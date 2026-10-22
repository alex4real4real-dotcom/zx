import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {evaluateDecision,verifyWebhook,hostedUrl,boundedJson} from '../supabase/functions/account-identity/provider.mjs';
import {createHandler} from '../supabase/functions/account-identity/handler.mjs';
const uid='10000000-0000-4000-8000-000000000001',id='20000000-0000-4000-8000-000000000001',sid='30000000-0000-4000-8000-000000000001',wid='40000000-0000-4000-8000-000000000001';
const expected={id,session_id:sid,workflow_id:wid,idNode:'id-first',liveNode:'live-second',faceNode:'face-third'};
const verdict=()=>({session_kind:'user',session_id:sid,vendor_data:id,workflow_id:wid,status:'Approved',id_verifications:[{node_id:'id-first',status:'Approved'}],liveness_checks:[{node_id:'live-second',status:'Approved'}],face_matches:[{node_id:'face-third',status:'Approved'}]});
test('approves only when the configured ID, liveness and face checks all passed',()=>assert.equal(evaluateDecision(verdict(),expected).state,'approved'));
test('a face mismatch immediately rejects even when the overall status says approved',()=>{const data=verdict();data.face_matches[0].status='Declined';assert.deepEqual([evaluateDecision(data,expected).state,evaluateDecision(data,expected).reason],['rejected','face_mismatch']);});
test('liveness spoof failure and invalid documents reject',()=>{for(const key of ['liveness_checks','id_verifications']){const data=verdict();data[key][0].status='Declined';assert.equal(evaluateDecision(data,expected).state,'rejected');}});
test('missing, duplicate, wrong-node or review-only checks never approve',()=>{
  for(const change of [data=>delete data.face_matches,data=>data.liveness_checks.push({...data.liveness_checks[0]}),data=>data.id_verifications[0].node_id='unrelated',data=>data.face_matches[0].status='In Review']){const data=verdict();change(data);assert.equal(evaluateDecision(data,expected).state,'retry');}
});
test('the decision is bound to the exact user request, provider session and workflow',()=>{
  for(const key of ['session_id','vendor_data','workflow_id','session_kind']){const data=verdict();data[key]='other';assert.throws(()=>evaluateDecision(data,expected),/INVALID_PROVIDER_RESPONSE/);}
});
test('capture issues request another capture instead of approving or inventing a mismatch',()=>{const data=verdict();data.status='Resubmission Requested';data.face_matches=[];assert.equal(evaluateDecision(data,expected).state,'retry');});
test('hosted links reject lookalike domains and credential-bearing URLs',()=>{for(const url of ['https://verify.didit.me.evil.test/session/x','javascript:alert(1)','https://attacker@verify.didit.me/session/x'])assert.equal(hostedUrl(url),null);assert.ok(hostedUrl('https://verify.didit.me/ar/session/token'));});
test('bounded response reader stops oversized provider data',async()=>assert.rejects(()=>boundedJson(new Response('x'.repeat(100)),50),/INVALID_PROVIDER_RESPONSE/));
const secret='fictional-test-webhook-secret',now=1800000000000;
const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
function headers(body,stamp=body.timestamp){return new Headers({'x-timestamp':String(stamp),'x-signature-v2':createHmac('sha256',secret).update(JSON.stringify(sorted(body))).digest('hex')});}
test('valid signed unicode webhooks pass; tampering, stale events and test events fail',async()=>{
  const body={timestamp:now/1000,session_id:sid,webhook_type:'status.updated',metadata:{label:'اختبار'}};const h=headers(body);
  assert.equal(await verifyWebhook(body,h,secret,now),true);
  assert.equal(await verifyWebhook({...body,session_id:uid},h,secret,now),false);
  assert.equal(await verifyWebhook(body,h,secret,now+301000),false);
  const old={...body,timestamp:body.timestamp-600};assert.equal(await verifyWebhook(old,headers(old,body.timestamp),secret,now),false);
  h.set('x-didit-test-webhook','true');assert.equal(await verifyWebhook(body,h,secret,now),false);
});
const envValues={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fictional-service',SUPABASE_ANON_KEY:'fictional-anon',IDENTITY_ENABLED:'true',IDENTITY_MODE:'live',DIDIT_API_KEY:'fictional-provider',DIDIT_WORKFLOW_ID:wid,DIDIT_WEBHOOK_SECRET:secret,DIDIT_ID_NODE_ID:'id-first',DIDIT_LIVENESS_NODE_ID:'live-second',DIDIT_FACE_NODE_ID:'face-third',IDENTITY_RETURN_URL:'https://example.test/verify.html'};
function request(body,token='fictional-user'){return new Request('https://example.supabase.co/functions/v1/account-identity',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});}
test('unauthenticated callers cannot create provider sessions or finalize outcomes',async()=>{
  let calls=0;const handle=createHandler({env:key=>envValues[key],fetch:async()=>{calls++;throw Error('unexpected call');}});
  assert.equal((await handle(request({action:'start',consent:true},''))).status,401);assert.equal(calls,0);
});
test('start uses the authenticated user, requires consent, and binds the new session server-side',async()=>{
  const actions=[];const handle=createHandler({env:key=>envValues[key],fetch:async(url,options)=>{
    if(url.endsWith('/auth/v1/user'))return Response.json({id:uid});
    if(url.includes('/rpc/')){const args=JSON.parse(options.body);actions.push(args);assert.equal(args.p_user_id,uid);
      if(args.p_action==='config')return Response.json({enabled:true,verified:false});
      if(args.p_action==='prepare')return Response.json({create_allowed:true,record:{id,state:'creating'}});
      if(args.p_action==='attach')return Response.json({verified:false,record:{id,state:'not_started',url:args.p_fields.url}});
      throw Error('unexpected RPC');
    }
    assert.equal(url,'https://verification.didit.me/v3/session/');const body=JSON.parse(options.body);assert.equal(body.vendor_data,id);assert.equal(body.workflow_id,wid);assert.equal(body.callback,'https://example.test/verify.html');assert.equal(body.callback_method,'both');assert.equal(body.sandbox_scenario,undefined);
    return Response.json({session_id:sid,workflow_id:wid,url:'https://verify.didit.me/ar/session/token'});
  }});
  assert.equal((await handle(request({action:'start',request_id:id,consent:false}))).status,400);
  const response=await handle(request({action:'start',request_id:id,user_id:'forged-user',consent:true,store:'Test',legal:'Test User',phone:'+966500000000'}));
  assert.equal(response.status,200);assert.equal((await response.json()).verified,false);assert.ok(actions.some(item=>item.p_action==='attach'));
});
test('client-supplied approval fields and callback parameters cannot grant verification',async()=>{
  let providerCalls=0;const handle=createHandler({env:key=>envValues[key],fetch:async(url)=>{
    if(url.endsWith('/auth/v1/user'))return Response.json({id:uid});
    if(url.includes('/rpc/'))return Response.json({enabled:true,verified:false,record:null});
    providerCalls++;throw Error('unexpected provider call');
  }});
  const response=await handle(request({action:'apply',state:'approved',verified:true,face_status:'approved'}));
  assert.equal(response.status,400);assert.equal(providerCalls,0);
});
test('disabled or sandbox configuration never starts live verification',async()=>{
  for(const overrides of [{IDENTITY_ENABLED:'false'},{IDENTITY_MODE:'sandbox'},{DIDIT_FACE_NODE_ID:''}]){
    let providerCalls=0;const handle=createHandler({env:key=>({...envValues,...overrides})[key],fetch:async(url)=>{
      if(url.endsWith('/auth/v1/user'))return Response.json({id:uid});
      if(url.includes('/rpc/'))return Response.json({enabled:true,verified:false});providerCalls++;throw Error('unexpected provider call');
    }});assert.equal((await handle(request({action:'start',consent:true,request_id:id}))).status,503);assert.equal(providerCalls,0);
  }
});
test('a signed webhook fetches the provider result instead of trusting payload approval',async()=>{
  const actions=[],body={timestamp:now/1000,session_id:sid,webhook_type:'status.updated',decision:{status:'Approved'}};
  const handle=createHandler({env:key=>envValues[key],now:()=>now,fetch:async(url,options)=>{
    if(url.includes('/rpc/')){const args=JSON.parse(options.body);actions.push(args);
      if(args.p_action==='lookup')return Response.json({...expected,user_id:uid,state:'processing'});
      if(args.p_action==='apply'){assert.equal(args.p_fields.state,'rejected');return Response.json({verified:false,record:{state:'rejected'}});}
    }
    assert.equal(url,'https://verification.didit.me/v3/session/'+sid+'/decision/');const data=verdict();data.face_matches[0].status='Declined';return Response.json(data);
  }});
  const response=await handle(new Request('https://example.supabase.co/functions/v1/account-identity/webhook',{method:'POST',headers:headers(body),body:JSON.stringify(body)}));
  assert.equal(response.status,200);assert.deepEqual(actions.map(x=>x.p_action),['lookup','apply']);
});
