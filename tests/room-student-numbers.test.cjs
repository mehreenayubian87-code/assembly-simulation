const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('room student numbers are private, stable, capacity-limited and isolated between rooms',async()=>{
 const db=new PGlite();const ids=Array.from({length:7},(_,i)=>'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'));
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const f of ['schema','live-rooms','live-classrooms-v2','room-student-numbers','room-student-numbers'])await db.exec(fs.readFileSync('supabase/'+f+'.sql','utf8'));
 for(const id of ids)await db.query('insert into auth.users values($1)',[id]);await db.query("insert into assembly_roles values($1,'professor'),($2,'professor')",[ids[0],ids[6]]);
 const briefs=Object.fromEntries(['k','n','m','p','s','a','v','e'].map(k=>[k,{name:k,priorities:'CONFIDENTIAL_'+k,constraints:'PRIVATE_CONSTRAINT_'+k}]));
 await db.query("insert into assembly_topics values('test','Test topic','Public summary','{}','A sufficiently long starting resolution for the test',$1,'[\"Teacher-only inject\"]')",[JSON.stringify(briefs)]);
 async function as(n){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[n]]);await db.exec('set role authenticated')}
 const rpc=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
 await as(0);const cid=(await rpc("select assembly_create_class('Policy seminar') id")).id;const code=(await rpc('select join_code from assembly_classes')).join_code;
 const rid=(await rpc("select assembly_live_create_v2($1,'Room A','test',4,30) id",[cid])).id;
 const other=(await rpc("select assembly_live_create_v2($1,'Room B','test',4,20) id",[cid])).id;
 const snap=async(id=rid)=>(await rpc('select assembly_live_snapshot($1) s',[id])).s;
 const act=async(action,payload={},id=rid)=>(await rpc('select assembly_live_action($1,$2,$3) s',[id,action,JSON.stringify(payload)])).s;
 assert.match(JSON.stringify((await rpc('select assembly_topic_catalog() c')).c),/CONFIDENTIAL_n/);
 for(let i=1;i<=4;i++){await as(i);await db.query('select assembly_join_class($1)',[code]);assert.equal((await rpc('select assembly_room_enroll($1) n',[rid])).n,i);assert.equal((await rpc('select assembly_room_enroll($1) n',[rid])).n,i);await assert.rejects(db.query('select assembly_room_enroll($1)',[other]));}
 await as(1);const catalog=(await rpc('select assembly_topic_catalog() c')).c;assert.equal(catalog[0].roles,null);assert.equal(catalog[0].injects,null);assert.ok(!JSON.stringify(catalog).includes('CONFIDENTIAL'));
 await assert.rejects(db.query('select private_roles from assembly_topics'));await assert.rejects(db.query('select assembly_live_snapshot_v1($1)',[rid]));await assert.rejects(db.query("select assembly_live_action_v1($1,'join','{\"role\":\"k\"}')",[rid]));
 await assert.rejects(act('join',{role:'k'}));await assert.rejects(act('assign',{role:'k',student:ids[1]}));assert.equal((await snap()).brief,null);
 await as(5);await db.query('select assembly_join_class($1)',[code]);await assert.rejects(db.query('select assembly_room_enroll($1)',[rid]));assert.equal((await rpc('select assembly_room_enroll($1) n',[other])).n,1);await assert.rejects(db.query('select assembly_room_roster($1)',[rid]));await assert.rejects(db.query('select * from assembly_room_students'));
 await as(0);const roster=(await rpc('select assembly_room_roster($1) r',[rid])).r;assert.deepEqual(roster.map(s=>s.name),['Student 1','Student 2','Student 3','Student 4']);assert.ok(!JSON.stringify(roster).includes(ids[5]));assert.equal((await rpc('select assembly_room_roster($1) r',[other])).r[0].name,'Student 1');await assert.rejects(act('assign',{role:'s',student:ids[5]}));await act('assign',{role:'k',student:ids[1]});await act('assign',{role:'n',student:ids[2]});await act('assign',{role:'m',student:ids[3]});
 await assert.rejects(act('advance',{revision:(await snap()).revision}));await assert.rejects(act('assign',{role:'p',student:ids[1]}));await assert.rejects(act('assign',{role:'k',student:ids[1]},other));await act('assign',{role:'p',student:ids[4]});
 await as(1);let s=await snap();assert.equal(s.brief.priorities,'CONFIDENTIAL_k');assert.equal(s.all_briefs,null);assert.equal(s.assigned,null);assert.ok(!JSON.stringify(s).includes('CONFIDENTIAL_n'));assert.equal((await snap(other)).brief,null);assert.equal((await snap(other)).draft,null);await assert.rejects(act('inject',{text:'Unauthorized event in this classroom'}));await assert.rejects(act('timer_extend',{minutes:5}));
 await as(0);s=await act('advance',{revision:(await snap()).revision});assert.equal(s.phase,'consultation');assert.ok(s.timer_end);assert.equal(s.duration_seconds,1800);await assert.rejects(act('assign',{role:'k',student:ids[2]}));
 s=await act('timer_pause');assert.equal(s.timer_end,null);assert.ok(s.timer_remaining>1700);s=await act('timer_extend',{minutes:5});assert.ok(s.timer_remaining>2000);s=await act('timer_resume');assert.ok(s.timer_end);assert.equal(s.timer_remaining,null);
 s=await act('advance',{revision:(await snap()).revision});assert.equal(s.phase,'committee');
 await as(1);await act('respond',{phase:'committee',draft_version:s.draft_version,position:'no_objection'});
 await as(0);s=await act('inject',{text:'Fictional event: supply interruption. Reconsider implementation.'});assert.equal(s.phase,'consultation');assert.deepEqual(s.responses,{});assert.equal(s.events.at(-1).kind,'inject');
 assert.equal((await snap(other)).events.length,0);const overview=(await rpc('select assembly_live_list() l')).l;assert.equal(overview.length,2);assert.ok(overview.every(r=>r.teacher));
 await as(6);await assert.rejects(snap());assert.deepEqual((await rpc('select assembly_class_roster($1) r',[cid])).r,[]);
 await as(5);assert.equal((await snap()).brief,null);assert.equal((await snap()).student_number,null);assert.equal((await snap(other)).student_number,1);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select assembly_topic_catalog()'));await assert.rejects(db.query('select assembly_live_snapshot($1)',[rid]));
 }finally{await db.close()}
});
