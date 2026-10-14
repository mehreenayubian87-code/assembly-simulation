const {test}=require('node:test');
const assert=require('node:assert/strict');
const N=require('../dist/negotiation.js');
const A=require('../dist/agreement.js');
const Lab=require('../dist/model.js');
const draft={alloc:[40,15,30,15],fund:40,delivery:10,report:true,guarantee:true,supply:80,shock:true};
test('custom draft respects allocation, financing and scripted mandates',()=>{
 assert.equal(N.validate(draft),'');
 assert.ok([0,1,2,3].every(i=>Lab.position(draft,i).yes));
 assert.ok(N.validate({...draft,alloc:[50,15,30,15]}));
 assert.ok(N.validate({...draft,delivery:41}));
 assert.ok(N.validate({...draft,fund:NaN}));
 assert.equal(Lab.position({...draft,fund:46},1).yes,false);
});
test('report uses negotiated values, escapes saved content and paginates long reflections',()=>{
 const r=A.create(draft,{id:'TEST',date:'2026-10-13',mode:'solo',roster:'<img src=x onerror=alert(1)>',attempts:1,failures:0});
 assert.match(r.sections[6].text,/32 million/);assert.match(r.sections[6].text,/8-million/);
 r.rows[0].name='<script>alert(1)</script>';
 r.reflection=['reflection '.repeat(60),'Learning','Next steps'];
 assert.ok(!A.html(r).includes('<script>'));assert.match(A.html(r),/Learning/);
 const pdf=Buffer.from(A.pdf(r)).toString();assert.match(pdf,/%PDF-1.4/);assert.match(pdf,/reflection/);
 const count=Number(pdf.match(/\/Count (\d+)/)[1]);assert.ok(count>=2);
 const offset=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(offset,offset+4),'xref');
});
