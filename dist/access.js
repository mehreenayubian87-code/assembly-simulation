const AssemblyAccess={canEnter(user,professor,memberships){return Boolean(user&&(professor===true||(Array.isArray(memberships)&&memberships.length>0)));}};
if(typeof module!=='undefined')module.exports=AssemblyAccess;
