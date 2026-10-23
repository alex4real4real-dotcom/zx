const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Node {constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.classList={toggle(){},add(){}};this.textContent='';}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;this.textContent='';}setAttribute(){}addEventListener(){}querySelectorAll(){return [];}after(){} }
const flatten=n=>[n.textContent,...n.children.map(flatten)].join(' ');
async function run(allTest){
 const nodes=new Map(),get=id=>nodes.get(id)||nodes.set(id,new Node()).get(id),uid='buyer';let simulationCalls=0;
 const item={id:'item-real',title:'REAL RECORD',unit_price:10,quantity:1,seller_id:'seller'},real={id:'real',user_id:uid,payment_mode:'live',status:'pending',created_at:'2026-10-23',items:[item]};
 const test=(id,flags)=>({id,user_id:uid,created_at:'2026-10-23',items:[{...item,id,title:'OLD TEST RECORD'}],...flags});
 const backend={currentUser:()=>({id:uid}),ready:Promise.resolve(),orders:async()=>[test('a',{payment_mode:'test'}),test('b',{is_test:true})].concat(allTest?[]:[real]),sellerOrders:async()=>[test('c',{status:'test_pending'})],disputes:async()=>[],products:async()=>[],testSettlements:()=>{simulationCalls++;throw Error('Simulation must not be called');}};
 const document={body:{dataset:{}},documentElement:{lang:'en'},readyState:'complete',hidden:false,getElementById:get,querySelectorAll:()=>[],querySelector:()=>new Node(),createElement:tag=>new Node(tag)};
 const window={accountBackend:backend,CurrencySystem:{format:v=>String(v)},ListingPlatforms:{create:()=>new Node()},OrderDisputes:{mount(){},reset(){}},addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('orders-view.js','utf8'),{window,document,location:{href:'https://example.com/orders.html'},URL,Intl,Date,Map,Set,Promise,setInterval(){}});
 for(let i=0;i<5;i++)await new Promise(setImmediate);
 const output=flatten(get('orderList'));assert(!output.includes('OLD TEST RECORD'));assert.equal(simulationCalls,0);assert.equal(output.includes('REAL RECORD'),!allTest);if(allTest)assert(output.includes('You do not have any orders yet.'));assert(!get('ordersStatus').textContent.includes('Could not'));
}
(async()=>{await run(true);await run(false);console.log('Order views exclude buyer and seller test records, preserve non-test records and never load simulated settlement.');})();
