const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('board retains selected issue through stage changes and replaces it between rooms',()=>{
 const drawn=[];const canvas={fillRect(){drawn.length=0},beginPath(){},moveTo(){},lineTo(){},stroke(){},measureText:t=>({width:t.length*28}),fillText:t=>drawn.push(t)};
 const source=fs.readFileSync('dist/scene.js','utf8').replace('return {init,view,speaking,screen,setTopic};','screenTexture=texture;return {init,view,speaking,screen,setTopic};');
 const ctx=vm.createContext({matchMedia:()=>({matches:false}),texture:{getContext:()=>canvas,update(){}}});vm.runInContext(source,ctx);
 vm.runInContext("AssemblyScene.setTopic('Antimicrobial resistance','Classroom 2');AssemblyScene.screen('CLOSING PLENARY','Review the draft');",ctx);
 assert.ok(drawn.includes('Antimicrobial resistance'));assert.ok(drawn.some(t=>t.includes('CLOSING PLENARY')));
 vm.runInContext("AssemblyScene.setTopic('Climate change and health','Classroom 3')",ctx);assert.ok(drawn.includes('Climate change and health'));assert.ok(!drawn.includes('Antimicrobial resistance'));
 vm.runInContext("AssemblyScene.setTopic('')",ctx);assert.ok(drawn.includes('CHOOSE A HEALTH ISSUE'));
});
