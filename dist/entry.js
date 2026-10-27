window.AssemblyEntry=(()=>{
 let loading;
 const files=['vendor/babylon.js','model.js?v=0.4','roles.js?v=2.0','scene.js?v=0.5','agreement.js?v=2.2','negotiation.js?v=1.0','diplomacy.js?v=1.1','live-rooms.js?v=3.2','workshop.js?v=1.3','chamber.js?v=3.2'];
 function enter(){if(loading)return loading;loading=(async()=>{
  for(const src of files)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(Error('The assembly could not load. Refresh to try again.'));document.body.append(script)});
  document.getElementById('authLanding').hidden=true;
  const app=document.getElementById('assemblyApp');app.hidden=false;app.inert=false;
  document.body.classList.remove('auth-locked');window.dispatchEvent(new Event('resize'));
 })();return loading;}
 return {enter};
})();
