(function () {
  'use strict';
  var backend=window.accountBackend,latest=null,ready=false,busy=false,epoch=0,requestId=null;
  var TEXT={
    title:['توثيق الهوية الآلي','Automatic identity verification'],intro:['وثّق هويتك وسيلفي مباشر لتفعيل حساب البائع، دون انتظار موافقة الإدارة.','Verify your ID and a live selfie to activate your seller account automatically.'],
    step_id:['١. تصوير الهوية','1. Capture your ID'],step_face:['٢. سيلفي مباشر','2. Take a live selfie'],step_result:['٣. نتيجة آلية','3. Automatic result'],
    detail:['ابدأ بوثيقة الهوية، ثم اتبع تعليمات الكاميرا لالتقاط سيلفي مباشر. تُفحص الهوية وحيوية الوجه ومطابقة الصورة.','Start with your ID, then follow the camera instructions for a live selfie. Your document, liveness and face match are checked.'],
    store:['اسم المتجر','Store name'],legal:['الاسم الكامل كما في الهوية','Full name on your ID'],phone:['رقم الجوال','Phone number'],
    consent:['أوافق على معالجة هويتي والسيلفي وبيانات مطابقة الوجه لدى Didit للتحقق من ملكيتي للهوية.','I consent to Didit processing my ID, live selfie and face matching data to verify that the ID belongs to me.'],
    privacy:['تُلتقط الصور مباشرة لدى مزود التحقق. يحفظ هذا المسار في الموقع بيانات الطلب ونتيجته، ولا يحفظ صور الهوية أو السيلفي.','Images are captured directly by the verification provider. This flow stores request information and the outcome on this site, without ID or selfie images.'],
    privacy_link:['خصوصية التحقق لدى Didit','Didit verification privacy notice'],notice_link:['تفاصيل معالجة بيانات التوثيق','Verification data notice'],
    start:['ابدأ بتصوير الهوية','Start with your ID'],resume:['متابعة الهوية والسيلفي','Continue ID and selfie'],sync:['تحديث النتيجة','Refresh result'],sell:['انتقل إلى عرض سلعك','List your items'],
    unavailable:['التوثيق الآلي غير مفعّل حاليًا. لن تُرفع أي وثائق من هذه الصفحة حتى يتم ربط خدمة التحقق.','Automatic verification is not enabled yet. This page will not upload any documents until the service is connected.'],
    loading:['جارٍ تحميل حالة التوثيق…','Loading verification status…'],working:['جارٍ الاتصال بخدمة التحقق…','Connecting to verification…'],
    creating:['جارٍ إنشاء جلسة التحقق. أعد تحديث الحالة بعد قليل.','Creating your verification session. Refresh shortly.'],not_started:['جلسة التحقق جاهزة. ابدأ بالهوية ثم السيلفي.','Your session is ready. Start with your ID, then take a live selfie.'],
    in_progress:['أكمل تصوير الهوية والسيلفي في جلسة التحقق.','Complete ID and selfie capture in the verification session.'],processing:['جارٍ فحص الهوية والسيلفي آليًا.','Your ID and selfie are being checked automatically.'],
    approved:['تم توثيق هويتك آليًا. يمكنك الآن عرض سلعك.','Your identity is verified. You can now list your items.'],rejected:['لم ينجح التوثيق الآلي. يمكنك تقديم طلب جديد.','Automatic verification failed. You can start a new request.'],
    face_mismatch:['رُفض الطلب آليًا: لم تتطابق صورة السيلفي مع صورة الهوية.','Automatically declined: the selfie did not match the ID portrait.'],
    retry:['تعذّر إكمال المطابقة. أعد التقاط الهوية والسيلفي بوضوح؛ حسابك غير موثّق بعد.','The check could not be completed. Retake clear ID and selfie captures; your account is not verified yet.'],cancelled:['انتهت جلسة التحقق. يمكنك بدء طلب جديد.','The session ended. You can start a new request.'],
    failed:['تعذّر الاتصال. أعد المحاولة دون رفع وثائق جديدة.','Connection failed. Retry without uploading new documents.'],limit:['وصلت للحد المسموح من المحاولات اليوم. حاول لاحقًا.','You have reached today’s attempt limit. Try later.'],cooldown:['انتظر قليلًا قبل تحديث النتيجة مجددًا.','Wait briefly before refreshing again.'],
    pending:['يوجد طلب توثيق سابق قيد الإجراء.','An earlier verification request is still pending.'],blocked:['هذا الحساب موقوف.','This account is suspended.'],confirm_email:['فعّل بريد حسابك أولًا.','Confirm your email first.'],login:['سجّل الدخول للمتابعة','Sign in to continue'],
    data_title:['بيانات التوثيق','Verification data'],data_body:['تُستخدم وثيقة الهوية والسيلفي المباشر للتحقق من أن الهوية تخص صاحب الطلب ولمنع انتحال الهوية. تُعالج الصور ومطابقة الوجه لدى Didit وفق إشعار خصوصية التحقق الخاص بها. يحتفظ الموقع ببيانات الطلب الأساسية، وموافقتك، ومعرّف الجلسة ونتيجة الفحص؛ ولا ينسخ صور هذا المسار إلى مساحة ملفات الموقع. لا تحصل الإدارة على رابط صور من هذا المسار. يمكنك التواصل مع إدارة المنصة عبر مركز المساعدة بخصوص طلبك وبياناتك.','Your ID and live selfie are used to verify that the document belongs to you and prevent impersonation. Didit processes images and facial matching under its verification privacy notice. This site retains basic request information, consent, the session identifier and the outcome, without copying images from this flow into site storage or providing an image link to site admins. Contact the site through the help center about your request and data.'],help:['مركز المساعدة','Help center']
  };
  function node(id){return document.getElementById(id);}
  function language(){return window.AppI18N&&window.AppI18N.getLang()==='en'?'en':'ar';}
  function t(key){return (TEXT[key]||TEXT.failed)[language()==='en'?1:0];}
  function notice(key,error){var el=node('identityStatus');el.textContent=t(key);el.hidden=false;el.classList.toggle('is-error',!!error);el.dataset.message=key;}
  function validUrl(value){try{var url=new URL(value);return url.origin==='https://verify.didit.me'&&!url.username&&!url.password?url.href:null;}catch(e){return null;}}
  function render(){
    var record=latest&&latest.record,verified=latest&&latest.verified,active=record&&!['approved','rejected','cancelled'].includes(record.state),link=record&&validUrl(record.url);
    if(record&&['approved','rejected','cancelled'].includes(record.state))requestId=null;
    node('identityForm').hidden=!!verified||!!active;
    node('identityStart').disabled=busy||!ready;
    node('identityResume').hidden=!ready||!active||!link;
    node('identityResume').href=link||'#';
    node('identitySync').hidden=!ready||!active||!record.session_id;
    node('identitySync').disabled=busy;
    node('identitySell').hidden=!verified;
    if(verified)notice('approved');else if(!ready)notice('unavailable',true);else if(record)notice(record.reason==='face_mismatch'?'face_mismatch':record.state,['rejected','retry'].includes(record.state));else node('identityStatus').hidden=true;
  }
  function localize(){document.querySelectorAll('[data-identity-text]').forEach(function(el){el.textContent=t(el.dataset.identityText);});document.title=t('title')+' | Account';if(latest)render();}
  function showError(error){var value=String(error&&error.message||error||''),key=/NOT_CONFIGURED|FunctionNotFound|PGRST202/.test(value)?'unavailable':/REQUEST_LIMIT/.test(value)?'limit':/CHECK_RATE_LIMIT/.test(value)?'cooldown':/VERIFICATION_PENDING/.test(value)?'pending':/ACCOUNT_BANNED/.test(value)?'blocked':/EMAIL_NOT_CONFIRMED/.test(value)?'confirm_email':'failed';notice(key,true);}
  async function load(sync){var revision=epoch;var result=await backend.identityVerification(sync?'sync':'status');if(revision!==epoch)return;latest=result;if('ready' in result)ready=result.ready;render();}
  async function perform(operation){if(busy)return;busy=true;render();notice('working');try{await operation();}catch(error){showError(error);}finally{busy=false;node('identityStart').disabled=!ready;node('identitySync').disabled=false;}}
  var dom=document.readyState==='loading'?new Promise(function(resolve){document.addEventListener('DOMContentLoaded',resolve,{once:true});}):Promise.resolve();
  Promise.all([dom,backend.ready]).then(async function(){
    localize();
    if(!backend.currentUser()){node('managementGuest').hidden=false;node('managementSignIn').href='./account.html?return=verify.html';return;}
    node('identityMember').hidden=false;notice('loading');
    node('identityForm').addEventListener('submit',function(event){event.preventDefault();var form=event.currentTarget;if(!form.reportValidity()||!ready)return;
      perform(async function(){if(!requestId)requestId=crypto.randomUUID();var result=await backend.identityVerification('start',{request_id:requestId,store:form.elements.store.value.trim(),legal:form.elements.legal.value.trim(),phone:backend.normalizePhone(form.elements.phone.value),consent:form.elements.consent.checked,language:language()});latest=result;render();var url=result.record&&validUrl(result.record.url);if(url)location.assign(url);});
    });
    node('identitySync').addEventListener('click',function(){perform(function(){return load(true);});});
    try{await load(false);if(ready&&latest.record&&!['approved','rejected','cancelled'].includes(latest.record.state))await load(true);}catch(error){showError(error);}
    var timer=setInterval(function(){if(!document.hidden&&!busy&&latest&&latest.record&&!['approved','rejected','cancelled'].includes(latest.record.state))load(false).catch(showError);},10000);
    window.addEventListener('pagehide',function(){clearInterval(timer);},{once:true});
  }).catch(showError);
  window.addEventListener('account:languagechange',localize);
  window.addEventListener('account:signed-out',function(){epoch++;latest=null;ready=false;node('identityMember').hidden=true;node('managementGuest').hidden=false;});
})();
