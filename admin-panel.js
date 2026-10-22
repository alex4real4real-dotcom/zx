(function () {
  'use strict';
  var backend = window.accountBackend, TEXT = window.AccountManagementText, page = document.body.dataset.managementPage;
  var user = null, profile = null, sessionEpoch = 0, listRevision = 0, busy = false, activeTab = '', filter = '', target = 50;
  var adminRows = [], topups = [], verificationRows = [], customerRows = [], purchases = [], overview = null, listMore = false, topupTarget = 50, topupMore = false;
  var settlementRows = [], serverOffset = 0;
  function settlementFor(id){return settlementRows.find(function(s){return s.order_item_id===id;});}
  function serverNow(){return Date.now()+serverOffset;}
  async function fetchSettlements(){return backend.testSettlements();}
  function saveSettlements(data){settlementRows=data.settlements||[];serverOffset=Date.parse(data.server_now)-Date.now();}
  var activeDialog = null, dialogRevision = 0, conversation = null, conversationMessages = [], conversationTimer = null, conversationBusy = false;
  function node(id) { return document.getElementById(id); }
  function lang() { return window.AppI18N ? window.AppI18N.getLang() : document.documentElement.lang || 'ar'; }
  function t(key) { return TEXT[key] ? TEXT[key][lang() === 'ar' ? 0 : 1] : key; }
  function make(tag, css, text) { var el = document.createElement(tag); if (css) el.className = css; if (text !== undefined) el.textContent = text; return el; }
  function label(key) { var el = make('span', '', t(key)); el.dataset.adminI18n = key; return el; }
  function validId(id) { return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id || ''); }
  function uuid() { if (crypto.randomUUID) return crypto.randomUUID(); var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = b[6] & 15 | 64; b[8] = b[8] & 63 | 128; var h = Array.from(b, function (v) { return v.toString(16).padStart(2, '0'); }).join(''); return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20); }
  function date(value) { var d = new Date(value); return Number.isNaN(d.valueOf()) ? '' : new Intl.DateTimeFormat(lang() === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(d); }
  function money(value) { return new Intl.NumberFormat(lang() === 'ar' ? 'ar-SA' : 'en-GB', { style: 'currency', currency: 'SAR' }).format(Number(value) || 0); }
  function notice(el, key, error) { if (typeof el === 'string') el = node(el); if (!el) return; el.hidden = !key; el.dataset.adminNotice = key || ''; el.textContent = key ? t(key) : ''; el.classList.toggle('is-error', !!error); }
  function errorKey(error) {
    var s = String(error && error.code || '') + ' ' + String(error && error.message || error || '');
    var keys = [['DISPUTE_WINDOW_EXPIRED','window_expired'],['DISPUTE_WINNER_REQUIRED','winner_required'],['SETTLEMENT_FINAL','settlement_final'],['SETTLEMENT_SELLER_REQUIRED','seller_required'],['ADMIN_REQUIRED','admin_required'],['AUTH_REQUIRED','guest_heading'],['OWNER_PROTECTED','owner_protected'],['SELF_PROTECTED','self_protected'],['ACCOUNT_NOT_FOUND','account_not_found'],['ACCOUNT_BANNED','account_banned'],['ALREADY_REVIEWED','already_reviewed'],['REASON_REQUIRED','reason_required'],['RECORD_NOT_FOUND','not_found'],['REQUEST_LIMIT','request_limit'],['VERIFICATION_PENDING|REQUEST_PENDING','verification_pending'],['ALREADY_VERIFIED','already_verified'],['DOCUMENT_REQUIRED','document_required'],['INVALID_DOCUMENT','invalid_document'],['DISPUTE_EXISTS','dispute_exists'],['DISPUTE_CLOSED','dispute_closed'],['INVALID_|23514','invalid_request'],['PGRST202|PGRST205|schema cache|does not exist|PROFILE_NOT_READY','not_ready']];
    for (var i = 0; i < keys.length; i++) if (new RegExp(keys[i][0], 'i').test(s)) return keys[i][1];
    return 'request_failed';
  }
  function localize() {
    document.querySelectorAll('[data-admin-i18n]').forEach(function (el) { el.textContent = t(el.dataset.adminI18n); });
    document.querySelectorAll('[data-admin-notice]').forEach(function (el) { if (el.dataset.adminNotice) el.textContent = t(el.dataset.adminNotice); });
    document.querySelectorAll('[data-admin-placeholder]').forEach(function (el) { el.placeholder = t(el.dataset.adminPlaceholder); });
    document.title = t(page === 'admin' ? 'dashboard' : page === 'sell' ? 'verification_page' : 'my_disputes') + ' | Account';
    if (page === 'admin' && activeTab) { renderAdminRows(); node('sectionTitle').textContent = t(activeTab); node('sectionCopy').textContent = t(activeTab + '_copy'); }
    if (page === 'sell') renderVerifications();
    if (page === 'disputes') { renderCustomerRows(); renderPurchases(); }
    if (conversation) renderMessages();
  }
  function setBusy(value) { busy = value; document.querySelectorAll('[data-management-mutation]').forEach(function (button) { button.disabled = value || button.dataset.permanentDisabled === 'true'; }); }
  async function run(operation, after, status) {
    if (busy) return; var epoch = sessionEpoch, saved = false; status = status || node('managementStatus'); setBusy(true); notice(status, '');
    try {
      var result = await operation(); saved = true; if (epoch !== sessionEpoch) return;
      if (after) await after(result); if (epoch !== sessionEpoch) return;
      notice(status.isConnected ? status : node('managementStatus'), 'saved');
    } catch (error) { if (epoch === sessionEpoch) { if (page === 'admin' && errorKey(error) === 'admin_required') denyAdmin(); else notice(status.isConnected ? status : node('managementStatus'), saved ? 'saved_refresh_failed' : errorKey(error), true); } }
    finally { setBusy(false); }
  }
  function button(key, click, outline) { var el = make('button', 'admin-button' + (outline ? ' is-outline' : '')); el.type = 'button'; el.append(label(key)); if (click) el.addEventListener('click', click); return el; }
  function mutationButton(key, click, outline) { var el = button(key, click, outline); el.dataset.managementMutation = ''; el.disabled = busy; return el; }
  function badge(key) { return make('span', 'admin-badge' + (['active','approved','verified'].includes(key) ? ' is-green' : ['closed','resolved_buyer','resolved_seller'].includes(key) ? ' is-muted' : key === 'banned' || key === 'rejected' ? ' is-red' : ''), t(key)); }
  function field(key, name, type, required, limit) {
    var wrap = make('label', 'admin-field'); wrap.append(label(key)); var input = make(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea') input.type = type || 'text'; input.name = name; input.required = !!required; if (limit) input.maxLength = limit; wrap.append(input); return wrap;
  }
  function selectField(key, options, value) {
    var wrap = make('label', 'admin-field'); wrap.append(label(key)); var select = make('select');
    options.forEach(function (item) { var opt = make('option', '', t(item[1])); opt.value = item[0]; opt.dataset.adminI18n = item[1]; select.append(opt); }); select.value = value; wrap.append(select); return { wrap: wrap, select: select };
  }
  function empty(host) { host.append(make('p', 'admin-copy', t('empty'))); }
  function card(title, state) { var box = make('article', 'admin-card'), top = make('div', 'admin-card-top'); top.append(make('h3', '', title)); if (state) top.append(badge(state)); box.append(top); return box; }
  function closeDialog() {
    dialogRevision++; conversation = null; conversationMessages = []; conversationBusy = false;
    if (conversationTimer) { clearInterval(conversationTimer); conversationTimer = null; }
    if (activeDialog) { var old = activeDialog; activeDialog = null; if (old.open) old.close(); old.remove(); }
  }
  function dialog(title, literal) {
    closeDialog(); var d = make('dialog', 'admin-dialog management-ui'), top = make('div', 'admin-dialog-header'), heading = make('h2'); heading.append(literal ? document.createTextNode(title) : label(title));
    var close = button('close', function () { if (!busy) closeDialog(); }, true); close.classList.add('is-small'); top.append(heading, close); d.append(top);
    var status = make('p', 'admin-status'); status.hidden = true; status.setAttribute('role', 'status');
    d.addEventListener('cancel', function (event) { event.preventDefault(); if (!busy) closeDialog(); }); document.body.append(d); activeDialog = d; d.showModal(); return { el: d, status: status, revision: dialogRevision };
  }
  async function updateOverview() {
    var epoch = sessionEpoch, result = await backend.adminData('overview'); if (epoch !== sessionEpoch) return;
    overview = result; node('adminEmail').textContent = result.email; node('adminIdentity').hidden = false;
    ['verifications','disputes','banned','topups'].forEach(function (key) { node('stat-' + key).textContent = String(result[key] || 0); });
  }
  function filtersFor(tab) {
    var host = node('sectionFilters'); host.replaceChildren();
    if (tab === 'accounts') {
      var form = make('form', 'admin-actions'), input = make('input', 'admin-filter'), search = button('search'); search.type = 'submit'; input.name = 'search'; input.maxLength = 120; input.placeholder = t('search_accounts'); input.dataset.adminPlaceholder = 'search_accounts';
      form.append(input, search); form.addEventListener('submit', function (event) { event.preventDefault(); filter = input.value.trim(); target = 50; loadAdminRows(); }); host.append(form);
    } else if (tab === 'disputes') {
      var wrap = make('label', 'admin-switch'), check = make('input'); check.type = 'checkbox'; check.checked = filter === 'open'; wrap.append(check, label('only_open')); host.append(wrap);
      check.addEventListener('change', function () { filter = check.checked ? 'open' : ''; target = 50; loadAdminRows(); });
    } else if (tab === 'tickets' || tab === 'verifications' || tab === 'withdrawals') {
      var opts = tab === 'tickets' ? [['','all'],['open','open'],['in_progress','in_progress'],['closed','closed']] : [['','all'],['pending','pending'],['approved','approved'],['rejected','rejected']].concat(tab==='verifications'?[['cancelled','cancelled']]:[]);
      var control = selectField('status', opts, filter); if (tab === 'tickets') control.select.id = 'ticketFilter'; host.append(control.wrap);
      control.select.addEventListener('change', function () { filter = control.select.value; target = 50; loadAdminRows(); });
    }
  }
  function membershipForm() {
    var form = make('form', 'admin-card admin-member-form'); form.id = 'adminMemberForm';
    var name = field('admin_name','admin_name','text',false,120), email = field('email','email','email',true,254), submit = mutationButton('add_admin'); submit.type = 'submit';
    name.querySelector('input').placeholder = t('admin_name_placeholder'); name.querySelector('input').dataset.adminPlaceholder = 'admin_name_placeholder'; email.querySelector('input').placeholder = 'admin@example.com';
    form.append(name,email,submit); form.addEventListener('submit', function (event) {
      event.preventDefault(); if (!form.reportValidity()) return;
      run(function () { return backend.adminMembership(form.elements.email.value.trim(),form.elements.admin_name.value.trim(),false); }, async function () { form.reset(); await refreshAdmin(); }, node('sectionStatus'));
    }); node('sectionForm').append(form);
  }
  function chooseTab(tab, nextFilter) {
    if (!['verifications','disputes','accounts','orders','tickets','members','withdrawals'].includes(tab)) tab = 'verifications';
    activeTab = tab; filter = nextFilter !== undefined ? nextFilter : (tab === 'verifications'||tab === 'withdrawals') ? 'pending' : tab === 'disputes' ? 'open' : ''; target = 50; topupTarget = 50; adminRows = []; topups = [];
    document.querySelectorAll('[data-admin-tab]').forEach(function (el) { var selected = el.dataset.adminTab === tab; el.setAttribute('aria-selected',String(selected)); el.tabIndex = selected ? 0 : -1; });
    node('adminSection').setAttribute('aria-labelledby','tab-' + tab); node('sectionTitle').textContent = t(tab); node('sectionCopy').textContent = t(tab + '_copy'); node('sectionForm').replaceChildren();
    node('topupSection').hidden = tab !== 'orders'; node('adminMore').hidden = true; filtersFor(tab); if (tab === 'members') membershipForm();
    node('myTicketsList').replaceChildren(); node('topupRows').replaceChildren();
    try { var url = new URL(location.href); url.hash = tab; history.replaceState(null,'',url.href); } catch (error) { /* Optional navigation state. */ }
    loadAdminRows();
  }
  async function loadAdminRows() {
    var revision = ++listRevision, epoch = sessionEpoch, tab = activeTab, rows = [], part;
    node('adminMore').disabled = true; notice('sectionStatus','loading');
    try {
      do { part = await backend.adminData(tab, rows.length, filter); rows = rows.concat(part.rows); } while (part.more && rows.length < target);
      var creditRows = [], creditPart;
      if (tab === 'orders') do { creditPart = await backend.adminData('topups', creditRows.length, ''); creditRows = creditRows.concat(creditPart.rows); } while (creditPart.more && creditRows.length < topupTarget);
      var settlementData=(tab==='orders'||tab==='disputes')?await fetchSettlements():null;
      if (revision !== listRevision || epoch !== sessionEpoch) return;
      if(settlementData)saveSettlements(settlementData);
      var seen = new Set(); adminRows = rows.filter(function (row) { var id = row.id || row.user_id; if (seen.has(id)) return false; seen.add(id); return true; });
      listMore = part.more; topups = creditRows; topupMore = !!(creditPart && creditPart.more); renderAdminRows(); notice('sectionStatus','');
    } catch (error) { if (revision === listRevision && epoch === sessionEpoch) { if (errorKey(error) === 'admin_required') denyAdmin(); else notice('sectionStatus',errorKey(error),true); } }
    finally { if (revision === listRevision) node('adminMore').disabled = false; }
  }
  async function refreshAdmin() { await Promise.all([updateOverview(),loadAdminRows()]); }
  function banDialog(id, banned, title) {
    var ui = dialog(banned ? 'ban' : 'unban'); ui.el.append(make('p','admin-copy',title || '')); var form = make('form','admin-form'), input = field('ban_reason','reason','textarea',banned,1000);
    if (banned) form.append(input); var submit = mutationButton(banned ? 'ban' : 'unban'); submit.type='submit'; form.append(submit,ui.status); ui.el.append(form);
    form.addEventListener('submit',function(event){event.preventDefault(); if(!form.reportValidity())return;var reason=banned?form.elements.reason.value.trim():'';
      run(function(){return backend.adminBan(id,banned,reason);},async function(){closeDialog();await refreshAdmin();},ui.status);
    });
  }
  function removeMember(row) {
    var ui=dialog('remove_admin');ui.el.append(make('p','admin-copy',row.email));var remove=mutationButton('remove_admin',function(){run(function(){return backend.adminMembership(row.email,'',true);},async function(){closeDialog();await refreshAdmin();},ui.status);});ui.el.append(remove,ui.status);
  }
  function renderMembers(host) {
    adminRows.forEach(function(row){var box=card(row.is_owner?t('platform_owner'):row.display_name,row.banned?'banned':'active');box.append(make('p','admin-email',row.email));
      if(row.user_id===user.id)box.append(badge('this_is_you'));
      if(row.is_owner)box.append(make('p','admin-owner-note',t('owner_note')));
      else if(row.user_id!==user.id){var actions=make('div','admin-actions');actions.append(mutationButton('remove_admin',function(){removeMember(row);},true));box.append(actions);}host.append(box);
    });
  }
  function renderAccounts(host) {
    adminRows.forEach(function(row){var box=card(row.display_name||row.email,row.banned?'banned':'active');box.append(make('p','admin-email',row.email));if(row.phone)box.append(make('p','',row.phone));box.append(badge(row.base_role||row.role));if(row.is_verified)box.append(badge('verified'));
      if(row.banned&&row.ban_reason)box.append(make('p','',row.ban_reason));var actions=make('div','admin-actions'),control=mutationButton(row.banned?'unban':'ban',function(){banDialog(row.id,!row.banned,row.display_name||row.email);},true);
      if(row.is_owner||row.id===user.id){control.disabled=true;control.dataset.permanentDisabled='true';control.title=t(row.is_owner?'owner_protected':'self_protected');}actions.append(control);box.append(actions);host.append(box);
    });
  }
  function renderTickets(host) {
    adminRows.forEach(function(row){var box=card(row.subject,row.status);box.classList.add('support-ticket-card');box.append(make('p','',t('category_'+row.category)+' · '+t('priority_'+row.priority)+' · '+(row.customer_email||row.customer_name)));
      box.append(make('p','',row.last_message));var actions=make('div','admin-actions'),link=make('a','admin-button is-outline is-small',t('open_conversation'));link.href='./ticket.html?id='+encodeURIComponent(row.id)+'&staff=1';actions.append(link,make('small','admin-copy',date(row.updated_at)));box.append(actions);host.append(box);
    });
  }
  function verificationCard(row, forAdmin) {
    var box=card(row.store_name,row.status);if(row.legal_name)box.append(make('p','',row.legal_name));if(row.email)box.append(make('p','admin-email',row.email));box.append(make('p','',(row.phone?row.phone+' · ':'')+date(row.created_at)));if(row.review_note)box.append(make('p','',row.review_note));
    if(forAdmin){if(row.verification_method==='didit'){box.append(make('p','admin-copy',lang()==='ar'?'نتيجة التحقق الآلي — لا تحتاج موافقة الإدارة.':'Automatic verification — no admin approval required.'));}else{var actions=make('div','admin-actions');actions.append(button('review',function(){reviewVerification(row);},true));box.append(actions);}}return box;
  }
  function reviewVerification(row) {
    var ui=dialog('review');ui.el.append(make('h3','admin-title',row.store_name),make('p','admin-copy',row.legal_name+' · '+row.email+' · '+row.phone),badge(row.status));
    var link=button('document',null,true);link.disabled=true;ui.el.append(make('p','admin-privacy',t('private_document')),link);
    backend.verificationDocument(row.document_path).then(function(url){if(!activeDialog||dialogRevision!==ui.revision)return;
      var anchor=make('a','admin-button is-outline');anchor.append(label('document'));anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';link.replaceWith(anchor);
    }).catch(function(error){if(ui.revision===dialogRevision)notice(ui.status,errorKey(error),true);});
    var form=make('form','admin-form'),note=field('review_note','note','textarea',false,1000);form.append(note);
    if(row.status==='pending'){var actions=make('div','admin-actions');[['approve',true],['reject',false]].forEach(function(pair){actions.append(mutationButton(pair[0],function(){var value=form.elements.note.value.trim();if(!pair[1]&&value.length<3){notice(ui.status,'reason_required',true);return;}
      run(function(){return backend.adminVerify(row.id,pair[1],value);},async function(){closeDialog();await refreshAdmin();},ui.status);
    },!pair[1]));});form.append(actions);}else form.elements.note.value=row.review_note||'';
    form.addEventListener('submit',function(event){event.preventDefault();});form.append(ui.status);ui.el.append(form);
  }
  function table(headers) {var wrap=make('div','admin-table-wrap'),el=make('table','admin-table'),head=make('thead'),tr=make('tr');headers.forEach(function(key){tr.append(make('th','',t(key)));});head.append(tr);var body=make('tbody');el.append(head,body);wrap.append(el);return{wrap:wrap,body:body};}
  function renderDisputeTable(host) {
    var view=table(['case','product','buyer','seller','reason','status','conversation','decision']);
    adminRows.forEach(function(row){var tr=make('tr'),values=['#'+row.case_number,row.product_title,row.buyer_email,row.seller_email||t('platform_store'),row.reason];values.forEach(function(value){tr.append(make('td','',value));});var state=make('td');state.append(badge(row.status));var settlement=settlementFor(row.order_item_id);if(settlement)state.append(make('p','admin-copy',t('settlement_'+settlement.state)));tr.append(state);
      var chat=make('td');chat.append(button('conversation',function(){openConversation(row.id);},true));tr.append(chat);var cell=make('td'),actions=make('div','admin-actions');
      if(row.status==='open'){
        actions.append(mutationButton('resolve_buyer',function(){decisionDialog(row,'resolved_buyer');},true));
        if(row.seller_id)actions.append(mutationButton('resolve_seller',function(){decisionDialog(row,'resolved_seller');},true));
        if(row.seller_id)actions.append(mutationButton('ban_seller',function(){banDialog(row.seller_id,true,row.seller_email);},true));
        actions.append(mutationButton('ban_buyer',function(){banDialog(row.buyer_id,true,row.buyer_email);},true));
      }cell.append(actions);tr.append(cell);view.body.append(tr);
    });host.append(view.wrap);
  }
  function orderDetails(row) {
    var ui=dialog('order_details');ui.el.append(make('p','admin-copy','#'+row.id.slice(0,8)+' · '+row.buyer_email+' · '+date(row.created_at)),make('p','admin-copy',t('test_payment')));
    var view=table(['product','quantity','total','status']);(row.items||[]).forEach(function(item){var tr=make('tr'),settlement=settlementFor(item.id);[item.title,String(item.quantity),money(Number(item.unit_price)*item.quantity),settlement?t('settlement_'+settlement.state)+' · '+t('settlement_deadline')+' '+date(settlement.release_at):t('settlement_legacy')].forEach(function(value){tr.append(make('td','',value));});view.body.append(tr);});ui.el.append(view.wrap,make('p','admin-copy',t('total')+': '+money(row.total)));
  }
  function renderOrders(host) {
    var view=table(['order','buyer','total','status','date','details']);adminRows.forEach(function(row){var tr=make('tr');['#'+row.id.slice(0,8),row.buyer_email,money(row.total),t('test_order'),date(row.created_at)].forEach(function(value){tr.append(make('td','',value));});var cell=make('td');cell.append(button('details',function(){orderDetails(row);},true));tr.append(cell);view.body.append(tr);});host.append(view.wrap);
    var credits=node('topupRows');credits.replaceChildren();topups.forEach(function(row){var box=card(row.email,row.status);box.append(make('p','',money(row.amount)),make('p','',t('test_topup')),make('p','',row.note));
      if(row.status==='pending'){var actions=make('div','admin-actions');[['approve_test',true],['reject',false]].forEach(function(pair){actions.append(mutationButton(pair[0],function(){run(function(){return backend.adminTopup(row.id,pair[1],'');},refreshAdmin,node('sectionStatus'));},!pair[1]));});box.append(actions);}credits.append(box);});if(!topups.length)empty(credits);node('topupMore').hidden=!topupMore;
  }
  function withdrawalReview(row,approved){
    var ui=dialog(approved?'withdrawal_approve':'withdrawal_reject'),form=make('form','admin-form'),note=field('review_note','note','textarea',!approved,1000),submit=mutationButton('save_decision');submit.type='submit';if(!approved)note.querySelector('textarea').minLength=3;
    ui.el.append(make('p','admin-copy',row.email+' · '+money(row.amount)),make('p','admin-copy',t('withdrawal_test')));form.append(note,submit,ui.status);ui.el.append(form);var key=uuid();
    form.addEventListener('submit',function(event){event.preventDefault();if(!form.reportValidity())return;run(function(){return backend.adminWithdrawalReview(row.id,approved,form.elements.note.value.trim(),key);},async function(){closeDialog();await refreshAdmin();},ui.status);});
  }
  function renderWithdrawals(host){
    adminRows.forEach(function(row){var box=card(row.email),top=make('div','admin-card-top');top.append(make('strong','',money(row.amount)),make('span','admin-badge',t('withdrawal_'+row.status)));box.append(top,make('p','admin-copy',row.bank_name+' · '+row.holder_name),make('p','admin-copy',row.iban_masked),make('p','admin-copy',date(row.created_at)),make('p','admin-copy',t('withdrawal_test')));if(row.note)box.append(make('p','',row.note));if(row.review_note)box.append(make('p','',row.review_note));if(row.status==='pending'){var actions=make('div','admin-actions');actions.append(mutationButton('withdrawal_approve',function(){withdrawalReview(row,true);}),mutationButton('withdrawal_reject',function(){withdrawalReview(row,false);},true));box.append(actions);}host.append(box);});
  }
  function renderAdminRows() {
    if(!activeTab||!node('myTicketsList')||!user)return;var host=node('myTicketsList');host.replaceChildren();host.className=['orders','disputes'].includes(activeTab)?'':'admin-grid';
    if(!adminRows.length)empty(host);
    else if(activeTab==='members')renderMembers(host);else if(activeTab==='accounts')renderAccounts(host);else if(activeTab==='tickets')renderTickets(host);
    else if(activeTab==='verifications')adminRows.forEach(function(row){host.append(verificationCard(row,true));});else if(activeTab==='disputes')renderDisputeTable(host);
    if(activeTab==='orders')renderOrders(host);if(activeTab==='withdrawals')renderWithdrawals(host);node('adminMore').hidden=!listMore;
  }
  function decisionDialog(row,status) {
    var ui=dialog('decision');ui.el.append(make('p','admin-copy','#'+row.case_number+' · '+row.product_title));var form=make('form','admin-form');var choices=[['resolved_buyer','resolve_buyer']];if(row.seller_id||!settlementFor(row.order_item_id))choices.push(['resolved_seller','resolve_seller']);var control=selectField('decision',choices,status),note=field('decision_note','note','textarea',true,1000);note.querySelector('textarea').minLength=3;var submit=mutationButton('save_decision');submit.type='submit';form.append(control.wrap,note,submit,ui.status);ui.el.append(form);var key=uuid();
    form.addEventListener('submit',function(event){event.preventDefault();if(!form.reportValidity())return;run(function(){return backend.adminDispute(row.id,control.select.value,form.elements.note.value.trim(),key);},async function(){closeDialog();await refreshAdmin();},ui.status);});
  }
  function renderMessages() {
    if(!activeDialog||!conversation)return;var host=activeDialog.querySelector('[data-dispute-thread]');if(!host)return;
    var follow=host.scrollHeight-host.scrollTop-host.clientHeight<80,oldTop=host.scrollTop;host.replaceChildren();
    conversationMessages.forEach(function(row){var box=make('div','admin-message'+(row.sender_id===user.id?' is-mine':'')),body=row.event_status?t(row.event_status)+': '+row.body:row.body;
      box.append(make('p','',body),make('small','',(row.sender_role==='admin'?t('support_team'):row.sender_id===user.id?t('you'):row.sender_name)+' · '+date(row.created_at)));host.append(box);
    });host.scrollTop=follow?host.scrollHeight:oldTop;
  }
  async function refreshConversation(id,revision) {
    if(conversationBusy)return;conversationBusy=true;var epoch=sessionEpoch;
    try{
      var result=await Promise.all([backend.dispute(id),backend.disputeMessages(id)]);
      if(epoch!==sessionEpoch||revision!==dialogRevision||!activeDialog)return;
      if(!result[0]){conversation=null;conversationMessages=[];activeDialog.querySelector('[data-dispute-thread]').replaceChildren();activeDialog.querySelector('form').hidden=true;throw new Error('RECORD_NOT_FOUND');}
      conversation=result[0];conversationMessages=result[1];activeDialog.querySelector('[data-dispute-summary]').textContent='#'+conversation.case_number+' · '+conversation.product_title+' · '+t(conversation.status);
      activeDialog.querySelector('form').hidden=conversation.status!=='open';renderMessages();
    }finally{conversationBusy=false;}
  }
  async function openConversation(id) {
    if(!validId(id)){notice('managementStatus','not_found',true);return;}
    var ui=dialog('conversation'),summary=make('p','admin-copy'),thread=make('div','admin-thread'),form=make('form','admin-form'),input=field('reply','message','textarea',true,5000),send=mutationButton('send_reply');
    summary.dataset.disputeSummary='';thread.dataset.disputeThread='';thread.setAttribute('role','log');thread.setAttribute('aria-live','polite');send.type='submit';form.hidden=true;form.append(input,send);ui.el.append(summary,thread,form,ui.status);notice(ui.status,'loading');var pending=null;
    form.addEventListener('submit',function(event){event.preventDefault();if(!form.reportValidity()||!conversation)return;var body=form.elements.message.value.trim();if(!body){notice(ui.status,'invalid_request',true);return;}
      if(!pending||pending.body!==body)pending={body:body,id:uuid()};
      run(function(){return backend.disputeReply(id,body,pending.id);},async function(){form.reset();pending=null;await refreshConversation(id,ui.revision);},ui.status);
    });
    try{await refreshConversation(id,ui.revision);if(ui.revision===dialogRevision){notice(ui.status,'');conversationTimer=setInterval(function(){if(document.hidden||busy||!activeDialog)return;refreshConversation(id,ui.revision).catch(function(error){if(ui.revision===dialogRevision)notice(ui.status,errorKey(error),true);});},7000);}}
    catch(error){if(ui.revision===dialogRevision)notice(ui.status,errorKey(error),true);}
  }
  function renderVerifications() {
    var host=node('verificationRows');if(!host||!user)return;host.replaceChildren();verificationRows.forEach(function(row){host.append(verificationCard(row,false));});if(!verificationRows.length)empty(host);
  }
  async function loadSeller() {
    var epoch=sessionEpoch,rows=await backend.verifications();if(epoch!==sessionEpoch)return;verificationRows=rows;renderVerifications();
    var form=node('verificationForm'),pending=rows.find(function(row){return row.status==='uploading'||row.status==='pending';});
    form.hidden=!!profile.is_verified||rows.some(function(row){return row.status==='approved';})||!!(pending&&pending.status==='pending');
    if(pending&&pending.status==='uploading'){
      form.elements.store.value=pending.store_name;form.elements.legal.value=pending.legal_name;form.elements.phone.value=pending.phone;
      ['store','legal','phone'].forEach(function(name){form.elements[name].readOnly=true;});notice('verificationStatus','verification_resume');
    }
    return pending;
  }
  async function validateFile(file) {
    if(!file||!file.size||file.size>5242880||!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new Error('INVALID_DOCUMENT');
    var buffer=await new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=function(){reject(new Error('INVALID_DOCUMENT'));};reader.readAsArrayBuffer(file.slice(0,12));});
    var b=new Uint8Array(buffer),ascii=function(start,end){return String.fromCharCode.apply(null,Array.from(b.slice(start,end)));};
    var ok=file.type==='image/png'?b[0]===137&&ascii(1,4)==='PNG':file.type==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:file.type==='image/webp'?ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP':ascii(0,5)==='%PDF-';
    if(!ok)throw new Error('INVALID_DOCUMENT');
  }
  async function sellerPage() {
    var epoch=sessionEpoch,pendingRecord=await loadSeller(),pendingKey=null,form=node('verificationForm');if(epoch!==sessionEpoch)return;node('sellerMember').hidden=false;
    form.addEventListener('submit',function(event){event.preventDefault();if(!form.reportValidity())return;var file=form.elements.document.files[0],data={store:form.elements.store.value.trim(),legal:form.elements.legal.value.trim(),phone:form.elements.phone.value,type:file&&file.type};
      run(async function(){await validateFile(file);if(data.store.length<2||data.legal.length<2)throw new Error('INVALID_VERIFICATION');
        var signature=JSON.stringify(data);if(!pendingKey||pendingKey.signature!==signature)pendingKey={signature:signature,id:uuid()};
        var epoch=sessionEpoch;
        if(!pendingRecord||pendingRecord.status!=='uploading')pendingRecord=await backend.verificationPrepare(data,pendingKey.id);
        if(epoch!==sessionEpoch)return;
        var ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','application/pdf':'.pdf'}[file.type];if(!pendingRecord.document_path.endsWith(ext))throw new Error('INVALID_DOCUMENT');
        return backend.verificationUpload(pendingRecord,file);
      },async function(){pendingRecord=null;pendingKey=null;form.reset();await loadSeller();notice('verificationStatus','verification_sent');},node('verificationStatus'));
    });
  }
  function renderPurchases() {
    var select=node('disputeOrderItem');if(!select)return;var chosen=select.value || new URL(location.href).searchParams.get('item');select.replaceChildren();
    var claimed=new Set(customerRows.map(function(row){return row.order_item_id;})),items=[];
    purchases.forEach(function(order){(order.items||[]).forEach(function(item){var settlement=settlementFor(item.id);if(!claimed.has(item.id)&&(!settlement||(settlement.state==='held'&&serverNow()<Date.parse(settlement.release_at))))items.push({item:item,order:order});});});
    items.forEach(function(row){var option=make('option','',row.item.title+' · '+date(row.order.created_at));option.value=row.item.id;select.append(option);});
    if(items.some(function(row){return row.item.id===chosen;}))select.value=chosen;
    var submit=node('newDisputeForm').querySelector('button[type=submit]');submit.disabled=!items.length||busy;submit.dataset.permanentDisabled=String(!items.length);
    if(!items.length)notice('disputeStatus','no_orders');else if(node('disputeStatus').dataset.adminNotice==='no_orders')notice('disputeStatus','');
  }
  function renderCustomerRows() {
    var host=node('disputeRows');if(!host||!user)return;host.replaceChildren();customerRows.forEach(function(row){var box=card('#'+row.case_number+' · '+row.product_title,row.status);box.append(make('p','',row.reason),make('p','',date(row.updated_at)));if(row.decision_note)box.append(make('p','',row.decision_note));var actions=make('div','admin-actions');actions.append(button('open_conversation',function(){openConversation(row.id);},true));box.append(actions);host.append(box);});if(!customerRows.length)empty(host);
  }
  async function loadCustomerDisputes() {
    var epoch=sessionEpoch,revision=++listRevision,rows=[],part;node('customerMore').disabled=true;
    do{part=await backend.disputes(rows.length);rows=rows.concat(part);}while(part.length===50&&rows.length<target);
    if(epoch!==sessionEpoch||revision!==listRevision)return;customerRows=rows;node('customerMore').disabled=false;node('customerMore').hidden=part.length!==50;renderCustomerRows();renderPurchases();
  }
  async function disputesPage() {
    var epoch=sessionEpoch, data=await Promise.all([backend.orders(),fetchSettlements()]);if(epoch!==sessionEpoch)return;purchases=data[0];saveSettlements(data[1]);
    var policy=make('p','admin-copy',t('settlement_policy'));policy.dataset.adminI18n='settlement_policy';node('newDisputeForm').prepend(policy);if(epoch!==sessionEpoch)return;await loadCustomerDisputes();if(epoch!==sessionEpoch)return;node('disputesMember').hidden=false;
    var form=node('newDisputeForm'),pending=null;form.addEventListener('submit',function(event){event.preventDefault();if(!form.reportValidity())return;var item=form.elements.namedItem('item').value,reason=form.elements.reason.value.trim();
      if(!validId(item)||reason.length<5){notice('disputeStatus','invalid_request',true);return;}var signature=item+'|'+reason;if(!pending||pending.signature!==signature)pending={signature:signature,id:uuid()};
      run(function(){return backend.disputeOpen(item,reason,pending.id);},async function(result){form.reset();pending=null;await loadCustomerDisputes();await openConversation(result.id);},node('disputeStatus'));
    });node('customerMore').addEventListener('click',function(){target+=50;loadCustomerDisputes().catch(function(error){notice('managementStatus',errorKey(error),true);});});
    var selected=new URL(location.href).searchParams.get('id');if(selected)openConversation(selected);
  }
  async function adminPage() {
    if(profile.role!=='admin'){node('supportDenied').hidden=false;return;}
    await updateOverview();if(!user)return;node('ticketsMember').hidden=false;node('adminRefresh').hidden=false;
    document.querySelectorAll('[data-admin-tab]').forEach(function(el){el.addEventListener('click',function(){chooseTab(el.dataset.adminTab);});el.addEventListener('keydown',function(event){var buttons=Array.from(document.querySelectorAll('[data-admin-tab]')),index=buttons.indexOf(el),next;
      if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else if(event.key==='ArrowLeft')next=(index+(document.documentElement.dir==='rtl'?1:-1)+buttons.length)%buttons.length;else if(event.key==='ArrowRight')next=(index+(document.documentElement.dir==='rtl'?-1:1)+buttons.length)%buttons.length;
      if(next!==undefined){event.preventDefault();buttons[next].click();buttons[next].focus();}
    });});
    document.querySelectorAll('[data-stat-tab]').forEach(function(el){el.addEventListener('click',function(){chooseTab(el.dataset.statTab,el.dataset.statTab==='accounts'?'__banned__':undefined);});});
    node('adminRefresh').addEventListener('click',function(){refreshAdmin().catch(function(error){notice('managementStatus',errorKey(error),true);});});
    node('adminMore').addEventListener('click',function(){target+=50;loadAdminRows();});node('topupMore').addEventListener('click',function(){topupTarget+=50;loadAdminRows();});
    chooseTab(location.hash.slice(1));
  }
  function denyAdmin() {
    sessionEpoch++;listRevision++;closeDialog();adminRows=[];topups=[];overview=null;
    node('ticketsMember').hidden=true;node('adminIdentity').hidden=true;node('adminEmail').textContent='';node('adminRefresh').hidden=true;
    node('myTicketsList').replaceChildren();node('topupRows').replaceChildren();node('sectionForm').replaceChildren();node('supportDenied').hidden=false;
  }
  async function initialize() {
    var epoch=sessionEpoch;user=backend.currentUser();localize();
    if(!user){node('managementGuest').hidden=false;node('managementSignIn').href='./account.html?return='+encodeURIComponent(location.pathname.split('/').pop()+location.search+location.hash);return;}
    profile=await backend.profile();if(epoch!==sessionEpoch)return;
    if(page==='admin')await adminPage();else if(page==='sell')await sellerPage();else await disputesPage();
  }
  window.addEventListener('account:languagechange',localize);
  window.addEventListener('account:signed-out',function(){sessionEpoch++;listRevision++;user=null;profile=null;overview=null;adminRows=[];topups=[];verificationRows=[];customerRows=[];purchases=[];settlementRows=[];closeDialog();
    ['ticketsMember','sellerMember','disputesMember','adminIdentity','adminRefresh'].forEach(function(id){if(node(id))node(id).hidden=true;});
    ['myTicketsList','topupRows','verificationRows','disputeRows','sectionForm'].forEach(function(id){if(node(id))node(id).replaceChildren();});if(node('adminEmail'))node('adminEmail').textContent='';node('managementGuest').hidden=false;
  });
  window.addEventListener('pagehide',closeDialog);
  var ready=document.readyState==='loading'?new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});}):Promise.resolve();
  Promise.all([ready,backend.ready]).then(initialize).catch(function(error){notice('managementStatus',errorKey(error),true);});
})();
