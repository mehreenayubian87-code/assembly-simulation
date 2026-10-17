const {test}=require('node:test');const assert=require('node:assert/strict');
const {canEnter}=require('../dist/access.js');
test('entry requires a verified user and professor permission or classroom membership',()=>{
 assert.equal(canEnter(null,true,[{class_id:'a'}]),false);
 assert.equal(canEnter({id:'google-user'},false,[]),false);
 assert.equal(canEnter({id:'anonymous-before-code'},false,[]),false);
 assert.equal(canEnter({id:'student'},false,[{class_id:'a'}]),true);
 assert.equal(canEnter({id:'professor'},true,[]),true);
});
