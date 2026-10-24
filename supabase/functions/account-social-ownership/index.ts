// Retired at the site owner's request. No platform reads or challenge creation.
Deno.serve((request: Request) => new Response(
 request.method === 'OPTIONS' ? null : JSON.stringify({error:'FEATURE_REMOVED'}),
 {status:request.method === 'OPTIONS' ? 204 : 410,headers:{
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'authorization,apikey,x-client-info,content-type',
  'access-control-allow-methods':'POST,OPTIONS',
  'cache-control':'no-store','content-type':'application/json'
 }}
));
