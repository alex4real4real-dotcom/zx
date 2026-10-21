(function () {
  'use strict';
  var backend = window.accountBackend;
  function el(tag, text, className) { var node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function status(id, text, error) { var node = document.getElementById(id); if (node) { node.textContent = text; node.className = 'backend-status ' + (error ? 'error' : 'success'); } }
  function money(value) { return window.CurrencySystem.format(value); }
  async function action(button, statusId, operation) {
    if (button) button.disabled = true;
    status(statusId, 'جارٍ التنفيذ…', false);
    try { return await operation(); }
    catch (error) { status(statusId, backend.errorMessage(error), true); }
    finally { if (button) button.disabled = false; }
  }
  function requireUser() {
    if (backend.currentUser()) return true;
    var container = document.querySelector('[data-backend-content]');
    if (container) {
      var panel = el('div', undefined, 'backend-panel');
      panel.append(el('p', 'سجّل الدخول لعرض هذه الصفحة.'));
      var link = el('a', 'تسجيل الدخول', 'backend-button'); link.href = 'account.html'; panel.append(link);
      container.replaceChildren(panel);
    }
    return false;
  }
  async function accountPage() {
    var logged = !!backend.currentUser();
    document.getElementById('authForms').classList.toggle('backend-hidden', logged);
    document.getElementById('profilePanel').classList.toggle('backend-hidden', !logged);
    if (logged) {
      try {
        var profile = await backend.profile();
        document.getElementById('profileEmail').value = backend.currentUser().email || '';
        document.getElementById('profileName').value = profile && profile.display_name || '';
        document.getElementById('profilePhone').value = profile && profile.phone || '';
      } catch (error) { status('profileStatus', backend.errorMessage(error), true); }
    }
    document.getElementById('loginForm').addEventListener('submit', function (event) {
      event.preventDefault(); var form = event.currentTarget;
      action(form.querySelector('button'), 'loginStatus', async function () {
        await backend.signIn(form.elements.email.value.trim(), form.elements.password.value);
        location.href = 'index.html';
      });
    });
    document.getElementById('signupForm').addEventListener('submit', function (event) {
      event.preventDefault(); var form = event.currentTarget;
      action(form.querySelector('button'), 'signupStatus', async function () {
        var data = await backend.signUp(form.elements.email.value.trim(), form.elements.password.value, form.elements.fullname.value.trim());
        if (data.session) { location.href = 'index.html'; return; }
        form.reset(); status('signupStatus', 'راجع بريدك الإلكتروني واضغط رابط تأكيد الحساب، ثم سجّل الدخول هنا.', false);
      });
    });
    document.getElementById('profileForm').addEventListener('submit', function (event) {
      event.preventDefault(); var form = event.currentTarget;
      action(form.querySelector('button'), 'profileStatus', async function () {
        await backend.updateProfile(form.elements.fullname.value.trim(), form.elements.phone.value.trim());
        status('profileStatus', 'حُفظت بياناتك.', false);
      });
    });
    document.getElementById('backendLogout').addEventListener('click', function (event) {
      action(event.currentTarget, 'profileStatus', async function () { await backend.signOut(); location.href = 'account.html'; });
    });
  }
  async function shopPage() {
    try {
      var rows = await backend.products(), container = document.getElementById('productList');
      container.replaceChildren();
      if (!rows.length) container.append(el('p', 'لا توجد منتجات متاحة حاليًا.'));
      rows.forEach(function (row) {
        var card = el('article', undefined, 'backend-panel');
        if (row.image_url) { var image = el('img'); image.src = row.image_url; image.alt = row.title; image.className = 'backend-card-image'; card.append(image); }
        card.append(el('h2', row.title), el('p', row.description, 'backend-muted'), el('p', money(row.price)));
        var button = el('button', 'أضف إلى السلة', 'backend-button js-add-to-cart'); button.type = 'button'; button.dataset.uid = row.id; card.append(button); container.append(card);
      });
      status('shopStatus', '', false);
    } catch (error) { status('shopStatus', backend.errorMessage(error), true); }
  }
  async function cartPage() {
    if (!requireUser()) return;
    var container = document.getElementById('cartList'), checkout = document.getElementById('testCheckout'), eligible = false;
    async function render() {
      var rows = await backend.cart(), total = 0;
      container.replaceChildren();
      rows.forEach(function (row) {
        total += row.price * row.count;
        var item = el('div', undefined, 'backend-item'), info = el('div');
        info.append(el('h3', row.title), el('p', row.available ? money(row.price) : 'هذا المنتج غير متاح حاليًا.', 'backend-muted'));
        var controls = el('div', undefined, 'backend-actions'), quantity = el('input');
        quantity.type = 'number'; quantity.min = '1'; quantity.max = '99'; quantity.value = row.count; quantity.setAttribute('aria-label', 'كمية ' + row.title);
        quantity.addEventListener('change', function () {
          action(quantity, 'cartStatus', async function () {
            var value = Number(quantity.value); if (!Number.isInteger(value) || value < 1 || value > 99) throw new Error('INVALID_QUANTITY');
            await backend.setCart(row.id, value, false); await render(); status('cartStatus', 'حُدّثت السلة.', false);
          });
        });
        var remove = el('button', 'حذف', 'backend-button secondary'); remove.type = 'button';
        remove.addEventListener('click', function () { action(remove, 'cartStatus', async function () {
          await backend.setCart(row.id, 0, false); await render(); status('cartStatus', 'حُذف المنتج من السلة.', false);
        }); });
        controls.append(quantity, remove); item.append(info, controls); container.append(item);
      });
      if (!rows.length) container.append(el('p', 'السلة فارغة.'));
      document.getElementById('cartTotal').textContent = money(total);
      eligible = !!rows.length && rows.every(function (row) { return row.available; });
      checkout.disabled = !eligible;
      if (window.updateCartBadge) window.updateCartBadge();
    }
    try { await render(); } catch (error) { checkout.disabled = true; status('cartStatus', backend.errorMessage(error), true); }
    checkout.addEventListener('click', function () {
      action(checkout, 'cartStatus', async function () {
        var storageKey = 'account.test-checkout.' + backend.currentUser().id;
        var requestId = sessionStorage.getItem(storageKey);
        if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(storageKey, requestId); }
        var response = await backend.checkout(requestId);
        if (!response.success || response.is_test !== true) throw new Error('تعذّر تأكيد الطلب التجريبي.');
        sessionStorage.removeItem(storageKey);
        await render();
        status('cartStatus', 'حُفظ الطلب التجريبي: ' + response.order_id + '\nالإجمالي: ' + money(response.total) + '\nلم تُسحب أي أموال.', false);
      }).finally(function () { checkout.disabled = !eligible; });
    });
  }
  async function ordersPage() {
    if (!requireUser()) return;
    try {
      var rows = await backend.orders(), container = document.getElementById('orderList');
      container.replaceChildren();
      if (!rows.length) container.append(el('p', 'لا توجد طلبات بعد.'));
      rows.forEach(function (row) {
        var panel = el('article', undefined, 'backend-panel');
        panel.append(el('h2', 'طلب تجريبي'), el('p', row.id, 'backend-order-id'));
        panel.append(el('p', new Date(row.created_at).toLocaleString('ar-SA') + ' — ' + money(row.total), 'backend-muted'));
        (row.items || []).forEach(function (item) { panel.append(el('p', item.title + ' × ' + item.quantity + ' — ' + money(item.unit_price * item.quantity))); });
        panel.append(el('p', 'محاكاة فقط؛ لا يُمثّل هذا الطلب دفعة حقيقية.')); container.append(panel);
      });
    } catch (error) { status('ordersStatus', backend.errorMessage(error), true); }
  }
  async function connectionPage() {
    document.getElementById('backendProjectUrl').textContent = window.ACCOUNT_CONFIG.url;
    document.getElementById('checkConnection').addEventListener('click', function (event) {
      action(event.currentTarget, 'connectionStatus', async function () {
        var result = await backend.health();
        if (!result || result.ready !== true) throw new Error('لم ينجح اختبار إعداد قاعدة البيانات.');
        status('connectionStatus', 'نجح الاتصال بقاعدة البيانات. يمكنك الآن إنشاء حساب وتجربة السلة والطلبات التجريبية.', false);
      });
    });
  }
  async function syncHomepageProducts() {
    var cards = document.querySelectorAll('article[data-ai-namespace="products"]');
    if (!cards.length) return;
    try {
      var rows = await backend.products();
      cards.forEach(function (card) {
        var button = card.querySelector('.js-add-to-cart'); if (!button) return;
        var row = rows.find(function (entry) { return entry.id === button.dataset.uid; });
        button.disabled = !row;
        if (!row) { button.title = 'المنتج غير متاح حاليًا'; return; }
        var title = card.querySelector('h3'), price = card.querySelector('[data-mc-price]');
        if (title) title.textContent = row.title;
        if (price) { price.dataset.mcPrice = row.price; price.textContent = Number(row.price).toFixed(2); }
      });
    } catch (error) { cards.forEach(function (card) { var button = card.querySelector('.js-add-to-cart'); if (button) button.title = backend.errorMessage(error); }); }
  }
  var domReady = document.readyState === 'loading' ? new Promise(function (resolve) { document.addEventListener('DOMContentLoaded', resolve, { once: true }); }) : Promise.resolve();
  Promise.all([domReady, backend.ready]).then(async function () {
    var page = document.body.dataset.backendPage;
    if (page === 'account') await accountPage();
    if (page === 'shop') await shopPage();
    if (page === 'cart') await cartPage();
    if (page === 'orders') await ordersPage();
    if (page === 'connection') await connectionPage();
    if (!page) await syncHomepageProducts();
  }).catch(function (error) { var node = document.querySelector('.backend-status'); if (node) { node.textContent = backend.errorMessage(error); node.classList.add('error'); } });
})();
