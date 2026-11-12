(function () {
  'use strict';

  const section = document.getElementById('availabilityAlerts');
  if (!section) return;

  const labels = {
    ar: {
      title: 'ما لقيت اللي تبيه؟',
      intro: 'يوصلك تنبيه بالبريد عند توفر اليوزر أو الخدمة.',
      modes: 'نوع التنبيه',
      usernameMode: 'تنبيه ليوزر',
      serviceMode: 'تنبيه لخدمة',
      close: 'إغلاق نموذج التنبيه',
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
      title: 'Can’t find what you need?',
      intro: 'Get an email when the username or service you want becomes available.',
      modes: 'Alert type',
      usernameMode: 'Username alert',
      serviceMode: 'Service alert',
      close: 'Close the alert form',
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

  function language() {
    return window.AppI18N?.getLang() === 'en' ? 'en' : 'ar';
  }

  function text(key) {
    return labels[language()][key];
  }

  function updateServiceCopy() {
    serviceLabel.textContent = text(serviceType.value === 'programming' ? 'programmingDetail' : 'serviceDetail');
    serviceDetails.placeholder = text(serviceType.value + 'Example') || '';
  }

  function renderStatus() {
    status.textContent = statusKey ? text(statusKey) : '';
    signIn.hidden = statusKey !== 'signIn';
  }

  function translate() {
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
  request.querySelector('[data-close-alert]').addEventListener('click', () => {
    const opener = selected;
    showRequest(null);
    opener?.focus();
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
})();
