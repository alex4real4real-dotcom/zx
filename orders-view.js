(function () {
  'use strict';
  var backend = window.accountBackend, disputesOnly=document.body.dataset.ordersMode==='disputes';
  var TEXT = {
    kicker:['طلباتي','MY ORDERS'], title:['تابع طلبك واستعرض معلومات الحساب','Track your order and view account information'],
    intro:['تابع مشترياتك ومبيعاتك. افتح النزاع بجانب السلعة، وتابع المحادثة والقرار من البطاقة نفسها.','Track your purchases and sales. Open a dispute beside the item and follow the conversation and decision in the same card.'],
    payment:['حالة الدفع','Payment status'], payment_copy:['الدفع غير مفعّل حاليًا. تظهر حالة كل طلب وفق سجله، ولا يُؤكّد الدفع دون تحصيل فعلي.','Payments are currently inactive. Each order reflects its recorded status; payment is not confirmed without an actual charge.'],
    delivery:['تسليم الحسابات','Account delivery'], delivery_copy:['استعرض حالة التسليم ومعلومات طلبك من حسابك الشخصي.','View delivery status and order information from your own account.'],
    fair:['نزاع عادل','Fair disputes'], fair_copy:['إغلاق البائع يحسم للمشتري، وإغلاق المشتري لصالح البائع يحسم للبائع. يمكن للإدارة الفصل، والحسم نهائي.','Seller closure awards the buyer; buyer closure in the seller’s favor awards the seller. Support can decide too. Decisions are final.'],
    refresh:['تحديث الطلبات','Refresh orders'],
    guest:['سجّل الدخول لعرض مشترياتك ومتابعة طلباتك.','Sign in to view your purchases and track your orders.'], login:['تسجيل الدخول','Sign in'],
    loading:['جارٍ تحميل الطلبات…','Loading orders…'], empty:['لا توجد طلبات حتى الآن.','You do not have any orders yet.'],
    test:['طلب تجريبي','Test order'], unknown:['حالة الدفع غير مؤكدة','Payment not confirmed'],
    open:['نزاع مفتوح','Open dispute'], resolved_buyer:['حُسم للمشتري','Resolved for buyer'], resolved_seller:['حُسم للبائع','Resolved for seller'], closed:['النزاع مغلق','Dispute closed'],
    price:['الإجمالي','Total'], quantity:['الكمية','Quantity'], order:['رقم الطلب','Order'],
    test_note:['هذا الطلب تجريبي ولا يمثل دفعة حقيقية أو مبلغًا محتجزًا.','This is a test order. It does not represent a real payment or funds held.'],
    pending_note:['لم تُؤكّد عملية دفع حقيقية لهذا الطلب.','A real payment has not been confirmed for this order.'],
    private:['معلومات الحساب خاصة بصاحب الطلب','Account information is private to the buyer'],
    show:['عرض معلومات الحساب','View account information'],
    test_delivery:['لم يحدد البائع بيانات وهمية للتسليم في هذا الطلب التجريبي.','The seller has not enabled dummy-data delivery for this test order.'],
    dummy_note:['بيانات وهمية سلّمها البائع لهذه التجربة.','Dummy details supplied by the seller for this test.'],account_email:['البريد الإلكتروني للحساب','Account email'],email_password:['كلمة مرور البريد','Email password'],account_username:['يوزر الحساب','Account username'],account_password:['كلمة مرور الحساب','Account password'],reveal_password:['إظهار','Show'],hide_password:['إخفاء','Hide'],
    pending_delivery:['لا توجد بيانات تسليم متاحة لهذا الطلب حاليًا. يمكنك متابعة المشكلة من خلال النزاع.','No delivery information is available for this order yet. You can follow up through a dispute.'],
    new_dispute:['فتح نزاع','Open a dispute'], view_dispute:['عرض النزاع','View dispute'],
    chat_note:['تُتابع محادثة النزاع هنا داخل بطاقة السلعة، ولا يمكن إعادة فتح النزاع بعد إغلاقه.','Follow the dispute here in the item card. A closed dispute cannot be reopened.'],
    held:['المبلغ معلّق — محاكاة','Amount held — simulation'], disputed:['المبلغ معلّق لدى الإدارة — محاكاة','Amount held for review — simulation'], released:['خُصّص المبلغ للبائع — محاكاة','Amount allocated to seller — simulation'], refunded:['رُد المبلغ للمشتري — محاكاة','Amount refunded to buyer — simulation'], needs_review:['التسوية تحتاج مراجعة الإدارة — محاكاة','Settlement needs review — simulation'],
    deadline:['آخر موعد لفتح نزاع','Dispute deadline'], expired:['انتهت مهلة النزاع','Dispute window ended'], legacy:['طلب سابق لتطبيق سياسة 12 ساعة.','This order predates the 12-hour policy.'], awaiting:['انتهت المهلة؛ جارٍ انتظار التسوية من الخادم.','The window ended; awaiting server settlement.'], policy_scope:['بعد تفعيل الدفع: تبقى قيمة السلعة معلّقة لمدة 12 ساعة، ويوقف النزاع التسوية حتى إغلاقه. الخدمات المالية غير مفعّلة حاليًا.','Once payments are activated, the item amount will be held for 12 hours. A dispute pauses settlement until closure. Financial services are currently inactive.'],
    purchase:['عملية شراء','Purchase'],sale:['عملية بيع','Sale'],cases_kicker:['نزاعاتي','MY DISPUTES'],cases_title:['تابع نزاعك بجانب السلعة','Follow your dispute beside the item'],cases_intro:['راجع المحادثة ونتيجة النزاع في بطاقة السلعة نفسها. لفتح نزاع جديد استخدم الزر بجانب السلعة في طلباتك.','Review the conversation and outcome in the item’s card. To open a new dispute, use the button beside the item in your orders.'],cases_empty:['لا توجد نزاعات لطلباتك حاليًا.','Your orders do not have any disputes yet.'],
    failed:['تعذّر تحميل الطلبات. حاول مجددًا.','Could not load orders. Please try again.']
  };
  var orders = [], disputes = [], products = [], revision = 0, ready = false, settlements = [], serverOffset = 0;
  function node(id) { return document.getElementById(id); }
  function english() { return document.documentElement.lang === 'en'; }
  function t(key) { return TEXT[key][english() ? 1 : 0]; }
  function make(tag, text, cls) { var el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
  function icon(cls) { var el = make('i', undefined, cls); el.setAttribute('aria-hidden','true'); return el; }
  function money(value) { return window.CurrencySystem.format(value); }
  function date(value) { var d = new Date(value); return Number.isNaN(d.valueOf()) ? '' : new Intl.DateTimeFormat(english() ? 'en-GB' : 'ar-SA-u-ca-gregory-nu-latn', {dateStyle:'medium',timeStyle:'short'}).format(d); }
  function uuid(value) { return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value || ''); }
  function testOrder(order) { return order.payment_mode === 'test' || order.is_test === true || /test/i.test(order.status || ''); }
  function notice(text, error) { node('ordersStatus').textContent = text || ''; node('ordersStatus').classList.toggle('error', !!error); }
  function localize() {
    document.querySelectorAll('[data-orders-text]').forEach(function(el){ el.textContent=t(el.dataset.ordersText); });
    if(disputesOnly){[['.orders-kicker','cases_kicker'],['.orders-title','cases_title'],['.orders-copy','cases_intro']].forEach(function(pair){document.querySelector(pair[0]).textContent=t(pair[1]);});}
    document.title = t(disputesOnly?'cases_kicker':'kicker') + ' | Account';
    if (ready) render();
  }
  function platform(item) {
    var product = products.find(function(p){return p.id === item.product_id;}) || {};
    return window.ListingPlatforms.create(product.listing_type || item.listing_type, 'order-platform');
  }

  function deliveryFields(body, result) {
    body.replaceChildren();
    if(result.state!=='delivered'){body.append(make('p',t('test_delivery')));return;}
    body.append(make('p',t('dummy_note'),'order-dummy-note'));
    ['account_username','account_email','account_password','email_password'].forEach(function(key){
      var label=make('label',undefined,'order-secret-field'),caption=make('span',t(key)),row=make('span',undefined,'order-secret-value'),input=make('input');
      input.readOnly=true;input.value=String(result.credentials&&result.credentials[key]||'');input.dir='ltr';input.autocomplete='off';input.spellcheck=false;
      var secret=/password/.test(key);input.type=secret?'password':'text';row.append(input);
      if(secret){var button=make('button',t('reveal_password'),'order-secret-toggle');button.type='button';button.setAttribute('aria-pressed','false');button.addEventListener('click',function(){var show=input.type==='password';input.type=show?'text':'password';button.textContent=t(show?'hide_password':'reveal_password');button.setAttribute('aria-pressed',String(show));});row.append(button);}
      label.append(caption,row);body.append(label);
    });
  }
  function mountDelivery(details,body,item){
    details.addEventListener('toggle',async function(){
      if(!details.open){body.replaceChildren();return;}
      var token=revision,user=backend.currentUser();body.textContent=t('loading');
      try{var result=await backend.orderDelivery(item.id);if(token!==revision||!details.open||!body.isConnected||!backend.currentUser()||backend.currentUser().id!==user.id)return;deliveryFields(body,result);}
      catch(error){if(token===revision&&details.open&&body.isConnected)body.textContent=t('failed');}
    });
  }
  function settlementFor(item) { return settlements.find(function(s){return s.order_item_id===item.id;}); }
  function serverNow() { return Date.now()+serverOffset; }
  function render() {
    var host=node('orderList'), expanded=new Set(Array.from(host.querySelectorAll('details[open]')).map(function(el){return el.dataset.item;}));
    host.replaceChildren();
    if (!backend.currentUser()) return;
    var count=0;
    orders.forEach(function(order){
      (order.items || []).forEach(function(item){
        var settlement=settlementFor(item), dispute=disputes.find(function(d){return d.order_item_id===item.id;}), isTest=testOrder(order);
        if(disputesOnly&&!dispute)return;count++;
        var current=backend.currentUser(),isBuyer=order.user_id===current.id,isSeller=item.seller_id===current.id;
        var query=new URL(location.href).searchParams;
        var card=make('article',undefined,'order-card'), heading=make('div',undefined,'order-heading'), info=make('div');
        info.append(make('h2',item.title),make('p',t('price')+': '+money(Number(item.unit_price)*Number(item.quantity))+' · '+t('quantity')+': '+item.quantity,'order-price'));
        info.append(make('span',t(dispute && TEXT[dispute.status] ? dispute.status : isTest ? 'test' : 'unknown'),'order-badge'+(dispute?' dispute':'')));
        info.append(make('span',t(isBuyer?'purchase':'sale'),'order-side'));heading.append(platform(item),info); card.append(heading);
        var meta=make('div',undefined,'order-meta'), id=make('span',t('order')+' #'+String(order.id).slice(0,8),'order-id'); id.title=String(order.id);meta.append(id,make('time',date(order.created_at))); card.append(meta);
        if(settlement){
          var status=make('p',t(settlement.state),'order-settlement');
          if(settlement.state==='held'){status.append(make('br'),make('span',t('deadline')+': '+date(settlement.release_at)));if(serverNow()>=Date.parse(settlement.release_at))status.append(make('br'),make('span',t('awaiting')));}
          card.append(status);
        }else card.append(make('p',t('legacy'),'order-settlement'));
        var note=make('p',undefined,'order-note');note.append(icon('fa-solid fa-shield-halved'),make('span',t(isTest?'test_note':'pending_note')));card.append(note);
        if(isBuyer){var details=make('details',undefined,'order-delivery'); details.dataset.item=item.id;details.open=expanded.has(item.id);
        var summary=make('summary'),label=make('span',undefined,'order-delivery-label');label.append(icon('fa-solid fa-key'),make('span',t('private')));
        var reveal=make('span',undefined,'orders-button');reveal.append(icon('fa-solid fa-eye'),make('span',t('show')));summary.append(label,reveal);
        var deliveryBody=make('div',undefined,'order-delivery-body');details.append(summary,deliveryBody);mountDelivery(details,deliveryBody,item);card.append(details);}
        var canOpen=isBuyer&&(!settlement||(settlement.state==='held'&&serverNow()<Date.parse(settlement.release_at)));
        window.OrderDisputes.mount(card,{item:item,dispute:dispute,isBuyer:isBuyer,isSeller:isSeller,canOpen:canOpen,refresh:load,
          initialOpen:!!(dispute&&(query.get('id')===dispute.id||query.get('item')===item.id))});
        if(!dispute&&isBuyer&&!canOpen)card.append(make('p',t('expired'),'order-window-ended'));
        var chat=make('p',undefined,'order-chat-note');chat.append(icon('fa-solid fa-lock'),make('span',t('chat_note')));card.append(chat);host.append(card);
      });
    });
    if(!count) host.append(make('p',t(disputesOnly?'cases_empty':'empty'),'orders-empty'));
  }
  function guest() { if(window.OrderDisputes)window.OrderDisputes.reset();revision++;ready=false;orders=[];disputes=[];products=[];settlements=[];node('orderList').replaceChildren();node('ordersMember').hidden=true;node('ordersGuest').hidden=false;notice(''); }
  async function allDisputes() { var rows=[],part;do{part=await backend.disputes(rows.length);rows=rows.concat(part);}while(part.length===50);return rows; }
  async function load() {
    if(!backend.currentUser()){guest();return;}
    var token=++revision, user=backend.currentUser();node('ordersGuest').hidden=true;node('ordersMember').hidden=false;node('ordersRefresh').disabled=true;notice(t('loading'));
    try {
      var result=await Promise.allSettled([backend.orders(),allDisputes(),backend.products(),backend.testSettlements(),backend.sellerOrders()]);
      if(token!==revision || !backend.currentUser() || backend.currentUser().id!==user.id)return;
      if(result[0].status!=='fulfilled')throw result[0].reason;
      if(result[3].status!=='fulfilled')throw result[3].reason;
      if(result[1].status!=='fulfilled')throw result[1].reason;
      if(result[4].status!=='fulfilled')throw result[4].reason;
      settlements=result[3].value.settlements || [];serverOffset=Date.parse(result[3].value.server_now)-Date.now();
      var merged=new Map();(result[0].value||[]).concat(result[4].value||[]).forEach(function(order){var existing=merged.get(order.id);if(!existing)merged.set(order.id,Object.assign({},order,{items:(order.items||[]).slice()}));else(order.items||[]).forEach(function(item){if(!existing.items.some(function(i){return i.id===item.id;}))existing.items.push(item);});});orders=Array.from(merged.values()).sort(function(a,b){return Date.parse(b.created_at)-Date.parse(a.created_at);});disputes=result[1].status==='fulfilled'?result[1].value || []:[];products=result[2].status==='fulfilled'?result[2].value || []:[];
      ready=true;render();notice('');
    }catch(error){if(token!==revision)return;orders=[];ready=false;node('orderList').replaceChildren();notice(t('failed'),true);}
    finally{if(token===revision)node('ordersRefresh').disabled=false;}
  }
  var domReady=document.readyState==='loading'?new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});}):Promise.resolve();
  domReady.then(function(){localize();node('ordersRefresh').addEventListener('click',load);window.addEventListener('account:languagechange',localize);window.addEventListener('account:signed-out',guest);
    var scope=make('p',t('policy_scope'),'order-policy');scope.dataset.ordersText='policy_scope';document.querySelector('.orders-features').after(scope);
    setInterval(function(){if(ready&&!document.hidden&&!node('ordersRefresh').disabled&&(settlements.some(function(s){return s.state==='held'||s.state==='disputed';})||disputes.some(function(d){return d.status==='open';})))load();},60000);});
  window.addEventListener('pagehide',function(){document.querySelectorAll('.order-delivery').forEach(function(details){details.open=false;details.querySelector('.order-delivery-body').replaceChildren();});});
  Promise.all([domReady,backend.ready]).then(load).catch(function(){notice(t('failed'),true);});
})();
