const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('prepared rooms and facilitator timing remain private and professor controlled',async()=>{
 const db=new PGlite();const ids=Array.from({length:7},(_,i)=>'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'));
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const f of ['schema','live-rooms','live-classrooms-v2','room-student-numbers','manual-role-assignment','teaching-sessions','teaching-sessions','end-teaching-session','end-teaching-session'])await db.exec(fs.readFileSync('supabase/'+f+'.sql','utf8'));
 for(const id of ids)await db.query('insert into auth.users values($1)',[id]);await db.query("insert into assembly_roles values($1,'professor'),($2,'professor')",[ids[0],ids[6]]);
 const briefs=Object.fromEntries(['k','n','m','p','s'].map(k=>[k,{name:k,priorities:'CONFIDENTIAL_'+k}]));
 await db.query("insert into assembly_topics values('test','Test topic','Public summary','{}','A sufficiently long starting resolution for the test',$1,'[]')",[JSON.stringify(briefs)]);
 async function as(n){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[n]]);await db.exec('set role authenticated')}
 const rpc=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
 await as(0);const cid=(await rpc("select assembly_session_create('University workshop') id")).id;
 const participants=['k','n','m','p','s'].map((role,i)=>({name:'Named learner '+(i+1),role}));
 const create=async title=>(await rpc("select assembly_prepare_room($1,$2,'test',$3) id",[cid,title,JSON.stringify(participants)])).id;
 const rid=await create('Room A');const other=await create('Room B');
 await assert.rejects(db.query("select assembly_prepare_room($1,'Invalid','test',$2)",[cid,JSON.stringify(participants.map(p=>({...p,role:'k'})))]));
 const snap=async()=>(await rpc('select assembly_session_snapshot($1) s',[cid])).s;
 const act=async(command,payload={})=>(await rpc('select assembly_session_control($1,$2,$3) s',[cid,command,JSON.stringify(payload)])).s;
 let s=await snap();assert.equal(s.rooms.length,2);assert.equal(s.rooms[0].participants.length,5);assert.equal(s.rooms[0].participants[0].joined,false);assert.ok(s.rooms.every(r=>r.code.length===12));assert.notEqual(s.rooms[0].code,s.rooms[1].code);assert.ok(!JSON.stringify(s).includes('CONFIDENTIAL'));
 assert.deepEqual((await rpc('select assembly_live_snapshot($1) s',[rid])).s.assigned,{});
 s=await act('next',{revision:s.revision});assert.equal(s.stage,'prebrief');assert.equal(Date.parse(s.ends)-Date.parse(s.started),600000);
 await assert.rejects(act('next',{revision:s.revision}));
 await db.exec('reset role');
 for(let i=1;i<=5;i++){await db.query('insert into assembly_memberships values($1,$2)',[cid,ids[i]]);await db.query('update assembly_prepared_students set user_id=$1 where room_id=$2 and student_number=$3',[ids[i],rid,i]);}
 // Second room remains unjoined: starting must still be rejected.
 await as(0);await assert.rejects(act('next',{revision:(await snap()).revision}));
 await db.exec('reset role');await db.query('delete from assembly_live_rooms where id=$1',[other]);
 await as(1);s=await snap();assert.equal(s.rooms.length,1);assert.equal(s.rooms[0].code,null);assert.equal(s.rooms[0].participants[0].name,'Named learner 1');await assert.rejects(act('next',{revision:s.revision}));await assert.rejects(db.query('select * from assembly_prepared_students'));
 await as(6);await assert.rejects(snap());await as(0);
 s=await act('next',{revision:(await snap()).revision});assert.equal(s.stage,'negotiation');assert.equal(Date.parse(s.ends)-Date.parse(s.started),1200000);
 s=await act('pause');assert.equal(s.ends,null);assert.ok(s.remaining>1190);s=await act('resume');assert.ok(s.ends);
 s=await act('broadcast',{text:'Please review implementation responsibilities.'});assert.equal(s.broadcasts.length,1);
 s=await act('next',{revision:s.revision});assert.equal(s.stage,'report');assert.equal(Date.parse(s.ends)-Date.parse(s.started),900000);
 s=await act('next',{revision:s.revision});assert.equal(s.stage,'debrief');assert.equal(Date.parse(s.ends)-Date.parse(s.started),900000);
 s=await act('next',{revision:s.revision});assert.equal(s.stage,'finished');assert.equal(s.timing_log.length,5);
 const early=(await rpc("select assembly_session_create('End test') id")).id;
 let earlyState=(await rpc("select assembly_session_control($1,'next',$2) s",[early,JSON.stringify({revision:1})])).s;
 earlyState=(await rpc("select assembly_session_control($1,'pause','{}') s",[early])).s;
 await as(6);await assert.rejects(db.query('select assembly_end_teaching_session($1,$2)',[early,earlyState.revision]));await as(0);
 await assert.rejects(db.query('select assembly_end_teaching_session($1,1)',[early]));
 const ended=(await rpc('select assembly_end_teaching_session($1,$2) s',[early,earlyState.revision])).s;
 assert.equal(ended.stage,'finished');assert.equal(ended.ends,null);assert.equal(ended.remaining,null);assert.equal(ended.timing_log.at(-1).reason,'Professor ended session early');
 assert.equal((await rpc('select assembly_end_teaching_session($1,$2) s',[early,earlyState.revision])).s.stage,'finished');
 }finally{await db.close()}
});
