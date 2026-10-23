(function () {
  'use strict';
  var config = window.ACCOUNT_CONFIG || {};
  var state = { client: null, session: null, user: null, profile: null, error: null, recovery: false };
  var backend = window.accountBackend = {};

  function message(error) {
    var text = String(error && (error.message || error.error_description || error) || '');
    if (/PAYMENTS_NOT_ENABLED/.test(text)) return 'الدفع والسحب غير متاحين حاليًا.';
    if (/AUTH_REQUIRED/.test(text)) return 'سجّل الدخول أولًا.';
    if (/ACCOUNT_BANNED/.test(text)) return 'هذا الحساب موقوف.';
    if (/EMAIL_IN_USE|User already registered|email_exists/i.test(text)) return 'هذا البريد مسجّل بالفعل. سجّل الدخول أو استخدم استعادة كلمة المرور.';
    if (/PHONE_IN_USE|account_profiles_confirmed_phone|duplicate key.*phone/i.test(text)) return 'رقم الجوال مستخدم في حساب آخر.';
    if (/INVALID_PHONE/.test(text)) return 'أدخل رقم جوال صحيحًا مثل 05xxxxxxxx أو رقمًا دوليًا يبدأ بعلامة +.';
    if (/INVALID_NAME/.test(text)) return 'اسم المستخدم يجب أن يكون بين حرفين و120 حرفًا.';
    if (/PHONE_LOGIN_NOT_READY/.test(text)) return 'الدخول بالجوال غير متاح حاليًا. يمكنك الدخول بالبريد الإلكتروني.';
    if (/otp_expired|Token has expired|invalid.*token/i.test(text)) return 'رمز التحقق غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا.';
    if (/Database error saving new user/i.test(text)) return 'تعذّر إنشاء الحساب. تحقق من رقم الجوال، فقد يكون مستخدمًا بحساب آخر.';
    if (/same_password|different from the old password/i.test(text)) return 'اختر كلمة مرور مختلفة عن السابقة.';
    if (/CART_EMPTY/.test(text)) return 'السلة فارغة.';
    if (/INVALID_QUANTITY/.test(text)) return 'الكمية المسموحة من 1 إلى 99.';
    if (/PRODUCT_UNAVAILABLE|PRODUCT_SOLD/.test(text)) return 'أحد المنتجات غير متاح حاليًا.';
    if (/PLEASE_WAIT/.test(text)) return 'انتظر دقيقتين قبل إرسال رسالة أخرى.';
    if (/Invalid login credentials/i.test(text)) return 'بيانات الدخول غير صحيحة.';
    if (/Email not confirmed/i.test(text)) return 'فعّل حسابك من رسالة التأكيد في بريدك الإلكتروني.';
    if (/Email address not authorized|email_address_not_authorized/i.test(text)) return 'إرسال تأكيد البريد لهذا العنوان يحتاج إعداد SMTP في Supabase. راجع ملف اقرأني.';
    if (/rate limit/i.test(text)) return 'بلغت حد المحاولات مؤقتًا؛ حاول لاحقًا.';
    if (/schema cache|does not exist|PROFILE_NOT_READY|PGRST202|PGRST205/i.test(text)) return 'قاعدة البيانات غير مهيأة؛ نفّذ ملف supabase/setup.sql في SQL Editor.';
    if (/Failed to fetch|NetworkError|Load failed/i.test(text)) return 'تعذّر الاتصال بالخادم؛ تحقق من الإنترنت.';
    return text || 'تعذّر تنفيذ الطلب.';
  }
  backend.errorMessage = message;

  function storeSession(session, user) {
    state.session = session || null;
    state.user = user || null;
    try {
      if (session && user) {
        localStorage.setItem('app_session_token', session.access_token);
        localStorage.setItem('app_user_email', user.email || '');
        localStorage.setItem('app_account', JSON.stringify({
          id: user.id, email: user.email || '',
          name: state.profile && state.profile.display_name || user.user_metadata && user.user_metadata.name || '',
          phone: state.profile && state.profile.phone || '', avatar: backend.avatarUrl(state.profile)
        }));
      } else {
        ['app_session_token', 'app_user_email', 'app_account', 'account.auth.started'].forEach(function (key) { localStorage.removeItem(key); });
      }
    } catch (error) { /* Supabase keeps its own session; legacy UI storage is optional. */ }
  }

  async function loadProfile() {
    if (!state.user) return null;
    var response = await state.client.from('account_profiles').select('*').eq('id', state.user.id).maybeSingle();
    if (response.error) throw response.error;
    state.profile = response.data;
    if (state.profile && state.profile.avatar_path && /^[a-f0-9-]{36}\/avatar\.(png|jpg|webp)$/.test(state.profile.avatar_path)) {
      var signed = await state.client.storage.from('account-avatars').createSignedUrl(state.profile.avatar_path, 3600);
      if (!signed.error && signed.data) state.profile.signed_avatar_url = signed.data.signedUrl;
    }
    return state.profile;
  }

  backend.ready = window.accountBackendReady = (async function () {
    try {
      if (!window.supabase || !window.supabase.createClient) throw new Error('تعذّر تحميل مكتبة الاتصال.');
      state.client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      state.client.auth.onAuthStateChange(function (event, session) {
        if (event === 'PASSWORD_RECOVERY') state.recovery = true;
        if (event === 'SIGNED_OUT') {
          state.profile = null;
          storeSession(null, null);
          window.dispatchEvent(new Event('account:signed-out'));
        } else if (event === 'TOKEN_REFRESHED' && state.user && session && session.user.id === state.user.id) {
          storeSession(session, state.user);
        }
      });
      var current = await state.client.auth.getSession();
      if (current.error) throw current.error;
      if (!current.data.session) { storeSession(null, null); return backend; }
      var started = Number(localStorage.getItem('account.auth.started'));
      if (started && Date.now() - started > 30 * 24 * 60 * 60 * 1000) {
        await state.client.auth.signOut({ scope: 'local' }); storeSession(null, null); return backend;
      }
      if (!started) localStorage.setItem('account.auth.started', String(Date.now()));
      // Cached user metadata is never used as authorization. Verify with Auth.
      var verified = await state.client.auth.getUser();
      if (verified.error) throw verified.error;
      state.user = verified.data.user;
      try { await loadProfile(); } catch (error) { state.error = message(error); }
      if (state.profile && state.profile.banned) { await state.client.auth.signOut(); state.profile = null; throw new Error('ACCOUNT_BANNED'); }
      storeSession(current.data.session, state.user);
    } catch (error) {
      state.error = message(error);
      storeSession(null, null);
    }
    return backend;
  })();

  async function client(requireUser) {
    await backend.ready;
    if (!state.client) throw new Error(state.error || 'تعذّر الاتصال بالخادم.');
    if (requireUser && !state.user) throw new Error('AUTH_REQUIRED');
    return state.client;
  }
  async function result(operation) {
    try { return await operation(); }
    catch (error) { return { success: false, error: message(error) }; }
  }
  function check(response) { if (response.error) throw response.error; return response.data; }
  backend.currentUser = function () { return state.user; };
  backend.recoverySession = function () { return state.recovery && !!state.user; };
  backend.avatarUrl = function (profile) {
    var path = profile && profile.avatar_path;
    return path && /^[a-f0-9-]{36}\/avatar\.(png|jpg|webp)$/.test(path) ? profile.signed_avatar_url || '' : '';
  };
  backend.normalizePhone = function (value) {
    var phone = String(value || '').trim().replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[\s()\-]/g, '');
    if (phone.slice(0, 2) === '00') phone = '+' + phone.slice(2);
    if (/^05\d{8}$/.test(phone)) phone = '+966' + phone.slice(1);
    if (/^5\d{8}$/.test(phone)) phone = '+966' + phone;
    if (/^9665\d{8}$/.test(phone)) phone = '+' + phone;
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('INVALID_PHONE');
    return phone;
  };
  backend.profile = async function () { await client(true); return loadProfile(); };
  backend.health = async function () { return check(await (await client()).rpc('account_health')); };

  async function acceptAuth(data) {
    state.user = data.user;
    await loadProfile();
    if (!state.profile) throw new Error('PROFILE_NOT_READY');
    if (state.profile.banned) { await state.client.auth.signOut(); state.profile = null; storeSession(null, null); throw new Error('ACCOUNT_BANNED'); }
    localStorage.setItem('account.auth.started', String(Date.now()));
    storeSession(data.session, data.user);
    return data;
  }
  backend.signIn = async function (identifier, password) {
    var c = await client();
    if (identifier.indexOf('@') !== -1) return acceptAuth(check(await c.auth.signInWithPassword({ email: identifier, password: password })));
    var response = await fetch(config.url + '/functions/v1/account-phone-login', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: config.publishableKey }, body: JSON.stringify({ phone: backend.normalizePhone(identifier), password: password }) });
    var result; try { result = await response.json(); } catch (error) { throw new Error('PHONE_LOGIN_NOT_READY'); }
    if (response.status === 404 || response.status === 503) throw new Error('PHONE_LOGIN_NOT_READY');
    if (!response.ok) throw new Error(result.error || 'Invalid login credentials');
    return acceptAuth(check(await c.auth.setSession({ access_token: result.session.access_token, refresh_token: result.session.refresh_token })));
  };
  backend.signUp = async function (email, password, name, phone) {
    var c = await client();
    email = email.trim().toLowerCase();
    phone = backend.normalizePhone(phone);
    var availability = check(await c.rpc('account_signup_availability', { p_email: email, p_phone: phone }));
    if (availability === 'email_in_use') throw new Error('EMAIL_IN_USE');
    if (availability === 'phone_in_use') throw new Error('PHONE_IN_USE');
    if (availability !== 'available') throw new Error('تعذّر التحقق من بيانات التسجيل. حاول مجددًا.');
    var data = check(await c.auth.signUp({ email: email, password: password, options: {
      data: { name: name, phone: backend.normalizePhone(phone) }, emailRedirectTo: new URL('account.html', location.href).href
    } }));
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('هذا البريد مسجّل بالفعل. سجّل الدخول أو استخدم استعادة كلمة المرور.');
    }
    if (data.session) {
      await acceptAuth(data);
    }
    return data;
  };
  backend.signOut = async function () {
    check(await (await client()).auth.signOut());
    state.profile = null; state.recovery = false;
    storeSession(null, null);
  };
  backend.verifySignup = async function (email, token) { return acceptAuth(check(await (await client()).auth.verifyOtp({ email: email, token: token, type: 'email' }))); };
  backend.resendSignup = async function (email) { return check(await (await client()).auth.resend({ type: 'signup', email: email, options: { emailRedirectTo: new URL('account.html', location.href).href } })); };
  backend.requestRecovery = async function (email) { return check(await (await client()).auth.resetPasswordForEmail(email, { redirectTo: new URL('account.html?recovery=1', location.href).href })); };
  backend.resetPassword = async function (email, token, password) {
    var c = await client();
    if (!backend.recoverySession()) { await acceptAuth(check(await c.auth.verifyOtp({ email: email, token: token, type: 'recovery' }))); state.recovery = true; }
    check(await c.auth.updateUser({ password: password }));
    await backend.signOut();
  };
  backend.uploadAvatar = async function (dataUrl) {
    var c = await client(true);
    var match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
    if (!match) throw new Error('اختر صورة PNG أو JPG أو WebP.');
    var raw = atob(match[2]); if (raw.length > 2 * 1024 * 1024) throw new Error('حجم الصورة الأقصى 2 ميجابايت.');
    var bytes = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    var path = state.user.id + '/avatar.' + (match[1] === 'jpeg' ? 'jpg' : match[1]);
    check(await c.storage.from('account-avatars').upload(path, new Blob([bytes], { type: 'image/' + match[1] }), { upsert: true, cacheControl: '0', contentType: 'image/' + match[1] }));
    return path;
  };
  backend.updateProfile = async function (name, phone, avatarPath) {
    var c = await client(true);
    check(await c.rpc('account_update_profile', { p_name: name, p_phone: backend.normalizePhone(phone), p_avatar_path: avatarPath === undefined ? null : avatarPath }));
    await loadProfile();
    storeSession(state.session, state.user);
    return state.profile;
  };
  backend.withdrawalDashboard = async function (offset) { return check(await (await client(true)).rpc('account_withdrawal_dashboard',{p_offset:offset||0})); };
  backend.addBank = async function (data,key) { return check(await (await client(true)).rpc('account_add_bank',{p_request_id:key,p_bank:data.bank,p_holder:data.holder,p_iban:data.iban})); };
  backend.requestWithdrawal = async function (data,key) { return check(await (await client(true)).rpc('account_request_withdrawal',{p_request_id:key,p_bank_id:data.bankId,p_amount:data.amount,p_note:data.note||''})); };
  backend.adminWithdrawalReview = async function (id,approve,note,key) { return check(await (await client(true)).rpc('account_admin_withdrawal_review',{p_id:id,p_approve:approve,p_note:note||'',p_request_id:key})); };
  backend.profileSummary = async function () { return check(await (await client(true)).rpc('account_profile_summary')); };
  backend.products = async function () {
    return check(await (await client()).from('account_products').select('*').eq('active', true).order('created_at', { ascending: false }));
  };
  backend.verifiedSellerProducts = async function () {
    return check(await (await client()).rpc('account_verified_seller_products').order('created_at', { ascending: false }).order('id', { ascending: true }));
  };
  backend.sellerProducts = async function (offset) {
    var c = await client(true), start = offset || 0;
    return check(await c.from('account_products').select('id,title,description,price,listing_type,active,created_at,sold_at')
      .eq('seller_id', state.user.id).order('created_at', { ascending: false }).order('id', { ascending: true }).range(start, start + 23));
  };
  backend.sellerProduct = async function (id) { return check(await (await client(true)).rpc('account_seller_read_product', { p_id: id })); };
  backend.sellerSaveProduct = async function (product) {
    return check(await (await client(true)).rpc('account_seller_save_product', {
      p_id: product.id, p_title: product.title, p_price: product.price, p_listing_type: product.kind,
      p_description: product.description, p_credentials: product.credentials, p_active: product.active
    }));
  };
  backend.sellerSetVisibility = async function (id, active) { return check(await (await client(true)).rpc('account_seller_set_visibility', { p_id: id, p_active: active })); };
  backend.cart = async function () {
    await client();
    if (!state.user) return [];
    var data = check(await state.client.from('account_cart').select('product_id,quantity,product:account_products(*)').eq('user_id', state.user.id));
    return data.map(function (row) {
      var product = row.product || {};
      return { unique_id_txt: row.product_id, id: row.product_id, title: product.title || 'منتج غير متاح',
        price: Number(product.price || 0), count: row.quantity, image: product.image_url || '', available: !!product.id };
    });
  };
  backend.setCart = async function (id, quantity, increment) {
    return check(await (await client(true)).rpc('account_set_cart_item', {
      p_product_id: id, p_quantity: quantity, p_increment: !!increment
    }));
  };
  backend.checkout = async function (requestId) {
    return check(await (await client(true)).rpc('account_place_test_order', { p_request_id: requestId }));
  };
  backend.orderDelivery = async function (itemId) { return check(await (await client(true)).rpc('account_order_delivery', { p_order_item_id: itemId })); };
  backend.testSettlements = async function () { return check(await (await client(true)).rpc('account_test_settlements')); };
  backend.orders = async function () {
    var c = await client(true);
    return check(await c.from('account_orders').select('*,items:account_order_items(*)')
      .eq('user_id', state.user.id).order('created_at', { ascending: false }));
  };
  backend.submitMessage = async function (email, kind, fields) {
    return check(await (await client()).rpc('account_submit_message', { p_email: email, p_kind: kind, p_fields: fields }));
  };

  backend.supportHealth = async function () { return check(await (await client()).rpc('account_support_health')); };
  backend.supportTickets = async function (staff, offset, status) {
    var c = await client(true), query;
    if (staff && (await loadProfile()).role !== 'admin') throw new Error('SUPPORT_FORBIDDEN');
    query = c.from('account_support_tickets').select('*');
    if (!staff) query = query.eq('user_id', state.user.id);
    if (['open', 'in_progress', 'closed'].includes(status)) query = query.eq('status', status);
    return check(await query.order('updated_at', { ascending: false }).order('id', { ascending: false }).range(offset || 0, (offset || 0) + 49));
  };
  backend.supportTicket = async function (id) { return check(await (await client(true)).from('account_support_tickets').select('*').eq('id', id).maybeSingle()); };
  backend.supportMessages = async function (id) {
    var c = await client(true), all = [], page;
    do {
      page = check(await c.from('account_support_replies').select('*').eq('ticket_id', id)
        .order('created_at', { ascending: true }).order('id', { ascending: true }).range(all.length, all.length + 199));
      all = all.concat(page);
    } while (page.length === 200);
    return all;
  };
  backend.supportCreate = async function (data, requestId) {
    return check(await (await client(true)).rpc('account_support_create', { p_request_id: requestId, p_subject: data.subject,
      p_category: data.category, p_priority: data.priority, p_body: data.message }));
  };
  backend.supportReply = async function (id, body, requestId) {
    return check(await (await client(true)).rpc('account_support_reply', { p_ticket_id: id, p_request_id: requestId, p_body: body }));
  };
  backend.supportStatus = async function (id, status) { return check(await (await client(true)).rpc('account_support_status', { p_ticket_id: id, p_status: status })); };
  backend.supportRead = async function (id, staff) { return check(await (await client(true)).rpc('account_support_read', { p_ticket_id: id, p_as_staff: !!staff })); };

  backend.adminData = async function (section, offset, filter) { if(section==='withdrawals')return check(await (await client(true)).rpc('account_admin_withdrawals',{p_offset:offset||0,p_filter:filter||''}));return check(await (await client(true)).rpc('account_admin_data', { p_section: section, p_offset: offset || 0, p_filter: filter || '' })); };
  backend.adminMembership = async function (email, name, remove) { return check(await (await client(true)).rpc('account_admin_membership', { p_email: email, p_name: name || '', p_remove: !!remove })); };
  backend.adminBan = async function (id, banned, reason) { return check(await (await client(true)).rpc('account_admin_ban', { p_user_id: id, p_banned: !!banned, p_reason: reason || '' })); };
  backend.adminVerify = async function (id, approve, note) { return check(await (await client(true)).rpc('account_admin_verify', { p_id: id, p_approve: !!approve, p_note: note || '' })); };
  backend.adminDispute = async function (id, status, note, requestId) { return check(await (await client(true)).rpc('account_admin_dispute', { p_id: id, p_status: status, p_note: note, p_request_id: requestId })); };
  backend.adminTopup = async function (id, approve, note) { return check(await (await client(true)).rpc('account_admin_topup', { p_id: id, p_approve: !!approve, p_note: note || '' })); };
  backend.identityVerification = async function (action, values) {
    var response = await (await client(true)).functions.invoke('account-identity', { body: Object.assign({}, values || {}, { action: action }) });
    if (response.error) {
      var detail = {}; try { if (response.error.context && response.error.context.json) detail = await response.error.context.json(); } catch (ignored) {}
      throw new Error(detail.error || 'IDENTITY_SERVICE_UNAVAILABLE');
    }
    return response.data;
  };
  backend.verificationPrepare = async function (data, requestId) { return check(await (await client(true)).rpc('account_verification_prepare', { p_request_id: requestId, p_store_name: data.store, p_legal_name: data.legal, p_phone: backend.normalizePhone(data.phone), p_file_type: data.type })); };
  backend.verificationSubmit = async function (id) { return check(await (await client(true)).rpc('account_verification_submit', { p_id: id })); };
  backend.verificationUpload = async function (record, file) {
    var c = await client(true), response = await c.storage.from('account-verification').upload(record.document_path, file, { upsert: false, contentType: file.type, cacheControl: '0' });
    if (response.error && !/already exists|duplicate/i.test(response.error.message || '')) throw response.error;
    return backend.verificationSubmit(record.id);
  };
  backend.verificationDocument = async function (path) {
    if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/.test(path || '')) throw new Error('INVALID_DOCUMENT');
    var data = check(await (await client(true)).storage.from('account-verification').createSignedUrl(path, 60));
    var url = new URL(data.signedUrl), allowed = new URL(config.url);
    if (url.origin !== allowed.origin || !url.pathname.startsWith('/storage/v1/object/sign/account-verification/')) throw new Error('INVALID_DOCUMENT');
    return url.href;
  };
  backend.verifications = async function () {
    var c = await client(true), rows = [], part;
    do { part = check(await c.from('account_verifications').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(rows.length, rows.length + 199)); rows = rows.concat(part); } while (part.length === 200);
    return rows;
  };
  backend.disputes = async function (offset) { var c = await client(true); return check(await c.from('account_disputes').select('*').or('buyer_id.eq.' + state.user.id + ',seller_id.eq.' + state.user.id).order('updated_at', { ascending: false }).order('id', { ascending: false }).range(offset || 0, (offset || 0) + 49)); };
  backend.dispute = async function (id) { return check(await (await client(true)).from('account_disputes').select('*').eq('id', id).maybeSingle()); };
  backend.disputeMessages = async function (id) {
    var c = await client(true), rows = [], part;
    do { part = check(await c.from('account_dispute_replies').select('*').eq('dispute_id', id).order('created_at', { ascending: true }).order('id', { ascending: true }).range(rows.length, rows.length + 199)); rows = rows.concat(part); } while (part.length === 200);
    return rows;
  };
  backend.disputeOpen = async function (item, reason, requestId) { return check(await (await client(true)).rpc('account_dispute_open', { p_item_id: item, p_request_id: requestId, p_reason: reason })); };
  backend.sellerOrders = async function () { var c=await client(true),rows=[],part;do{part=check(await c.rpc('account_seller_orders',{p_offset:rows.length}));rows=rows.concat(part);}while(part.length===50);return rows; };
  backend.disputePartyClose = async function (id, requestId) { return check(await (await client(true)).rpc('account_dispute_party_close', { p_id:id, p_request_id:requestId })); };
  backend.disputeReply = async function (id, body, requestId) { return check(await (await client(true)).rpc('account_dispute_reply', { p_id: id, p_request_id: requestId, p_body: body })); };

  // Compatibility with the APIs already called by the supplied application.
  window.OrderSystem = {
    getCart: function () { return result(async function () { return { success: true, cart: await backend.cart() }; }); },
    addToCart: function (record, quantity) { return result(function () { return backend.setCart(record.unique_id_txt || record.id, quantity || 1, true); }); }
  };
  window.LoginSystem = { logout: function () { return result(async function () { await backend.signOut(); return { success: true }; }); } };
  window.MessagesSystem = { submit: function (fields, form) {
    return result(function () {
      var email = fields.find(function (field) { return field.type === 'email'; });
      return backend.submitMessage(email && email.value || '', form && form.id === 'newsletterForm' ? 'newsletter' : 'contact', fields);
    });
  } };
  window.CurrencySystem = { format: function (amount) {
    var lang = document.documentElement.lang || 'ar';
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : lang, { style: 'currency', currency: 'SAR' }).format(Number(amount) || 0);
  } };
  window.DataSystem = { list: function (namespace, options) {
    return result(async function () {
      var records = [], profile;
      await client();
      if (namespace === 'products') {
        records = (await backend.products()).map(function (row) { return { id: row.id, title: row.title, price: row.price, image: row.image_url }; });
      } else if (['accounts', 'admins', 'sellers'].indexOf(namespace) !== -1) {
        if (state.user) {
          profile = await backend.profile();
          if (profile && (namespace === 'accounts' || namespace === 'admins' && profile.role === 'admin' && !profile.banned || namespace === 'sellers' && profile.role === 'seller')) {
            records = [{ id: profile.id, email: profile.email, name: profile.display_name,
              store_name: profile.display_name, phone: profile.phone, avatar: backend.avatarUrl(profile), verified: profile.is_verified === true, banned: profile.banned, ban_reason: profile.ban_reason, active: !profile.banned }];
          }
        }
      } else if (namespace !== 'withdrawals') {
        throw new Error('هذه الوظيفة غير مهيأة في الربط الحالي.');
      }
      var page = Math.max(1, Number(options && options.page) || 1), limit = Math.min(100, Math.max(1, Number(options && options.limit) || 50));
      return { success: true, keys: records.slice((page - 1) * limit, page * limit).map(function (row) {
        return { key_txt: row.id, unique_id_txt: row.id, page_url_txt: '', data_json: JSON.stringify(row) };
      }), pagination: { pagesLeft: Math.max(0, Math.ceil(records.length / limit) - page) } };
    });
  } };
  // Test orders never create real money, real withdrawable balances, or real sales.
  // The dedicated withdrawal API reserves simulation credits only.
  window.ServerFunction = { call: function (name) {
    return result(async function () { if (name !== 'seller_sales') throw new Error('هذه الوظيفة غير مهيأة.'); var summary = await backend.profileSummary(); return { success: true, totalSales: Number(summary.totalSales), is_test: true }; });
  } };
  window.PluginsSystem = { sendRequest: function () {
    return Promise.resolve({ success: false, error: 'رفع الملفات يحتاج إعداد تخزين مستقل؛ لم يُفعّل في هذه الحزمة.' });
  } };
})();
