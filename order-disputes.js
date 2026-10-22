(function(){
'use strict';
var backend=window.accountBackend, states=new Map(), epoch=0, modal=null;
var TEXT={
 open:['فتح نزاع','Open a dispute'],view:['متابعة النزاع','View dispute'],hide:['إخفاء المحادثة','Hide conversation'],
 heading:['فتح نزاع','Open a dispute'],reason:['سبب النزاع','Dispute reason'],details:['تفاصيل إضافية','Additional details'],
 not_received:['لم أستلم المنتج','I did not receive the item'],not_as_described:['المنتج مختلف عن الوصف','The item does not match its description'],wrong_credentials:['بيانات الحساب غير صحيحة','The account information is incorrect'],other:['سبب آخر','Other reason'],
 submit:['إرسال النزاع','Submit dispute'],cancel:['إلغاء','Cancel'],loading:['جارٍ التحميل…','Loading…'],failed:['تعذّر إتمام الطلب. حاول مجددًا.','Could not complete the request. Please try again.'],
 expired:['انتهت مهلة فتح النزاع لهذه السلعة.','The dispute window for this item has ended.'],exists:['يوجد نزاع لهذه السلعة. حدّث الطلبات لمتابعته.','This item already has a dispute. Refresh orders to view it.'],final:['أُغلق النزاع نهائيًا ولا يمكن فتحه مرة أخرى.','This dispute is permanently closed and cannot be reopened.'],
 denied:['هذه المحادثة خاصة بطرفي الطلب والإدارة.','This conversation is private to the order participants and support team.'],
 invalid:['اكتب تفاصيل المشكلة من 5 أحرف على الأقل.','Describe the issue using at least 5 characters.'],limited:['طلبات كثيرة؛ حاول بعد قليل.','Too many requests. Please try again shortly.'],
 chat:['محادثة النزاع','Dispute conversation'],empty:['لا توجد رسائل حتى الآن.','No messages yet.'],reply:['رسالتك','Your message'],send:['إرسال','Send'],refresh:['تحديث المحادثة','Refresh conversation'],
 buyer:['المشتري','Buyer'],seller:['البائع','Seller'],admin:['إدارة المنصة','Support team'],you:['أنت','You'],
 status_open:['نزاع مفتوح','Open dispute'],status_resolved_buyer:['مغلق لصالح المشتري','Closed in buyer’s favor'],status_resolved_seller:['مغلق لصالح البائع','Closed in seller’s favor'],status_closed:['مغلق نهائيًا','Permanently closed'],
 buyer_close:['إغلاق النزاع لصالح البائع','Close dispute in seller’s favor'],seller_close:['إغلاق النزاع وإعادة المبلغ للمشتري','Close dispute and refund buyer'],
 buyer_confirm:['تأكيد الإغلاق لصالح البائع','Confirm closure for seller'],seller_confirm:['تأكيد الإغلاق لصالح المشتري','Confirm closure for buyer'],
 buyer_warning:['بالتأكيد تُحسم التسوية لصالح البائع، ويُغلق النزاع نهائيًا دون إعادة فتحه.','Confirming awards settlement to the seller and permanently closes the dispute. It cannot be reopened.'],
 seller_warning:['بالتأكيد تُحسم التسوية لصالح المشتري، ويُغلق النزاع نهائيًا دون إعادة فتحه.','Confirming awards settlement to the buyer and permanently closes the dispute. It cannot be reopened.'],
 test:['التسوية الحالية تجريبية؛ لا يتم تحويل أو استرداد أموال حقيقية.','Current settlement is a simulation. No real money is transferred or refunded.'],
 buyer_event:['أغلق المشتري النزاع لصالح البائع.','The buyer closed the dispute in the seller’s favor.'],seller_event:['أغلق البائع النزاع لصالح المشتري.','The seller closed the dispute in the buyer’s favor.'],
 note:['المحادثة خاصة بالمشتري والبائع والإدارة، وتبقى محفوظة بعد الإغلاق.','The conversation is private to the buyer, seller and support team, and remains available after closure.'],
 saved_refresh:['حُفظ التغيير. حدّث المحادثة لعرض آخر حالة.','The change was saved. Refresh the conversation to see the latest state.']
};
function en(){return document.documentElement.lang==='en';}
function t(key){return TEXT[key]?TEXT[key][en()?1:0]:key;}
function el(tag,text,cls){var n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function label(tag,key,cls){var n=el(tag,t(key),cls);n.dataset.caseText=key;return n;}
function button(key,fn,cls){var b=label('button',key,cls||'orders-button outline');b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function id(){if(crypto.randomUUID)return crypto.randomUUID();var b=crypto.getRandomValues(new Uint8Array(16));b[6]=b[6]&15|64;b[8]=b[8]&63|128;var h=Array.from(b,function(v){return v.toString(16).padStart(2,'0');}).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
function time(value){var d=new Date(value);return Number.isNaN(d.valueOf())?'':new Intl.DateTimeFormat(en()?'en-GB':'ar-SA-u-ca-gregory-nu-latn',{dateStyle:'short',timeStyle:'short'}).format(d);}
function active(stamp,uid){return stamp===epoch&&backend.currentUser()&&backend.currentUser().id===uid;}
function errorKey(error){var msg=String(error&&error.message||error);if(/DISPUTE_WINDOW_EXPIRED/.test(msg))return'expired';if(/DISPUTE_EXISTS/.test(msg))return'exists';if(/DISPUTE_CLOSED|SETTLEMENT_FINAL/.test(msg))return'final';if(/AUTH_REQUIRED|RECORD_NOT_FOUND|ACCOUNT_BANNED/.test(msg))return'denied';if(/REQUEST_LIMIT/.test(msg))return'limited';return'failed';}
function notice(node,key){node.dataset.caseError=key||'';node.textContent=key?t(key):'';}
function closeModal(){if(!modal)return;var old=modal;modal=null;if(old.open)old.close();old.remove();}
function openForm(ctx){
 closeModal();var stamp=epoch,uid=backend.currentUser().id,dialog=el('dialog',undefined,'order-case-dialog'),header=el('div',undefined,'order-case-heading');modal=dialog;
 header.append(label('h2','heading'),button('cancel',function(){if(!busy)closeModal();}));dialog.append(header,el('p',ctx.item.title,'order-case-product'));
 var form=el('form',undefined,'order-case-form'),reasonLabel=label('label','reason'),select=el('select'),detailsLabel=label('label','details'),area=el('textarea'),send=label('button','submit','orders-button'),status=el('p',undefined,'order-case-status');
 select.id='caseReason';reasonLabel.htmlFor=select.id;['not_received','not_as_described','wrong_credentials','other'].forEach(function(key){var option=label('option',key);option.value=key;select.append(option);});
 area.id='caseDetails';detailsLabel.htmlFor=area.id;area.rows=3;area.maxLength=1800;send.type='submit';status.setAttribute('role','status');
 select.value=ctx.state.reason||'not_received';area.value=ctx.state.reasonDetails||'';
 function validateOther(){area.required=select.value==='other';area.minLength=area.required?5:0;ctx.state.reason=select.value;}
 select.addEventListener('change',validateOther);area.addEventListener('input',function(){ctx.state.reasonDetails=area.value;});validateOther();
 form.append(reasonLabel,select,detailsLabel,area,send,status,label('p','test','order-case-note'));dialog.append(form);document.body.append(dialog);var busy=false;
 dialog.addEventListener('cancel',function(event){event.preventDefault();if(!busy)closeModal();});dialog.showModal();select.focus();
 form.addEventListener('submit',async function(event){event.preventDefault();if(busy||!form.reportValidity())return;
  var detail=area.value.trim();if(select.value==='other'&&detail.length<5){notice(status,'invalid');return;}
  var reason=t(select.value)+(detail?'\n'+detail:''),signature=ctx.item.id+'|'+reason;
  if(!ctx.state.pendingOpen||ctx.state.pendingOpen.signature!==signature)ctx.state.pendingOpen={signature:signature,key:id()};
  busy=true;Array.from(dialog.querySelectorAll('button')).forEach(function(b){b.disabled=true;});notice(status,'loading');var saved=false;
  try{var result=await backend.disputeOpen(ctx.item.id,reason,ctx.state.pendingOpen.key);saved=true;if(!active(stamp,uid))return;
   ctx.state.dispute={id:result.id,order_item_id:ctx.item.id,buyer_id:uid,seller_id:ctx.item.seller_id,status:'open',reason:reason};ctx.state.open=true;ctx.state.pendingOpen=null;
   closeModal();await ctx.refresh();if(active(stamp,uid))await fetchThread(ctx.state);
  }catch(error){if(active(stamp,uid))notice(status,saved?'saved_refresh':errorKey(error));}
  finally{busy=false;if(dialog.isConnected)Array.from(dialog.querySelectorAll('button')).forEach(function(b){b.disabled=false;});}
 });
}
function renderMessages(state){
 var view=state.view;if(!view)return;
 var host=view.messages,nearBottom=host.scrollHeight-host.scrollTop-host.clientHeight<50,position=host.scrollTop;
 host.replaceChildren();if(!state.messages.length)host.append(label('p','empty','order-case-note'));
 state.messages.forEach(function(row){
  var message=el('article',undefined,'order-case-message'+(row.sender_id===backend.currentUser().id?' mine':'')),body=row.body;
  if(row.event_status&&row.sender_role==='buyer'&&row.event_status==='resolved_seller')body=t('buyer_event');
  if(row.event_status&&row.sender_role==='seller'&&row.event_status==='resolved_buyer')body=t('seller_event');
  var role=TEXT[row.sender_role]?t(row.sender_role):row.sender_name;
  message.append(el('p',body),el('small',(row.sender_id===backend.currentUser().id?t('you')+' · ':'')+role+' · '+time(row.created_at)));host.append(message);
 });
 host.scrollTop=nearBottom?host.scrollHeight:position;
}
function updateControls(state){
 var view=state.view;if(!view)return;
 var closed=state.dispute.status!=='open';view.badge.textContent=t('status_'+state.dispute.status);view.composer.hidden=closed;view.closeBox.hidden=closed||(!state.ctx.isBuyer&&!state.ctx.isSeller)||(state.ctx.isBuyer&&state.ctx.isSeller);view.final.hidden=!closed;
 view.send.disabled=state.writing;view.confirm.disabled=state.writing;view.refresh.disabled=state.loading||state.writing;
}
async function fetchThread(state){
 if(state.loading||!state.dispute||!backend.currentUser())return;var stamp=epoch,uid=backend.currentUser().id,disputeId=state.dispute.id;state.loading=true;updateControls(state);
 try{var results=await Promise.all([backend.dispute(disputeId),backend.disputeMessages(disputeId)]);if(!active(stamp,uid)||!state.open)return;
  if(!results[0])throw Error('RECORD_NOT_FOUND');var changed=state.dispute.status!==results[0].status;state.dispute=results[0];state.messages=results[1]||[];state.loaded=true;
  renderMessages(state);updateControls(state);notice(state.view.status,'');if(changed)await state.ctx.refresh();
 }catch(error){if(active(stamp,uid)&&state.view)notice(state.view.status,errorKey(error));}
 finally{state.loading=false;updateControls(state);}
}
function buildPanel(state){
 var ctx=state.ctx,panel=el('section',undefined,'order-case-panel');panel.setAttribute('aria-label',t('chat'));var top=el('div',undefined,'order-case-heading'),badge=el('span',t('status_'+state.dispute.status),'order-badge dispute'),refresh=button('refresh',function(){fetchThread(state);});top.append(label('h3','chat'),badge,refresh);
 var messages=el('div',undefined,'order-case-messages');messages.setAttribute('role','log');messages.setAttribute('aria-live','polite');
 var composer=el('form',undefined,'order-case-composer'),replyLabel=label('label','reply'),area=el('textarea'),send=label('button','send','orders-button');area.id='reply-'+ctx.item.id;replyLabel.htmlFor=area.id;area.required=true;area.maxLength=5000;area.rows=3;area.value=state.draft||'';send.type='submit';area.addEventListener('input',function(){state.draft=area.value;});composer.append(replyLabel,area,send);
 var closeBox=el('details',undefined,'order-case-close'),buyer=ctx.isBuyer,confirm=button(buyer?'buyer_confirm':'seller_confirm',async function(){
  if(state.writing)return;var stamp=epoch,uid=backend.currentUser().id;state.writing=true;updateControls(state);notice(status,'loading');state.closeKey=state.closeKey||id();var saved=false;
  try{var result=await backend.disputePartyClose(state.dispute.id,state.closeKey);saved=true;if(!active(stamp,uid))return;state.dispute.status=result.status;updateControls(state);await ctx.refresh();if(active(stamp,uid))await fetchThread(state);}
  catch(error){if(active(stamp,uid))notice(state.view.status,saved?'saved_refresh':errorKey(error));}
  finally{state.writing=false;updateControls(state);}
 },'orders-button');
 closeBox.append(label('summary',buyer?'buyer_close':'seller_close'),label('p',buyer?'buyer_warning':'seller_warning'),label('p','test','order-case-note'),confirm);
 var final=label('p','final','order-case-final'),status=el('p',undefined,'order-case-status');status.setAttribute('role','status');panel.append(top,messages,composer,closeBox,final,status,label('p','note','order-case-note'));
 state.view={panel:panel,messages:messages,composer:composer,area:area,send:send,closeBox:closeBox,confirm:confirm,final:final,status:status,badge:badge,refresh:refresh};
 composer.addEventListener('submit',async function(event){event.preventDefault();if(state.writing||!composer.reportValidity())return;var body=area.value.trim();if(!body)return;
  var stamp=epoch,uid=backend.currentUser().id;if(!state.pendingReply||state.pendingReply.body!==body)state.pendingReply={body:body,key:id()};state.writing=true;updateControls(state);notice(status,'loading');
  try{await backend.disputeReply(state.dispute.id,body,state.pendingReply.key);if(!active(stamp,uid))return;state.draft='';area.value='';state.pendingReply=null;await fetchThread(state);}
  catch(error){if(active(stamp,uid))notice(state.view.status,errorKey(error));}
  finally{state.writing=false;updateControls(state);}
 });
 renderMessages(state);updateControls(state);return panel;
}
function mount(card,ctx){
 var state=states.get(ctx.item.id);if(!state){state={open:false,messages:[],draft:'',loaded:false,writing:false,loading:false};states.set(ctx.item.id,state);}ctx.state=state;state.ctx=ctx;if(!state.initialized){state.open=!!ctx.initialOpen;state.initialized=true;}
 if(ctx.dispute){if(!state.dispute||!state.dispute.updated_at||Date.parse(ctx.dispute.updated_at)>=Date.parse(state.dispute.updated_at))state.dispute=ctx.dispute;}
 var actions=el('div',undefined,'order-actions');card.append(actions);
 if(!state.dispute){if(ctx.canOpen&&ctx.isBuyer)actions.append(button('open',function(){openForm(ctx);}));return;}
 var toggle=button(state.open?'hide':'view',function(){state.open=!state.open;toggle.textContent=t(state.open?'hide':'view');panel.hidden=!state.open;toggle.setAttribute('aria-expanded',String(state.open));if(state.open)fetchThread(state);});toggle.setAttribute('aria-expanded',String(state.open));
 var panel=buildPanel(state);panel.hidden=!state.open;actions.append(toggle);card.append(panel);if(state.open&&!state.loaded)fetchThread(state);
}
function reset(){epoch++;states.clear();closeModal();}
window.OrderDisputes={mount:mount,reset:reset,openItem:function(itemId){var state=states.get(itemId);if(!state||!state.dispute)return;state.open=true;state.ctx.refresh().then(function(){fetchThread(state);});}};
window.addEventListener('account:signed-out',reset);
window.addEventListener('account:languagechange',function(){if(modal){modal.querySelectorAll('[data-case-text]').forEach(function(n){n.textContent=t(n.dataset.caseText);});modal.querySelectorAll('[data-case-error]').forEach(function(n){notice(n,n.dataset.caseError);});}});
setInterval(function(){if(document.hidden)return;states.forEach(function(state){if(state.open&&state.dispute&&state.view&&state.view.panel.isConnected)fetchThread(state);});},12000);
})();
