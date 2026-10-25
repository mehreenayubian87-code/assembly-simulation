const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../dist/diplomacy.js');
const A=require('../dist/agreement.js');
const agree=()=>D.snapshot().paragraphs.forEach(p=>D.edit(p.id,p.text,'agreed ad ref','Test group'));
test('bracketed paragraphs block committee; plenary requires recommendation and editing invalidates it',()=>{
 D.reset();assert.throws(()=>D.committee());assert.throws(()=>D.adopt());
 agree();D.committee();
 D.edit('OP1','URGES Member States to review delivery barriers with affected communities;','bracketed','Kitala');
 assert.equal(D.snapshot().committee,false);assert.throws(()=>D.adopt());
 agree();D.committee();D.reservation('Nordland','Reporting capacity needs support.');D.adopt();
 assert.equal(D.snapshot().plenary,true);
 assert.throws(()=>D.edit('OP1','URGES Member States to make another change;','open','Kitala'));
 assert.equal(D.snapshot().reservations.length,1);
 D.reset();assert.equal(D.snapshot().events.length,0);assert.equal(D.ready(),false);
});
test('draft history and explanations are escaped and included in downloadable report',()=>{
 D.reset();D.edit('OP1','URGES Member States to review <script>alert(1)</script> safely;','open','Learner');
 D.reservation('Kitala','We request <img src=x> support.');
 const r=A.create({alloc:[35,20,30,15],fund:35,delivery:10,report:true,guarantee:true,supply:80},{id:'TEST',date:'2026-10-25',mode:'solo',attempts:1,failures:0});
 r.diplomacy=D.reportSections();
 assert.ok(!A.html(r).includes('<script>'));assert.ok(!A.html(r).includes('<img'));
 assert.match(A.html(r),/Previous:/);assert.match(A.html(r),/rule-based/);
 const pdf=Buffer.from(A.pdf(r)).toString();assert.match(pdf,/Explanations of position/);assert.match(pdf,/Previous:/);
});
