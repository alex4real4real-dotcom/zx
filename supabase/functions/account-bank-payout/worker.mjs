import {createAlrajhiAdapter} from './alrajhi-adapter.mjs';
async function equalSecret(left,right) {
 const encode=new TextEncoder();
 const [a,b]=await Promise.all([left,right].map(value=>crypto.subtle.digest('SHA-256',encode.encode(value))));
 const x=new Uint8Array(a),y=new Uint8Array(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;
}
export function createWorker({env,fetch:send=fetch,adapter=createAlrajhiAdapter()}) {
 const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
 async function rpc(name,values={}) {
  const base=env('SUPABASE_URL'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
  if(!base||!secret)throw Error('WORKER_NOT_CONFIGURED');
  const response=await send(base+'/rest/v1/rpc/'+name,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:secret,authorization:'Bearer '+secret,'content-type':'application/json'},body:JSON.stringify(values)});
  if(!response.ok)throw Error('PAYOUT_STORE_UNAVAILABLE');
  return response.json();
 }
 async function report(job,status,event,reference='') {
  return rpc('account_payout_report',{p_id:job.id,p_claim:job.claim_id,p_status:status,p_event:event,p_reference:reference,p_amount:job.amount,p_iban:job.iban});
 }
 return async request=>{
  if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  const token=env('PAYOUT_WORKER_TOKEN');
  if(!token||token.length<32)return reply({error:'WORKER_NOT_CONFIGURED'},503);
  if(!await equalSecret(request.headers.get('authorization')||'','Bearer '+token))return reply({error:'AUTH_REQUIRED'},401);
  // Adding credentials alone cannot enable a nonexistent banking implementation.
  if(adapter.configured!==true)return reply({error:'BANK_INTEGRATION_NOT_CONFIGURED'},503);
  let job;
  try{
   job=await rpc('account_payout_claim');if(!job)return reply({processed:false});
   let outcome;
   try{outcome=await (job.action==='submit'?adapter.submit(job):adapter.lookup(job));}
   catch{
    // A timeout is not proof of failure. Keep the reservation, then reconcile
    // by the same request UUID; never send a second uncorrelated transfer.
    await report(job,'reconciling','uncertain:'+job.claim_id);return reply({processed:true,status:'reconciling'});
   }
   if(!outcome||outcome.idempotencyKey!==job.idempotency_key||String(outcome.amount)!==String(job.amount)||outcome.currency!==job.currency||outcome.iban!==job.iban||!['paid','failed','reconciling'].includes(outcome.status)||typeof outcome.eventId!=='string'||!outcome.eventId||outcome.eventId.length>200||(outcome.status==='paid'&&(typeof outcome.reference!=='string'||!outcome.reference||outcome.reference.length>200))) {
    await report(job,'reconciling','mismatch:'+job.claim_id);return reply({processed:true,status:'reconciling'});
   }
   await report(job,outcome.status,outcome.eventId,outcome.reference||'');
   return reply({processed:true,status:outcome.status});
  }catch{return reply({error:'PAYOUT_WORKER_UNAVAILABLE'},503);}
 };
}
