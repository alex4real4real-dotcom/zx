import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from '../supabase/functions/account-bank-payout/worker.mjs';
import {createAlrajhiAdapter} from '../supabase/functions/account-bank-payout/alrajhi-adapter.mjs';
const token='a-unique-worker-token-with-at-least-32-characters';
const env=name=>({PAYOUT_WORKER_TOKEN:token,SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-only'}[name]);
const request=()=>new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({amount:'999999',iban:'attacker',status:'paid'})});
const job={id:'11111111-1111-4111-8111-111111111111',claim_id:'22222222-2222-4222-8222-222222222222',action:'submit',idempotency_key:'11111111-1111-4111-8111-111111111111',amount:'20.00',currency:'SAR',iban:'SA-TEST-ONLY',holder_name:'Fixture'};
const json=data=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
const outcome=extra=>({idempotencyKey:job.idempotency_key,amount:job.amount,currency:'SAR',iban:job.iban,status:'paid',eventId:'bank-event-1',reference:'bank-ref-1',...extra});
test('unconfigured worker and bank adapter cannot claim or transfer funds',async()=>{
 assert.equal(createAlrajhiAdapter().configured,false);
 let calls=0;const send=async()=>{calls++;throw Error('must not fetch');};
 assert.equal((await createWorker({env:()=>undefined,fetch:send})(request())).status,503);
 const worker=createWorker({env,fetch:send});
 assert.equal((await worker(new Request('https://example.test',{method:'POST'}))).status,401);
 assert.equal((await worker(request())).status,503);assert.equal(calls,0);
 assert.equal((await worker(new Request('https://example.test'))).status,405);
});
test('bank results use the stored job and never client-supplied amounts or beneficiaries',async()=>{
 const reports=[];const worker=createWorker({env,adapter:{configured:true,submit:async received=>{assert.deepEqual(received,job);return outcome();}},fetch:async(url,options)=>{
  assert.equal(options.headers.authorization,'Bearer server-only');assert.equal(options.redirect,'error');
  if(url.endsWith('/account_payout_claim'))return json(job);
  const data=JSON.parse(options.body);reports.push(data);return json({status:data.p_status});
 }});
 const result=await worker(request());assert.equal(result.status,200);assert.equal((await result.json()).status,'paid');
 assert.equal(reports[0].p_amount,'20.00');assert.equal(reports[0].p_iban,job.iban);assert.equal(reports[0].p_reference,'bank-ref-1');
});
test('a lost response retains the reservation and reconciles, never declares failure',async()=>{
 let result;const worker=createWorker({env,adapter:{configured:true,submit:async()=>{throw Error('timeout after debit');}},fetch:async(url,options)=>{
  if(url.endsWith('/account_payout_claim'))return json(job);result=JSON.parse(options.body);return json({status:result.p_status});
 }});
 assert.equal((await (await worker(request())).json()).status,'reconciling');assert.equal(result.p_status,'reconciling');
});
test('reconciliation jobs perform lookup without re-submitting a transfer',async()=>{
 let lookup=0;const worker=createWorker({env,adapter:{configured:true,submit:async()=>{throw Error('must not resubmit');},lookup:async received=>{lookup++;assert.equal(received.idempotency_key,job.id);return outcome();}},fetch:async(url)=>json(url.endsWith('/account_payout_claim')?{...job,action:'lookup'}:{status:'paid'})});
 assert.equal((await worker(request())).status,200);assert.equal(lookup,1);
});
test('mismatched or incomplete bank outcomes stay reserved',async()=>{
 for(const override of [{amount:'21.00'},{iban:'other'},{currency:'USD'},{idempotencyKey:'other'},{reference:''},{status:'unknown'},{eventId:''}]){
  let reported;const worker=createWorker({env,adapter:{configured:true,submit:async()=>outcome(override)},fetch:async(url,options)=>{
   if(url.endsWith('/account_payout_claim'))return json(job);reported=JSON.parse(options.body);return json({status:reported.p_status});
  }});
  await worker(request());assert.equal(reported.p_status,'reconciling');
 }
});
test('a database failure after bank success cannot produce another transfer in the same run',async()=>{
 let submits=0;const worker=createWorker({env,adapter:{configured:true,submit:async()=>{submits++;return outcome();}},fetch:async(url)=>url.endsWith('/account_payout_claim')?json(job):new Response('unavailable',{status:503})});
 assert.equal((await worker(request())).status,503);assert.equal(submits,1);
});
test('a verified definitive bank rejection is the only failed-bank path',async()=>{
 let reported;const worker=createWorker({env,adapter:{configured:true,submit:async()=>outcome({status:'failed',reference:''})},fetch:async(url,options)=>{
  if(url.endsWith('/account_payout_claim'))return json(job);reported=JSON.parse(options.body);return json({status:reported.p_status});
 }});await worker(request());assert.equal(reported.p_status,'failed');
});
