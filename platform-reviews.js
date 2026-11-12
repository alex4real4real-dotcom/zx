(function () {
  'use strict';

  const backend = window.accountBackend;
  const section = document.getElementById('platformReviews');
  const orderPage = document.querySelector('[data-platform-review-required]');
  if (!backend || (!section && !orderPage)) return;

  const labels = {
    ar: {
      title: 'آراء العملاء',
      loading: 'جارٍ تحميل آراء العملاء…',
      empty: 'تظهر آراء العملاء بعد أول تقييم.',
      samples: 'تقييمات تجريبية',
      loadError: 'تعذّر تحميل آراء العملاء.',
      buyer: 'مشتري موثّق',
      previous: 'السابق',
      next: 'التالي',
      pause: 'إيقاف التبديل',
      play: 'تشغيل التبديل',
      more: 'عرض المزيد',
      retry: 'إعادة المحاولة',
      paid: 'تم الشراء بنجاح',
      prompt: 'كيف كانت تجربتك مع المنصة؟',
      hint: 'اختر تقييمك واكتب تعليقك للمتابعة إلى طلبك. سيظهر رأيك باسم مشتري موثّق.',
      score: 'تقييمك من ٥ نجوم',
      comment: 'تعليقك',
      placeholder: 'اكتب رأيك في تجربة الشراء',
      send: 'إرسال التقييم',
      sending: 'جارٍ إرسال التقييم…',
      thanks: 'شكرًا على تقييمك.',
      checkError: 'تعذّر التحقق من التقييم المطلوب. أعد المحاولة.',
      sendError: 'تعذّر حفظ التقييم. أعد المحاولة.',
    },
    en: {
      title: 'Customer Reviews',
      loading: 'Loading customer reviews…',
      empty: 'Customer reviews will appear after the first rating.',
      samples: 'Sample reviews',
      loadError: 'Could not load customer reviews.',
      buyer: 'Verified buyer',
      previous: 'Previous',
      next: 'Next',
      pause: 'Pause rotation',
      play: 'Resume rotation',
      more: 'Show more',
      retry: 'Try again',
      paid: 'Purchase confirmed',
      prompt: 'How was your experience with the platform?',
      hint: 'Choose a rating and leave a comment to continue to your order. Your review will appear as Verified buyer.',
      score: 'Your rating out of 5 stars',
      comment: 'Your comment',
      placeholder: 'Tell us about your purchase experience',
      send: 'Submit review',
      sending: 'Submitting review…',
      thanks: 'Thank you for your review.',
      checkError: 'Could not check for a required review. Try again.',
      sendError: 'Could not save your review. Try again.',
    },
  };

  const sampleReviews = [
    {
      rating: 5,
      copy: {
        ar: { author: 'سعد م.', comment: 'خطوات الشراء كانت واضحة، ووصلتني تفاصيل الطلب بعد الدفع مباشرة.' },
        en: { author: 'Saad M.', comment: 'The checkout steps were clear, and I received my order details right after paying.' },
      },
    },
    {
      rating: 4,
      copy: {
        ar: { author: 'نورة ع.', comment: 'الشراء سهل، بس تمنّيت تفاصيل المنتج تكون أوضح قبل الدفع.' },
        en: { author: 'Noura A.', comment: 'Buying was easy, but I wish the product details had been clearer before checkout.' },
      },
    },
    {
      rating: 5,
      copy: {
        ar: { author: 'عبدالرحمن س.', comment: 'لقيت الحساب اللي أبحث عنه بسرعة، وقدرت أتابع الطلب من حسابي.' },
        en: { author: 'Abdulrahman S.', comment: 'I found the account I was looking for quickly and could track the order from my account.' },
      },
    },
    {
      rating: 3,
      copy: {
        ar: { author: 'ريم خ.', comment: 'الطلب تم، لكن تحديث حالته تأخر شوي وخلاني أراجع الصفحة أكثر من مرة.' },
        en: { author: 'Reem K.', comment: 'My order went through, but the status took a while to update, so I checked the page a few times.' },
      },
    },
    {
      rating: 4,
      copy: {
        ar: { author: 'خالد أ.', comment: 'التصفح بالجوال مريح، وكنت أتمنى خيارات أكثر في الفئة اللي أبحث عنها.' },
        en: { author: 'Khalid A.', comment: 'Browsing on my phone was easy. I would have liked more options in the category I was looking at.' },
      },
    },
    {
      rating: 5,
      copy: {
        ar: { author: 'هيا ف.', comment: 'كان عندي سؤال عن الطلب، ورد الدعم وضّح لي الخطوة اللي بعدها.' },
        en: { author: 'Haya F.', comment: 'I had a question about my order, and support explained what to do next.' },
      },
    },
  ];

  function language() {
    return window.AppI18N?.getLang() === 'en' ? 'en' : 'ar';
  }

  function text(key) {
    return labels[language()][key];
  }

  function translate(container) {
    container.querySelectorAll('[data-review-label]').forEach(node => {
      node.textContent = text(node.dataset.reviewLabel);
    });
  }

  function ratingLabel(rating) {
    if (language() === 'en') return rating + ' out of 5 stars';
    return new Intl.NumberFormat('ar-SA', { numberingSystem: 'arab' }).format(rating) + ' من ٥ نجوم';
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function setupReviews() {
    const grid = section.querySelector('.platform-review-grid');
    const status = section.querySelector('.platform-review-status');
    const controls = section.querySelector('.platform-review-mobile');
    const more = section.querySelector('[data-review-more]');
    const previous = section.querySelector('[data-review-previous]');
    const next = section.querySelector('[data-review-next]');
    const toggle = section.querySelector('[data-review-toggle]');
    const mobile = window.matchMedia('(max-width: 767px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pageSize = 12;
    const cards = [];
    let offset = 0;
    let active = 0;
    let timer;
    let loading = false;
    let hasMore = true;
    let paused = reducedMotion.matches;
    let statusKey = 'loading';

    function show(index, announce) {
      if (!cards.length) return;
      active = (index + cards.length) % cards.length;
      grid.setAttribute('aria-live', announce && mobile.matches ? 'polite' : 'off');
      cards.forEach((card, cardIndex) => {
        card.node.classList.toggle('is-current', cardIndex === active);
      });
    }

    function updateRotation() {
      window.clearInterval(timer);
      controls.hidden = cards.length < 2;
      toggle.textContent = text(paused ? 'play' : 'pause');
      if (mobile.matches && cards.length > 1 && !paused && !document.hidden) {
        timer = window.setInterval(() => show(active + 1, false), 2000);
      }
    }

    function updateLabels() {
      translate(section);
      status.textContent = statusKey ? text(statusKey) : '';
      status.hidden = !statusKey;
      more.textContent = text(statusKey === 'loadError' ? 'retry' : 'more');
      more.hidden = !hasMore || (loading && !cards.length);
      more.disabled = loading;
      const locale = language();
      cards.forEach(({ stars, rating, sampleCopy, quote, buyer }) => {
        stars.setAttribute('aria-label', ratingLabel(rating));
        if (sampleCopy) {
          quote.textContent = '«' + sampleCopy[locale].comment + '»';
          buyer.textContent = sampleCopy[locale].author;
        }
      });
      updateRotation();
    }

    function appendReview(review, sampleCopy) {
      const rating = Number(review.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
      if (!sampleCopy && typeof review.comment !== 'string') return;
      const card = element('article', 'platform-review-card glass-panel');
      const stars = element('span', 'platform-review-stars', '★'.repeat(rating) + '☆'.repeat(5 - rating));
      stars.dir = 'ltr';
      stars.setAttribute('role', 'img');
      const quote = element('blockquote', 'platform-review-quote', sampleCopy ? '' : '«' + review.comment + '»');
      quote.dir = 'auto';
      const author = element('div', 'platform-review-author');
      const icon = element('i', 'fa-solid fa-user');
      icon.setAttribute('aria-hidden', 'true');
      const buyer = element('span', '');
      if (!sampleCopy) buyer.dataset.reviewLabel = 'buyer';
      author.append(icon, buyer);
      card.append(stars, quote, author);
      grid.append(card);
      cards.push({ node: card, stars, rating, sampleCopy, quote, buyer });
    }

    async function loadReviews() {
      if (loading || !hasMore) return;
      loading = true;
      statusKey = cards.length ? '' : 'loading';
      updateLabels();
      try {
        const page = await backend.platformReviews(offset, pageSize + 1);
        const rows = page.slice(0, pageSize);
        if (offset === 0 && rows.length === 0) {
          sampleReviews.forEach(review => appendReview(review, review.copy));
          statusKey = 'samples';
        } else {
          rows.forEach(review => appendReview(review));
          statusKey = cards.length ? '' : 'empty';
        }
        offset += rows.length;
        hasMore = page.length > pageSize;
        show(active, false);
      } catch {
        statusKey = 'loadError';
      } finally {
        loading = false;
        updateLabels();
      }
    }

    more.addEventListener('click', loadReviews);
    previous.addEventListener('click', () => { show(active - 1, true); updateRotation(); });
    next.addEventListener('click', () => { show(active + 1, true); updateRotation(); });
    toggle.addEventListener('click', () => { paused = !paused; updateRotation(); });
    mobile.addEventListener('change', updateRotation);
    reducedMotion.addEventListener('change', event => { paused = event.matches; updateRotation(); });
    document.addEventListener('visibilitychange', updateRotation);
    window.addEventListener('account:languagechange', updateLabels);
    loadReviews();
  }

  function setupRequiredRating() {
    const dialog = element('dialog', 'platform-rating-dialog');
    dialog.setAttribute('aria-labelledby', 'platformRatingHeading');
    dialog.setAttribute('aria-describedby', 'platformRatingHint');
    dialog.innerHTML = `
      <p class="platform-rating-paid"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> <span data-review-label="paid"></span></p>
      <h2 id="platformRatingHeading" data-review-label="prompt"></h2>
      <p id="platformRatingHint" data-review-label="hint"></p>
      <form>
        <fieldset>
          <legend data-review-label="score"></legend>
          <div class="platform-rating-options"></div>
          <output class="platform-rating-caption" aria-live="polite"></output>
        </fieldset>
        <label for="platformRatingComment" data-review-label="comment"></label>
        <textarea id="platformRatingComment" rows="3" maxlength="1000" required></textarea>
        <button class="backend-button platform-rating-submit" type="submit" disabled></button>
        <p class="platform-rating-error" role="alert" hidden></p>
      </form>`;
    const form = dialog.querySelector('form');
    const options = dialog.querySelector('.platform-rating-options');
    const comment = dialog.querySelector('textarea');
    const button = dialog.querySelector('button');
    const caption = dialog.querySelector('output');
    const error = dialog.querySelector('.platform-rating-error');
    const notice = element('p', 'platform-rating-notice');
    notice.setAttribute('role', 'status');
    notice.hidden = true;
    orderPage.prepend(notice);
    document.body.append(dialog);
    let pendingOrder;
    let checking = false;
    let sending = false;
    let noticeKey;
    let errorKey;
    const stars = [];

    for (let rating = 1; rating <= 5; rating += 1) {
      const label = element('label', 'platform-rating-star');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'platform-rating';
      input.value = String(rating);
      input.required = true;
      const mark = element('span', '', '☆');
      mark.setAttribute('aria-hidden', 'true');
      label.append(input, mark);
      options.append(label);
      stars.push({ rating, label, input, mark });
    }

    function score() {
      return stars.find(star => star.input.checked)?.rating || 0;
    }

    function updateForm() {
      const value = score();
      stars.forEach(({ rating, label, input, mark }) => {
        label.classList.toggle('is-filled', rating <= value);
        input.setAttribute('aria-label', ratingLabel(rating));
        mark.textContent = rating <= value ? '★' : '☆';
      });
      caption.textContent = value ? ratingLabel(value) : '';
      button.disabled = sending || !value || !comment.value.trim();
      button.textContent = text(sending ? 'sending' : 'send');
    }

    function updateLabels() {
      translate(dialog);
      comment.placeholder = text('placeholder');
      error.textContent = errorKey ? text(errorKey) : '';
      error.hidden = !errorKey;
      notice.textContent = noticeKey ? text(noticeKey) : '';
      notice.hidden = !noticeKey;
      updateForm();
    }

    async function checkPending() {
      if (checking || dialog.open) return;
      checking = true;
      try {
        await backend.ready;
        if (!backend.currentUser()) return;
        pendingOrder = await backend.pendingPlatformReview();
        if (pendingOrder) {
          noticeKey = undefined;
          errorKey = undefined;
          form.reset();
          updateLabels();
          dialog.showModal();
        } else if (noticeKey === 'checkError') {
          noticeKey = undefined;
        }
      } catch {
        noticeKey = 'checkError';
      } finally {
        checking = false;
        updateLabels();
      }
    }

    dialog.addEventListener('cancel', event => event.preventDefault());
    form.addEventListener('input', updateForm);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const rating = score();
      const body = comment.value.trim();
      if (sending || !pendingOrder || !rating || !body) return;
      sending = true;
      errorKey = undefined;
      updateLabels();
      try {
        await backend.submitPlatformReview(pendingOrder, rating, body);
        dialog.close();
        pendingOrder = undefined;
        noticeKey = 'thanks';
      } catch {
        errorKey = 'sendError';
      } finally {
        sending = false;
        updateLabels();
      }
      if (!dialog.open) checkPending();
    });
    window.addEventListener('account:languagechange', updateLabels);
    window.addEventListener('pageshow', event => { if (event.persisted) checkPending(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkPending(); });
    document.getElementById('ordersRefresh')?.addEventListener('click', checkPending);
    updateLabels();
    checkPending();
  }

  if (section) setupReviews();
  if (orderPage) setupRequiredRating();
})();
