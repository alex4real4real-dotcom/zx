export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function hostedUrl(value) {
  try {const url=new URL(value);return url.origin==='https://verify.didit.me'&&!url.username&&!url.password&&url.pathname.startsWith('/')?url.href:null;}catch{return null;}
}
const normalized=value=>typeof value==='string'?value.toLowerCase().replace(/[ _-]+/g,'_'):'';
export function evaluateDecision(data,expected) {
  if(!data||data.session_kind!=='user'||data.session_id!==expected.session_id||data.vendor_data!==expected.id||data.workflow_id!==expected.workflow_id)
    throw new Error('INVALID_PROVIDER_RESPONSE');
  function step(key,node) {
    const rows=data[key];
    if(!Array.isArray(rows))return '';
    const matches=rows.filter(row=>row&&row.node_id===node);
    return matches.length===1?normalized(matches[0].status):'';
  }
  const id_status=step('id_verifications',expected.idNode),liveness_status=step('liveness_checks',expected.liveNode),face_status=step('face_matches',expected.faceNode);
  const status=normalized(data.status);
  let state='processing',reason='';
  // Only authoritative feature verdicts are used. No client-supplied score or image matching.
  if(face_status==='declined'){state='rejected';reason='face_mismatch';}
  else if(status==='declined'||id_status==='declined'||liveness_status==='declined'){state='rejected';reason='verification_failed';}
  else if(['expired','abandoned','cancelled'].includes(status)){state='cancelled';reason='expired';}
  else if(status==='approved'&&[id_status,liveness_status,face_status].every(s=>s==='approved'))state='approved';
  else if(status==='approved'){state='retry';reason='incomplete_checks';}
  else if(['resubmission_requested','in_review'].includes(status)){state='retry';reason='capture_retry';}
  else if(status==='not_started')state='not_started';
  else if(status==='in_progress')state='in_progress';
  return {session_id:data.session_id,workflow_id:data.workflow_id,vendor_data:data.vendor_data,state,reason,id_status,liveness_status,face_status};
}
function sorted(value) {
  if(Array.isArray(value))return value.map(sorted);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])]));
  return value;
}
export async function verifyWebhook(body,headers,secret,now=Date.now()) {
  const timestamp=headers.get('x-timestamp'),signature=headers.get('x-signature-v2');
  if(!secret||!/^[0-9]{10,11}$/.test(timestamp||'')||!/^[0-9a-f]{64}$/i.test(signature||'')||Math.abs(now/1000-Number(timestamp))>300)return false;
  // Bind freshness to the signed timestamp; replacing the header cannot replay old events.
  if(Number(body?.timestamp)!==Number(timestamp)||headers.get('x-didit-test-webhook')==='true')return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes=Uint8Array.from(signature.match(/../g),value=>parseInt(value,16));
  return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(JSON.stringify(sorted(body))));
}
export async function boundedJson(response,max=512000) {
  if(!response.ok)throw new Error('IDENTITY_SERVICE_UNAVAILABLE');
  const reader=response.body?.getReader();if(!reader)throw new Error('INVALID_PROVIDER_RESPONSE');
  let length=0,chunks=[];
  try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>max)throw new Error('INVALID_PROVIDER_RESPONSE');chunks.push(value);}}
  finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(length);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error('INVALID_PROVIDER_RESPONSE');}
}
