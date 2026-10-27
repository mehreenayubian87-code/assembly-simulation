const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',checked:true,parentElement:{},style:{},classList:{toggle(){}},setAttribute(){},addEventListener(){},focus(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(id)}
 const context=vm.createContext({console,TextEncoder,Date,Math,setTimeout(){},window:{scrollTo(){}},document:{getElementById:element,querySelectorAll:()=>[],body:{classList:{toggle(){}}}},AssemblyScene:{init(){},view(){},screen(){},setTopic(){},speaking(){}},fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('dist/dialogue.json','utf8'))}),Audio:class{play(){queueMicrotask(()=>this.onended?.());return Promise.resolve()}pause(){}}});
 for(const name of ['model','roles','agreement','negotiation','diplomacy','chamber'])vm.runInContext(fs.readFileSync('dist/'+name+'.js','utf8'),context);
 return {run:s=>vm.runInContext(s,context),element};
}
test('chamber requires human plenary confirmation and reopens consultation on objection',async()=>{
 const f=fixture();await tick();
 f.run('Chamber.setup("solo");Chamber.assign(0,"k");Chamber.beginBriefings();Chamber.confirmBriefing();Chamber.start(false)');await tick();
 f.run('Chamber.shock()');await tick();f.run('Chamber.reporting();Chamber.choose("balanced")');await tick();
 f.run('Chamber.recordPosition("k","support");Chamber.decide()');
 assert.match(f.element('dialogBody').innerHTML,/Resolution/);
 assert.equal(f.run('Diplomacy.snapshot().committee'),false);
 f.run('Diplomacy.snapshot().paragraphs.forEach(p=>Diplomacy.edit(p.id,p.text,"agreed ad ref","Test"));Chamber.closeDialog();Chamber.decide()');
 assert.equal(f.run('Diplomacy.snapshot().committee'),true);assert.equal(f.run('Diplomacy.snapshot().plenary'),false);
 f.run('Chamber.completePlenary()');assert.equal(f.run('Diplomacy.snapshot().plenary'),false);
 f.run('Chamber.plenaryPosition("k",false)');assert.equal(f.run('Diplomacy.snapshot().committee'),false);
 f.run('Chamber.choose("balanced")');await tick();f.run('Chamber.recordPosition("k","support");Chamber.decide();Chamber.plenaryPosition("k",true);Chamber.completePlenary()');await tick();
 assert.equal(f.run('Diplomacy.snapshot().plenary'),true);assert.match(f.element('panel').innerHTML,/Your agreement is ready/);
 f.run('Chamber.reviewAgreement()');assert.match(f.element('dialogBody').innerHTML,/URGES Member States/);assert.match(f.element('dialogBody').innerHTML,/closing-plenary adoption/);
 f.run('Chamber.resetSession()');assert.equal(f.run('Diplomacy.snapshot().plenary'),false);
});
test('group plenary waits for each human country and cannot adopt text edited after committee',async()=>{
 const f=fixture();await tick();
 f.run('Chamber.setup("group");Chamber.assign(0,"k");Chamber.assign(1,"n");Chamber.beginBriefings();Chamber.confirmBriefing();Chamber.confirmBriefing();Chamber.start(false)');await tick();
 f.run('Chamber.shock()');await tick();f.run('Chamber.reporting();Chamber.choose("balanced")');await tick();
 f.run('Diplomacy.snapshot().paragraphs.forEach(p=>Diplomacy.edit(p.id,p.text,"agreed ad ref","Test"));Chamber.recordPosition("k","support");Chamber.recordPosition("n","support");Chamber.decide();Chamber.plenaryPosition("k",true);Chamber.completePlenary()');
 assert.equal(f.run('Diplomacy.snapshot().plenary'),false);
 f.run('Chamber.plenaryPosition("n",true);Diplomacy.edit("OP1","URGES Member States to reconsider the allocation principles;","agreed ad ref","Test");Chamber.completePlenary()');
 assert.equal(f.run('Diplomacy.snapshot().plenary'),false);assert.match(f.element('panel').innerHTML,/Revise the package/);
});
