(function () {
  'use strict';

  const gamesLinks = document.querySelectorAll('nav details a[href="./shop.html?category=games"], #navOverlay a[href="./shop.html?category=games"]');
  if (!gamesLinks.length) return;

  const section = document.createElement('dialog');
  section.id = 'availabilityAlerts';
  section.setAttribute('aria-labelledby', 'account-alert-strip-title');
  section.innerHTML = `
  <div class="alert-section">
    <button type="button" data-close-alert aria-label="إغلاق نافذة التنبيه" data-alert-aria="close">
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
    <div class="alert-entry">
      <div class="alert-copy">
        <span class="alert-bell" aria-hidden="true"><i class="fa-solid fa-bell"></i></span>
        <div>
          <h2 id="account-alert-strip-title" data-alert-text="title">ما لقيت اللي تبيه؟</h2>
          <p data-alert-text="intro">يوصلك تنبيه بالبريد عند توفر اليوزر أو الخدمة.</p>
        </div>
      </div>
      <div class="alert-choices" role="group" aria-label="نوع التنبيه" data-alert-aria="modes">
        <button type="button" data-alert-kind="username" aria-controls="account-alert-strip-request" aria-expanded="false">
          <i class="fa-solid fa-at" aria-hidden="true"></i><span data-alert-text="usernameMode">تنبيه ليوزر</span>
        </button>
        <button type="button" data-alert-kind="service" aria-controls="account-alert-strip-request" aria-expanded="false">
          <i class="fa-solid fa-code" aria-hidden="true"></i><span data-alert-text="serviceMode">تنبيه لخدمة</span>
        </button>
      </div>
    </div>
    <section id="account-alert-strip-request" class="alert-request" aria-labelledby="account-alert-strip-form-title" hidden>
      <header class="alert-request-header">
        <h3 id="account-alert-strip-form-title"></h3>
      </header>
      <form autocomplete="off">
        <fieldset class="alert-fields" data-alert-fields="username" hidden disabled>
          <label>
            <span data-alert-text="platform">التطبيق</span>
            <select name="platform">
              <option value="instagram" data-alert-text="instagram">إنستغرام</option>
              <option value="tiktok" data-alert-text="tiktok">تيك توك</option>
              <option value="telegram" data-alert-text="telegram">تيليجرام</option>
              <option value="x" data-alert-text="x">إكس</option>
              <option value="discord" data-alert-text="discord">ديسكورد</option>
              <option value="tellonym" data-alert-text="tellonym">تيلونيم</option>
              <option value="playstation" data-alert-text="playstation">بلايستيشن</option>
              <option value="xbox" data-alert-text="xbox">إكس بوكس</option>
            </select>
          </label>
          <label>
            <span data-alert-text="username">اليوزر المطلوب</span>
            <input name="username" dir="ltr" placeholder="@username" autocapitalize="none" spellcheck="false" maxlength="65" required>
          </label>
        </fieldset>
        <fieldset class="alert-fields" data-alert-fields="service" hidden disabled>
          <label>
            <span data-alert-text="serviceType">نوع الخدمة</span>
            <select name="service-type">
              <option value="programming" data-alert-text="programming">برمجة</option>
              <option value="design" data-alert-text="design">تصميم</option>
              <option value="video" data-alert-text="video">مونتاج</option>
              <option value="other" data-alert-text="other">أخرى</option>
            </select>
          </label>
          <label>
            <span data-alert-service-label>نوع البرمجة</span>
            <input name="service-details" dir="auto" maxlength="100" required>
          </label>
        </fieldset>
        <div class="alert-form-actions">
          <span class="alert-destination"><i class="fa-regular fa-envelope" aria-hidden="true"></i><span data-alert-text="email">على بريد حسابك المسجّل</span></span>
          <button type="submit">نبّهني عند التوفر</button>
        </div>
        <div class="alert-feedback" aria-live="polite">
          <p data-alert-status></p>
          <a href="./account.html" data-alert-sign-in data-alert-text="signInLink" hidden>تسجيل الدخول</a>
        </div>
      </form>
    </section>
  </div>
  `;
  document.body.append(section);

  const labels = {
    ar: {
      menu: 'ما لقيت اللي تبيه',
      title: 'ما لقيت اللي تبيه؟',
      intro: 'يوصلك تنبيه بالبريد عند توفر اليوزر أو الخدمة.',
      modes: 'نوع التنبيه',
      usernameMode: 'تنبيه ليوزر',
      serviceMode: 'تنبيه لخدمة',
      close: 'إغلاق نافذة التنبيه',
      platform: 'التطبيق',
      username: 'اليوزر المطلوب',
      instagram: 'إنستغرام',
      tiktok: 'تيك توك',
      telegram: 'تيليجرام',
      x: 'إكس',
      discord: 'ديسكورد',
      tellonym: 'تيلونيم',
      playstation: 'بلايستيشن',
      xbox: 'إكس بوكس',
      serviceType: 'نوع الخدمة',
      programming: 'برمجة',
      design: 'تصميم',
      video: 'مونتاج',
      other: 'أخرى',
      programmingDetail: 'نوع البرمجة',
      serviceDetail: 'الخدمة المطلوبة',
      designExample: 'مثل تصميم شعار',
      videoExample: 'مثل مونتاج مقاطع قصيرة',
      otherExample: 'اكتب اسم الخدمة',
      email: 'على بريد حسابك المسجّل',
      submit: 'نبّهني عند التوفر',
      saving: 'جارٍ حفظ التنبيه…',
      saved: 'حفظنا طلبك. يوصلك تنبيه بالبريد عند توفر إعلان مطابق.',
      savedPending: 'حفظنا طلبك. إرسال التنبيهات بالبريد بانتظار تفعيل المرسل.',
      signIn: 'سجّل دخولك لحفظ التنبيه على بريد حسابك.',
      signInLink: 'تسجيل الدخول',
      unverified: 'أكد بريد حسابك عشان تستقبل التنبيه.',
      invalidUsername: 'اكتب اليوزر المطلوب بدون مسافات.',
      invalidService: 'اكتب اسم الخدمة المطلوبة.',
      failed: 'تعذّر حفظ التنبيه. حاول مرة ثانية.',
    },
    en: {
      menu: 'Can’t find what you need?',
      title: 'Can’t find what you need?',
      intro: 'Get an email when the username or service you want becomes available.',
      modes: 'Alert type',
      usernameMode: 'Username alert',
      serviceMode: 'Service alert',
      close: 'Close the alert dialog',
      platform: 'Platform',
      username: 'Requested username',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      telegram: 'Telegram',
      x: 'X',
      discord: 'Discord',
      tellonym: 'Tellonym',
      playstation: 'PlayStation',
      xbox: 'Xbox',
      serviceType: 'Service type',
      programming: 'Programming',
      design: 'Design',
      video: 'Video editing',
      other: 'Other',
      programmingDetail: 'Type of programming',
      serviceDetail: 'Requested service',
      designExample: 'For example, logo design',
      videoExample: 'For example, short video editing',
      otherExample: 'Enter the service name',
      email: 'Sent to your account email',
      submit: 'Notify me when available',
      saving: 'Saving your alert…',
      saved: 'Your alert is saved. We’ll email you when a matching listing is available.',
      savedPending: 'Your alert is saved. Email notifications are pending sender setup.',
      signIn: 'Sign in to save an alert for your account email.',
      signInLink: 'Sign in',
      unverified: 'Confirm your account email to receive alerts.',
      invalidUsername: 'Enter the username without spaces.',
      invalidService: 'Enter the name of the requested service.',
      failed: 'Could not save the alert. Please try again.',
    },
  };

  const backend = window.accountBackend;
  const request = section.querySelector('.alert-request');
  const heading = request.querySelector('h3');
  const buttons = Array.from(section.querySelectorAll('[data-alert-kind]'));
  const panels = Array.from(section.querySelectorAll('[data-alert-fields]'));
  const form = request.querySelector('form');
  const username = form.elements.namedItem('username');
  const platform = form.elements.namedItem('platform');
  const serviceType = form.elements.namedItem('service-type');
  const serviceDetails = form.elements.namedItem('service-details');
  const serviceLabel = form.querySelector('[data-alert-service-label]');
  const submit = form.querySelector('[type="submit"]');
  const status = form.querySelector('[data-alert-status]');
  const signIn = form.querySelector('[data-alert-sign-in]');
  let selected;
  let statusKey;
  let saving = false;
  let revision = 0;
  let returnFocus;

  function language() {
    return window.AppI18N?.getLang() === 'en' ? 'en' : 'ar';
  }

  function text(key) {
    return labels[language()][key];
  }

  function openDialog(button) {
    if (section.open) return;
    returnFocus = button;
    const categories = button?.closest('details');
    if (categories) {
      returnFocus = categories.querySelector('summary');
      categories.open = false;
    }
    if (button?.closest('#navOverlay')) {
      returnFocus = document.getElementById('navOpenButton');
      document.getElementById('navCloseButton')?.click();
    }
    section.showModal();
  }

  const menuLabels = Array.from(gamesLinks, gamesLink => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = gamesLink.className;
    button.classList.remove('nav-close-link');
    button.classList.add('availability-menu-choice');
    button.style.fontFamily = gamesLink.style.fontFamily;
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', section.id);
    button.append(...Array.from(gamesLink.children, node => node.cloneNode(true)));
    const icon = button.querySelector('i');
    icon.classList.replace('fa-gamepad', 'fa-bell');
    icon.setAttribute('aria-hidden', 'true');
    const label = button.querySelector('[data-i18n="cat_games_name"]');
    label.removeAttribute('data-i18n');
    button.addEventListener('click', () => openDialog(button));
    gamesLink.after(button);
    return label;
  });

  function updateServiceCopy() {
    serviceLabel.textContent = text(serviceType.value === 'programming' ? 'programmingDetail' : 'serviceDetail');
    serviceDetails.placeholder = text(serviceType.value + 'Example') || '';
  }

  function renderStatus() {
    status.textContent = statusKey ? text(statusKey) : '';
    signIn.hidden = statusKey !== 'signIn';
  }

  function translate() {
    menuLabels.forEach(label => { label.textContent = text('menu'); });
    section.querySelectorAll('[data-alert-text]').forEach(node => {
      node.textContent = text(node.dataset.alertText);
    });
    section.querySelectorAll('[data-alert-aria]').forEach(node => {
      node.setAttribute('aria-label', text(node.dataset.alertAria));
    });
    const kind = selected?.dataset.alertKind;
    if (kind) heading.textContent = text(kind + 'Mode');
    submit.disabled = saving;
    submit.textContent = text(saving ? 'saving' : 'submit');
    updateServiceCopy();
    renderStatus();
  }

  function clearStatus() {
    revision += 1;
    statusKey = '';
    renderStatus();
  }

  function showRequest(button) {
    selected = button;
    const kind = button?.dataset.alertKind;
    request.hidden = !button;
    buttons.forEach(item => item.setAttribute('aria-expanded', String(item === button)));
    panels.forEach(panel => {
      panel.hidden = panel.disabled = panel.dataset.alertFields !== kind;
    });
    clearStatus();
    translate();
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => showRequest(selected === button ? null : button));
  });
  section.querySelector('[data-close-alert]').addEventListener('click', () => section.close());
  section.addEventListener('click', event => {
    if (event.target === section) section.close();
  });
  section.addEventListener('close', () => {
    showRequest(null);
    if (window.location.hash === '#availabilityAlerts') {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    returnFocus?.focus();
    returnFocus = null;
  });
  form.addEventListener('input', event => {
    if (event.target === username || event.target === serviceDetails) event.target.setCustomValidity('');
    clearStatus();
  });
  form.addEventListener('change', () => {
    updateServiceCopy();
    clearStatus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!selected || saving) return;

    const kind = selected.dataset.alertKind;
    const isUsername = kind === 'username';
    const field = isUsername ? username : serviceDetails;
    const target = field.value.trim();
    const qualifier = isUsername ? platform.value : serviceType.value;
    if (!target || (isUsername && !/^@?[^@\s]+$/u.test(target))) {
      field.setCustomValidity(text(isUsername ? 'invalidUsername' : 'invalidService'));
      field.reportValidity();
      return;
    }

    const submittedRevision = revision;
    saving = true;
    statusKey = '';
    translate();
    let resultKey;
    try {
      if (!backend) throw new Error('BACKEND_UNAVAILABLE');
      await backend.ready;
      if (!backend.currentUser()) {
        resultKey = 'signIn';
      } else {
        const result = await backend.saveAvailabilityAlert(kind, qualifier, target, language());
        resultKey = result.mail_configured ? 'saved' : 'savedPending';
      }
    } catch (error) {
      const message = String(error?.message || '');
      if (message.includes('AUTH_REQUIRED')) resultKey = 'signIn';
      else if (message.includes('EMAIL_CONFIRMATION_REQUIRED')) resultKey = 'unverified';
      else resultKey = 'failed';
    } finally {
      saving = false;
      if (submittedRevision === revision) statusKey = resultKey;
      translate();
    }
  });

  window.addEventListener('account:languagechange', translate);
  window.addEventListener('account:signed-out', clearStatus);
  translate();
  if (window.location.hash === '#availabilityAlerts') openDialog();
})();
