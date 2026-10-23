(function () {
  'use strict';
  var backend = window.accountBackend;
  var pendingKey = 'account.pending-signup', recoveryKey = 'account.pending-recovery';
  var returnKey = 'account.return-after-auth';
  function safeReturn(value) {
    try {
      var target = new URL(value, location.href);
      if (target.origin !== location.origin) return null;
      var allowed = ['ideas.html', 'help.html', 'tickets.html', 'ticket.html', 'admin.html', 'sell.html', 'verify.html', 'seller-disputes.html'].map(function (page) { return new URL(page, location.href).pathname; });
      return allowed.includes(target.pathname) ? target.pathname + target.search + target.hash : null;
    } catch (error) { return null; }
  }
  try {
    var requestedReturn = new URL(location.href).searchParams.get('return');
    if (requestedReturn) { var safe = safeReturn(requestedReturn); if (safe) sessionStorage.setItem(returnKey, safe); else sessionStorage.removeItem(returnKey); }
  } catch (error) { /* Returning to support is optional. */ }
  function goAfterAuth() {
    var next = null;
    try { next = safeReturn(sessionStorage.getItem(returnKey)); sessionStorage.removeItem(returnKey); } catch (error) { /* Optional storage. */ }
    location.assign(next || './profile.html');
  }
  function node(id) { return document.getElementById(id); }
  function t(text) { return window.AppI18N ? window.AppI18N.text(text) : text; }
  function bindText(node, text) { if (window.AppI18N) window.AppI18N.bindText(node, text); else node.textContent = text; }
  function notify(id, text, error) { var p = node(id); if (!p) return; p.hidden = !text; bindText(p, text || ''); p.classList.toggle('is-error', !!error); }
  function userError(error) {
    var text = backend.errorMessage(error);
    if (/SQL Editor|SMTP|تهيئة|schema|Storage|Bucket|row-level|policy/i.test(text)) return 'الخدمة غير جاهزة حاليًا؛ تواصل مع الدعم.';
    return text;
  }
  async function run(button, statusId, operation) {
    if (button.disabled) return;
    button.disabled = true; notify(statusId, '', false);
    try { await operation(); } catch (error) { notify(statusId, userError(error), true); }
    finally { button.disabled = false; }
  }
  function readStored(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (error) { return null; } }
  function writeStored(key, value) { if (value) sessionStorage.setItem(key, JSON.stringify(value)); else sessionStorage.removeItem(key); }
  function checkedPassword(form) {
    var password = form.elements.password.value;
    if (password.length < 8 || password.length > 128 || !/\p{L}/u.test(password) || !/\p{N}/u.test(password)) throw new Error('كلمة المرور يجب أن تكون 8 خانات على الأقل وتجمع بين الحروف والأرقام.');
    if (password !== form.elements.confirm.value) throw new Error('كلمتا المرور غير متطابقتين.');
    return password;
  }
  function readAvatar(input, preview) {
    return new Promise(function (resolve, reject) {
      var file = input.files && input.files[0]; if (!file) { resolve(null); return; }
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { reject(new Error('اختر صورة PNG أو JPG أو WebP.')); return; }
      if (file.size > 2 * 1024 * 1024) { reject(new Error('حجم الصورة الأقصى 2 ميجابايت.')); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('تعذّرت قراءة الصورة.')); };
      reader.onload = function () { if (preview) preview.src = reader.result; resolve(reader.result); };
      reader.readAsDataURL(file);
    });
  }
  function syncHeader(profile) {
    var name = node('accountWidgetName'), image = node('accountWidgetAvatar');
    if (name) name.textContent = profile.display_name;
    if (image) image.src = backend.avatarUrl(profile) || './800_6ad36bdac7565.png';
  }
  async function finishSignup() {
    var pending = readStored(pendingKey);
    if (pending && pending.avatar && backend.currentUser() && pending.email.toLowerCase() === backend.currentUser().email.toLowerCase()) {
      var path = await backend.uploadAvatar(pending.avatar);
      await backend.updateProfile(pending.name, pending.phone, path);
    }
    writeStored(pendingKey, null);
    goAfterAuth();
  }
  function bindForm(id, statusId, operation) {
    var form = node(id);
    form.addEventListener('submit', function (event) { event.preventDefault(); if (!form.reportValidity()) return; run(form.querySelector('[type=submit]'), statusId, function () { return operation(form); }); });
  }
  function authPage() {
    var pending = readStored(pendingKey), recovery = readStored(recoveryKey), mode = 'login';
    var cooldowns = { signup: 0, recovery: 0 }, busy = false;
    function show(view) {
      mode = view;
      ['login', 'signup', 'verify', 'forgot', 'recovery'].forEach(function (key) { node(key + 'View').hidden = view !== key; });
      var sign = ['signup', 'verify'].includes(view);
      ['signup', 'login'].forEach(function (key) { var tab = node(key + 'Tab'), active = (key === 'signup') === sign; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', String(active)); });
      var email = sign ? pending && pending.email : recovery && recovery.email;
      document.querySelectorAll('.account-target-email').forEach(function (p) { p.textContent = email || ''; });
      node('recoveryForm').elements.token.closest('.account-field').hidden = backend.recoverySession();
      node('recoveryForm').elements.token.required = !backend.recoverySession();
    }
    document.querySelectorAll('[data-auth-view]').forEach(function (button) { button.addEventListener('click', function () { if (!busy) show(button.dataset.authView); }); });
    document.querySelectorAll('.account-otp').forEach(function (input) { input.addEventListener('input', function () { input.value = input.value.replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/\D/g, '').slice(0, 6); }); });
    node('signupAvatar').addEventListener('change', function () { readAvatar(this, node('signupAvatarPreview')).catch(function (e) { this.value = ''; notify('signupStatus', userError(e), true); }.bind(this)); });
    function exclusive(op) { return async function (form) { busy = true; try { await op(form); } finally { busy = false; } }; }
    bindForm('loginForm', 'loginStatus', exclusive(async function (form) { await backend.signIn(form.elements.identifier.value.trim(), form.elements.password.value); form.elements.password.value = ''; goAfterAuth(); }));
    bindForm('signupForm', 'signupStatus', exclusive(async function (form) {
      var password = checkedPassword(form), name = form.elements.fullname.value.trim(), phone = backend.normalizePhone(form.elements.phone.value);
      if (name.length < 2 || name.length > 120) throw new Error('INVALID_NAME');
      var next = { email: form.elements.email.value.trim().toLowerCase(), name: name, phone: phone, avatar: await readAvatar(node('signupAvatar'), node('signupAvatarPreview')) || pending && pending.avatar || null };
      // Never store a password. Keep only the optional avatar and pending email across the OTP step.
      writeStored(pendingKey, next);
      var data;
      try { data = await backend.signUp(next.email, password, name, phone); }
      catch (error) { writeStored(pendingKey, pending); throw error; }
      pending = next; form.elements.password.value = ''; form.elements.confirm.value = '';
      if (data.session) { await finishSignup(); return; }
      cooldowns.signup = Date.now() + 60000;
      show('verify'); notify('verifyStatus', 'أدخل رمز التحقق الذي يصلك على بريدك الإلكتروني.', false);
    }));
    bindForm('verifyForm', 'verifyStatus', exclusive(async function (form) {
      if (!pending || !pending.email) throw new Error('أدخل بيانات الحساب أولًا.');
      await backend.verifySignup(pending.email, form.elements.token.value);
      try { await finishSignup(); }
      catch (error) { notify('verifyStatus', 'تم تفعيل الحساب، لكن تعذّر حفظ الصورة. يمكنك رفعها من تعديل الملف.', true); setTimeout(function () { location.assign('./profile.html'); }, 2500); }
    }));
    bindForm('forgotForm', 'forgotStatus', exclusive(async function (form) {
      var email = form.elements.email.value.trim().toLowerCase();
      await backend.requestRecovery(email); recovery = { email: email }; writeStored(recoveryKey, recovery);
      cooldowns.recovery = Date.now() + 60000;
      show('recovery'); notify('recoveryStatus', 'إذا كان البريد مسجّلًا، ستصلك رسالة برمز التحقق.', false);
    }));
    bindForm('recoveryForm', 'recoveryStatus', exclusive(async function (form) {
      var password = checkedPassword(form);
      var email = recovery && recovery.email || backend.currentUser() && backend.currentUser().email;
      if (!email) throw new Error('أدخل بريد الحساب أولًا.');
      await backend.resetPassword(email, form.elements.token.value, password);
      form.reset(); writeStored(recoveryKey, null); recovery = null; show('login');
      notify('loginStatus', 'حُفظت كلمة المرور الجديدة. يمكنك تسجيل الدخول الآن.', false);
    }));
    document.querySelectorAll('[data-resend]').forEach(function (button) {
      var baseText = button.textContent.trim(), inFlight = false, label = document.createElement('span'), icon = button.querySelector('i');
      label.textContent = baseText; if (icon) button.replaceChildren(icon, label); else button.replaceChildren(label);
      function update() { var remaining = Math.ceil((cooldowns[button.dataset.resend] - Date.now()) / 1000); button.disabled = inFlight || remaining > 0; var caption = t('إعادة إرسال الرمز'); label.textContent = remaining > 0 ? caption + ' (' + remaining + ')' : caption; }
      window.addEventListener('account:languagechange', update);
      update(); setInterval(update, 1000);
      button.addEventListener('click', function () {
        var kind = button.dataset.resend, statusId = kind === 'signup' ? 'verifyStatus' : 'recoveryStatus', target = kind === 'signup' ? pending : recovery;
        inFlight = true;
        run(button, statusId, async function () {
          if (!target || !target.email) throw new Error('أدخل البريد الإلكتروني أولًا.');
          if (kind === 'signup') await backend.resendSignup(target.email); else await backend.requestRecovery(target.email);
          cooldowns[kind] = Date.now() + 60000; notify(statusId, 'طُلب إرسال رمز جديد. راجع بريدك الإلكتروني.', false);
        }).finally(function () { inFlight = false; update(); });
      });
    });
    if (pending) { var f = node('signupForm'); f.elements.fullname.value = pending.name || ''; f.elements.email.value = pending.email || ''; f.elements.phone.value = pending.phone || ''; if (pending.avatar) node('signupAvatarPreview').src = pending.avatar; }
    if (recovery) node('forgotForm').elements.email.value = recovery.email;
    if (backend.recoverySession()) { recovery = { email: backend.currentUser().email }; show('recovery'); }
    else if (backend.currentUser()) { finishSignup().catch(function (error) { show('login'); notify('loginStatus', userError(error), true); }); }
    else show(pending ? 'verify' : new URL(location.href).searchParams.get('view') === 'signup' ? 'signup' : 'login');
    window.addEventListener('pageshow', function (event) { if (event.persisted && backend.currentUser()) location.reload(); });
  }
  async function profilePage() {
    if (!backend.currentUser()) { node('profileGuest').hidden = false; return; }
    var profile, changedAvatar = null;
    async function render() {
      profile = await backend.profile();
      node('profileHeadingName').textContent = profile.display_name;
      node('profileDisplayName').textContent = profile.display_name;
      node('profileAvatar').src = backend.avatarUrl(profile) || './800_6ad36bdac7565.png';
      var badge = node('profileVerified'); bindText(badge, profile.is_verified === true ? '✓ موثّق' : 'غير موثّق');
      badge.className = 'verified-badge ' + (profile.is_verified === true ? 'is-approved' : 'is-unverified');
      node('profileCard').hidden = false;
      syncHeader(profile);
      try { var summary = await backend.profileSummary(); node('profileSales').dataset.currencyAmount = summary.totalSales; node('profileSales').textContent = window.CurrencySystem.format(summary.totalSales); }
      catch (error) { node('profileSales').textContent = '—'; notify('profileStatus', userError(error), true); }
    }
    node('editProfile').addEventListener('click', function () {
      var form = node('profileForm'); form.elements.fullname.value = profile.display_name; form.elements.email.value = backend.currentUser().email; form.elements.phone.value = profile.phone;
      node('editAvatarPreview').src = backend.avatarUrl(profile) || './800_6ad36bdac7565.png';
      node('editAvatar').value = ''; changedAvatar = null; node('profileCard').hidden = true; node('profileEditor').hidden = false; notify('profileStatus', '', false);
    });
    node('cancelProfileEdit').addEventListener('click', function () { node('profileEditor').hidden = true; node('profileCard').hidden = false; notify('profileStatus', '', false); });
    node('editAvatar').addEventListener('change', function () { readAvatar(this, node('editAvatarPreview')).then(function (data) { changedAvatar = data; }).catch(function (error) { this.value = ''; changedAvatar = null; notify('profileStatus', userError(error), true); }.bind(this)); });
    bindForm('profileForm', 'profileStatus', async function (form) {
      var name = form.elements.fullname.value.trim(), phone = backend.normalizePhone(form.elements.phone.value);
      if (name.length < 2 || name.length > 120) throw new Error('INVALID_NAME');
      var avatar = changedAvatar ? await backend.uploadAvatar(changedAvatar) : undefined;
      await backend.updateProfile(name, phone, avatar);
      node('profileEditor').hidden = true; await render(); notify('profileStatus', 'حُفظت بيانات الملف الشخصي.', false);
    });
    node('profileLogout').addEventListener('click', function () { run(this, 'profileStatus', async function () { await backend.signOut(); location.replace('./account.html'); }); });
    await render();
    window.addEventListener('pageshow', function (event) { if (event.persisted) location.reload(); });
  }
  var ready = document.readyState === 'loading' ? new Promise(function (resolve) { document.addEventListener('DOMContentLoaded', resolve, { once: true }); }) : Promise.resolve();
  Promise.all([ready, backend.ready]).then(function () { return document.body.dataset.backendPage === 'profile-view' ? profilePage() : authPage(); }).catch(function (error) { notify(document.body.dataset.backendPage === 'profile-view' ? 'profileStatus' : 'loginStatus', userError(error), true); });
})();
