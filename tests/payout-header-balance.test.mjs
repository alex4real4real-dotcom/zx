import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=source.indexOf('    window.getUserBalance = function (email)'),end=source.indexOf('    window.makeKey = ',start);
test('account header reads only the current user real available balance',async()=>{
 let reads=0;const window={accountBackend:{ready:Promise.resolve(),currentUser:()=>({email:'owner@example.test'}),payoutBalance:async()=>{reads++;return {available:75,earned:100,reserved:25};}},ServerFunction:{call:()=>{throw Error('test sales must not count');}}};
 runInNewContext(source.slice(start,end),{window,Promise,Math,Number,String});
 assert.equal(await window.getUserBalance('OWNER@example.test'),75);assert.equal(reads,1);
 assert.equal(await window.getUserBalance('someone-else@example.test'),0);assert.equal(reads,1);
 window.accountBackend.payoutBalance=async()=>{throw Error('connection unavailable');};
 assert.equal(await window.getUserBalance('owner@example.test'),0);
});
