window.AssemblyWorkspace=(()=>{
 function home(){if(typeof Chamber!=='undefined')Chamber.suspendAudio();document.body.classList.remove('solo-workspace');document.body.classList.add('workspace-mode');document.getElementById('practiceWorkspace').hidden=false;document.getElementById('practiceWorkspace').focus({preventScroll:true});window.scrollTo(0,0);}
 function showSolo(){document.querySelector('#practiceWorkspace video').pause();document.getElementById('practiceWorkspace').hidden=true;document.body.classList.remove('workspace-mode');document.body.classList.add('solo-workspace');try{AssemblyScene.init();window.dispatchEvent(new Event('resize'));}catch{document.getElementById('webglFallback').hidden=false;}}
 function solo(){showSolo();AssemblyRooms.soloTopics();}
 function live(){home();AssemblyWorkshop.open();}
 return {home,solo,live,showSolo};
})();
