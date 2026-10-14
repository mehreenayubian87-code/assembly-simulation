/* Transparent teaching rules, not predictions of real delegations. */
const Negotiation = (() => {
 function validate(p) {
  if (!p || !Array.isArray(p.alloc) || p.alloc.length!==4 || p.alloc.some(n=>!Number.isInteger(n)||n<0||n>100)) return 'Use four whole-number shares between 0 and 100.';
  if(p.alloc.reduce((a,b)=>a+b,0)!==100) return 'The four allocation shares must total 100%.';
  if(!Number.isInteger(p.fund)||p.fund<0||p.fund>100) return 'Donor financing must be a whole number from 0 to 100.';
  if(!Number.isInteger(p.delivery)||p.delivery<0||p.delivery>p.fund) return 'Delivery support must be between zero and the total donor financing.';
  if(typeof p.report!=='boolean'||typeof p.guarantee!=='boolean') return 'Choose reporting and guarantee terms.';
  return '';
 }
 function describe(p){return `${p.alloc.join('/')}% allocation; ${p.fund}m financing; ${p.delivery}m delivery; reporting ${p.report?'included':'absent'}; guarantee ${p.guarantee?'included':'absent'}`;}
 function changes(a,b){if(!a)return ['Opening draft'];const result=[];['Kitala','Nordland','Meridia','Pelagia'].forEach((n,i)=>{if(a.alloc[i]!==b.alloc[i])result.push(`${n}: ${a.alloc[i]}% to ${b.alloc[i]}%`)});for(const [k,n] of [['fund','Financing'],['delivery','Delivery']])if(a[k]!==b[k])result.push(`${n}: ${a[k]}m to ${b[k]}m`);for(const [k,n] of [['report','Reporting'],['guarantee','Guarantee']])if(a[k]!==b[k])result.push(`${n}: ${b[k]?'added':'removed'}`);return result.length?result:['Terms unchanged'];}
 function cleanReflection(value){return String(value||'').trim().slice(0,600)}
 return {validate,describe,changes,cleanReflection};
})();
if(typeof module!=='undefined')module.exports=Negotiation;
