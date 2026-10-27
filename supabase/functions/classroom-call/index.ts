// Deploy as classroom-call. DAILY_API_KEY must exist only in Edge Function secrets.
const origin = 'https://mehreenayubian87-code.github.io';
const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
Deno.serve(async(req:Request)=>{
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'POST required'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!,daily=Deno.env.get('DAILY_API_KEY');
  if(!daily)return reply({error:'Conferencing is not configured.'},503);
  const authorization=req.headers.get('Authorization')||'';
  const dbHeaders={apikey:key,Authorization:authorization,'Content-Type':'application/json'};
  const identity=await fetch(url+'/auth/v1/user',{headers:dbHeaders});
  if(!identity.ok)return reply({error:'Sign in before joining a call.'},401);
  const user=await identity.json();
  const body=await req.json();const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(body.class_id)||body.room_id&&!uuid.test(body.room_id))return reply({error:'Invalid classroom.'},400);
  const rpc=async(name:string,args:unknown)=>{const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:dbHeaders,body:JSON.stringify(args)});if(!r.ok)throw Error('Classroom access could not be verified.');return r.json()};
  const session=await rpc('assembly_session_snapshot',{target_class:body.class_id});
  if(['preparation','finished'].includes(session.stage))return reply({error:'Calls open during the timed teaching stages.'},403);
  const lobby=['prebrief','debrief'].includes(session.stage);
  let displayName='Professor';let scope='lobby';
  if(!lobby){
   if(!body.room_id||!session.rooms.some((r:any)=>r.id===body.room_id))return reply({error:'Choose your assigned classroom.'},403);
   const room=await rpc('assembly_live_snapshot',{target_room:body.room_id});
   if(room.class_id!==body.class_id||!room.prepared||(!room.teacher&&!room.role))return reply({error:'This classroom is not assigned to you.'},403);
   scope=body.room_id;
  }
  if(!session.teacher){
   // The session snapshot lists only rooms assigned to this user. Use the authenticated room role to resolve their prepared name.
   const assigned=session.rooms[0];if(!assigned)return reply({error:'Professor approval is required.'},403);
   const room=await rpc('assembly_live_snapshot',{target_room:assigned.id});
   if(!room.role)return reply({error:'Professor approval is required.'},403);
   displayName=assigned.participants.find((p:any)=>p.role===room.role)?.name||'Student';
  }
  const name='a-'+body.class_id.replaceAll('-','')+'-'+(scope==='lobby'?'l':scope.replaceAll('-',''));
  const dailyRequest=(path:string,method='GET',data?:unknown)=>fetch('https://api.daily.co/v1/'+path,{method,headers:{Authorization:'Bearer '+daily,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  let found=await dailyRequest('rooms/'+name);
  if(found.status===404){const created=await dailyRequest('rooms','POST',{name,privacy:'private',properties:{enable_knocking:false,enable_screenshare:true,enable_chat:false,start_video_off:true,start_audio_off:true}});found=created.ok?created:await dailyRequest('rooms/'+name);}
  if(!found.ok)throw Error('The video service could not open this room.');
  const meeting=await found.json();if(meeting.privacy!=='private')throw Error('Call privacy configuration requires attention.');
  const expires=Math.floor(Date.now()/1000)+3600;
  const issued=await dailyRequest('meeting-tokens','POST',{properties:{room_name:name,user_id:user.id,user_name:displayName,is_owner:session.teacher===true,exp:expires,eject_at_token_exp:true,start_video_off:true,start_audio_off:true}});
  if(!issued.ok)throw Error('The video service could not issue access.');
  const token=await issued.json();return reply({url:meeting.url,token:token.token,stage:session.stage,scope,label:lobby?'Main lobby':session.rooms.find((r:any)=>r.id===body.room_id)?.title,expires});
 }catch(e){return reply({error:e instanceof Error?e.message:'Unable to join call.'},400);}
});
