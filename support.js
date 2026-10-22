(function () {
  "use strict";
  var TEXT = {
  "page_help": [
    "مركز المساعدة",
    "Help Center"
  ],
  "page_tickets": [
    "تذاكري ومحادثاتي مع الدعم",
    "My support tickets"
  ],
  "page_ticket": [
    "محادثة الدعم",
    "Support conversation"
  ],
  "page_admin": [
    "إدارة تذاكر الدعم",
    "Support inbox"
  ],
  "help_heading": [
    "كيف نقدر نساعدك اليوم؟",
    "How can we help you today?"
  ],
  "help_intro": [
    "افتح تذكرة دعم وتواصل مباشرة مع فريق Account ضمن محادثة واحدة لكل تذكرة، وتابع الردود أولًا بأول.",
    "Open a support ticket and talk to the Account team in one private conversation. Follow every reply in the same thread."
  ],
  "open_new": [
    "فتح تذكرة جديدة",
    "Open a new ticket"
  ],
  "follow_tickets": [
    "متابعة تذاكري",
    "Track my tickets"
  ],
  "guest_prefix": [
    "تذاكر الدعم متاحة للمستخدمين المسجّلين فقط.",
    "Support tickets are available to signed-in members."
  ],
  "sign_in": [
    "سجّل الدخول",
    "Sign in"
  ],
  "guest_suffix": [
    "أو أنشئ حسابًا لفتح تذكرة.",
    "or create an account to open a ticket."
  ],
  "help_feature_chat": [
    "محادثة مباشرة مع فريق الدعم",
    "A direct conversation with support"
  ],
  "help_feature_history": [
    "ردود سريعة ومتابعة كاملة للتذكرة",
    "Replies and the full ticket history in one place"
  ],
  "help_feature_private": [
    "تذاكر خاصة تظهر لك ولإدارة المنصة فقط",
    "Private tickets visible only to you and the support team"
  ],
  "support_image": [
    "فريق دعم Account",
    "Account support team"
  ],
  "my_tickets": [
    "تذاكري",
    "My tickets"
  ],
  "my_tickets_desc": [
    "تابع تذاكرك ومحادثاتك مع فريق الدعم.",
    "Track your tickets and conversations with support."
  ],
  "open_new_desc": [
    "تواصل مع فريق الدعم وابدأ محادثة جديدة.",
    "Contact the support team and start a new conversation."
  ],
  "faq": [
    "الأسئلة الشائعة",
    "Frequently asked questions"
  ],
  "faq_desc": [
    "إجابات سريعة عن أكثر الأسئلة تكرارًا.",
    "Quick answers to common questions."
  ],
  "back_home": [
    "العودة للمنصة",
    "Back to the marketplace"
  ],
  "back_home_desc": [
    "في حال رغبتك بالعودة، اضغط على الرئيسية.",
    "Return to the marketplace homepage."
  ],
  "faq_heading": [
    "إجابات سريعة قبل التواصل",
    "Quick answers before you contact us"
  ],
  "faq_open_q": [
    "كيف أفتح تذكرة دعم؟",
    "How do I open a support ticket?"
  ],
  "faq_open_a": [
    "سجّل الدخول إلى حسابك، ثم انتقل إلى صفحة «تذاكري» واضغط «فتح تذكرة جديدة»، واختر التصنيف والأولوية واكتب تفاصيل المشكلة.",
    "Sign in, go to My tickets and choose Open a new ticket. Select a category and priority, then describe the problem."
  ],
  "faq_who_q": [
    "من يمكنه رفع تذكرة؟",
    "Who can open a ticket?"
  ],
  "faq_who_a": [
    "تذاكر الدعم متاحة فقط للمستخدمين المسجّلين في المنصة، لضمان متابعة كل تذكرة مع صاحبها.",
    "Tickets are available to signed-in members so each conversation stays with its owner."
  ],
  "faq_reply_q": [
    "كيف أتابع رد الدعم؟",
    "How do I follow support replies?"
  ],
  "faq_reply_a": [
    "افتح التذكرة من صفحة «تذاكري» وستجد كل الرسائل ضمن محادثة واحدة، ويمكنك إضافة ردك في أي وقت.",
    "Open a ticket from My tickets to see its conversation. New replies appear automatically. You can reply while the ticket is open."
  ],
  "faq_close_q": [
    "متى تُغلق التذكرة؟",
    "When is a ticket closed?"
  ],
  "faq_close_a": [
    "يمكنك إغلاق التذكرة بعد حل المشكلة، ويمكنك إعادة فتحها في أي وقت إن عادت المشكلة.",
    "Close a ticket when the problem is solved. Reopen it if the problem comes back."
  ],
  "tickets_kicker": [
    "تذاكر الدعم",
    "Support tickets"
  ],
  "tickets_intro": [
    "افتح تذكرة جديدة أو تابع التذاكر الحالية. كل تذكرة عبارة عن محادثة مباشرة بينك وبين فريق الدعم.",
    "Open a new ticket or follow an existing one. Each ticket is a private conversation between you and the support team."
  ],
  "new_ticket_heading": [
    "فتح تذكرة دعم جديدة",
    "Open a new support ticket"
  ],
  "new_ticket_copy": [
    "وضّح مشكلتك باختصار وسنبدأ محادثة مع فريق الدعم.",
    "Describe your problem to start a conversation with the support team."
  ],
  "subject": [
    "موضوع التذكرة *",
    "Subject *"
  ],
  "subject_placeholder": [
    "مثال: لم تصلني بيانات الحساب بعد الشراء",
    "Example: I have not received my account details after purchase"
  ],
  "category": [
    "التصنيف",
    "Category"
  ],
  "priority": [
    "الأولوية",
    "Priority"
  ],
  "details": [
    "تفاصيل المشكلة *",
    "Problem details *"
  ],
  "details_placeholder": [
    "اشرح المشكلة بالتفصيل…",
    "Describe the problem in detail…"
  ],
  "submit_ticket": [
    "فتح التذكرة",
    "Open ticket"
  ],
  "your_tickets": [
    "تذاكرك",
    "Your tickets"
  ],
  "empty_tickets": [
    "لا توجد تذاكر حتى الآن. يمكنك فتح تذكرة جديدة من النموذج أعلاه.",
    "You do not have any tickets yet. Open one using the form above."
  ],
  "empty_inbox": [
    "لا توجد تذاكر تطابق هذا الاختيار.",
    "There are no tickets matching this filter."
  ],
  "load_more": [
    "عرض المزيد",
    "Load more"
  ],
  "category_order": [
    "مشكلة في الطلب",
    "Order problem"
  ],
  "category_account": [
    "مشكلة في الحساب",
    "Account problem"
  ],
  "category_payment": [
    "الدفع",
    "Payment"
  ],
  "category_technical": [
    "مشكلة تقنية",
    "Technical problem"
  ],
  "category_other": [
    "أخرى",
    "Other"
  ],
  "priority_low": [
    "منخفضة",
    "Low"
  ],
  "priority_normal": [
    "عادية",
    "Normal"
  ],
  "priority_high": [
    "مرتفعة",
    "High"
  ],
  "priority_urgent": [
    "عاجلة",
    "Urgent"
  ],
  "status_open": [
    "مفتوح",
    "Open"
  ],
  "status_in_progress": [
    "قيد المتابعة",
    "In progress"
  ],
  "status_closed": [
    "مغلق",
    "Closed"
  ],
  "open_conversation": [
    "فتح المحادثة",
    "Open conversation"
  ],
  "unread": [
    "رسالة جديدة",
    "New message"
  ],
  "guest_heading": [
    "سجّل الدخول لمتابعة الدعم",
    "Sign in to contact support"
  ],
  "guest_copy": [
    "تذاكرك ومحادثاتك خاصة بحسابك. سجّل الدخول أو أنشئ حسابًا للمتابعة.",
    "Your support conversations are private. Sign in or create an account to continue."
  ],
  "inbox_intro": [
    "تابع تذاكر العملاء وردّ عليها من المحادثة الخاصة بكل تذكرة.",
    "Review customer tickets and reply in each ticket’s private conversation."
  ],
  "inbox_heading": [
    "تذاكر العملاء",
    "Customer tickets"
  ],
  "filter_status": [
    "حالة التذكرة",
    "Ticket status"
  ],
  "filter_all": [
    "كل الحالات",
    "All statuses"
  ],
  "staff_only": [
    "هذه الصفحة مخصّصة لفريق الدعم.",
    "This page is for the support team."
  ],
  "staff_only_copy": [
    "لا يملك حسابك صلاحية عرض تذاكر المستخدمين أو الرد باسم الإدارة.",
    "Your account does not have permission to access the support inbox or reply as staff."
  ],
  "loading": [
    "جارٍ تحميل المحادثة…",
    "Loading conversation…"
  ],
  "not_found": [
    "التذكرة غير موجودة أو لا تملك صلاحية عرضها.",
    "This ticket does not exist or you do not have permission to view it."
  ],
  "back_tickets": [
    "العودة إلى تذاكري",
    "Back to my tickets"
  ],
  "back_inbox": [
    "العودة إلى تذاكر العملاء",
    "Back to the support inbox"
  ],
  "conversation": [
    "محادثة التذكرة",
    "Ticket conversation"
  ],
  "conversation_copy": [
    "الرسائل خاصة بين صاحب التذكرة وفريق الدعم، وتُحدّث تلقائيًا.",
    "Messages are private to the ticket owner and support team, and update automatically."
  ],
  "close_ticket": [
    "إغلاق التذكرة",
    "Close ticket"
  ],
  "reopen_ticket": [
    "إعادة فتح التذكرة",
    "Reopen ticket"
  ],
  "reply_label": [
    "رسالتك",
    "Your message"
  ],
  "reply_placeholder": [
    "اكتب ردك هنا…",
    "Write your reply…"
  ],
  "send_reply": [
    "إرسال الرد",
    "Send reply"
  ],
  "closed_notice": [
    "هذه التذكرة مغلقة. أعد فتحها لإضافة رسالة جديدة.",
    "This ticket is closed. Reopen it to send another message."
  ],
  "support_team": [
    "فريق الدعم",
    "Support team"
  ],
  "you": [
    "أنت",
    "You"
  ],
  "no_messages": [
    "لا توجد رسائل بعد.",
    "No messages yet."
  ],
  "created": [
    "تم إنشاء تذكرتك وحفظ رسالتك.",
    "Your ticket and message have been saved."
  ],
  "reply_sent": [
    "تم إرسال رسالتك.",
    "Your message has been sent."
  ],
  "ticket_closed": [
    "تم إغلاق التذكرة.",
    "The ticket has been closed."
  ],
  "ticket_reopened": [
    "تمت إعادة فتح التذكرة.",
    "The ticket has been reopened."
  ],
  "saved_refresh_failed": [
    "حُفظ التغيير، لكن تعذّر تحديث المحادثة. حدّث الصفحة لعرض آخر الرسائل.",
    "Your change was saved, but the conversation could not refresh. Reload to see the latest messages."
  ],
  "forbidden": [
    "لا تملك صلاحية تنفيذ هذا الإجراء.",
    "You do not have permission to perform this action."
  ],
  "banned": [
    "هذا الحساب موقوف.",
    "This account is suspended."
  ],
  "sign_in_again": [
    "انتهت جلسة الدخول. سجّل الدخول مرة أخرى للمتابعة.",
    "Your session has ended. Sign in again to continue."
  ],
  "invalid_ticket": [
    "اكتب موضوعًا بين 3 و160 حرفًا وتفاصيل بين 5 و5000 حرف، وحدّد التصنيف والأولوية.",
    "Enter a subject of 3–160 characters and details of 5–5000 characters, and choose a category and priority."
  ],
  "invalid_reply": [
    "اكتب رسالة بين حرف واحد و5000 حرف.",
    "Write a message of 1–5000 characters."
  ],
  "ticket_limit": [
    "بلغت حد فتح التذاكر لهذه الساعة. تابع تذكرتك الحالية أو حاول لاحقًا.",
    "You have reached the hourly ticket limit. Continue an existing conversation or try later."
  ],
  "reply_limit": [
    "أرسلت رسائل كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مجددًا.",
    "You have sent too many messages in a short time. Wait a little and try again."
  ],
  "unavailable": [
    "خدمة التذاكر غير متاحة حاليًا. حاول لاحقًا.",
    "The ticket service is currently unavailable. Try again later."
  ],
  "network_error": [
    "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.",
    "Could not connect to the server. Check your connection and try again."
  ],
  "request_error": [
    "تعذّر تنفيذ الطلب. حاول مرة أخرى.",
    "The request could not be completed. Please try again."
  ],
  "manage_support": [
    "إدارة تذاكر الدعم",
    "Manage support tickets"
  ]
};
  var backend = window.accountBackend, page = document.body.dataset.supportPage;
  var user = null, profile = null, currentTicket = null, messages = [], listRows = [];
  var staff = page === 'admin', busy = false, listBusy = false, listRevision = 0, targetCount = 50, more = false;
  var conversationPromise = null, lastRead = '', threadFingerprint = '', timer = null, sessionRevision = 0;
  function node(id) { return document.getElementById(id); }
  function lang() { return window.AppI18N ? window.AppI18N.getLang() : document.documentElement.lang || 'ar'; }
  function t(key) { var pair = TEXT[key]; return pair ? pair[lang() === 'ar' ? 0 : 1] : key; }
  function element(tag, className, text) { var el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = bytes[6] & 15 | 64; bytes[8] = bytes[8] & 63 | 128;
    var hex = Array.from(bytes, function (v) { return v.toString(16).padStart(2, '0'); }).join('');
    return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  }
  function validId(id) { return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id || ''); }
  function when(value) { var date = new Date(value); return Number.isNaN(date.valueOf()) ? '' : new Intl.DateTimeFormat(lang() === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(date); }
  function notify(id, key, error) { var el = node(id); if (!el) return; el.hidden = !key; el.dataset.supportNotice = key || ''; el.textContent = key ? t(key) : ''; el.classList.toggle('is-error', !!error); }
  function errorKey(error) {
    var value = String(error && (error.code || '') || '') + ' ' + String(error && (error.message || error.error_description) || error || '');
    if (/SUPPORT_NOT_FOUND/.test(value)) return 'not_found';
    if (/SUPPORT_FORBIDDEN|permission denied/.test(value)) return 'forbidden';
    if (/ACCOUNT_BANNED/.test(value)) return 'banned';
    if (/AUTH_REQUIRED|JWT expired|invalid JWT/i.test(value)) return 'sign_in_again';
    if (/SUPPORT_CLOSED/.test(value)) return 'closed_notice';
    if (/SUPPORT_INVALID_TICKET/.test(value)) return 'invalid_ticket';
    if (/SUPPORT_INVALID_REPLY/.test(value)) return 'invalid_reply';
    if (/SUPPORT_TICKET_LIMIT/.test(value)) return 'ticket_limit';
    if (/SUPPORT_REPLY_LIMIT|rate limit/i.test(value)) return 'reply_limit';
    if (/PGRST202|PGRST205|does not exist|schema cache|PROFILE_NOT_READY/i.test(value)) return 'unavailable';
    if (/fetch|Network|Load failed/i.test(value)) return 'network_error';
    return 'request_error';
  }
  function localize() {
    document.querySelectorAll('[data-support-i18n]').forEach(function (el) { el.textContent = t(el.dataset.supportI18n); });
    document.querySelectorAll('[data-support-text]').forEach(function (el) {
      Array.prototype.some.call(el.childNodes, function (child) { if (child.nodeType !== 3 || !child.nodeValue.trim()) return false; child.nodeValue = child.nodeValue.replace(child.nodeValue.trim(), t(el.dataset.supportText)); return true; });
    });
    document.querySelectorAll('[data-support-placeholder]').forEach(function (el) { el.placeholder = t(el.dataset.supportPlaceholder); });
    document.querySelectorAll('[data-support-alt]').forEach(function (el) { el.alt = t(el.dataset.supportAlt); });
    document.querySelectorAll('[data-support-notice]').forEach(function (el) { if (el.dataset.supportNotice) el.textContent = t(el.dataset.supportNotice); });
    document.title = t('page_' + page) + ' | Account';
    renderList(); if (currentTicket) { renderHeader(); renderMessages(true); }
  }
  function updateControls() {
    document.querySelectorAll('[data-support-mutation]').forEach(function (button) { button.disabled = busy; });
    if (!currentTicket) return;
    var closed = currentTicket.status === 'closed';
    node('ticketCloseButton').hidden = closed; node('ticketReopenButton').hidden = !closed;
    node('ticketReplyForm').hidden = closed; node('ticketClosedNotice').hidden = !closed;
  }
  async function run(id, operation) {
    if (busy) return; busy = true; updateControls(); notify(id, '', false);
    try { await operation(); } catch (error) { notify(id, errorKey(error), true); }
    finally { busy = false; updateControls(); }
  }
  function badge(status) { return element('span', 'support-badge' + (status === 'closed' ? ' is-closed' : status === 'in_progress' ? ' is-progress' : ''), t('status_' + status)); }
  function renderList() {
    var host = node('myTicketsList'); if (!host) return;
    host.replaceChildren();
    listRows.forEach(function (ticket) {
      var link = element('a', 'support-ticket-card'); link.href = './ticket.html?id=' + encodeURIComponent(ticket.id) + (staff ? '&staff=1' : '');
      var top = element('div', 'support-ticket-top'), title = element('h3', '', ticket.subject), state = badge(ticket.status);
      var readAt = Date.parse(staff ? ticket.staff_read_at : ticket.user_read_at) || 0;
      if (ticket.last_sender !== (staff ? 'admin' : 'user') && Date.parse(ticket.last_message_at) > readAt) { var unread = element('span', 'support-unread'); unread.setAttribute('aria-label', t('unread')); state.prepend(unread); }
      top.append(title, state); link.append(top);
      link.append(element('p', 'support-ticket-meta', (staff ? ticket.customer_name + ' · ' : '') + t('category_' + ticket.category) + ' · ' + t('priority_' + ticket.priority) + ' · ' + when(ticket.updated_at)));
      link.append(element('p', 'support-preview', ticket.last_message));
      var cta = element('span', 'support-ticket-cta', t('open_conversation') + ' '); var icon = element('i', 'fa-solid fa-arrow-left'); icon.setAttribute('aria-hidden', 'true'); cta.append(icon); link.append(cta); host.append(link);
    });
    var empty = node('myTicketsEmpty'); if (empty) empty.hidden = !!listRows.length;
    var moreButton = node('ticketsMore'); if (moreButton) { moreButton.hidden = !more; moreButton.disabled = listBusy; }
  }
  async function loadList() {
    var revision = ++listRevision, rows = [], chunk, filter = node('ticketFilter'); listBusy = true;
    if (node('ticketsMore')) node('ticketsMore').disabled = true;
    try {
      do { chunk = await backend.supportTickets(staff, rows.length, filter && filter.value); rows = rows.concat(chunk); } while (chunk.length === 50 && rows.length < targetCount);
      if (revision !== listRevision) return;
      var seen = new Set(); listRows = rows.filter(function (row) { if (seen.has(row.id)) return false; seen.add(row.id); return true; }); more = chunk.length === 50;
      notify('ticketsStatus', '', false); renderList();
    } catch (error) { if (revision === listRevision) notify('ticketsStatus', errorKey(error), true); }
    finally { if (revision === listRevision) { listBusy = false; if (node('ticketsMore')) node('ticketsMore').disabled = false; } }
  }
  function bindNewTicket() {
    var form = node('newTicketForm'); if (!form) return; var pending = null;
    form.addEventListener('submit', function (event) {
      event.preventDefault(); if (!form.reportValidity()) return;
      run('newTicketStatus', async function () {
        var data = { subject: form.elements.namedItem('subject').value.trim(), category: form.elements.namedItem('category').value, priority: form.elements.namedItem('priority').value, message: form.elements.namedItem('message').value.trim() };
        if (data.subject.length < 3 || data.subject.length > 160 || data.message.length < 5 || data.message.length > 5000) throw new Error('SUPPORT_INVALID_TICKET');
        var signature = JSON.stringify(data); if (!pending || pending.signature !== signature) pending = { signature: signature, id: uuid() };
        var revision = sessionRevision, result = await backend.supportCreate(data, pending.id);
        if (revision !== sessionRevision) return;
        if (!result || !validId(result.id)) throw new Error('Invalid server response');
        pending = null; form.reset(); notify('newTicketStatus', 'created', false);
        location.assign('./ticket.html?id=' + encodeURIComponent(result.id));
      });
    });
  }
  function renderHeader() {
    node('ticketSubject').textContent = currentTicket.subject;
    node('ticketMeta').textContent = t('category_' + currentTicket.category) + ' · ' + t('priority_' + currentTicket.priority) + ' · ' + when(currentTicket.created_at);
    node('ticketStatus').replaceChildren(badge(currentTicket.status));
    node('ticketCustomer').textContent = staff ? currentTicket.customer_name : '';
    var back = node('ticketBack'); back.href = staff ? './admin.html' : './tickets.html'; back.querySelector('span').textContent = t(staff ? 'back_inbox' : 'back_tickets');
    updateControls();
  }
  function renderMessages(force) {
    var host = node('ticketThread'); if (!host) return;
    var fingerprint = messages.map(function (m) { return m.id; }).join('|') + '|' + lang();
    if (!force && fingerprint === threadFingerprint) return;
    var follow = host.scrollHeight - host.scrollTop - host.clientHeight < 80 || !threadFingerprint;
    var oldTop = host.scrollTop; host.replaceChildren();
    messages.forEach(function (message) {
      var mine = message.sender_id === user.id;
      var bubble = element('div', 'support-message' + (mine ? ' is-mine' : ''));
      bubble.append(element('p', 'support-message-body', message.body));
      bubble.append(element('span', 'support-message-meta', (message.sender_role === 'admin' ? t('support_team') : mine ? t('you') : message.sender_name) + ' · ' + when(message.created_at)));
      host.append(bubble);
    });
    if (!messages.length) host.append(element('p', 'support-copy', t('no_messages')));
    host.scrollTop = follow ? host.scrollHeight : oldTop; threadFingerprint = fingerprint;
  }
  function denyTicket() { currentTicket = null; messages = []; node('ticketContent').hidden = true; node('ticketDenied').hidden = false; node('ticketLoading').hidden = true; node('ticketThread').replaceChildren(); }
  async function refreshConversation(force) {
    if (conversationPromise) { await conversationPromise; if (!force) return; }
    conversationPromise = (async function () {
      var revision = sessionRevision;
      if (!user || !profile) return;
      var params = new URL(location.href).searchParams, id = params.get('id') || params.get('app_id');
      if (!validId(id)) { denyTicket(); return; }
      var ticket = await backend.supportTicket(id);
      if (revision !== sessionRevision) return;
      if (!ticket) { denyTicket(); return; }
      staff = profile.role === 'admin' && (params.get('staff') === '1' || ticket.user_id !== user.id);
      var replies = await backend.supportMessages(id);
      if (revision !== sessionRevision) return;
      currentTicket = ticket; messages = replies;
      node('ticketLoading').hidden = true; node('ticketDenied').hidden = true; node('ticketContent').hidden = false;
      renderHeader(); renderMessages(false); notify('ticketSyncStatus', '', false);
      if (!document.hidden && lastRead !== ticket.last_message_at) {
        await backend.supportRead(id, staff).then(function () { lastRead = ticket.last_message_at; }).catch(function () { /* Optional read marker must not hide a delivered message. */ });
      }
    })();
    try { await conversationPromise; } finally { conversationPromise = null; }
  }
  function bindConversation() {
    var form = node('ticketReplyForm'), pending = null;
    form.addEventListener('submit', function (event) {
      event.preventDefault(); if (!form.reportValidity() || !currentTicket) return;
      run('replyStatus', async function () {
        var body = form.elements.namedItem('message').value.trim(); if (!body || body.length > 5000) throw new Error('SUPPORT_INVALID_REPLY');
        if (currentTicket.status === 'closed') throw new Error('SUPPORT_CLOSED');
        if (!pending || pending.body !== body) pending = { body: body, id: uuid() };
        var revision = sessionRevision;
        await backend.supportReply(currentTicket.id, body, pending.id);
        if (revision !== sessionRevision) return;
        pending = null; form.reset(); notify('replyStatus', 'reply_sent', false);
        try { await refreshConversation(true); } catch (error) { notify('ticketSyncStatus', 'saved_refresh_failed', true); }
      });
    });
    [['ticketCloseButton','closed'],['ticketReopenButton','open']].forEach(function (pair) {
      node(pair[0]).addEventListener('click', function () {
        if (!currentTicket) return;
        run('ticketActionStatus', async function () {
          var revision = sessionRevision;
          await backend.supportStatus(currentTicket.id, pair[1]);
          if (revision !== sessionRevision) return;
          currentTicket.status = pair[1]; renderHeader();
          notify('ticketActionStatus', pair[1] === 'closed' ? 'ticket_closed' : 'ticket_reopened', false);
          try { await refreshConversation(true); } catch (error) { notify('ticketSyncStatus', 'saved_refresh_failed', true); }
        });
      });
    });
  }
  function startUpdates() {
    if (timer) return;
    timer = setInterval(function () {
      if (document.hidden || busy) return;
      if (page === 'ticket') refreshConversation(false).catch(function (error) { notify('ticketSyncStatus', errorKey(error), true); });
      else if (!listBusy) loadList();
    }, 7000);
  }
  async function initialize() {
    var revision = sessionRevision;
    user = backend.currentUser(); localize();
    if (user) profile = await backend.profile();
    if (revision !== sessionRevision) return;
    if (page === 'help') {
      node('helpAuthActions').classList.toggle('hidden', !user); node('helpAuthActions').classList.toggle('flex', !!user);
      node('helpGuestNotice').hidden = !!user;
      var adminLink = node('supportAdminLink'); if (adminLink) adminLink.hidden = !profile || profile.role !== 'admin';
      return;
    }
    if (!user) {
      node('supportGuest').hidden = false;
      var target = location.pathname.split('/').pop() + location.search + location.hash;
      node('supportSignIn').href = './account.html?return=' + encodeURIComponent(target);
      if (node('ticketLoading')) node('ticketLoading').hidden = true; return;
    }
    if (page === 'admin' && profile.role !== 'admin') { node('supportDenied').hidden = false; return; }
    await backend.supportHealth();
    if (revision !== sessionRevision) return;
    if (page === 'ticket') { bindConversation(); await refreshConversation(false); }
    else {
      node('ticketsMember').hidden = false; bindNewTicket();
      node('ticketsMore').addEventListener('click', function () { targetCount += 50; loadList(); });
      if (node('ticketFilter')) node('ticketFilter').addEventListener('change', function () { targetCount = 50; loadList(); });
      await loadList();
    }
    if (user && revision === sessionRevision) startUpdates();
  }
  window.addEventListener('account:languagechange', localize);
  window.addEventListener('account:signed-out', function () {
    sessionRevision++; listRevision++;
    user = null; profile = null; currentTicket = null; messages = []; listRows = [];
    if (timer) { clearInterval(timer); timer = null; }
    if (node('ticketsMember')) node('ticketsMember').hidden = true;
    if (node('ticketContent')) node('ticketContent').hidden = true;
    if (node('ticketThread')) node('ticketThread').replaceChildren();
    if (node('myTicketsList')) node('myTicketsList').replaceChildren();
    if (node('supportGuest')) node('supportGuest').hidden = false;
    if (node('helpAuthActions')) { node('helpAuthActions').classList.add('hidden'); node('helpAuthActions').classList.remove('flex'); node('helpGuestNotice').hidden = false; }
    if (node('supportAdminLink')) node('supportAdminLink').hidden = true;
  });
  window.addEventListener('pagehide', function () { if (timer) { clearInterval(timer); timer = null; } });
  window.addEventListener('pageshow', function (event) { if (event.persisted && user && page !== 'help') { if (page === 'ticket') refreshConversation(false).catch(function () {}); else loadList(); startUpdates(); } });
  var ready = document.readyState === 'loading' ? new Promise(function (resolve) { document.addEventListener('DOMContentLoaded', resolve, { once: true }); }) : Promise.resolve();
  Promise.all([ready, backend.ready]).then(initialize).catch(function (error) {
    if (node('ticketLoading')) node('ticketLoading').hidden = true;
    notify(page === 'ticket' ? 'ticketSyncStatus' : 'ticketsStatus', errorKey(error), true);
  });

})();
