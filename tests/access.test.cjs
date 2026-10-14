const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
test('database isolates student work and restricts professor privileges',async()=>{
 const db=new PGlite();
 const ids=[1,2,3,4].map(n=>'00000000-0000-0000-0000-00000000000'+n);
 try{
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
 await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/classroom-management.sql','utf8'));
 for(const id of ids)await db.query('insert into auth.users values ($1)',[id]);
 await db.query("insert into assembly_roles values ($1,'professor'),($2,'professor')",[ids[2],ids[3]]);
 async function as(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role)}
 await as(ids[2]);const classId=(await db.query("select assembly_create_class('Seminar') as id")).rows[0].id;
 const code=(await db.query('select join_code from assembly_classes')).rows[0].join_code;
 await as(ids[0]);
 await assert.rejects(db.query("insert into assembly_roles values ($1,'professor')",[ids[0]]));
 await assert.rejects(db.query("select assembly_create_class('Forbidden')"));
 assert.equal((await db.query('select * from assembly_classes')).rows.length,0);
 await db.query("insert into assembly_reports(owner_id,report_id,report) values ($1,'PRIVATE','{}')",[ids[0]]);
 await assert.rejects(db.query("insert into assembly_reports(owner_id,report_id,class_id,report) values ($1,'BAD',$2,'{}')",[ids[0],classId]));
 await db.query('select assembly_join_class($1)',[code]);
 await db.query("insert into assembly_reports(owner_id,report_id,class_id,report) values ($1,'SUBMITTED',$2,'{}')",[ids[0],classId]);
 await as(ids[1]);assert.equal((await db.query('select * from assembly_reports')).rows.length,0);
 await assert.rejects(db.query("insert into assembly_reports(owner_id,report_id,report) values ($1,'IMPERSONATE','{}')",[ids[0]]));
 await as(ids[2]);assert.deepEqual((await db.query('select report_id from assembly_reports')).rows,[{report_id:'SUBMITTED'}]);
 assert.equal((await db.query("update assembly_reports set report='{}' returning id")).rows.length,0);
 await db.query('select assembly_close_class($1)',[classId]);
 await as(ids[1]);await assert.rejects(db.query('select assembly_join_class($1)',[code]));
 await as(ids[3]);assert.equal((await db.query('select * from assembly_reports')).rows.length,0);
 await assert.rejects(db.query('select assembly_reopen_class($1)',[classId]));
 await assert.rejects(db.query('select assembly_delete_class($1)',[classId]));
 await as(ids[0]);await assert.rejects(db.query('select assembly_delete_class($1)',[classId]));
 await assert.rejects(db.query('select assembly_reopen_class($1)',[classId]));
 await as(ids[2]);await db.query('select assembly_reopen_class($1)',[classId]);
 await as(ids[1]);await db.query('select assembly_join_class($1)',[code]);
 await as(ids[2]);await db.query('select assembly_delete_class($1)',[classId]);
 assert.equal((await db.query('select * from assembly_reports')).rows.length,0);
 await as(ids[0]);assert.equal((await db.query('select * from assembly_memberships')).rows.length,0);
 const retained=await db.query('select class_id from assembly_reports');assert.equal(retained.rows.length,2);assert.ok(retained.rows.every(r=>r.class_id===null));
 await assert.rejects(db.query('select assembly_join_class($1)',[code]));
 await as('', 'anon');await assert.rejects(db.query('select assembly_reopen_class($1)',[classId]));await assert.rejects(db.query('select assembly_delete_class($1)',[classId]));await assert.rejects(db.query('select * from assembly_reports'));await assert.rejects(db.query('select assembly_join_class($1)',[code]));
 }finally{await db.close()}
});
