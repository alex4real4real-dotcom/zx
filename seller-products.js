(function () {
  'use strict';
  var backend = window.accountBackend;
  var SOCIAL = ['x','instagram','snapchat','tiktok','facebook','youtube'];
  var TYPES = {x:['منصة X','X'],instagram:['إنستغرام','Instagram'],snapchat:['سناب شات','Snapchat'],tiktok:['تيك توك','TikTok'],facebook:['فيسبوك','Facebook'],youtube:['يوتيوب','YouTube'],service:['خدمة رقمية','Digital service'],game:['لعبة أو اشتراك','Game or subscription']};
  var TEXT = {
    title:['إضافة خدمة جديدة','Add a new listing'],intro:['أضف بيانات السلعة لتظهر في متجرك وكتالوج السوق.','Add your listing to your store and the marketplace.'],
    name:['اسم الخدمة *','Listing name *'],user:['يوزر الحساب *','Account username *'],price:['السعر (ر.س) *','Price (SAR) *'],kind:['نوع العرض *','Listing type *'],
    hint:['كل منصة تواصل تظهر برمزها تلقائيًا، أما الخدمات والألعاب فتظهر بأيقونة دون صورة.','Social accounts use their platform icon. Services and games use an icon.'],
    private:['بيانات الحساب المعروض للبيع','Account details for this listing'],email:['البريد الإلكتروني للحساب *','Account email *'],email_password:['باسورد البريد *','Email password *'],username:['يوزر الحساب *','Account username *'],password:['باسورد الحساب *','Account password *'],
    privacy:['هذه البيانات خاصة بك ولا تظهر في صفحة المنتج العامة أو الطلبات التجريبية.','These details are private and are not shown in the public listing or test orders.'],
    description:['وصف مختصر للخدمة','Short description'],publish:['نشر المنتج','Publish listing'],draft:['حفظ السلعة كمسودة','Save listing as a draft'],update:['حفظ التعديلات','Save changes'],cancel:['إلغاء التعديل','Cancel editing'],
    mine:['سلعي','My listings'],refresh:['تحديث','Refresh'],edit:['تعديل','Edit'],hide:['إخفاء','Hide'],show:['نشر','Publish'],live:['منشور','Published'],hidden:['مسودة / مخفي','Draft / hidden'],more:['عرض المزيد','Load more'],empty:['لم تُضف أي سلع بعد. أضف سلعتك الأولى من النموذج أعلاه.','No listings yet. Add your first listing using the form above.'],
    loading:['جارٍ تحميل سلعك…','Loading your listings…'],saved:['حُفظت السلعة ونُشرت في المتجر.','Your listing was saved and published.'],draft_saved:['حُفظت السلعة كمسودة. يمكنك نشرها بعد توثيق الحساب.','Your listing was saved as a draft. Verify your account to publish it.'],hidden_saved:['أُخفيت السلعة من المتجر.','Your listing is now hidden.'],hidden_updated:['حُفظت التعديلات. السلعة مخفية حاليًا ويمكنك نشرها من قائمة سلعك.','Changes saved. This listing is hidden; publish it from your listings.'],saved_refresh:['حُفظت السلعة، لكن تعذّر تحديث القائمة. اضغط تحديث.','Saved, but the list could not refresh. Select Refresh.'],
    login:['سجّل الدخول لإضافة سلعك وإدارتها.','Sign in to add and manage listings.'],sign_in:['تسجيل الدخول','Sign in'],verify_hint:['يمكنك تجهيز سلعك كمسودات الآن. يتطلب نشرها في المتجر توثيق حساب البائع.','You can prepare drafts now. Verify your seller account to publish them.'],verify:['توثيق الحساب','Verify account'],
    failed:['تعذّر تنفيذ الطلب. حاول مرة أخرى.','The request failed. Please try again.'],unavailable:['الخدمة غير جاهزة حاليًا. حاول لاحقًا.','This service is not ready. Please try later.'],invalid:['راجع اسم السلعة والسعر والحقول المطلوبة.','Check the listing name, price and required fields.'],invalid_credentials:['أكمل بيانات الحساب المعروض للبيع.','Complete the account details for this listing.'],not_found:['هذه السلعة غير موجودة أو لا تخص حسابك.','This listing is unavailable or does not belong to you.'],blocked:['حسابك موقوف ولا يمكنه إضافة السلع.','Your account is suspended.'],limit:['وصلت إلى الحد الأقصى للسلع.','You have reached the listing limit.'],email_required:['فعّل بريد حسابك قبل إضافة السلع.','Confirm your email before adding listings.'],
    placeholder:['مثال: لعبة فيفا 27','For example: FIFA 27'],user_placeholder:['مثال: xx7a','For example: xx7a'],description_placeholder:['اكتب وصفًا مختصرًا للخدمة…','Write a short description…']
  };
  var form, user, profile, canPublish = false, busy = false, epoch = 0, listEpoch = 0, rows = [], more = false, editing = false, productId = null;
  function node(id) { return document.getElementById(id); }
  function uuid() { if (crypto.randomUUID) return crypto.randomUUID(); var bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=bytes[6]&15|64;bytes[8]=bytes[8]&63|128;var h=Array.from(bytes,function(b){return b.toString(16).padStart(2,'0');}).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20); }
  function english() { return window.AppI18N && window.AppI18N.getLang() !== 'ar'; }
  function t(key) { var text = TEXT[key] || TYPES[key]; return text ? text[english()?1:0] : key; }
  function status(key, error) { var el = node('sellerStatus'); el.dataset.messageKey = key || ''; el.hidden = !key; el.textContent = key ? t(key) : ''; el.classList.toggle('is-error', !!error); }
  function errorKey(error) { var s = String(error && error.message || error || ''); if(/SELLER_VERIFICATION_REQUIRED/.test(s))return 'verify_hint'; if(/EMAIL_CONFIRMATION_REQUIRED/.test(s))return 'email_required'; if(/INVALID_CREDENTIALS/.test(s))return 'invalid_credentials'; if(/INVALID_PRODUCT|23514/.test(s))return 'invalid'; if(/PRODUCT_NOT_FOUND/.test(s))return 'not_found'; if(/PRODUCT_LIMIT/.test(s))return 'limit'; if(/ACCOUNT_BANNED/.test(s))return 'blocked'; if(/AUTH_REQUIRED/.test(s))return 'login'; if(/schema|PGRST20[25]|does not exist|permission denied/i.test(s))return 'unavailable'; return 'failed'; }
  function make(tag,css,text) { var el=document.createElement(tag);if(css)el.className=css;if(text!==undefined)el.textContent=text;return el; }
  function setBusy(value) { busy=value; node('listingFields').disabled=value||!user; node('cancelListing').disabled=value; node('sellerRefresh').disabled=value; document.querySelectorAll('[data-seller-action]').forEach(function(el){el.disabled=value;}); }
  function updateKind() {
    var social=SOCIAL.includes(form.elements.kind.value);node('listingCredentials').hidden=!social;node('listingCredentials').disabled=!social;
    node('listingNameLabel').textContent=t(social?'user':'name');form.elements.title.placeholder=t(social?'user_placeholder':'placeholder');
    form.elements.title.autocomplete='off';
  }
  function localize() {
    document.querySelectorAll('[data-seller-text]').forEach(function(el){el.textContent=t(el.dataset.sellerText);});
    document.querySelectorAll('[data-seller-type]').forEach(function(el){el.textContent=t(el.dataset.sellerType);});
    document.title=t('title')+' | Account';
    if(form){updateKind();form.elements.description.placeholder=t('description_placeholder');node('listingSubmitText').textContent=t(editing?'update':canPublish?'publish':'draft');}
    var key=node('sellerStatus').dataset.messageKey;if(key)node('sellerStatus').textContent=t(key);render();
  }
  function resetForm() { form.reset(); productId=null; editing=false; node('cancelListing').hidden=true; updateKind();node('listingSubmitText').textContent=t(canPublish?'publish':'draft'); }
  function money(value) { return new Intl.NumberFormat(english()?'en-GB':'ar-SA',{style:'currency',currency:'SAR'}).format(Number(value)); }
  function render() {
    var host=node('sellerRows');host.replaceChildren();
    if(!rows.length&&user)host.append(make('p','seller-copy',t('empty')));
    rows.forEach(function(row){
      var card=make('article','seller-product'),top=make('div','seller-product-top'),info=make('div');info.append(make('h3','',row.title),make('strong','',money(row.price)));top.append(info,make('span','seller-badge',t(row.active?'live':'hidden')));card.append(top,make('p','',t(row.listing_type||'service')));
      if(row.description)card.append(make('p','',row.description));
      var actions=make('div','seller-actions');[['edit',function(){editProduct(row.id);}], [row.active?'hide':'show',function(){changeVisibility(row);}]].forEach(function(pair){var b=make('button','seller-button secondary',t(pair[0]));b.type='button';b.dataset.sellerAction='';b.disabled=busy;b.addEventListener('click',pair[1]);actions.append(b);});card.append(actions);host.append(card);
    });node('sellerMore').hidden=!more;
  }
  async function loadProducts(append) {
    var current=++listEpoch,session=epoch,offset=append?rows.length:0;
    node('sellerMore').disabled=true;
    try { var batch=await backend.sellerProducts(offset);if(current!==listEpoch||session!==epoch)return;rows=append?rows.concat(batch):batch;more=batch.length===24;render(); }
    finally { if(current===listEpoch)node('sellerMore').disabled=false; }
  }
  async function act(operation) {
    if(busy||!user)return;var session=epoch;setBusy(true);status('');
    try { await operation(session); } catch(error){if(session===epoch)status(errorKey(error),true);} finally{setBusy(false);}
  }
  async function refreshedAfterSave(key, session) {
    status(key,false);
    try{await loadProducts(false);}catch(error){if(session===epoch)status('saved_refresh',true);}
  }
  function editProduct(id) {
    act(async function(session){var result=await backend.sellerProduct(id);if(session!==epoch)return;var row=result.product,secrets=result.credentials||{};
      productId=row.id;editing=true;form.elements.title.value=row.title;form.elements.price.value=row.price;form.elements.kind.value=row.listing_type||'service';form.elements.description.value=row.description;form.dataset.wasActive=String(row.active);
      ['account_email','email_password','account_username','account_password'].forEach(function(key){form.elements[key].value=secrets[key]||'';});updateKind();node('cancelListing').hidden=false;node('listingSubmitText').textContent=t('update');node('listingCard').scrollIntoView({behavior:'smooth',block:'start'});form.elements.title.focus();
    });
  }
  function changeVisibility(row) {
    act(async function(session){if(!row.active&&!canPublish)throw new Error('SELLER_VERIFICATION_REQUIRED');await backend.sellerSetVisibility(row.id,!row.active);if(session!==epoch)return;await refreshedAfterSave(row.active?'hidden_saved':'saved',session);});
  }
  async function initialize() {
    form=node('sellerProductForm');localize();
    form.elements.kind.addEventListener('change',updateKind);node('cancelListing').addEventListener('click',function(){if(!busy){resetForm();status('');}});
    node('sellerRefresh').addEventListener('click',function(){act(async function(){await loadProducts(false);});});node('sellerMore').addEventListener('click',function(){act(async function(){await loadProducts(true);});});
    form.addEventListener('submit',function(event){event.preventDefault();if(!form.reportValidity())return;
      act(async function(session){
        var currentProfile=await backend.profile();if(session!==epoch)return;profile=currentProfile;canPublish=!!(profile&&(profile.is_verified||profile.role==='admin'));
        var social=SOCIAL.includes(form.elements.kind.value),credentials={};if(social)['account_email','email_password','account_username','account_password'].forEach(function(key){credentials[key]=form.elements[key].value;});
        if(!productId)productId=uuid();
        var record=await backend.sellerSaveProduct({id:productId,title:form.elements.title.value.trim(),price:Number(form.elements.price.value),kind:form.elements.kind.value,description:form.elements.description.value.trim(),credentials:credentials,active:canPublish&&(!editing||form.dataset.wasActive==='true')});
        if(session!==epoch)return;resetForm();node('sellerVerification').hidden=canPublish;await refreshedAfterSave(record.active?'saved':canPublish?'hidden_updated':'draft_saved',session);
      });
    });
    var session=epoch;await backend.ready;if(session!==epoch)return;user=backend.currentUser();
    if(!user){node('sellerGuest').hidden=false;setBusy(false);return;}
    try{profile=await backend.profile();if(session!==epoch)return;canPublish=!!(profile&&(profile.is_verified||profile.role==='admin'));node('sellerVerification').hidden=canPublish;node('sellerProducts').hidden=false;setBusy(false);localize();await loadProducts(false);}catch(error){status(errorKey(error),true);}
  }
  window.addEventListener('account:languagechange',function(){if(form)localize();});
  window.addEventListener('account:signed-out',function(){epoch++;listEpoch++;user=null;profile=null;rows=[];more=false;if(form)resetForm();node('sellerRows').replaceChildren();node('sellerProducts').hidden=true;node('sellerVerification').hidden=true;node('sellerGuest').hidden=false;status('');setBusy(false);});
  window.addEventListener('pagehide',function(){if(form){['account_email','email_password','account_username','account_password'].forEach(function(key){form.elements[key].value='';});}});
  var ready=document.readyState==='loading'?new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});}):Promise.resolve();
  ready.then(initialize).catch(function(error){status(errorKey(error),true);});
})();
