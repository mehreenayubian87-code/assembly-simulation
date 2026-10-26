const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const policy=require('../dist/access.js');
async function run(user,role,memberships,fail=false){
 let starts=0,reloads=0,authCallback;
 const nodes={};const node=()=>({hidden:false,innerHTML:'',textContent:'',classList:{toggle(){}},setAttribute(){},addEventListener(){},append(){},querySelector(){return node()},show(){this.open=true},showModal(){this.open=true},close(){this.open=false}});
 const document={body:node(),createElement:node,getElementById:id=>nodes[id]||(nodes[id]=node())};
 const client={auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:cb=>{authCallback=cb}},from(table){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},maybeSingle(){return q},then(resolve){return Promise.resolve({data:table==='assembly_roles'?(role?{role:'professor'}:null):table==='assembly_memberships'?memberships:[],error:fail?{message:'Unavailable'}:null}).then(resolve)}};return q}};
 const window={ASSEMBLY_AUTH_CONFIG:{url:'https://example.supabase.co',publishableKey:'sb_publishable_example'},createAssemblyAuthClient:()=>client,AssemblyEntry:{enter:async()=>{starts++}},addEventListener(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}}};
 vm.runInNewContext(fs.readFileSync('dist/account.js','utf8'),{window,document,AssemblyAccess:policy,location:{reload(){reloads++}},setTimeout,console});
 await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 return {starts,signout(){authCallback('SIGNED_OUT',null);return reloads}};
}
test('account bootstrap does not load the assembly for a signed-out user',async()=>assert.equal((await run(null,false,[])).starts,0));
test('Google identity or anonymous identity without membership cannot enter',async()=>{
 assert.equal((await run({id:'google'},false,[])).starts,0);
 assert.equal((await run({id:'guest',is_anonymous:true},false,[])).starts,0);
});
test('approved professors and classroom members enter, sign-out resets the page',async()=>{
 const teacher=await run({id:'teacher'},true,[]);assert.equal(teacher.starts,1);assert.equal(teacher.signout(),1);
 assert.equal((await run({id:'student'},false,[{class_id:'c'}])).starts,1);
});
test('failed access lookup keeps entry locked',async()=>assert.equal((await run({id:'teacher'},true,[],true)).starts,0));
