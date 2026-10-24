(function () {
  'use strict';
  var backend = window.accountBackend;
  var SOCIAL = ['x','instagram','snapchat','tiktok','tellonym','discord','playstation','xbox','telegram'];
  var TYPES = {x:['X','X'],instagram:['إنستغرام','Instagram'],snapchat:['سناب شات','Snapchat'],tiktok:['تيك توك','TikTok'],tellonym:['تيلونيم','Tellonym'],discord:['ديسكورد','Discord'],playstation:['سوني (PlayStation)','PlayStation (Sony)'],xbox:['إكس بوكس','Xbox'],telegram:['تلقرام','Telegram'],service:['خدمة رقمية','Digital service'],game:['لعبة أو اشتراك','Game or subscription']};
  var TEXT = {
    bio_checking:["جارٍ فحص البايو آليًا…", "Checking the biography automatically…"],
    bio_connection:["الفحص الآلي لهذه المنصة غير متاح حاليًا ويحتاج ربطها بالموقع. لا يمكن نشر الحساب قبل تفعيل الفحص.", "Automatic verification for this platform is not connected yet. This account cannot be published until verification is available."],
    bio_unavailable:["تعذّرت قراءة البايو آليًا من المنصة. لن يُنشر الحساب دون تحقق آلي ناجح. يمكنك إعادة المحاولة لاحقًا.", "The platform biography could not be read automatically. Publication requires successful automatic verification. You can retry later."],
    bio_title:["إثبات ملكية حساب التواصل","Prove social account ownership"],
    bio_hint:["ضع الكود في بايو الحساب المعروض للبيع واجعله ظاهرًا حتى يكتمل التحقق. لا يمكن نشر الحساب قبل إثبات ملكيته.","Place the code in the account bio and keep it visible until verification is complete. Ownership must be verified before publishing."],
    bio_start:["إصدار كود الملكية","Get ownership code"],
    bio_code:["كود الملكية","Ownership code"],
    bio_copy:["نسخ الكود","Copy code"],
    bio_check:["وضعت الكود — تحقق من البايو","Code added — verify bio"],
    bio_refresh:["إعادة الفحص الآلي", "Run automatic check again"],
    bio_profile:["فتح الحساب","Open profile"],
    bio_draft:["حفظ كمسودة","Save as draft"],
    bio_required:["أثبت ملكية الحساب من قسم البايو أولًا. للسلع المحفوظة، افتح «تعديل» لإصدار الكود.","Verify account ownership in the bio section first. For saved listings, open Edit to get the code."],
    bio_username:["أدخل يوزر الحساب بالأعلى أولًا، دون رابط أو مسافات.","First enter the username above, without a URL or spaces."],
    bio_mismatch:["يوزر بيانات التسليم يجب أن يطابق يوزر الحساب الذي تم التحقق منه.","The delivery username must match the verified username."],
    bio_issued:["انسخ الكود إلى البايو ثم اضغط التحقق. الكود خاص بهذا الحساب وهذه السلعة وصالح لمدة 24 ساعة.","Copy the code into the bio, then verify. This code is tied to this account and listing and expires in 24 hours."],
    bio_pending:["لم يكتمل الفحص الآلي. اضغط التحقق لإعادة المحاولة؛ لا توجد مراجعة يدوية للملكية.", "Automatic verification is incomplete. Run the check again; ownership is never approved manually."],
    bio_missing:["لم يظهر الكود في بايو الحساب. تأكد من الحساب والكود ثم أعد الفحص الآلي.", "The code was not found in the account bio. Check the username and code, then run automatic verification again."],
    bio_approved:["تم إثبات الملكية. يمكنك نشر هذا الحساب بعد إكمال بيانات السلعة وتوثيق البائع.","Ownership verified. Complete the listing and seller verification to publish."],
    bio_expired:["انتهت صلاحية الكود. أصدر كودًا جديدًا وضعه في البايو.","Code expired. Get a new code and add it to the bio."],
    bio_rejected:["لم يتم إثبات الملكية آليًا. تأكد من البايو وأعد الفحص أو أصدر كودًا جديدًا.", "Automatic ownership verification did not succeed. Check the bio and retry or request a new code."],
    bio_rate:["انتظر قليلًا قبل إعادة التحقق أو إصدار أكواد إضافية.","Please wait before checking again or requesting more codes."],
    bio_copied:["نُسخ كود الملكية.","Ownership code copied."],
    bio_copy_failed:["انسخ الكود من الخانة يدويًا.","Copy the code from the field manually."],
    bio_draft_saved:["حُفظت السلعة كمسودة. أكمل إثبات الملكية قبل نشر حساب التواصل.","Draft saved. Verify social account ownership before publishing."],
    delete:['حذف السلعة','Delete listing'],restore:['استعادة كمسودة','Restore as draft'],deleted:['محذوفة','Deleted'],deleted_list:['المحذوفات','Deleted listings'],active_list:['العودة إلى سلعي','Back to my listings'],deleted_empty:['لا توجد سلع محذوفة.','No deleted listings.'],deleted_saved:['حُذفت السلعة من العرض. يمكنك استعادتها من المحذوفات.','Listing removed. You can restore it from Deleted listings.'],restored_saved:['استُعيدت السلعة كمسودة.','Listing restored as a draft.'],delete_confirm:['هل تريد حذف هذه السلعة من العرض؟ تبقى الطلبات السابقة محفوظة، ويمكنك استعادتها من المحذوفات.','Remove this listing? Existing orders are preserved. You can restore it from Deleted listings.'],
    title:['إضافة خدمة جديدة','Add a new listing'],intro:['أضف بيانات السلعة لتظهر في متجرك وكتالوج السوق.','Add your listing to your store and the marketplace.'],
    name:['اسم الخدمة *','Listing name *'],user:['يوزر الحساب *','Account username *'],price:['السعر (SAR) *','Price (SAR) *'],kind:['نوع العرض *','Listing type *'],
    hint:['كل منصة تواصل تظهر برمزها تلقائيًا، أما الخدمات والألعاب فتظهر بأيقونة دون صورة.','Social accounts use their platform icon. Services and games use an icon.'],
    private:['بيانات الحساب المعروض للبيع','Account details for this listing'],email:['البريد الإلكتروني للحساب *','Account email *'],email_password:['باسورد البريد *','Email password *'],username:['يوزر الحساب *','Account username *'],password:['باسورد الحساب *','Account password *'],
    privacy:['بيانات الحساب خاصة ولا تظهر في صفحة المنتج العامة.','Account details are private and hidden from the public listing.'],
    test_delivery:['هذه بيانات وهمية للاختبار، وأسمح بتسليمها لمشتري الطلب التجريبي.','These are dummy test details. Allow delivery to the test-order buyer.'],sold:['تم البيع','Sold'],sold_notice:['تم بيع هذا الحساب ولا يمكن نشره مجددًا.','This account has been sold and cannot be published again.'],
    description:['وصف مختصر للخدمة','Short description'],publish:['نشر المنتج','Publish listing'],draft:['حفظ السلعة كمسودة','Save listing as a draft'],update:['حفظ التعديلات','Save changes'],cancel:['إلغاء التعديل','Cancel editing'],
    mine:['سلعي','My listings'],refresh:['تحديث','Refresh'],edit:['تعديل','Edit'],hide:['إخفاء','Hide'],show:['نشر','Publish'],live:['منشور','Published'],hidden:['مسودة / مخفي','Draft / hidden'],more:['عرض المزيد','Load more'],empty:['لم تُضف أي سلع بعد. أضف سلعتك الأولى من النموذج أعلاه.','No listings yet. Add your first listing using the form above.'],
    loading:['جارٍ تحميل سلعك…','Loading your listings…'],saved:['حُفظت السلعة ونُشرت في المتجر.','Your listing was saved and published.'],draft_saved:['حُفظت السلعة كمسودة. يمكنك نشرها بعد توثيق الحساب.','Your listing was saved as a draft. Verify your account to publish it.'],hidden_saved:['أُخفيت السلعة من المتجر.','Your listing is now hidden.'],hidden_updated:['حُفظت التعديلات. السلعة مخفية حاليًا ويمكنك نشرها من قائمة سلعك.','Changes saved. This listing is hidden; publish it from your listings.'],saved_refresh:['حُفظت السلعة، لكن تعذّر تحديث القائمة. اضغط تحديث.','Saved, but the list could not refresh. Select Refresh.'],
    login:['سجّل الدخول لإضافة سلعك وإدارتها.','Sign in to add and manage listings.'],sign_in:['تسجيل الدخول','Sign in'],verify_hint:['يمكنك تجهيز سلعك كمسودات الآن. يتطلب نشرها في المتجر توثيق حساب البائع.','You can prepare drafts now. Verify your seller account to publish them.'],verify:['توثيق الحساب','Verify account'],
    failed:['تعذّر تنفيذ الطلب. حاول مرة أخرى.','The request failed. Please try again.'],unavailable:['الخدمة غير جاهزة حاليًا. حاول لاحقًا.','This service is not ready. Please try later.'],invalid:['راجع اسم السلعة والسعر والحقول المطلوبة.','Check the listing name, price and required fields.'],invalid_credentials:['أكمل بيانات الحساب المعروض للبيع.','Complete the account details for this listing.'],not_found:['هذه السلعة غير موجودة أو لا تخص حسابك.','This listing is unavailable or does not belong to you.'],blocked:['حسابك موقوف ولا يمكنه إضافة السلع.','Your account is suspended.'],limit:['وصلت إلى الحد الأقصى للسلع.','You have reached the listing limit.'],email_required:['فعّل بريد حسابك قبل إضافة السلع.','Confirm your email before adding listings.'],
    placeholder:['مثال: لعبة فيفا 27','For example: FIFA 27'],user_placeholder:['مثال: xx7a','For example: xx7a'],description_placeholder:['اكتب وصفًا مختصرًا للخدمة…','Write a short description…']
  };
  var form, user, profile, canPublish = false, busy = false, epoch = 0, listEpoch = 0, rows = [], more = false, editing = false, productId = null, viewDeleted = false;
  var BIO=['x','instagram','snapchat','tiktok','tellonym','discord','telegram'],bioProof=null,bioOffset=0,draftIntent=false;
  function normalizedUsername(value){return String(value||'').trim().replace(/^@/,'').toLowerCase();}
  function bioRequired(){return form&&BIO.includes(form.elements.kind.value);}
  function bioMatches(){return !!(bioProof&&bioProof.product_id===productId&&bioProof.platform===form.elements.kind.value&&bioProof.username===normalizedUsername(form.elements.title.value));}
  function bioValid(){return bioMatches()&&bioProof.status==='approved'&&['public_bio','official_api'].includes(bioProof.method)&&(bioProof.consumed_at||Date.parse(bioProof.expires_at)>Date.now()+bioOffset);}
  function receiveBio(value){bioProof=value;bioOffset=value&&value.server_now?Date.parse(value.server_now)-Date.now():0;renderBio();}
  function renderBio(){
    if(!node('bioOwnership')||!form)return;var required=bioRequired(),matches=bioMatches(),expired=matches&&!bioProof.consumed_at&&Date.parse(bioProof.expires_at)<=Date.now()+bioOffset;
    node('bioOwnership').hidden=!required;node('bioCodePanel').hidden=!matches;node('bioStart').hidden=matches&&!expired&&bioProof.status!=='rejected';
    node('bioCheck').disabled=busy||!matches||expired||bioValid()||bioProof.status==='rejected';node('bioRefresh').disabled=busy||!productId;
    if(matches){node('bioCode').value=bioProof.code;node('bioAccount').textContent=t(bioProof.platform)+' · @'+bioProof.username;node('bioProfile').hidden=!bioProof.profile_url;if(bioProof.profile_url)node('bioProfile').href=bioProof.profile_url;}
    var key=!matches?'bio_hint':expired?'bio_expired':bioValid()?'bio_approved':bioProof.status==='rejected'?'bio_rejected':bioProof.check_reason==='code_missing'?'bio_missing':bioProof.check_reason==='automatic_unavailable'?'bio_connection':bioProof.check_reason==='profile_unavailable'?'bio_unavailable':bioProof.status==='pending'?'bio_pending':'bio_issued';
    node('bioMessage').textContent=t(key);node('bioReviewNote').textContent=matches?bioProof.review_note||'':'';
    var publishing=canPublish&&(!editing||form.dataset.wasActive==='true');
    node('listingPublish').disabled=busy||(required&&publishing&&!bioValid());node('bioDraft').hidden=!canPublish;node('bioDraft').disabled=busy;
  }
  async function loadBio(){if(productId&&bioRequired())receiveBio(await backend.ownershipStatus(productId));else receiveBio(null);}
  function node(id) { return document.getElementById(id); }
  function uuid() { if (crypto.randomUUID) return crypto.randomUUID(); var bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=bytes[6]&15|64;bytes[8]=bytes[8]&63|128;var h=Array.from(bytes,function(b){return b.toString(16).padStart(2,'0');}).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20); }
  function english() { return window.AppI18N && window.AppI18N.getLang() !== 'ar'; }
  function t(key) { var text = TEXT[key] || TYPES[key]; return text ? text[english()?1:0] : key; }
  function status(key, error) { var el = node('sellerStatus'); el.dataset.messageKey = key || ''; el.hidden = !key; el.textContent = key ? t(key) : ''; el.classList.toggle('is-error', !!error); }
  function errorKey(error) { var s = String(error && error.message || error || ''); if(/BIO_VERIFICATION_REQUIRED/.test(s))return 'bio_required';if(/BIO_INVALID_USERNAME/.test(s))return 'bio_username';if(/BIO_USERNAME_MISMATCH/.test(s))return 'bio_mismatch';if(/BIO_CODE_EXPIRED/.test(s))return 'bio_expired';if(/BIO_CHECK_RATE_LIMIT|BIO_REQUEST_LIMIT/.test(s))return 'bio_rate';if(/BIO_UNAVAILABLE/.test(s))return 'unavailable';if(/PRODUCT_DELETED/.test(s))return 'not_found'; if(/PRODUCT_SOLD/.test(s))return 'sold_notice'; if(/SELLER_VERIFICATION_REQUIRED/.test(s))return 'verify_hint'; if(/EMAIL_CONFIRMATION_REQUIRED/.test(s))return 'email_required'; if(/INVALID_CREDENTIALS/.test(s))return 'invalid_credentials'; if(/INVALID_PRODUCT|23514/.test(s))return 'invalid'; if(/PRODUCT_NOT_FOUND/.test(s))return 'not_found'; if(/PRODUCT_LIMIT/.test(s))return 'limit'; if(/ACCOUNT_BANNED/.test(s))return 'blocked'; if(/AUTH_REQUIRED/.test(s))return 'login'; if(/schema|PGRST20[25]|does not exist|permission denied/i.test(s))return 'unavailable'; return 'failed'; }
  function make(tag,css,text) { var el=document.createElement(tag);if(css)el.className=css;if(text!==undefined)el.textContent=text;return el; }
  function setBusy(value) { busy=value; node('listingFields').disabled=value||!user; node('cancelListing').disabled=value; node('sellerRefresh').disabled=value;if(node('sellerDeletedToggle'))node('sellerDeletedToggle').disabled=value; document.querySelectorAll('[data-seller-action]').forEach(function(el){el.disabled=value;});renderBio(); }
  function updateKind() {
    var social=SOCIAL.includes(form.elements.kind.value);node('listingCredentials').hidden=!social;node('listingCredentials').disabled=!social;
    node('listingNameLabel').textContent=t(social?'user':'name');form.elements.title.placeholder=t(social?'user_placeholder':'placeholder');
    form.elements.title.autocomplete='off';renderBio();
  }
  function localize() {
    document.querySelectorAll('[data-seller-text]').forEach(function(el){el.textContent=t(el.dataset.sellerText);});
    document.querySelectorAll('[data-seller-type]').forEach(function(el){el.textContent=t(el.dataset.sellerType);});
    document.title=t('title')+' | Account';
    if(form){updateKind();form.elements.description.placeholder=t('description_placeholder');node('listingSubmitText').textContent=t(editing?'update':canPublish?'publish':'draft');}
    if(node('sellerDeletedToggle'))node('sellerDeletedToggle').textContent=t(viewDeleted?'active_list':'deleted_list');
    var key=node('sellerStatus').dataset.messageKey;if(key)node('sellerStatus').textContent=t(key);render();
  }
  function resetForm() { form.reset(); productId=null; editing=false;bioProof=null;draftIntent=false; node('cancelListing').hidden=true; updateKind();node('listingSubmitText').textContent=t(canPublish?'publish':'draft'); }
  function money(value) { return window.CurrencySystem.format(value); }
  function render() {
    var host=node('sellerRows');host.replaceChildren();
    if(!rows.length&&user)host.append(make('p','seller-copy',t(viewDeleted?'deleted_empty':'empty')));
    rows.forEach(function(row){
      var card=make('article','seller-product'),top=make('div','seller-product-top'),info=make('div');var title=make('h3','listing-title');title.append(window.ListingPlatforms.create(row.listing_type),make('bdi','',row.title));info.append(title,make('strong','',money(row.price)));top.append(info,make('span','seller-badge',t(row.deleted_at?'deleted':row.sold_at?'sold':row.active?'live':'hidden')));card.append(top,make('p','',t(row.listing_type||'service')));
      if(row.description)card.append(make('p','',row.description));
      var actions=make('div','seller-actions');(row.deleted_at?[['restore',function(){archiveProduct(row,true);}]]:(row.sold_at?[]:[['edit',function(){editProduct(row.id);}], [row.active?'hide':'show',function(){changeVisibility(row);}] ]).concat([['delete',function(){archiveProduct(row,false);}]] )).forEach(function(pair){var b=make('button','seller-button secondary',t(pair[0]));b.type='button';b.dataset.sellerAction='';b.disabled=busy;b.addEventListener('click',pair[1]);actions.append(b);});card.append(actions);host.append(card);
    });node('sellerMore').hidden=!more;
  }
  async function loadProducts(append) {
    var current=++listEpoch,session=epoch,offset=append?rows.length:0;
    node('sellerMore').disabled=true;
    try { var batch=await backend.sellerProducts(offset,viewDeleted);if(current!==listEpoch||session!==epoch)return;rows=append?rows.concat(batch):batch;more=batch.length===24;render(); }
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
      ['account_email','email_password','account_username','account_password'].forEach(function(key){form.elements[key].value=secrets[key]||'';});updateKind();await loadBio();node('cancelListing').hidden=false;node('listingSubmitText').textContent=t('update');node('listingCard').scrollIntoView({behavior:'smooth',block:'start'});form.elements.title.focus();
    });
  }
  function archiveProduct(row,restore) {
    if(!restore&&!window.confirm(t('delete_confirm')))return;
    act(async function(session){await backend.sellerArchiveProduct(row.id,restore);if(session!==epoch)return;if(productId===row.id)resetForm();await refreshedAfterSave(restore?'restored_saved':'deleted_saved',session);});
  }
  function changeVisibility(row) {
    act(async function(session){if(!row.active&&!canPublish)throw new Error('SELLER_VERIFICATION_REQUIRED');await backend.sellerSetVisibility(row.id,!row.active);if(session!==epoch)return;await refreshedAfterSave(row.active?'hidden_saved':'saved',session);});
  }
  async function initialize() {
    form=node('sellerProductForm');
    var deletedToggle=make('button','seller-button secondary',t('deleted_list'));deletedToggle.id='sellerDeletedToggle';deletedToggle.type='button';node('sellerRefresh').parentElement.append(deletedToggle);deletedToggle.addEventListener('click',function(){act(async function(){viewDeleted=!viewDeleted;localize();await loadProducts(false);});});
    localize();
    form.elements.title.addEventListener('input',renderBio);
    node('bioStart').addEventListener('click',function(){act(async function(session){var name=normalizedUsername(form.elements.title.value);if(!/^[a-z0-9][a-z0-9_.-]{0,63}$/.test(name))throw new Error('BIO_INVALID_USERNAME');if(!productId)productId=uuid();var result=await backend.ownershipStart(productId,form.elements.kind.value,name);if(session===epoch)receiveBio(result);});});
    node('bioCheck').addEventListener('click',function(){act(async function(session){if(!bioMatches())throw new Error('BIO_VERIFICATION_REQUIRED');node('bioMessage').textContent=t('bio_checking');var result=await backend.ownershipCheck(bioProof.id);if(session===epoch)receiveBio(result);});});
    node('bioRefresh').addEventListener('click',function(){act(async function(session){if(!bioMatches())throw new Error('BIO_VERIFICATION_REQUIRED');node('bioMessage').textContent=t('bio_checking');var result=await backend.ownershipCheck(bioProof.id);if(session===epoch)receiveBio(result);});});
    node('bioCopy').addEventListener('click',async function(){if(!bioMatches())return;try{await navigator.clipboard.writeText(bioProof.code);status('bio_copied');}catch{status('bio_copy_failed',true);}});
    node('bioDraft').addEventListener('click',function(){if(busy||!form.reportValidity())return;draftIntent=true;form.requestSubmit();});
    form.elements.kind.addEventListener('change',updateKind);node('cancelListing').addEventListener('click',function(){if(!busy){resetForm();status('');}});
    node('sellerRefresh').addEventListener('click',function(){act(async function(){await loadProducts(false);});});node('sellerMore').addEventListener('click',function(){act(async function(){await loadProducts(true);});});
    form.addEventListener('submit',function(event){event.preventDefault();var forceDraft=draftIntent;draftIntent=false;if(!form.reportValidity())return;
      act(async function(session){
        var currentProfile=await backend.profile();if(session!==epoch)return;profile=currentProfile;canPublish=!!(profile&&(profile.is_verified||profile.role==='admin'));
        var social=SOCIAL.includes(form.elements.kind.value),credentials={};if(social)['account_email','email_password','account_username','account_password'].forEach(function(key){credentials[key]=form.elements[key].value;});if(social)credentials.test_delivery=false;
        if(!productId)productId=uuid();
        var desiredActive=!forceDraft&&canPublish&&(!editing||form.dataset.wasActive==='true');if(desiredActive&&bioRequired()&&!bioValid())throw new Error('BIO_VERIFICATION_REQUIRED');
        var record=await backend.sellerSaveProduct({id:productId,title:form.elements.title.value.trim(),price:Number(form.elements.price.value),kind:form.elements.kind.value,description:form.elements.description.value.trim(),credentials:credentials,active:desiredActive});
        if(session!==epoch)return;var needsBio=BIO.includes(record.listing_type)&&!record.active;resetForm();node('sellerVerification').hidden=canPublish;await refreshedAfterSave(record.active?'saved':needsBio?'bio_draft_saved':canPublish?'hidden_updated':'draft_saved',session);
      });
    });
    var session=epoch;await backend.ready;if(session!==epoch)return;user=backend.currentUser();
    if(!user){node('sellerGuest').hidden=false;setBusy(false);return;}
    try{profile=await backend.profile();if(session!==epoch)return;canPublish=!!(profile&&(profile.is_verified||profile.role==='admin'));node('sellerVerification').hidden=canPublish;node('sellerProducts').hidden=false;setBusy(false);localize();await loadProducts(false);}catch(error){status(errorKey(error),true);}
  }
  window.addEventListener('account:languagechange',function(){if(form)localize();});
  window.addEventListener('account:signed-out',function(){epoch++;listEpoch++;user=null;profile=null;rows=[];more=false;viewDeleted=false;if(form)resetForm();node('sellerRows').replaceChildren();node('sellerProducts').hidden=true;node('sellerVerification').hidden=true;node('sellerGuest').hidden=false;status('');setBusy(false);});
  window.addEventListener('pagehide',function(){if(form){['account_email','email_password','account_username','account_password'].forEach(function(key){form.elements[key].value='';});}});
  var ready=document.readyState==='loading'?new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});}):Promise.resolve();
  ready.then(initialize).catch(function(error){status(errorKey(error),true);});
})();
