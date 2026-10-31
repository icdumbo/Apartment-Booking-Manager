import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCommerce} from '../src/commerce-screen.js';

function element(){return {style:{},append(){},setAttribute(){}};}
for(const mode of ['native-handle','promise-handle','rejected-promise','unsupported'])test(`optional Billing listener ${mode} cannot abort menu/auth startup`,async()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:element};
 let registered=0;
 try{
  const billing={addListener(event){assert.equal(event,'purchasesChanged');registered++;if(mode==='unsupported')throw Error('unavailable');if(mode==='rejected-promise')return Promise.reject(Error('unavailable'));const handle={remove:async()=>{}};return mode==='promise-handle'?Promise.resolve(handle):handle;}};
  const controls=mountCommerce({root:element(),auth:{available:false},capacitor:{getPlatform:()=> 'android',Plugins:{BookingBilling:billing}},t:key=>key,getEntitlement:()=>({state:'BASIC'})});
  assert.equal(registered,1);assert.equal(typeof controls.refresh,'function');
  await controls.refresh();
 }finally{globalThis.document=previous;}
});
