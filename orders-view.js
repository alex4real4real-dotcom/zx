(function () {
  'use strict';
  var backend = window.accountBackend;
  var TEXT = {
    kicker:['طلباتي','MY ORDERS'], title:['تابع طلبك واستعرض معلومات الحساب','Track your order and view account information'],
    intro:['هنا تجد مشترياتك وتفاصيل التسليم. إذا واجهت مشكلة في طلبك، يمكنك فتح نزاع ومتابعته مع البائع والإدارة.','View your purchases and delivery details. If there is a problem with an order, open a dispute and follow up with the seller and support team.'],
    payment:['حالة الدفع','Payment status'], payment_copy:['الطلبات الحالية تجريبية؛ لا تُخصم أموال أو تُحجز مبالغ.','Current orders are tests. No money is charged or held.'],
    delivery:['تسليم الحسابات','Account delivery'], delivery_copy:['استعرض حالة التسليم ومعلومات طلبك من حسابك الشخصي.','View delivery status and order information from your own account.'],
    fair:['نزاع عادل','Fair disputes'], fair_copy:['وضّح المشكلة لتراجع الإدارة تفاصيل النزاع وردود الطرفين.','Describe the issue so the team can review the dispute and both parties’ replies.'],
    email:['البريد الإلكتروني المستخدم في الشراء','Purchase email address'], refresh:['اعرض طلباتي','View my orders'],
    guest:['سجّل الدخول لعرض مشترياتك ومتابعة طلباتك.','Sign in to view your purchases and track your orders.'], login:['تسجيل الدخول','Sign in'],
    loading:['جارٍ تحميل الطلبات…','Loading orders…'], empty:['لا توجد طلبات حتى الآن.','You do not have any orders yet.'],
    test:['طلب تجريبي','Test order'], unknown:['حالة الدفع غير مؤكدة','Payment not confirmed'],
    open:['نزاع مفتوح','Open dispute'], resolved_buyer:['حُسم للمشتري','Resolved for buyer'], resolved_seller:['حُسم للبائع','Resolved for seller'], closed:['النزاع مغلق','Dispute closed'],
    price:['الإجمالي','Total'], quantity:['الكمية','Quantity'], order:['رقم الطلب','Order'],
    test_note:['هذا الطلب تجريبي ولا يمثل دفعة حقيقية أو مبلغًا محتجزًا.','This is a test order. It does not represent a real payment or funds held.'],
    pending_note:['لم تُؤكّد عملية دفع حقيقية لهذا الطلب.','A real payment has not been confirmed for this order.'],
    private:['معلومات الحساب خاصة بصاحب الطلب','Account information is private to the buyer'],
    show:['عرض معلومات الحساب','View account information'],
    test_delivery:['لا توجد بيانات تسليم مؤكدة لهذا الطلب التجريبي. لا يمنح الطلب التجريبي إمكانية الوصول إلى كلمات مرور الحسابات المعروضة.','There is no confirmed delivery for this test order. Test orders do not grant access to the passwords of listed accounts.'],
    pending_delivery:['لا توجد بيانات تسليم متاحة لهذا الطلب حاليًا. يمكنك متابعة المشكلة من خلال النزاع.','No delivery information is available for this order yet. You can follow up through a dispute.'],
    new_dispute:['فتح نزاع','Open a dispute'], view_dispute:['عرض النزاع','View dispute'],
    chat_note:['المحادثة مع البائع متاحة من داخل النزاع الخاص بالطلب.','You can message the seller through the order’s dispute conversation.'],
    failed:['تعذّر تحميل الطلبات. حاول مجددًا.','Could not load orders. Please try again.']
  };
  var orders = [], disputes = [], products = [], revision = 0, ready = false;
  function node(id) { return document.getElementById(id); }
  function english() { return document.documentElement.lang === 'en'; }
  function t(key) { return TEXT[key][english() ? 1 : 0]; }
  function make(tag, text, cls) { var el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
  function icon(cls) { var el = make('i', undefined, cls); el.setAttribute('aria-hidden','true'); return el; }
  function money(value) { return new Intl.NumberFormat(english() ? 'en-GB' : 'ar-SA', {style:'currency',currency:'SAR'}).format(Number(value) || 0); }
  function date(value) { var d = new Date(value); return Number.isNaN(d.valueOf()) ? '' : new Intl.DateTimeFormat(english() ? 'en-GB' : 'ar-SA-u-ca-gregory-nu-latn', {dateStyle:'medium',timeStyle:'short'}).format(d); }
  function uuid(value) { return /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value || ''); }
  function testOrder(order) { return order.payment_mode === 'test' || order.is_test === true || /test/i.test(order.status || ''); }
  function notice(text, error) { node('ordersStatus').textContent = text || ''; node('ordersStatus').classList.toggle('error', !!error); }
  function localize() {
    document.querySelectorAll('[data-orders-text]').forEach(function(el){ el.textContent=t(el.dataset.ordersText); });
    document.title = t('kicker') + ' | Account';
    if (ready) render();
  }
  function platform(item) {
    var product = products.find(function(p){return p.id === item.product_id;}) || {};
    var types = {instagram:'fa-brands fa-instagram',x:'fa-brands fa-x-twitter',tiktok:'fa-brands fa-tiktok',snapchat:'fa-brands fa-snapchat',facebook:'fa-brands fa-facebook',youtube:'fa-brands fa-youtube',game:'fa-solid fa-gamepad',service:'fa-solid fa-briefcase'};
    var type=product.listing_type || item.listing_type, box=make('span',undefined,'order-platform' + (type==='instagram'?' is-instagram':''));
    box.append(icon(types[type] || 'fa-solid fa-box-open'));
    return box;
  }
  function render() {
    var host=node('orderList'), expanded=new Set(Array.from(host.querySelectorAll('details[open]')).map(function(el){return el.dataset.item;}));
    host.replaceChildren();
    if (!backend.currentUser()) return;
    var count=0;
    orders.forEach(function(order){
      (order.items || []).forEach(function(item){
        count++;
        var dispute=disputes.find(function(d){return d.order_item_id===item.id;}), isTest=testOrder(order);
        var card=make('article',undefined,'order-card'), heading=make('div',undefined,'order-heading'), info=make('div');
        info.append(make('h2',item.title),make('p',t('price')+': '+money(Number(item.unit_price)*Number(item.quantity))+' · '+t('quantity')+': '+item.quantity,'order-price'));
        info.append(make('span',t(dispute && TEXT[dispute.status] ? dispute.status : isTest ? 'test' : 'unknown'),'order-badge'+(dispute?' dispute':'')));
        heading.append(platform(item),info); card.append(heading);
        var meta=make('div',undefined,'order-meta'), id=make('span',t('order')+' #'+String(order.id).slice(0,8),'order-id'); id.title=String(order.id);meta.append(id,make('time',date(order.created_at))); card.append(meta);
        var note=make('p',undefined,'order-note');note.append(icon('fa-solid fa-shield-halved'),make('span',t(isTest?'test_note':'pending_note')));card.append(note);
        var details=make('details',undefined,'order-delivery'); details.dataset.item=item.id;details.open=expanded.has(item.id);
        var summary=make('summary'),label=make('span',undefined,'order-delivery-label');label.append(icon('fa-solid fa-key'),make('span',t('private')));
        var reveal=make('span',undefined,'orders-button');reveal.append(icon('fa-solid fa-eye'),make('span',t('show')));summary.append(label,reveal);
        details.append(summary,make('div',t(isTest?'test_delivery':'pending_delivery'),'order-delivery-body'));card.append(details);
        var actions=make('div',undefined,'order-actions'), link=make('a',undefined,'orders-button outline');
        link.append(icon('fa-solid fa-scale-balanced'),make('span',t(dispute?'view_dispute':'new_dispute')));
        if(dispute && uuid(dispute.id)) link.href='./seller-disputes.html?id='+encodeURIComponent(dispute.id);
        else if(uuid(item.id)) link.href='./seller-disputes.html?item='+encodeURIComponent(item.id)+'#newDisputeForm';
        else {link.href='./seller-disputes.html';}
        actions.append(link);card.append(actions);
        var chat=make('p',undefined,'order-chat-note');chat.append(icon('fa-solid fa-lock'),make('span',t('chat_note')));card.append(chat);host.append(card);
      });
    });
    if(!count) host.append(make('p',t('empty'),'orders-empty'));
  }
  function guest() { revision++;ready=false;orders=[];disputes=[];products=[];node('orderList').replaceChildren();node('ordersEmail').value='';node('ordersMember').hidden=true;node('ordersGuest').hidden=false;notice(''); }
  async function load() {
    if(!backend.currentUser()){guest();return;}
    var token=++revision, user=backend.currentUser();node('ordersGuest').hidden=true;node('ordersMember').hidden=false;node('ordersEmail').value=user.email || '';node('ordersRefresh').disabled=true;notice(t('loading'));
    try {
      var result=await Promise.allSettled([backend.orders(),backend.disputes(),backend.products()]);
      if(token!==revision || !backend.currentUser() || backend.currentUser().id!==user.id)return;
      if(result[0].status!=='fulfilled')throw result[0].reason;
      orders=result[0].value || [];disputes=result[1].status==='fulfilled'?result[1].value || []:[];products=result[2].status==='fulfilled'?result[2].value || []:[];
      ready=true;render();notice('');
    }catch(error){if(token!==revision)return;orders=[];ready=false;node('orderList').replaceChildren();notice(t('failed'),true);}
    finally{if(token===revision)node('ordersRefresh').disabled=false;}
  }
  var domReady=document.readyState==='loading'?new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});}):Promise.resolve();
  domReady.then(function(){localize();node('ordersLookup').addEventListener('submit',function(event){event.preventDefault();load();});window.addEventListener('account:languagechange',localize);window.addEventListener('account:signed-out',guest);});
  Promise.all([domReady,backend.ready]).then(load).catch(function(){notice(t('failed'),true);});
})();
