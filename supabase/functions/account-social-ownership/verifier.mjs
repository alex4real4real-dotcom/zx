const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE=/^[0-9]{8}$/;
const NAME=/^[a-z0-9][a-z0-9_.-]{0,63}$/;
export async function boundedText(response,max=2_000_000) {
 if(!response.ok||!response.body)throw new Error('PROFILE_UNAVAILABLE');
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max)throw new Error('RESPONSE_TOO_LARGE');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return new TextDecoder().decode(bytes);
}
function entities(value) {
 return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,code)=>{
  if(code[0]==='#'){const number=code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10);return number>=0&&number<=0x10ffff?String.fromCodePoint(number):'';}
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[code.toLowerCase()];
 });
}
function attributes(tag) {
 const result={};for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))result[match[1].toLowerCase()]=entities(match[2]??match[3]);return result;
}
export function biography(platform,username,html) {
 if(platform==='tiktok') {
  for(const tag of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
   const id=attributes(tag[1]).id;if(!['__UNIVERSAL_DATA_FOR_REHYDRATION__','SIGI_STATE'].includes(id))continue;
   let data;try{data=JSON.parse(tag[2]);}catch{continue;}
   const user=id==='SIGI_STATE'?data.UserModule?.users?.[username]:data.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user;
   if(typeof user?.uniqueId==='string'&&user.uniqueId.toLowerCase()===username&&typeof user.signature==='string')return user.signature.slice(0,10000);
  }
  return null;
 }
 if(platform==='telegram') {
  let canonical=null;
  for(const tag of html.matchAll(/<(?:meta|link)\b[^>]*>/gi)){
   const attr=attributes(tag[0]);if(attr.property==='og:url')canonical=attr.content;
   if(attr.rel==='canonical')canonical=attr.href;
  }
  try{const url=new URL(canonical);if(url.protocol!=='https:'||url.hostname!=='t.me'||url.pathname.replace(/\/$/,'').toLowerCase()!=='/'+username)return null;}catch{return null;}
  const found=html.match(/<div\b[^>]*class\s*=\s*["'][^"']*\btgme_page_description\b[^"']*["'][^>]*>([\s\S]*?)<\/div\s*>/i);
  return found?entities(found[1].replace(/<[^>]*>/g,' ')).slice(0,10000):null;
 }
 return null;
}
export async function verifyPublicBio(proof,send=fetch) {
 if(!NAME.test(proof.username||'')||!CODE.test(proof.code||''))throw new Error('INVALID_REQUEST');
 const unavailable=proof.platform==='tiktok'?'automatic_unavailable':'profile_unavailable';
 let url;
 if(proof.platform==='telegram')url='https://t.me/'+proof.username;
 else if(proof.platform==='tiktok')url='https://www.tiktok.com/@'+proof.username;
 else return {verified:false,reason:'automatic_unavailable'};
 try {
  const response=await send(url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{accept:'text/html','cache-control':'no-cache','user-agent':'AccountOwnershipVerifier/1.0'}});
  if(!(response.headers.get('content-type')||'').includes('text/html'))return {verified:false,reason:unavailable};
  const bio=biography(proof.platform,proof.username,await boundedText(response));
  if(bio===null)return {verified:false,reason:unavailable};
  const present=new RegExp('(^|[^\\p{L}\\p{N}])'+proof.code+'($|[^\\p{L}\\p{N}])','u').test(bio);
  return {verified:present,reason:present?'':'code_missing'};
 }catch{return {verified:false,reason:unavailable};}
}
export function createHandler({env,fetch:send=fetch}) {
 const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,x-client-info,content-type','access-control-allow-methods':'POST,OPTIONS','cache-control':'no-store','content-type':'application/json'};
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
 const url=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY'),anon=env('SUPABASE_ANON_KEY');
 async function rpc(action,uid,id,result={}) {
  const response=await send(url+'/rest/v1/rpc/account_bio_service',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify({p_action:action,p_user_id:uid,p_id:id,p_success:result.verified===true,p_reason:result.reason||''})});
  const data=JSON.parse(await boundedText(response,24000).catch(async()=>{
   const body=await response.json().catch(()=>({}));throw new Error(/^(BIO_CHECK_RATE_LIMIT|BIO_REQUEST_LIMIT|BIO_CODE_EXPIRED|AUTH_REQUIRED|RECORD_NOT_FOUND)$/.test(body.message||'')?body.message:'BIO_UNAVAILABLE');
  }));
  return data;
 }
 return async request=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  try{
   const token=request.headers.get('authorization')||'';if(!/^Bearer \S+$/i.test(token))return reply({error:'AUTH_REQUIRED'},401);
   if(!url||!key||!anon)return reply({error:'BIO_UNAVAILABLE'},503);
   const auth=await send(url+'/auth/v1/user',{redirect:'error',signal:AbortSignal.timeout(8000),headers:{apikey:anon,authorization:token}});
   if(!auth.ok)return reply({error:'AUTH_REQUIRED'},401);
   const user=JSON.parse(await boundedText(auth,32000));if(!UUID.test(user.id||''))return reply({error:'AUTH_REQUIRED'},401);
   let body;try{body=JSON.parse(await boundedText(new Response(request.body),4096));}catch{return reply({error:'INVALID_REQUEST'},400);}
   if(!body||body.action!=='check'||!UUID.test(body.id||''))return reply({error:'INVALID_REQUEST'},400);
   const proof=await rpc('claim',user.id,body.id);
   if(proof.status==='approved'&&['public_bio','official_api'].includes(proof.method))return reply(proof);
   const decision=await verifyPublicBio(proof,send);
   return reply(await rpc('finish',user.id,proof.id,decision));
  }catch(error){
   const message=String(error?.message||'');const known=['BIO_CHECK_RATE_LIMIT','BIO_REQUEST_LIMIT','BIO_CODE_EXPIRED','AUTH_REQUIRED','RECORD_NOT_FOUND','INVALID_REQUEST'];
   return reply({error:known.includes(message)?message:'BIO_UNAVAILABLE'},message==='AUTH_REQUIRED'?401:known.includes(message)?400:503);
  }
 };
}
