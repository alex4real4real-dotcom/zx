import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPublicBio,biography,createHandler} from '../supabase/functions/account-social-ownership/verifier.mjs';
const code='ACCT-0123456789ABCDEF',uid='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const proof={id,platform:'tiktok',username:'owner',code,status:'issued'};
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
const html=(name='owner',signature=code,extra='')=>'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.user-detail':{userInfo:{user:{uniqueId:name,signature}}}}})+'</script>'+extra;
const page=value=>new Response(value,{headers:{'content-type':'text/html'}});
test('only the named account biography can prove ownership',async()=>{
 assert.equal((await verifyPublicBio(proof,async()=>page(html()))).verified,true);
 assert.equal((await verifyPublicBio(proof,async()=>page(html('someone_else')))).verified,false);
 assert.equal((await verifyPublicBio(proof,async()=>page(html('owner','no code','<p>'+code+'</p>')))).verified,false);
 assert.equal((await verifyPublicBio(proof,async()=>page(html('owner',code+'1')))).verified,false);
 assert.equal((await verifyPublicBio(proof,async()=>page(html('owner','Hello! '+code+' ✨')))).verified,true);
});
test('Telegram requires a matching canonical profile and the biography field',()=>{
 const telegram='<meta property="og:url" content="https://t.me/owner"><div class="tgme_page_description">Hello &amp; '+code+'</div>';
 assert.equal(biography('telegram','owner',telegram),'Hello & '+code);
 assert.equal(biography('telegram','other',telegram),null);
 assert.equal(biography('telegram','owner','<div>'+code+'</div>'),null);
});
test('unsupported platforms and failed responses require review, never approval',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('network');};
 assert.deepEqual(await verifyPublicBio({...proof,platform:'instagram'},fetcher),{verified:false,reason:'manual_review'});assert.equal(calls,0);
 assert.deepEqual(await verifyPublicBio(proof,fetcher),{verified:false,reason:'profile_unavailable'});assert.equal(calls,1);
 assert.equal((await verifyPublicBio(proof,async()=>new Response('denied',{status:403}))).verified,false);
 assert.equal((await verifyPublicBio(proof,async()=>page('x'.repeat(2_000_001)))).verified,false);
});
test('URLs are constructed from validated handles and requests never follow redirects',async()=>{
 await assert.rejects(verifyPublicBio({...proof,username:'127.0.0.1/secret'},async()=>{throw Error('must not fetch');}),/INVALID_REQUEST/);
 await verifyPublicBio({...proof,profile_url:'http://127.0.0.1/'},async(url,options)=>{assert.equal(url,'https://www.tiktok.com/@owner');assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,undefined);return page(html());});
});
const env=name=>({SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-only-secret',SUPABASE_ANON_KEY:'public-key'}[name]);
test('unauthenticated callers cannot read a challenge or reach platform profiles',async()=>{
 const handler=createHandler({env,fetch:async()=>{throw Error('must not fetch');}});
 assert.equal((await handler(new Request('https://example.test',{method:'POST',body:'{}'}))).status,401);
 assert.equal((await handler(new Request('https://example.test',{method:'GET'}))).status,405);
 assert.equal((await handler(new Request('https://example.test',{method:'OPTIONS'}))).status,204);
});
test('verification uses the authenticated user, stored challenge and observed bio',async()=>{
 const calls=[];const handler=createHandler({env,fetch:async(url,options)=>{
  calls.push(url);
  if(url.endsWith('/auth/v1/user'))return json({id:uid});
  if(url.endsWith('/rpc/account_bio_service')){
   assert.equal(options.headers.apikey,'server-only-secret');const body=JSON.parse(options.body);assert.equal(body.p_user_id,uid);assert.equal(body.p_id,id);
   if(body.p_action==='claim')return json(proof);
   assert.equal(body.p_success,true);return json({...proof,status:'approved'});
  }
  assert.equal(url,'https://www.tiktok.com/@owner');assert.equal(options.headers.apikey,undefined);return page(html());
 }});
 const response=await handler(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer valid-user-token'},body:JSON.stringify({action:'check',id,user_id:'attacker',verified:true,username:'attacker',code:'fake'})}));
 assert.equal(response.status,200);assert.equal((await response.json()).status,'approved');assert.equal(calls.length,4);
});
test('a client cannot turn a missing biography code into approval',async()=>{
 const handler=createHandler({env,fetch:async(url,options)=>{
  if(url.endsWith('/auth/v1/user'))return json({id:uid});
  if(url.endsWith('/rpc/account_bio_service')){const body=JSON.parse(options.body);if(body.p_action==='claim')return json(proof);assert.equal(body.p_success,false);return json({...proof,status:'pending'});}
  return page(html('owner','No ownership code here'));
 }});
 const response=await handler(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({action:'check',id,verified:true})}));
 assert.equal((await response.json()).status,'pending');
});
