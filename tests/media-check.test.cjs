const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('device check stops camera on close and discards permission results received after closing',async()=>{
 const listeners={},nodes=new Map();const node=s=>{if(!nodes.has(s))nodes.set(s,{setAttribute(){},value:0});return nodes.get(s)};
 const modal={open:false,setAttribute(){},querySelector:node,addEventListener:(k,f)=>listeners[k]=f,showModal(){this.open=true},close(){this.open=false}};
 let resolve,stopped=0;const track={kind:'video',readyState:'live',stop(){stopped++;this.readyState='ended'}};
 const context={document:{createElement:()=>modal,body:{append(){}}},window:{addEventListener(){}},navigator:{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)}},cancelAnimationFrame(){},MediaStream:class{constructor(){this.tracks=[]}getTracks(){return this.tracks}addTrack(t){this.tracks.push(t)}}};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/media-check.js','utf8'),context);
 const click=action=>listeners.click({target:{closest:()=>({dataset:{media:action}})}});
 context.window.AssemblyMedia.open();click('camera');click('close');resolve({getTracks:()=>[track]});await new Promise(r=>setImmediate(r));assert.equal(stopped,1);assert.equal(modal.open,false);assert.equal(node('video').srcObject,null);
 track.readyState='live';context.window.AssemblyMedia.open();click('camera');resolve({getTracks:()=>[track]});await new Promise(r=>setImmediate(r));assert.ok(node('video').srcObject);click('close');assert.equal(stopped,2);assert.equal(node('video').srcObject,null);
});
