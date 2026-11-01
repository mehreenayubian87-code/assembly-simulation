const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('workspace entry does not start 3D; solo starts it and live returns to the workspace',()=>{
 const flags=new Set(),nodes=new Map();let sceneStarts=0,soloOpened=0,liveOpened=0,audioPaused=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,focus(){},pause(){}});return nodes.get(id)};
 const context={document:{body:{classList:{add:x=>flags.add(x),remove:x=>flags.delete(x)}},getElementById:node,querySelector:node},window:{scrollTo(){},dispatchEvent(){}},Event:class{},Chamber:{suspendAudio(){audioPaused++}},AssemblyScene:{init(){sceneStarts++}},AssemblyRooms:{soloTopics(){soloOpened++}},AssemblyWorkshop:{open(){liveOpened++}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('dist/workspace.js','utf8'),context);const app=context.window.AssemblyWorkspace;
 app.home();assert.equal(sceneStarts,0);assert.equal(node('practiceWorkspace').hidden,false);assert.ok(flags.has('workspace-mode'));
 app.solo();assert.equal(sceneStarts,1);assert.equal(soloOpened,1);assert.equal(node('practiceWorkspace').hidden,true);assert.ok(flags.has('solo-workspace'));
 app.live();assert.equal(liveOpened,1);assert.equal(sceneStarts,1);assert.ok(!flags.has('solo-workspace'));assert.ok(audioPaused>0);
});
test('public resource scenario contains evidence and unresolved text but no confidential roles',()=>{
 const topics=JSON.parse(fs.readFileSync('dist/public-topics.json','utf8'));const t=topics.find(t=>t.id==='digital-water-health');
 assert.ok(t);assert.ok(t.packet.sources.every(s=>s.url.startsWith('https://')));assert.ok(t.zero_draft.includes('['));assert.equal(t.roles,undefined);assert.equal(t.private_roles,undefined);assert.equal(t.injects,undefined);
});
