const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const policy=require('../dist/access.js');
async function run(user,role,memberships,fail=false){
 let starts=0,reloads=0,authCallback,modal;
 const nodes={};const node=()=>({hidden:false,innerHTML:'',textContent:'',classList:{toggle(){}},setAttribute(){},listeners:{},addEventListener(name,fn){this.listeners[name]=fn},append(){},querySelector(){return node()},show(){this.open=true},showModal(){this.open=true},close(){this.open=false}});
 const document={body:node(),createElement:()=>{modal=node();return modal},getElementById:id=>nodes[id]||(nodes[id]=node())};
 const client={auth:{getUser:async()=>({data:{user},error:null}),onAuthStateChange:cb=>{authCallback=cb}},from(table){const q={select(){return q},eq(){return q},order(){return q},limit(){return q},maybeSingle(){return q},then(resolve){return Promise.resolve({data:table==='assembly_roles'?(role?{role:'professor'}:null):table==='assembly_memberships'?memberships:[],error:fail?{message:'Unavailable'}:null}).then(resolve)}};return q}};
 const window={ASSEMBLY_AUTH_CONFIG:{url:'https://example.supabase.co',publishableKey:'sb_publishable_example'},createAssemblyAuthClient:()=>client,AssemblyEntry:{enter:async()=>{starts++}},addEventListener(){},localStorage:{getItem(){return null},setItem(){},removeItem(){}}};
 vm.runInNewContext(fs.readFileSync('dist/account.js','utf8'),{window,document,AssemblyAccess:policy,location:{reload(){reloads++}},setTimeout,console});
 await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 return {starts,paste(input,text){let prevented=false;modal.listeners.paste({target:input,clipboardData:{getData:()=>text},preventDefault(){prevented=true}});return prevented},html:()=>modal.innerHTML,async repeatSignIn(){modal.innerHTML='Preserved typed form and error';authCallback('SIGNED_IN',{user});await new Promise(r=>setTimeout(r,10));return modal.innerHTML},signout(){authCallback('SIGNED_OUT',null);return reloads}};
}
test('account bootstrap does not load the assembly for a signed-out user',async()=>assert.equal((await run(null,false,[])).starts,0));
test('Google identity or anonymous identity without membership cannot enter',async()=>{
 assert.equal((await run({id:'google'},false,[])).starts,0);
 assert.equal((await run({id:'guest',is_anonymous:true},false,[])).starts,0);
});
test('approved professors and classroom members enter, sign-out resets the page',async()=>{
 const teacher=await run({id:'teacher'},true,[]);assert.equal(teacher.starts,1);assert.match(teacher.html(),/Professor workspace/);assert.match(teacher.html(),/Manage teaching sessions/);assert.doesNotMatch(teacher.html(),/Account temporarily unavailable/);assert.equal(teacher.signout(),1);
 const student=await run({id:'student'},false,[{class_id:'c'}]);assert.equal(student.starts,1);assert.match(student.html(),/My learning workspace/);assert.doesNotMatch(student.html(),/Account temporarily unavailable/);
});
test('failed access lookup keeps entry locked',async()=>assert.equal((await run({id:'teacher'},true,[],true)).starts,0));

test('unapproved anonymous session retains student entry UI and ignores duplicate sign-in events',async()=>{
 const pending=await run({id:'pending-student',is_anonymous:true},false,[]);
 assert.match(pending.html(),/studentJoinForm/);
 assert.doesNotMatch(pending.html(),/My learning workspace|pending-student/);
 assert.equal(await pending.repeatSignIn(),'Preserved typed form and error');
});

test('pasting a full classroom code preserves all twelve characters and replaces stale text',async()=>{
 const app=await run(null,false,[]);const hint={};
 const input={name:'code',value:'OLD',selectionStart:3,selectionEnd:3,form:{querySelector(){return hint}},setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b},setCustomValidity(value){this.validation=value}};
 assert.equal(app.paste(input,'  a9cf79ba9abc\u200B\n'),true);
 assert.equal(input.value,'A9CF79BA9ABC');assert.equal(input.validation,'');assert.equal(hint.textContent,'12 of 12 characters');
 app.paste(input,'A9CF79BA9ABC');assert.equal(input.value,'A9CF79BA9ABC');
 input.value='A9CF79BA9AB';input.selectionStart=11;input.selectionEnd=11;app.paste(input,'C');assert.equal(input.value,'A9CF79BA9ABC');assert.equal(input.validation,'');
});
