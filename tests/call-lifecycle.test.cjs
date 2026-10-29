const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(invoke){
 const classes=()=>{const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x),toggle(x,on){on??=!s.has(x);on?s.add(x):s.delete(x);return on}}};
 const nodes=new Map(),listeners={},frames=[];
 const node=s=>{if(!nodes.has(s))nodes.set(s,{setAttribute(){}});return nodes.get(s)};
 const panel={classList:classes(),setAttribute(){},querySelector:node,addEventListener:(k,f)=>listeners[k]=f,matches(){return this.open},showPopover(){this.open=true},hidePopover(){this.open=false}};
 let poll;
 const client={functions:{invoke:invoke||(async()=>({data:{stage:'negotiation',url:'room',token:'token'}}))},rpc:async()=>({data:{stage:'negotiation'}})};
 const context={document:{createElement:t=>t==='section'?panel:{},head:{append:s=>s.onload()},body:{append(){},classList:classes()}},window:{addEventListener(){},Daily:{createFrame(){const handlers={};const f={destroyed:0,on:(k,h)=>handlers[k]=h,join:async()=>{},destroy:async()=>{f.destroyed++},handlers};frames.push(f);return f}}},AssemblyMedia:{close(){}},AssemblyAccount:{connection:()=>client},setInterval:f=>(poll=f,1),clearInterval(){poll=null}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('dist/conferencing.js','utf8'),context);
 return {call:context.window.AssemblyCall,panel,frames,client,poll:()=>poll(),click(action){const b=node('[data-call="'+action+'"]');b.closest=()=>({dataset:{call:action}});listeners.click({target:b})}};
}
test('minimize and reopen preserve the live call; switching ignores old frame events',async()=>{
 const h=setup();await h.call.join('class','one');h.click('minimize');assert.equal(h.panel.classList.contains('minimized'),true);assert.equal(h.frames[0].destroyed,0);
 await h.call.join('class','one');assert.equal(h.frames.length,1);assert.equal(h.panel.classList.contains('minimized'),false);
 await h.call.join('class','two');assert.equal(h.frames[0].destroyed,1);h.frames[0].handlers['left-meeting']();assert.equal(h.call.active(),true);assert.equal(h.frames[1].destroyed,0);
 await h.call.leave();assert.equal(h.frames[1].destroyed,1);assert.equal(h.call.active(),false);
});
test('leaving during token retrieval cannot open a late camera session',async()=>{
 let resolve;const h=setup(()=>new Promise(r=>resolve=r));const joining=h.call.join('class','one');await new Promise(r=>setImmediate(r));await h.call.leave();resolve({data:{stage:'negotiation'}});await joining;assert.equal(h.frames.length,0);assert.equal(h.panel.hidden,true);
});
test('session stage change moves lobby participants into their assigned room',async()=>{
 const h=setup(async()=>({data:{stage:h.frames.length?'negotiation':'prebrief',url:'room',token:'token'}}));
 await h.call.join('class','one');h.client.rpc=async()=>({data:{stage:'negotiation',teacher:false,rooms:[{id:'one'}]}});await h.poll();assert.equal(h.frames.length,2);assert.equal(h.frames[0].destroyed,1);
});
