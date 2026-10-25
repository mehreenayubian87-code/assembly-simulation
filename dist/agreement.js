/* One report model shared by the on-screen agreement and downloadable PDF. */
const Agreement=(()=>{
 function create(s,meta){
  if(!s.report||!s.guarantee||s.alloc.reduce((a,b)=>a+b,0)!==100)throw Error('Agreement is incomplete.');
  return {history:JSON.parse(JSON.stringify(meta.history||[])),id:meta.id,date:meta.date,mode:meta.mode,roster:meta.roster||'Student 1: Kitala',rows:['Kitala','Nordland','Meridia','Pelagia'].map((name,i)=>({name,share:s.alloc[i],courses:s.supply*s.alloc[i]/100})),sections:[
   {title:'1. Decision and participating delegations',text:'The four fictional delegations - Kitala, Nordland, Meridia and Pelagia - adopt the revised equitable-access package by consensus. No objection remains under the written mandates used in this simulation. This records a simulated outcome, not real government consent.'},
   {title:'2. Allocation of the shared pool',text:`The available pool is ${s.supply} million vaccine courses, reduced from 100 million following a manufacturing disruption. The allocation below forms part of the adopted agreement.`},
   {title:'3. Financing and delivery support',text:`Nordland provides ${s.fund} million fictional credits of donor financing. Of this total, ${s.delivery} million credits are earmarked for delivery support in Pelagia; this is included in, not additional to, the donor commitment.`},
   {title:'4. Accountability and production',text:'Quarterly public reporting is included as a condition of donor support. The package includes a production purchase guarantee addressing Meridia\'s requirement. The exercise does not specify guarantee pricing, contracting terms or liability.'},
   {title:'5. Implementation follow-up',text:'The agreement commits resources and policy terms; it does not demonstrate completed delivery. Delegations must translate commitments into financing, procurement, distribution and reporting arrangements. Detailed owners, dates and delivery plans remain to be negotiated; they were not adopted in this exercise.'},
   {title:'6. Negotiation record',text:`Kitala opening approach: ${meta.opening==='national'?'Kitala requested 50% without additional conditions.':'Kitala proposed an equitable package and invited discussion of reporting and production commitments.'} Initial response to reporting: ${meta.initialReporting?'accepted':'rejected'}. ${meta.attempts} consensus check(s) took place; ${meta.failures} did not reach agreement. The final package includes reporting and a production guarantee.`},
   {title:'7. Learning and scope',text:`Kitala receives ${s.supply*s.alloc[0]/100} million allocated courses against a scenario priority need of 40 million. Its ${s.alloc[0]}% share would have yielded ${s.alloc[0]} million before the supply shock. Adoption leaves a ${Math.max(0,40-s.supply*s.alloc[0]/100)}-million-course allocation gap before delivery losses. Countries, resources and mandates are fictional. This independent WHO-inspired exercise is not an official WHO agreement or a validated digital twin.`}
  ]};
 }
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function html(r){return `<div class="report-meta">${escape(r.id)} · ${escape(r.date)}<br>${r.mode==='solo'?'Solo practice':'Shared-screen classroom'} · Adopted by simulated consensus<br>${escape(r.roster)}</div>`+sections(r).map((s,i)=>`<section class="agreement-section"><h3>${escape(s.title)}</h3><p>${escape(s.text)}</p>${i===1?`<table class="agreement-table"><thead><tr><th>Delegation</th><th>Share</th><th>Courses</th></tr></thead><tbody>${r.rows.map(x=>`<tr><th scope="row">${escape(x.name)}</th><td>${escape(x.share)}%</td><td>${escape(x.courses)} million</td></tr>`).join('')}<tr><th scope="row">Total</th><td>100%</td><td>${r.rows.reduce((n,x)=>n+Number(x.courses),0)} million</td></tr></tbody></table>`:''}</section>`).join('')}
 function sections(r){
  const result=[...r.sections,...(r.diplomacy||[])];
  for(const p of (r.history||[]))result.push({title:'Draft '+p.number+' — '+p.result,text:(p.terms?.alloc||[]).join('/')+'% allocation; financing '+p.terms?.fund+'m; delivery '+p.terms?.delivery+'m; reporting '+(p.terms?.report?'included':'absent')+'; guarantee '+(p.terms?.guarantee?'included':'absent')+'. Changes: '+(p.changes||[]).join('; ')});
  const prompts=['Which concession made agreement possible?','Whose priorities remained unmet?','What must happen next: owner, timing and monitoring?'];
  prompts.forEach((title,i)=>result.push({title,text:r.reflection?.[i]||'No reflection recorded.'}));
  if(r.implementation){const p=r.implementation;result.push({title:'Optional implementation experiment (not adopted terms)',text:`Budget ${p.budget}m credits; planned spending ${p.spent}m; illustrative delivery ${Number(p.delivered).toFixed(1)}m courses; remaining need ${Number(p.gap).toFixed(1)}m. Readiness starts at 30%; cold chain and teams each add 1.5 percentage points per credit (up to 20 each), monitoring adds 1 point (up to 10). Readiness is capped at 100%. These assumptions are not empirically calibrated.`});}
  return result;
 }
 // Paginated vector PDF, with byte-correct offsets and standard PDF fonts.
 function pdf(r){
  const safe=s=>String(s).replace(/[^\x20-\x7e]/g,' ').replace(/([\\()])/g,'\\$1');
  function text(s,x,y,size=10,font='F1',color='0.16 0.23 0.24'){return `${color} rg BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${safe(s)}) Tj ET\n`}
  function wrap(s,max=84){const words=String(s).match(/\S{1,84}/g)||[];const lines=[];let line='';for(const word of words){if((line+' '+word).trim().length>max){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line);return lines}
  const streams=[];let out='',y=650;
  function page(){if(out)streams.push(out);out='0.08 0.19 0.22 rg 0 725 595 117 re f\n'+text('ASSEMBLY / POLICY AGREEMENT',44,797,11,'F2','0.87 0.8 0.61')+text('Equitable access to vaccines',44,762,23,'F2','1 1 1')+text(r.id+' | '+r.date,44,703,9)+text('ADOPTED BY SIMULATED CONSENSUS',44,685,9,'F2')+text('Independent educational simulation - not an official WHO document',44,43,8)+text(String(streams.length+1),530,43,8);y=650}
  function line(s,size=10,font='F1'){if(y<85)page();out+=text(s,44,y,size,font);y-=16}
  page();line('Student role allocation',12,'F2');for(const l of wrap(r.roster))line(l);y-=15;
  sections(r).forEach((section,i)=>{if(y<150)page();for(const l of wrap(section.title,65))line(l,12,'F2');y-=5;for(const l of wrap(section.text))line(l);y-=18;if(i===1){line('DELEGATION / SHARE / VACCINE COURSES',10,'F2');for(const row of r.rows)line(row.name+' / '+row.share+'% / '+row.courses+' million');line('Total / 100% / '+r.rows.reduce((n,x)=>n+Number(x.courses),0)+' million',10,'F2');y-=18}});streams.push(out);
  const objects=['<< /Type /Catalog /Pages 2 0 R >>',`<< /Type /Pages /Kids [${streams.map((_,i)=>(5+i*2)+' 0 R').join(' ')}] /Count ${streams.length} >>`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];streams.forEach((s,i)=>{objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6+i*2} 0 R >>`);objects.push(`<< /Length ${s.length} >>\nstream\n${s}endstream`)});
  out='%PDF-1.4\n';const offsets=[0];objects.forEach((s,i)=>{offsets.push(out.length);out+=`${i+1} 0 obj\n${s}\nendobj\n`});const xref=out.length;out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(const n of offsets.slice(1))out+=`${String(n).padStart(10,'0')} 00000 n \n`;out+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new TextEncoder().encode(out);
 }
 return {create,html,pdf};
})();
if(typeof module!=='undefined')module.exports=Agreement;
