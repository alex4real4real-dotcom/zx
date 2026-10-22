import {UUID,hostedUrl,evaluateDecision,verifyWebhook,boundedJson} from './provider.mjs';
export function createHandler({env,fetch:send=fetch,now=Date.now}) {
  const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, x-client-info, content-type','access-control-allow-methods':'POST, OPTIONS','cache-control':'no-store','content-type':'application/json'};
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
  const sb=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY'),anon=env('SUPABASE_ANON_KEY');
  const rpc=async(action,uid=null,id=null,request=null,fields={})=>{
    const response=await send(sb+'/rest/v1/rpc/account_identity_service',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{apikey:service,authorization:'Bearer '+service,'content-type':'application/json'},body:JSON.stringify({p_action:action,p_user_id:uid,p_id:id,p_request_id:request,p_fields:fields})});
    if(!response.ok){const data=await response.json().catch(()=>({}));const known=String(data.message||'').match(/ACCOUNT_BANNED|AUTH_REQUIRED|EMAIL_NOT_CONFIRMED|REQUEST_LIMIT|CHECK_RATE_LIMIT|VERIFICATION_PENDING|ALREADY_VERIFIED|RECORD_NOT_FOUND|IDENTITY_NOT_CONFIGURED|INVALID_REQUEST/);throw new Error(known?.[0]||'IDENTITY_SERVICE_UNAVAILABLE');}
    return boundedJson(response);
  };
  const configured=()=>env('IDENTITY_ENABLED')==='true'&&env('IDENTITY_MODE')==='live'&&env('DIDIT_API_KEY')&&UUID.test(env('DIDIT_WORKFLOW_ID')||'')&&env('DIDIT_WEBHOOK_SECRET')&&['DIDIT_ID_NODE_ID','DIDIT_LIVENESS_NODE_ID','DIDIT_FACE_NODE_ID'].every(key=>!!env(key))&&/^https:\/\/[^?#]+\/verify\.html$/.test(env('IDENTITY_RETURN_URL')||'');
  const callProvider=(path,options={})=>send('https://verification.didit.me/v3/'+path,{...options,redirect:'error',signal:AbortSignal.timeout(8000),headers:{'x-api-key':env('DIDIT_API_KEY'),'content-type':'application/json'}}).then(boundedJson);
  async function reconcile(context) {
    if(!UUID.test(context.session_id)||!UUID.test(context.id))throw new Error('INVALID_PROVIDER_RESPONSE');
    const data=await callProvider('session/'+context.session_id+'/decision/');
    const result=evaluateDecision(data,{...context,idNode:env('DIDIT_ID_NODE_ID'),liveNode:env('DIDIT_LIVENESS_NODE_ID'),faceNode:env('DIDIT_FACE_NODE_ID')});
    return rpc('apply',context.user_id,context.id,null,result);
  }
  return async function handle(request) {
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
    if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
    try {
      const webhook=new URL(request.url).pathname.endsWith('/webhook');
      let body;try{body=await boundedJson(new Response(request.body),webhook?524288:4096);}catch{return reply({error:'INVALID_REQUEST'},400);}
      if(!body||Array.isArray(body)||typeof body!=='object')return reply({error:'INVALID_REQUEST'},400);
      if(webhook) {
        if(!configured())return reply({error:'IDENTITY_NOT_CONFIGURED'},503);
        if(!await verifyWebhook(body,request.headers,env('DIDIT_WEBHOOK_SECRET'),now()))return reply({error:'INVALID_SIGNATURE'},401);
        if(body.webhook_type!=='status.updated'||!UUID.test(body.session_id||''))return reply({received:true});
        const context=await rpc('lookup',null,null,null,{session_id:body.session_id});
        if(context&&!['approved','rejected','cancelled'].includes(context.state))await reconcile(context);
        return reply({received:true});
      }
      const token=request.headers.get('authorization')||'';
      if(!/^Bearer \S+$/i.test(token))return reply({error:'AUTH_REQUIRED'},401);
      const authResponse=await send(sb+'/auth/v1/user',{redirect:'error',signal:AbortSignal.timeout(8000),headers:{apikey:anon,authorization:token}});
      if(!authResponse.ok)return reply({error:'AUTH_REQUIRED'},401);
      const user=await boundedJson(authResponse,16000);if(!UUID.test(user.id||''))return reply({error:'AUTH_REQUIRED'},401);
      const config=await rpc('config',user.id);
      const ready=!!configured()&&config.enabled;
      if(body.action==='status')return reply({ready,verified:config.verified,...await rpc('latest',user.id)});
      if(!ready)return reply({error:'IDENTITY_NOT_CONFIGURED'},503);
      if(body.action==='start') {
        if(!UUID.test(body.request_id||'')||body.consent!==true)return reply({error:'CONSENT_REQUIRED'},400);
        const result=await rpc('prepare',user.id,null,body.request_id,{store:String(body.store||'').trim(),legal:String(body.legal||'').trim(),phone:String(body.phone||'').replace(/[^+0-9]/g,''),consent_version:'identity-v1'});
        if(!result.create_allowed)return reply(result);
        try {
          const callback=new URL(env('IDENTITY_RETURN_URL'));if(callback.protocol!=='https:'||callback.search||callback.hash||callback.username||callback.password)throw new Error('IDENTITY_NOT_CONFIGURED');
          const session=await callProvider('session/',{method:'POST',body:JSON.stringify({workflow_id:env('DIDIT_WORKFLOW_ID'),vendor_data:result.record.id,callback:callback.href,callback_method:'both',language:body.language==='en'?'en':'ar'})});
          const url=hostedUrl(session.url);
          if(!UUID.test(session.session_id||'')||!url||session.workflow_id!==env('DIDIT_WORKFLOW_ID'))throw new Error('INVALID_PROVIDER_RESPONSE');
          return reply(await rpc('attach',user.id,result.record.id,null,{session_id:session.session_id,url,workflow_id:session.workflow_id}));
        }catch(error){await rpc('creation_failed',user.id,result.record.id).catch(()=>{});throw error;}
      }
      if(body.action==='sync') {
        const latest=await rpc('latest',user.id),record=latest.record;
        if(!record||!record.session_id||['approved','rejected','cancelled'].includes(record.state))return reply(latest);
        await rpc('claim_sync',user.id,record.id);
        return reply(await reconcile({...record,user_id:user.id}));
      }
      return reply({error:'INVALID_REQUEST'},400);
    }catch(error){
      const code=String(error?.message||'');
      const safe=['ACCOUNT_BANNED','AUTH_REQUIRED','EMAIL_NOT_CONFIRMED','REQUEST_LIMIT','CHECK_RATE_LIMIT','VERIFICATION_PENDING','ALREADY_VERIFIED','RECORD_NOT_FOUND','IDENTITY_NOT_CONFIGURED','INVALID_REQUEST','CONSENT_REQUIRED'];
      if(error instanceof SyntaxError)return reply({error:'INVALID_REQUEST'},400);
      return reply({error:safe.includes(code)?code:'IDENTITY_SERVICE_UNAVAILABLE'},code==='AUTH_REQUIRED'?401:code==='ACCOUNT_BANNED'?403:safe.includes(code)&&code!=='IDENTITY_NOT_CONFIGURED'?400:503);
    }
  };
}
