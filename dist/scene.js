/* Original, stylized architecture. Not an architectural survey of a WHO venue. */
const AssemblyScene=(()=>{
 let engine,scene,camera,screenTexture,screenMesh,active='',move=null,last=0;
 let agenda='';
 const desks={}, people=[], lamps={};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function init(){
  if(!window.BABYLON)throw new Error('The local 3D library is unavailable.');
  const B=BABYLON,V=B.Vector3, canvas=document.getElementById('world');
  engine=new B.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,antialias:true});
  engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));
  scene=new B.Scene(engine);scene.clearColor=new B.Color4(.055,.105,.13,1);
  scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.013;scene.fogColor=new B.Color3(.065,.12,.14);
  camera=new B.UniversalCamera('delegate view',new V(0,8,-17),scene);camera.minZ=.1;camera.maxZ=90;camera.fov=.78;camera.setTarget(new V(2,1.5,3));
  const hemi=new B.HemisphericLight('soft ceiling light',new V(0,1,0),scene);hemi.intensity=.8;hemi.groundColor=new B.Color3(.2,.25,.23);
  const sun=new B.DirectionalLight('chamber daylight',new V(.4,-1,.5),scene);sun.position=new V(-7,12,-4);sun.intensity=.9;sun.diffuse=new B.Color3(1,.91,.75);
  const stageLight=new B.PointLight('stage light',new V(0,6,6),scene);stageLight.intensity=.8;stageLight.range=22;stageLight.diffuse=new B.Color3(.65,.82,1);
  const shadows=new B.ShadowGenerator(1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=12;
  function mat(name,hex,rough=1,emissive=false){const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(hex);m.specularColor=new B.Color3(.12,.12,.12).scale(1-rough*.7);if(emissive){m.emissiveColor=m.diffuseColor;m.disableLighting=true}return m}
  const wood=mat('walnut','#786048'),edge=mat('dark timber','#433d33'),wall=mat('warm limestone','#bbb49f'),carpet=mat('petrol blue carpet','#365762'),black=mat('microphones','#1d2930'),gold=mat('brushed brass','#c4aa72',.4),white=mat('ivory paper','#f2e8cf'),seat=mat('sage upholstery','#556a60'),navy=mat('suit blue','#283f50'),cream=mat('suit ivory','#b9b3a1'),hair=mat('hair','#31342e'),skin=mat('skin','#b88c6a'),skin2=mat('skin 2','#d0ad8c'),light=mat('luminous strips','#efd6a5',0,true),blue=mat('window light','#a2c7d1',0,true);
  function box(n,w,h,d,x,y,z,m,parent){const mesh=B.MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=m;mesh.parent=parent||null;mesh.receiveShadows=true;return mesh}
  function cyl(n,d,h,x,y,z,m,parent){const mesh=B.MeshBuilder.CreateCylinder(n,{diameter:d,height:h,tessellation:24},scene);mesh.position.set(x,y,z);mesh.material=m;mesh.parent=parent||null;return mesh}
  function sphere(n,d,x,y,z,m,parent){const mesh=B.MeshBuilder.CreateSphere(n,{diameter:d,segments:12},scene);mesh.position.set(x,y,z);mesh.material=m;mesh.parent=parent||null;return mesh}
  function label(text,w,h,x,y,z,bg='#efe9d8',color='#253c3d',parent){const tx=new B.DynamicTexture('label '+text,{width:768,height:128},scene,false);const ctx=tx.getContext();ctx.fillStyle=bg;ctx.fillRect(0,0,768,128);ctx.font='500 57px Arial';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,67);tx.update();const m=new B.StandardMaterial('label material '+text,scene);m.diffuseTexture=tx;m.emissiveTexture=tx;m.specularColor=B.Color3.Black();m.backFaceCulling=false;const p=B.MeshBuilder.CreatePlane(text,{width:w,height:h,sideOrientation:B.Mesh.DOUBLESIDE},scene);p.position.set(x,y,z);p.material=m;p.parent=parent||null;return p}
  box('floor',32,.22,34,0,-.14,0,carpet);
  box('rear wall',30,9,.35,0,4.4,11.5,wall);
  box('left wall',.3,9,27,-14,4.4,-2,wall);box('right wall',.3,9,27,14,4.4,-2,wall);
  for(let x=-13.7;x<=13.7;x+=.37)box('acoustic timber slat',.14,8,.17,x,4.05,11.23,wood);
  box('stage',18,.5,5,0,.2,8.6,edge);box('stage surface',18,.06,5,0,.49,8.6,wood);
  box('step one',14,.18,.5,0,.0,5.8,edge);box('step two',14,.32,.5,0,.12,6.3,wood);
  box('stage edge light',17,.025,.04,0,.44,6.08,light);
  for(const x of [-13.8,13.8])for(let z=-9;z<10;z+=3.1){box('window',.05,5.5,2.3,x,4,z,blue);box('window frame',.12,5.6,.08,x+(x<0?.03:-.03),4,z-1.15,gold)}
  for(let z=-8;z<12;z+=3.5){box('ceiling beam',28,.18,.28,0,8.6,z,wood);box('ceiling light',21,.035,.07,0,8.47,z,light)}
  // Emblem is an original geometric globe, deliberately not WHO insignia.
  const ring=B.MeshBuilder.CreateTorus('globe outer ring',{diameter:1.5,thickness:.035,tessellation:64},scene);ring.position.set(-6.7,4.1,10.95);ring.rotation.x=Math.PI/2;ring.material=gold;
  const inner=ring.clone('globe meridian');inner.scaling.x=.45;const equator=ring.clone('globe equator');equator.scaling.y=.45;
  label('ASSEMBLY',2.6,.35,-6.7,2.85,10.95,'#65543e','#eddbaf');
  screenTexture=new B.DynamicTexture('central agenda',{width:1536,height:768},scene,false);
  const sm=new B.StandardMaterial('screen glass',scene);sm.diffuseTexture=screenTexture;sm.emissiveTexture=screenTexture;sm.disableLighting=true;sm.specularColor=B.Color3.Black();
  box('screen surround',8.4,4.3,.22,0,4.1,11,black);screenMesh=B.MeshBuilder.CreatePlane('agenda screen',{width:8,height:4},scene);screenMesh.position.set(0,4.1,10.85);screenMesh.material=sm;
  screen('CHOOSE A HEALTH ISSUE','Select solo practice or enter your assigned classroom.','ASSEMBLY');
  const colors=[['#60867a','#d6bd78','#e5dfc8'],['#3b697c','#ebdfc7','#75a5a6'],['#b39683','#ddd7c5','#87769f'],['#568177','#e0d4a4','#6b95a3']];
  colors.forEach((cs,i)=>{const x=6+i*.75;cyl('flag stand',.4,.08,x,.55,10,gold);cyl('flagpole',.025,4.8,x,2.9,10,gold);cs.forEach((c,j)=>box('fictional flag',.55,.28,.015,x+.27,4.5-j*.28,10,mat('flag stripe '+i+j,c)))});
  function person(parent,x,z,m,skinMat,id){cyl('torso',.4,.55,x,1.19,z,m,parent);box('shoulders',.48,.22,.25,x,1.4,z,m,parent);const head=sphere('head',.28,x,1.66,z,skinMat,parent);const cap=sphere('hair',.285,x,1.72,z-.025,hair,parent);cap.scaling.y=.55;box('collar',.13,.12,.08,x,1.48,z+.14,white,parent);box('tie',.045,.25,.02,x,1.30,z+.205,gold,parent);for(const sx of [-.23,.23]){const arm=cyl('sleeve',.13,.47,x+sx,1.17,z+.10,m,parent);arm.rotation.x=-.55;sphere('hand',.12,x+sx,.98,z+.22,skinMat,parent)}shadows.addShadowCaster(head);people.push({head,base:head.position.y,id});}
  function chairAt(parent,x,z){box('chair seat',.59,.13,.55,x,.62,z,seat,parent);box('chair back',.61,.7,.13,x,.98,z-.25,seat,parent);cyl('chair stem',.075,.5,x,.32,z,black,parent);box('chair feet',.65,.04,.12,x,.08,z,black,parent)}
  function desk(name,x,z,rot,idx){const root=new B.TransformNode(name+' group',scene);root.position.set(x,0,z);root.rotation.y=rot;
   const top=box(name+' desktop',2.6,.14,1.0,0,.96,0,wood,root);shadows.addShadowCaster(top);
   box('front panel',2.45,.70,.08,0,.54,.43,edge,root);box('brass trim',2.5,.025,.035,0,.92,-.48,gold,root);
   for(const lx of [-1.08,1.08])box('desk legs',.12,.8,.65,lx,.43,0,black,root);
   chairAt(root,0,-.64);if(name!=='Kitala')person(root,0,-.64,idx%2?cream:navy,idx%2?skin2:skin,name);
   box('document',.44,.01,.33,-.6,1.04,-.06,white,root);box('tablet',.35,.035,.25,.48,1.05,.0,black,root);
   cyl('microphone base',.16,.04,0,1.07,-.12,black,root);const mic=B.MeshBuilder.CreateTube('microphone stem',{path:[new V(0,1.08,-.12),new V(0,1.43,-.1),new V(0,1.50,-.26)],radius:.015,tessellation:8},scene);mic.parent=root;mic.material=black;
   const ledmat=mat(name+' microphone glow','#526760',0,true);lamps[name]=ledmat;const led=sphere('microphone light',.055,0,1.49,-.25,ledmat,root);
   const plate=label(name.toUpperCase(),1.3,.22,0,1.14,-.48,'#e7dfcc','#263c3c',root);plate.rotation.x=.08;
   box('desk indicator',2.4,.018,.025,0,1.045,-.46,ledmat,root);
   root.getChildMeshes().forEach(m=>{m.metadata={delegate:name};m.isPickable=true});desks[name]=root;
  }
  desk('Kitala',-2,-3,.05,0);desk('Nordland',-5,0,.27,1);desk('Meridia',2.4,-2,-.09,2);desk('Pelagia',5.3,1,-.28,3);
  // Supporting seats remain empty: only the four labeled delegations negotiate.
  for(let row=0;row<2;row++)for(let i=0;i<7;i++){const x=-9+i*3,z=-7-row*3;box('observer desk',2.25,.11,.75,x,.95,z,wood);for(const sx of [-.6,.6])chairAt(null,x+sx,z-.75);box('observer front',2.2,.58,.06,x,.62,z+.32,edge)}
  box('chair dais',5.8,.92,1.1,0,.96,8.15,wood);box('chair dais inset',5.6,.66,.05,0,.98,7.57,edge);label('CHAIR',1.1,.20,0,1.59,7.54);
  const chairRoot=new B.TransformNode('chair person',scene);chairRoot.position.set(0,.47,8.9);chairRoot.rotation.y=Math.PI;person(chairRoot,0,0,navy,skin2,'Chair');
  lamps.Chair=mat('chair live','#526760',0,true);box('chair mic indicator',.16,.035,.12,.75,1.44,7.92,lamps.Chair);cyl('chair mic',.023,.32,.75,1.60,7.92,black);
  // Consultation area, physically separated by an open screen.
  box('consultation rug',5.5,.015,5,-9,.005,4,mat('rug','#718078'));const table=cyl('consultation table',2.5,.12,-9,.94,4,wood);cyl('table leg',.3,.85,-9,.48,4,black);
  const consultRoot=new B.TransformNode('consultation participants',scene);consultRoot.position.set(-9,0,4);chairAt(consultRoot,-.8,.9);chairAt(consultRoot,.8,.9);person(consultRoot,.8,.9,cream,skin2,'Nordland');
  label('INFORMAL CONSULTATIONS',3.7,.4,-10,3,7.1,'#334e50','#e1d4ac');
  for(let x=-12.5;x<-6.5;x+=.32)box('privacy screen',.09,3.0,.12,x,1.5,7.3,wood);
  const planter=mat('planter','#454c44'),leaf=mat('leaves','#55725c');for(const x of [-11.7,11.7]){cyl('plant pot',.7,.8,x,.4,9,planter);for(let i=0;i<6;i++){const l=sphere('foliage',.75,x+Math.sin(i)*.35,1.1+i*.17,9+Math.cos(i)*.27,leaf);l.scaling.y=1.5;}}
  scene.onPointerObservable.add(ev=>{if(ev.type===B.PointerEventTypes.POINTERPICK){const n=ev.pickInfo?.pickedMesh?.metadata?.delegate;if(n&&typeof Chamber!=='undefined')Chamber.delegate(n)}});
  engine.runRenderLoop(()=>{const now=performance.now();if(move){const p=Math.min(1,(now-move.start)/move.duration),e=p*p*(3-2*p);camera.position=B.Vector3.Lerp(move.from,move.to,e);camera.setTarget(B.Vector3.Lerp(move.fromTarget,move.toTarget,e));if(p===1)move=null}people.forEach(o=>o.head.position.y=o.base+(o.id===active&&!reduced?Math.sin(now*.005)*.012:0));scene.render();last=now});
  window.addEventListener('resize',()=>engine.resize());
  return true;
 }
 function view(name){if(!camera)return;const V=BABYLON.Vector3;const defs={overview:[[0,8,-17],[2,1.5,3]],seat:[[-2,1.9,-4.1],[.5,2.8,8.5]],chair:[[0,3,-.1],[0,2.6,8.7]],consult:[[-9,2.4,.1],[-8.9,1.4,4.4]],Nordland:[[-6,2.6,-3.5],[-5,1.2,.0]],Meridia:[[1,2.6,-6],[2.4,1.2,-2]],Pelagia:[[3.3,2.7,-2.5],[5.3,1.2,1]]};const d=defs[name]||defs.overview;move={from:camera.position.clone(),to:V.FromArray(d[0]),fromTarget:camera.getTarget().clone(),toTarget:V.FromArray(d[1]),start:performance.now(),duration:reduced?1:1400};}
 function speaking(name){active=name;Object.entries(lamps).forEach(([n,m])=>{m.emissiveColor=BABYLON.Color3.FromHexString(n===name?'#c9ed97':'#455e59');m.diffuseColor=m.emissiveColor;});}
 function setTopic(title,context=''){agenda=String(title||'').trim();screen(agenda||'CHOOSE A HEALTH ISSUE',context||'A shared challenge. A negotiated response.',agenda?'CURRENT HEALTH ISSUE':'ASSEMBLY');}
 function screen(title,subtitle='',tag='CURRENT HEALTH ISSUE'){
  if(!screenTexture)return;
  const c=screenTexture.getContext(),heading=agenda||String(title),detail=agenda&&title!==agenda?String(title)+' ? '+subtitle:subtitle;
  c.fillStyle='#152e3a';c.fillRect(0,0,1536,768);c.strokeStyle='#c9b982';c.lineWidth=3;c.beginPath();c.moveTo(90,110);c.lineTo(240,110);c.stroke();c.textAlign='left';c.fillStyle='#cbbd92';c.font='25px Arial';c.fillText(agenda?'CURRENT HEALTH ISSUE':tag.toUpperCase(),90,175);
  function lines(text,size){c.font=size+'px Arial';const result=[];let line='';for(const word of String(text).split(/\s+/)){if(line&&c.measureText(line+' '+word).width>1320){result.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)result.push(line);return result;}
  let size=58,rows=lines(heading,size);while(rows.length>4&&size>28){size-=2;rows=lines(heading,size);}
  c.fillStyle='#f4edda';rows.forEach((line,i)=>c.fillText(line,90,265+i*(size+12),1320));
  c.fillStyle='#d0dee0';const sub=lines(detail,29),y=Math.max(420,265+rows.length*(size+12)+25);sub.slice(0,3).forEach((line,i)=>c.fillText(line,90,y+i*38,1320));
  c.fillStyle='#9aafb6';c.font='20px Arial';c.fillText('ASSEMBLY  /  INDEPENDENT EDUCATIONAL SIMULATION',90,717);screenTexture.update();
 }
 return {init,view,speaking,screen,setTopic};
})();


