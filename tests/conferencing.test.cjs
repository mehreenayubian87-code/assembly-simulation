const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {stripTypeScriptTypes}=require('node:module');
test('call endpoint rejects unauthenticated users and students requesting another classroom before contacting Daily',async()=>{
 let handler,daily=0,authenticated=false;
 const context={Request,Response,fetch:async(url)=>{if(url.includes('daily.co')){daily++;throw Error('Must not contact Daily')}if(url.endsWith('/user'))return Response.json({id:'student'},{status:authenticated?200:401});return Response.json({stage:'negotiation',teacher:false,rooms:[{id:'11111111-1111-1111-1111-111111111111'}]});},Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://test.supabase.co':'test'},serve:f=>handler=f}};
 vm.runInNewContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/classroom-call/index.ts','utf8')),context);
 const request=()=>new Request('https://test/call',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify({class_id:'22222222-2222-2222-2222-222222222222',room_id:'33333333-3333-3333-3333-333333333333'})});
 assert.equal((await handler(request())).status,401);authenticated=true;assert.equal((await handler(request())).status,403);assert.equal(daily,0);
});
