import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPublicBio,biography,apiBiography,capabilities,createHandler} from '../supabase/functions/account-social-ownership/verifier.mjs';
const code='01234567',uid='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const proof={id,platform:'tiktok',username:'owner',code,status:'issued'};
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
const html=(name='owner',signature=code,extra='')=>'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+JSON.stringify({__DEFAULT_SCOPE__:{'webapp.user-detail':{userInfo:{user:{uniqueId:name,signature}}}}})+'</script>'+extra;
const page=value=>new Response(value,{headers:{'content-type':'text/html'}});
test('ownership codes are exactly eight digits and preserve a leading zero',async()=>{
 assert.equal(code.length,8);assert.equal(code[0],'0');
 assert.equal((await verifyPublicBio(proof,async()=>page(html()))).verified,true);
 for(const invalid of ['1234567','123456789','ACCT-01234567','abcdefgh'])await assert.rejects(verifyPublicBio({...proof,code:invalid},async()=>page(html())),/INVALID_REQUEST/);
 assert.equal((await verifyPublicBio(proof,async()=>page(html('owner','١'+code)))).verified,false);
});
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
test('unsupported platforms and failed responses remain unverified',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('network');};
 assert.deepEqual(await verifyPublicBio({...proof,platform:'instagram'},fetcher),{verified:false,reason:'automatic_unavailable'});assert.equal(calls,0);
 assert.deepEqual(await verifyPublicBio(proof,fetcher),{verified:false,reason:'automatic_unavailable'});assert.equal(calls,1);
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
  if(url.endsWith('/rpc/account_bio_service')){const body=JSON.parse(options.body);if(body.p_action==='claim')return json(proof);assert.equal(body.p_success,false);return json({...proof,status:'issued'});}
  return page(html('owner','No ownership code here'));
 }});
 const response=await handler(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({action:'check',id,verified:true})}));
 assert.equal((await response.json()).status,'issued');
});
test('Tellonym checks only the exact account aboutMe, never answers or display names',async()=>{
 const tellonym={...proof,platform:'tellonym'};
 assert.deepEqual(await verifyPublicBio(tellonym,async(url,options)=>{
  assert.equal(url,'https://api.tellonym.me/profiles/name/owner');assert.equal(options.redirect,'error');assert.equal(options.headers.authorization,undefined);
  return json({id:1,username:'Owner',aboutMe:'About me: '+code});
 }),{verified:true,reason:''});
 for(const data of [{username:'other',aboutMe:code},{username:'owner',aboutMe:'no code',answers:[{answer:code}]},{displayName:'owner',aboutMe:code},{username:'owner',aboutMe:code+'0'}])assert.equal((await verifyPublicBio(tellonym,async()=>json(data))).verified,false);
 assert.equal((await verifyPublicBio(tellonym,async()=>json({username:'owner',aboutMe:'Hello'}))).reason,'code_missing');
});
test('X official API requires a server token and a matching username',async()=>{
 const x={...proof,platform:'x'},tokens=name=>name==='X_API_BEARER_TOKEN'?'x-server-token':undefined;
 assert.equal((await verifyPublicBio(x,async()=>{throw Error('must not fetch');})).reason,'automatic_unavailable');
 assert.equal((await verifyPublicBio(x,async(url,options)=>{
  assert.equal(url,'https://api.x.com/2/users/by/username/owner?user.fields=description');assert.equal(options.headers.authorization,'Bearer x-server-token');assert.equal(options.headers.apikey,undefined);
  return json({data:{id:'123',username:'Owner',description:code}});
 },tokens)).verified,true);
 assert.equal((await verifyPublicBio(x,async()=>json({data:{username:'other',description:code}}),tokens)).verified,false);
 assert.equal((await verifyPublicBio(x,async()=>new Response('denied',{status:401}),tokens)).reason,'automatic_unavailable');
});
test('Snapchat official API matches one exact successful public profile',async()=>{
 const snap={...proof,platform:'snapchat'},tokens=name=>name==='SNAPCHAT_PROFILE_ACCESS_TOKEN'?'snap-server-token':undefined;
 const profile=(name,bio)=>({sub_request_status:'SUCCESS',public_profile:{snap_user_name:name,description:bio}});
 const data={request_status:'SUCCESS',public_profiles:[profile('someone_else',code),profile('Owner',code)]};
 assert.equal((await verifyPublicBio(snap,async(url,options)=>{
  const parsed=new URL(url);assert.equal(parsed.origin,'https://businessapi.snapchat.com');assert.equal(parsed.pathname,'/public/v1/public_profiles/search');assert.equal(parsed.searchParams.get('query'),'owner');assert.equal(parsed.searchParams.get('includeStandard'),'true');assert.equal(options.headers.authorization,'Bearer snap-server-token');return json(data);
 },tokens)).verified,true);
 assert.equal(apiBiography('snapchat','owner',{...data,public_profiles:[profile('other',code)]}),null);
 assert.equal(apiBiography('snapchat','owner',{...data,public_profiles:[profile('owner',code),profile('owner',code)]}),null);
 assert.equal((await verifyPublicBio(snap,async()=>json({...data,public_profiles:[profile('owner','empty')]}),tokens)).reason,'code_missing');
});
test('all account types report capabilities without exposing credentials',async()=>{
 const publicCapabilities=capabilities();
 assert.deepEqual(Object.keys(publicCapabilities).sort(),['x','instagram','snapchat','tiktok','tellonym','discord','playstation','xbox','telegram'].sort());
 assert.equal(publicCapabilities.tellonym,'public_bio');assert.equal(publicCapabilities.x,'connection_required');
 assert.equal(capabilities(()=> 'secret').x,'official_api');assert.equal(capabilities(()=> 'secret').snapchat,'official_api');
 const handler=createHandler({env:name=>env(name)||(name==='X_API_BEARER_TOKEN'?'do-not-return-me':undefined),fetch:async(url)=>{assert.equal(url,'https://project.supabase.co/auth/v1/user');return json({id:uid});}});
 const response=await handler(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer token'},body:JSON.stringify({action:'capabilities'})}));
 const body=await response.text();assert.equal(response.status,200);assert.equal(body.includes('do-not-return-me'),false);assert.equal(JSON.parse(body).platforms.x,'official_api');
});
test('gaming and unconnected account types never pass verification or cause external requests',async()=>{
 for(const platform of ['playstation','xbox','instagram','discord'])assert.deepEqual(await verifyPublicBio({...proof,platform,username:platform==='xbox'?'صقر Player#1234':'owner'},async()=>{throw Error('must not fetch');}),{verified:false,reason:'automatic_unavailable'});
 await assert.rejects(verifyPublicBio({...proof,platform:'xbox',username:'name/../../secret'},async()=>{}),/INVALID_REQUEST/);
});
