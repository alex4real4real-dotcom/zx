(function () {
  'use strict';
  var config = window.ACCOUNT_CONFIG || {};
  var state = { client: null, session: null, user: null, profile: null, error: null };
  var backend = window.accountBackend = {};

  function message(error) {
    var text = String(error && (error.message || error.error_description || error) || '');
    if (/AUTH_REQUIRED/.test(text)) return 'سجّل الدخول أولًا.';
    if (/ACCOUNT_BANNED/.test(text)) return 'هذا الحساب موقوف.';
    if (/CART_EMPTY/.test(text)) return 'السلة فارغة.';
    if (/INVALID_QUANTITY/.test(text)) return 'الكمية المسموحة من 1 إلى 99.';
    if (/PRODUCT_UNAVAILABLE/.test(text)) return 'أحد المنتجات غير متاح حاليًا.';
    if (/PLEASE_WAIT/.test(text)) return 'انتظر دقيقتين قبل إرسال رسالة أخرى.';
    if (/Invalid login credentials/i.test(text)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
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
          name: state.profile && state.profile.display_name || user.user_metadata && user.user_metadata.name || ''
        }));
      } else {
        ['app_session_token', 'app_user_email', 'app_account'].forEach(function (key) { localStorage.removeItem(key); });
      }
    } catch (error) { /* Supabase keeps its own session; legacy UI storage is optional. */ }
  }

  async function loadProfile() {
    if (!state.user) return null;
    var response = await state.client.from('account_profiles').select('*').eq('id', state.user.id).maybeSingle();
    if (response.error) throw response.error;
    state.profile = response.data;
    return state.profile;
  }

  backend.ready = window.accountBackendReady = (async function () {
    try {
      if (!window.supabase || !window.supabase.createClient) throw new Error('تعذّر تحميل مكتبة الاتصال.');
      state.client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      state.client.auth.onAuthStateChange(function (event, session) {
        if (event === 'SIGNED_OUT') {
          state.profile = null;
          storeSession(null, null);
        } else if (event === 'TOKEN_REFRESHED' && state.user && session && session.user.id === state.user.id) {
          storeSession(session, state.user);
        }
      });
      var current = await state.client.auth.getSession();
      if (current.error) throw current.error;
      if (!current.data.session) { storeSession(null, null); return backend; }
      // Cached user metadata is never used as authorization. Verify with Auth.
      var verified = await state.client.auth.getUser();
      if (verified.error) throw verified.error;
      state.user = verified.data.user;
      try { await loadProfile(); } catch (error) { state.error = message(error); }
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
  backend.profile = async function () { await client(true); return loadProfile(); };
  backend.health = async function () { return check(await (await client()).rpc('account_health')); };

  backend.signIn = async function (email, password) {
    var c = await client();
    var data = check(await c.auth.signInWithPassword({ email: email, password: password }));
    state.user = data.user;
    await loadProfile();
    storeSession(data.session, data.user);
    return data;
  };
  backend.signUp = async function (email, password, name) {
    var c = await client();
    var data = check(await c.auth.signUp({ email: email, password: password, options: {
      data: { name: name }, emailRedirectTo: new URL('account.html', location.href).href
    } }));
    if (data.session) {
      state.user = data.user;
      await loadProfile();
      storeSession(data.session, data.user);
    }
    return data;
  };
  backend.signOut = async function () {
    check(await (await client()).auth.signOut());
    state.profile = null;
    storeSession(null, null);
  };
  backend.updateProfile = async function (name, phone) {
    var c = await client(true);
    check(await c.from('account_profiles').update({ display_name: name, phone: phone }).eq('id', state.user.id));
    await loadProfile();
    storeSession(state.session, state.user);
    return state.profile;
  };
  backend.products = async function () {
    return check(await (await client()).from('account_products').select('*').eq('active', true).order('created_at', { ascending: false }));
  };
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
  backend.orders = async function () {
    var c = await client(true);
    return check(await c.from('account_orders').select('*,items:account_order_items(*)')
      .eq('user_id', state.user.id).order('created_at', { ascending: false }));
  };
  backend.submitMessage = async function (email, kind, fields) {
    return check(await (await client()).rpc('account_submit_message', { p_email: email, p_kind: kind, p_fields: fields }));
  };

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
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(Number(amount) || 0);
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
              store_name: profile.display_name, banned: profile.banned, ban_reason: profile.ban_reason, active: !profile.banned }];
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
  // Test orders never create money, withdrawable balances, or real sales.
  window.ServerFunction = { call: function (name) {
    return Promise.resolve(name === 'seller_sales' ? { success: true, totalSales: 0, is_test: true } : { success: false, error: 'هذه الوظيفة غير مهيأة.' });
  } };
  window.PluginsSystem = { sendRequest: function () {
    return Promise.resolve({ success: false, error: 'رفع الملفات يحتاج إعداد تخزين مستقل؛ لم يُفعّل في هذه الحزمة.' });
  } };
})();
