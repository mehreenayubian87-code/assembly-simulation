const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('shared code requests reveal no brief until owner approval and cannot bypass prepared roles',async()=>{
 const db=new PGlite();const ids=Array.from({length:8},(_,i)=>'10000000-0000-0000-0000-'+String(i+1).padStart(12,'0'));
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const f of ['schema','live-rooms','live-classrooms-v2','room-student-numbers','manual-role-assignment','teaching-sessions','prepared-entry','prepared-entry','audit-session-guards'])await db.exec(fs.readFileSync('supabase/'+f+'.sql','utf8'));
 for(const id of ids)await db.query('insert into auth.users values($1)',[id]);await db.query("insert into assembly_roles values($1,'professor'),($2,'professor')",[ids[0],ids[7]]);
 const briefs=Object.fromEntries(['k','n','m','p'].map(k=>[k,{name:k,priorities:'CONFIDENTIAL_'+k}]));
 await db.query("insert into assembly_topics values('test','Topic','Public summary','{}','Starting draft with sufficient text',$1,'[]')",[JSON.stringify(briefs)]);
 async function as(n){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[n]]);await db.exec('set role authenticated')}
 const rpc=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
 await as(0);const cid=(await rpc("select assembly_session_create('Workshop') id")).id;
 const participants=['k','n','m','p'].map((role,i)=>({name:'Learner '+(i+1),role}));
 const create=async title=>(await rpc("select assembly_prepare_room($1,$2,'test',$3) id",[cid,title,JSON.stringify(participants)])).id;
 const rid=await create('A'),other=await create('B');
 const all=(await rpc('select assembly_session_snapshot($1) s',[cid])).s;
 const code=all.rooms.find(r=>r.id===rid).code,otherCode=all.rooms.find(r=>r.id===other).code;
 const cohort=(await rpc('select join_code from assembly_classes where id=$1',[cid])).join_code;
 const snap=async(id=rid)=>(await rpc('select assembly_live_snapshot($1) s',[id])).s;
 const request=async(name,c=code)=>rpc('select assembly_request_entry($1,$2) s',[c,name]);
 const approve=async(n,yes=true)=>db.query('select assembly_approve_entry($1,$2,$3)',[rid,ids[n],yes]);
 await as(1);await assert.rejects(db.query('select assembly_join_class($1)',[cohort]));await assert.rejects(db.query('select assembly_room_enroll($1)',[rid]));await assert.rejects(request('Wrong name'));await request('Learner 1');await assert.rejects(snap());await assert.rejects(approve(1));await assert.rejects(db.query('select * from assembly_prepared_students'));
 await as(2);await request('Learner 1');await as(7);await assert.rejects(approve(1));await as(0);const requests=(await rpc('select assembly_entry_requests($1) q',[cid])).q;assert.equal(requests.length,2);await approve(1);
 await as(1);let s=await snap();assert.equal(s.brief.priorities,'CONFIDENTIAL_k');assert.ok(!JSON.stringify(s).includes('CONFIDENTIAL_n'));assert.equal(s.participants.length,4);assert.equal(s.participants[1].name,'Learner 2');assert.equal((await snap(other)).draft,null);assert.equal((await snap(other)).participants,undefined);await assert.rejects(request('Learner 2',otherCode));
 await as(2);assert.equal((await rpc('select assembly_my_entry_requests() q')).q[0].status,'rejected');await request('Learner 2');
 await as(0);await approve(2);await assert.rejects(db.query("select assembly_live_action($1,'assign',$2)",[rid,JSON.stringify({role:'m',student:ids[1]})]));
 await as(3);await request('Learner 3');await as(0);await approve(3,false);await as(3);assert.equal((await rpc('select assembly_my_entry_requests() q')).q[0].status,'rejected');await assert.rejects(snap());
 await as(3);await request('Learner 3');await as(0);await approve(3);await as(4);await request('Learner 4');await as(0);await approve(4);
 await db.exec('reset role');await db.query('delete from assembly_live_rooms where id=$1',[other]);await as(0);
 const session=async()=>(await rpc('select assembly_session_snapshot($1) s',[cid])).s;
 const next=async()=>rpc("select assembly_session_control($1,'next',$2) s",[cid,JSON.stringify({revision:(await session()).revision})]);
 await next();await as(1);await assert.rejects(db.query('select assembly_save_room_report($1,$2,1)',[rid,'Premature report']));await as(0);await next();assert.equal((await snap()).phase,'consultation');await next();
 await as(1);s=(await rpc('select assembly_save_room_report($1,$2,1) s',[rid,'Agreed policy and implementation responsibilities.'])).s;assert.equal(s.report_version,2);
 await as(2);await assert.rejects(db.query('select assembly_save_room_report($1,$2,1)',[rid,'Stale overwrite']));assert.equal((await snap()).report_text,'Agreed policy and implementation responsibilities.');
 await as(6);await assert.rejects(db.query('select assembly_save_room_report($1,$2,2)',[rid,'Unauthorized report']));
 await as(0);await next();await assert.rejects(db.query('select assembly_save_room_report($1,$2,2)',[rid,'Late edit']));
 await db.query('select assembly_end_teaching_session($1,$2)',[cid,(await session()).revision]);
 await assert.rejects(db.query("select assembly_live_action($1,'message',$2)",[rid,JSON.stringify({text:'After ending'})]),/ended/);
 await assert.rejects(approve(3),/ended/);
 assert.equal((await snap()).report_text,'Agreed policy and implementation responsibilities.');
 await db.exec('reset role');await db.exec(fs.readFileSync('supabase/direct-student-entry.sql','utf8'));await db.query("update assembly_teaching_sessions set stage='negotiation' where class_id=$1",[cid]);
 await as(6);await assert.rejects(request('Not on roster'));assert.equal((await request('Learner 1')).s,'approved');assert.equal((await snap()).role,'k');assert.equal((await request('Learner 1')).s,'approved');await assert.rejects(request('Learner 2'));
 await as(1);await assert.rejects(snap());
 await as(0);await assert.rejects(approve(6));
 }finally{await db.close()}
});
