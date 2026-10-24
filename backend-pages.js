(function () {
  'use strict';
  var backend = window.accountBackend;
  var CATALOG_SECTIONS = {
    social: {title:'حسابات التواصل الاجتماعي', types:['x','instagram','snapchat','tiktok','tellonym','discord','telegram']},
    services: {title:'الخدمات الرقمية', types:['service']},
    games: {title:'الألعاب والاشتراكات', types:['game','playstation','xbox']}
  };
  function el(tag, text, className) { var node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
  function t(text) { return window.AppI18N ? window.AppI18N.text(text) : text; }
  function ui(tag, text, className) { var node = el(tag, undefined, className); return window.AppI18N ? window.AppI18N.bindText(node, text) : (node.textContent = text, node); }
  function amount(value) { var node = el('p', money(value)); node.dataset.currencyAmount = value; return node; }
  function status(id, text, error) { var node = document.getElementById(id); if (node) { if (window.AppI18N) window.AppI18N.bindText(node, text); else node.textContent = text; node.className = 'backend-status ' + (error ? 'error' : 'success'); } }
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
      panel.append(ui('p', 'سجّل الدخول لعرض هذه الصفحة.'));
      var link = ui('a', 'تسجيل الدخول', 'backend-button'); link.href = 'account.html'; panel.append(link);
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
  function listingCard(row, headingTag) {
    var card = el('article', undefined, 'catalog-card');
    var header = el('div', undefined, 'catalog-header'), badge = window.ListingPlatforms.create(row.listing_type), identity = el('div', undefined, 'catalog-identity');
    var heading = el(headingTag || 'h2', undefined, 'catalog-title'); heading.append(el('bdi', row.title));
    identity.append(heading); header.append(badge, identity);
    var description = ['حسابات التواصل الاجتماعي', 'الخدمات الرقمية', 'الألعاب والاشتراكات'].includes(row.description) ? ui('p', row.description, 'catalog-description') : el('p', row.description || '', 'catalog-description');
    description.dir = 'auto';
    if (row.description) description.title = row.description;
    var footer = el('div', undefined, 'catalog-footer'), price = amount(row.price); price.className = 'catalog-price';
    var button = el('button', undefined, 'backend-button js-add-to-cart catalog-buy'), mark = el('i', undefined, 'fa-solid fa-cart-shopping');
    mark.setAttribute('aria-hidden', 'true'); button.type = 'button'; button.dataset.uid = row.id; button.append(mark, ui('span', 'أضف إلى السلة'));
    footer.append(price, button); card.append(header, description, footer); return card;
  }
  function filterListings(rows, filters) {
    var query = String(filters.search || '').trim().toLocaleLowerCase();
    return rows.filter(function (row) {
      if (query && ![row.title, row.description].join(' ').toLocaleLowerCase().includes(query)) return false;
      if (filters.type && row.listing_type !== filters.type) return false;
      if (filters.category) {
        if (['service', 'game'].includes(row.listing_type)) return false;
        var length = Array.from(String(row.title || '').trim().replace(/^@/, '')).length;
        if (filters.category === 'other' ? length >= 2 && length <= 6 : length !== Number(filters.category)) return false;
      }
      if (filters.price === 'above' && !(Number(row.price) > 500)) return false;
      if (filters.price === 'below' && !(Number(row.price) < 500)) return false;
      return true;
    });
  }
  function mountCatalog(rows, host, headingTag, emptyText, section) {
    var layout = el('div', undefined, 'catalog-layout');
    var toggle = ui('button', 'الفلاتر', 'catalog-filter-toggle backend-button secondary');
    var sidebar = el('aside', undefined, 'catalog-filters'), form = el('form');
    var results = el('div', undefined, 'catalog-results');
    var fields = {}, prefix = host.id + '-filter-';
    sidebar.id = prefix + 'panel';
    sidebar.setAttribute('aria-label', t('خيارات التصفية'));
    sidebar.setAttribute('data-i18n-aria', 'خيارات التصفية');
    toggle.type = 'button'; toggle.setAttribute('aria-controls', sidebar.id); toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      toggle.setAttribute('aria-expanded', String(sidebar.classList.toggle('is-open')));
    });
    function field(name, label, control) {
      var group = el('div', undefined, 'catalog-filter-field'), caption = ui('label', label);
      control.id = prefix + name; control.name = name; caption.htmlFor = control.id;
      fields[name] = control; group.append(caption, control); form.append(group); return control;
    }
    function select(name, label, options) {
      var control = field(name, label, el('select'));
      options.forEach(function (option) { var node = ui('option', option[1]); node.value = option[0]; control.append(node); });
    }
    var search = field('search', 'كلمة البحث', el('input'));
    search.type = 'search'; search.placeholder = t('أدخل كلمة البحث'); search.setAttribute('data-i18n-placeholder', 'أدخل كلمة البحث');
    var typeOptions = [['', 'الكل'], ['x', 'X'], ['instagram', 'Instagram'], ['snapchat', 'Snapchat'], ['tiktok', 'TikTok'], ['tellonym', 'Tellonym'], ['discord', 'Discord'], ['playstation', 'PlayStation'], ['xbox', 'Xbox'], ['telegram', 'Telegram'], ['service', 'الخدمات الرقمية'], ['game', 'الألعاب والاشتراكات']];
    select('type', 'نوع الحساب', typeOptions.filter(function(option){return !section || !option[0] || section.types.includes(option[0]);}));
    if (!section || section === CATALOG_SECTIONS.social) select('category', 'فئة الحساب', [['', 'الكل'], ['2', 'ثنائي'], ['3', 'ثلاثي'], ['4', 'رباعي'], ['5', 'خماسي'], ['6', 'سداسي'], ['other', 'أخرى']]);
    var priceGroup = el('fieldset', undefined, 'catalog-filter-field catalog-price-filter');
    priceGroup.append(ui('legend', 'الفئة السعرية'));
    [['above', 'أكثر من'], ['below', 'أقل من']].forEach(function (option) {
      var label = el('label'), radio = el('input'); radio.type = 'radio'; radio.name = 'price'; radio.value = option[0];
      var caption = el('span'), threshold = el('bdi', money(500));
      threshold.dataset.currencyAmount = '500';
      caption.append(ui('span', option[1]), document.createTextNode(' '), threshold);
      label.append(radio, caption); priceGroup.append(label);
    });
    var reset = ui('button', 'إعادة تعيين', 'catalog-filter-reset'); reset.type = 'reset';
    form.append(priceGroup, reset); sidebar.append(form);
    host.parentNode.insertBefore(layout, host);
    host.classList.remove('backend-grid', 'mt-12'); host.classList.add('catalog-grid');
    host.setAttribute('aria-live', 'polite');
    results.append(host); layout.append(toggle, sidebar, results);
    function render() {
      var selected = form.querySelector('input[name="price"]:checked');
      var visible = filterListings(rows, {search: fields.search.value, type: fields.type.value, category: fields.category ? fields.category.value : '', price: selected ? selected.value : ''});
      host.replaceChildren();
      visible.forEach(function (row) { host.append(listingCard(row, headingTag)); });
      if (!visible.length) host.append(ui('p', rows.length ? 'لا توجد منتجات تطابق خيارات البحث.' : emptyText || 'لا توجد منتجات متاحة حاليًا.', 'backend-muted catalog-empty'));
    }
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    form.addEventListener('input', render); form.addEventListener('change', render);
    form.addEventListener('reset', function () { window.setTimeout(render, 0); });
    render();
  }
  async function shopPage(verifiedOnly) {
    try {
      var rows = await (verifiedOnly ? backend.verifiedSellerProducts() : backend.products()), container = document.getElementById('productList');
      var sectionName = new URLSearchParams(location.search).get('category');
      var section = !verifiedOnly && Object.prototype.hasOwnProperty.call(CATALOG_SECTIONS,sectionName) ? CATALOG_SECTIONS[sectionName] : null;
      if (section) {
        rows = rows.filter(function(row){return section.types.includes(row.listing_type);});
        var heading = document.querySelector('main h1');
        if (heading) {if(window.AppI18N)window.AppI18N.bindText(heading,section.title);else heading.textContent=section.title;}
      }
      if (verifiedOnly) {
        container.classList.add('catalog-grid'); container.replaceChildren();
        if (!rows.length) container.append(ui('p', 'لا توجد سلع متاحة من بائعين موثّقين حاليًا.'));
        rows.forEach(function (row) { container.append(listingCard(row)); });
      } else mountCatalog(rows, container, undefined, undefined, section);
      status('shopStatus', '', false);
    } catch (error) { status('shopStatus', backend.errorMessage(error), true); }
  }
  async function cartPage() {
    if (!requireUser()) return;
    var container = document.getElementById('cartList'), checkout = document.getElementById('checkoutUnavailable');

    async function render() {
      var rows = await backend.cart(), total = 0;
      container.replaceChildren();
      rows.forEach(function (row) {
        total += row.price * row.count;
        var item = el('div', undefined, 'backend-item'), info = el('div');
        var heading = el('h3', undefined, 'cart-account-heading');
        heading.append(window.ListingPlatforms.create(row.listing_type));
        heading.append(el('bdi', row.title));
        info.append(heading, row.available ? amount(row.price) : ui('p', 'هذا المنتج غير متاح حاليًا.', 'backend-muted'));
        var controls = el('div', undefined, 'backend-actions'), quantity = el('input');
        quantity.type = 'number'; quantity.min = '1'; quantity.max = '99'; quantity.value = row.count; quantity.dataset.productTitle = row.title; quantity.setAttribute('aria-label', t('كمية') + ' ' + row.title);
        quantity.addEventListener('change', function () {
          action(quantity, 'cartStatus', async function () {
            var value = Number(quantity.value); if (!Number.isInteger(value) || value < 1 || value > 99) throw new Error('INVALID_QUANTITY');
            await backend.setCart(row.id, value, false); await render(); status('cartStatus', 'حُدّثت السلة.', false);
          });
        });
        var remove = ui('button', 'حذف', 'backend-button secondary'); remove.type = 'button';
        remove.addEventListener('click', function () { action(remove, 'cartStatus', async function () {
          await backend.setCart(row.id, 0, false); await render(); status('cartStatus', 'حُذف المنتج من السلة.', false);
        }); });
        controls.append(quantity, remove); item.append(info, controls); container.append(item);
      });
      if (!rows.length) container.append(ui('p', 'السلة فارغة.'));
      var totalNode = document.getElementById('cartTotal'); totalNode.dataset.currencyAmount = total; totalNode.textContent = money(total);
      checkout.disabled = true;
      if (window.updateCartBadge) window.updateCartBadge();
    }
    try { await render(); } catch (error) { checkout.disabled = true; status('cartStatus', backend.errorMessage(error), true); }
  }

  async function connectionPage() {
    document.getElementById('backendProjectUrl').textContent = window.ACCOUNT_CONFIG.url;
    document.getElementById('checkConnection').addEventListener('click', function (event) {
      action(event.currentTarget, 'connectionStatus', async function () {
        var result = await backend.health();
        if (!result || result.ready !== true) throw new Error('لم ينجح اختبار إعداد قاعدة البيانات.');
        status('connectionStatus', 'نجح الاتصال بقاعدة البيانات. الحسابات والسلع والسلة مرتبطة بالخادم.', false);
      });
    });
  }
  async function syncHomepageProducts() {
    var host = document.getElementById('featuredProducts');
    if (!host) return;
    try {
      var rows = (await backend.products()).filter(function (row) { return !row.deleted_at && !row.sold_at; });
      mountCatalog(rows, host, 'h3');
    } catch (error) { host.replaceChildren(ui('p', backend.errorMessage(error), 'backend-status error')); }
  }
  window.addEventListener('account:languagechange', function () {
    document.querySelectorAll('[data-product-title]').forEach(function (node) { node.setAttribute('aria-label', t('كمية') + ' ' + node.dataset.productTitle); });
  });
  var domReady = document.readyState === 'loading' ? new Promise(function (resolve) { document.addEventListener('DOMContentLoaded', resolve, { once: true }); }) : Promise.resolve();
  Promise.all([domReady, backend.ready]).then(async function () {
    var page = document.body.dataset.backendPage;
    if (page === 'account') await accountPage();
    if (page === 'shop') await shopPage();
    if (page === 'sellers') await shopPage(true);
    if (page === 'cart') await cartPage();
    if (page === 'connection') await connectionPage();
    if (!page) await syncHomepageProducts();
  }).catch(function (error) { var node = document.querySelector('.backend-status'); if (node) { if (window.AppI18N) window.AppI18N.bindText(node, backend.errorMessage(error)); else node.textContent = backend.errorMessage(error); node.classList.add('error'); } });
})();

