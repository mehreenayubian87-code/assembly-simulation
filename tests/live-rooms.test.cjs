const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('live rooms enforce membership, unique seats, stale-write checks and individual consensus in both phases',async()=>{
 const db=new PGlite(),ids=[1,2,3,4,5].map(n=>'00000000-0000-0000-0000-00000000000'+n);
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));await db.exec(fs.readFileSync('supabase/live-rooms.sql','utf8'));await db.exec(fs.readFileSync('supabase/live-rooms.sql','utf8'));
 for(const id of ids)await db.query('insert into auth.users values($1)',[id]);await db.query("insert into assembly_roles values($1,'professor'),($2,'professor')",[ids[0],ids[4]]);
 async function as(i){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[i]]);await db.exec('set role authenticated')}
 await as(0);const cid=(await db.query("select assembly_create_class('Seminar') id")).rows[0].id;const code=(await db.query('select join_code from assembly_classes')).rows[0].join_code;
 const rid=(await db.query("select assembly_live_create($1,'Group 1') id",[cid])).rows[0].id;
 const snap=async()=>(await db.query('select assembly_live_snapshot($1) s',[rid])).rows[0].s;
 const act=async(kind,payload={})=>(await db.query('select assembly_live_action($1,$2,$3) s',[rid,kind,JSON.stringify(payload)])).rows[0].s;
 await as(3);await assert.rejects(snap());assert.deepEqual((await db.query('select assembly_live_list() rooms')).rows[0].rooms,[]);await assert.rejects(act('join',{role:'k'}));
 await as(4);await assert.rejects(snap());await assert.rejects(act('advance',{revision:1}));
 await as(1);await db.query('select assembly_join_class($1)',[code]);await assert.rejects(db.query("select assembly_live_create($1,'Forbidden')",[cid]));assert.equal((await snap()).draft,null);await act('join',{role:'k'});await assert.rejects(act('join',{role:'n'}));await assert.rejects(db.query('select * from assembly_live_rooms'));
 await as(2);await db.query('select assembly_join_class($1)',[code]);await assert.rejects(act('join',{role:'k'}));await act('join',{role:'n'});await assert.rejects(act('advance',{revision:(await snap()).revision}));
 await as(0);await act('advance',{revision:(await snap()).revision});assert.equal((await snap()).phase,'consultation');
 await as(1);let s=await snap();const old=s.revision;await act('message',{text:'We propose equitable delivery.'});await assert.rejects(act('draft',{text:'URGES Member States to improve access and delivery;',revision:old}));s=await act('draft',{text:'URGES Member States to improve access and delivery;',revision:(await snap()).revision});const v=s.draft_version;
 await as(0);await act('advance',{revision:(await snap()).revision});await assert.rejects(act('advance',{revision:(await snap()).revision}));await assert.rejects(act('respond',{position:'no_objection',phase:'committee',draft_version:v}));
 await as(1);await assert.rejects(act('respond',{position:'no_objection',phase:'committee',draft_version:v-1}));await act('respond',{position:'no_objection',phase:'committee',draft_version:v});
 await as(2);await act('respond',{position:'object',phase:'committee',draft_version:v,explanation:'Need delivery financing.'});
 await as(0);await assert.rejects(act('advance',{revision:(await snap()).revision}));
 await as(2);await act('respond',{position:'no_objection',phase:'committee',draft_version:v,explanation:'Financing remains a follow-up concern.'});
 await as(0);s=await act('advance',{revision:(await snap()).revision});assert.equal(s.phase,'plenary');assert.deepEqual(s.responses,{});await assert.rejects(act('advance',{revision:s.revision}));
 await as(1);await assert.rejects(act('respond',{position:'no_objection',phase:'committee',draft_version:v}));await act('respond',{position:'no_objection',phase:'plenary',draft_version:v});
 await as(2);await act('respond',{position:'no_objection',phase:'plenary',draft_version:v});
 await as(0);s=await act('advance',{revision:(await snap()).revision});assert.equal(s.phase,'adopted');await assert.rejects(act('reopen'));await assert.rejects(act('message',{text:'Change final decision'}));assert.ok(!JSON.stringify(s).includes(ids[1]));
 await as(1);assert.equal((await snap()).phase,'adopted');await assert.rejects(act('draft',{text:'URGES a different outcome in this classroom;',revision:(await snap()).revision}));
 }finally{await db.close()}
});
