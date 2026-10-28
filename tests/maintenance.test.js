import test from 'node:test';import assert from 'node:assert/strict';
import {emptyMaintenance,changeMaintenance,createMaintenanceRepository,selectMaintenance,reviewDue,validateMaintenance,MAINTENANCE_KEY} from '../src/maintenance.js';
const access={state:'PREMIUM'},expense=(id='e',currency='RON',amountCents=100)=>({id,apartmentId:'a',date:'2026-10-28',category:'water',description:'Test',amountCents,currency,notes:''});
const change=(data,kind,operation,item,id,extra={})=>changeMaintenance(data,{kind,operation,item,id,...extra},access);
test('expense CRUD and inclusive filters keep currencies and zero separate',()=>{
 let d=emptyMaintenance();for(const e of [expense(),expense('eur','EUR',250),{...expense('zero'),amountCents:0,apartmentId:'b',category:'gas',date:'2026-10-29'}])d=change(d,'expenses','save',e);
 assert.deepEqual(selectMaintenance(d,'expenses').totals,{RON:100,EUR:250});assert.equal(selectMaintenance(d,'expenses',{apartmentId:'a',category:'water',start:'2026-10-28',end:'2026-10-28'}).rows.length,2);
 d=change(d,'expenses','save',expense('e','RON',200),'e');assert.equal(d.expenses[0].amountCents,200);d=change(d,'expenses','delete',null,'e');assert.equal(d.expenses.length,2);assert.equal(selectMaintenance(d,'expenses',{apartmentId:'b'}).totals.RON,0);
});
test('one atomic work conversion; linked costs cannot drift; delete and explicit reconversion',()=>{
 const work={id:'w',apartmentId:'a',description:'Repair',scheduledDate:'2026-10-28',completedDate:'2026-10-29',status:'completed',provider:'Test',currency:'EUR',estimatedCents:undefined,actualCents:0};
 let d=change(emptyMaintenance(),'works','save',work);d=change(d,'works','convert',null,'w',{expenseId:'from-work'});assert.equal(d.expenses[0].amountCents,0);assert.equal(d.expenses[0].date,'2026-10-29');
 assert.throws(()=>change(d,'works','convert',null,'w',{expenseId:'duplicate'}),/maintenanceAlreadyLinked/);assert.throws(()=>change(d,'works','save',{...work,actualCents:100},'w'),/maintenanceLinked/);assert.throws(()=>change(d,'works','delete',null,'w'),/maintenanceLinked/);assert.throws(()=>change(d,'expenses','save',expense('from-work'),'from-work'),/maintenanceLinked/);
 d=change(d,'expenses','delete',null,'from-work');d=change(d,'works','save',{...work,actualCents:250},'w');d=change(d,'works','convert',null,'w',{expenseId:'new'});assert.equal(selectMaintenance(d,'expenses').totals.EUR,250);
});
test('planned/missing actual/completion cannot convert, missing is distinct from zero',()=>{
 const w={id:'w',apartmentId:'a',description:'Test',scheduledDate:'2026-10-28',status:'planned',currency:'RON'};
 for(const item of [w,{...w,status:'completed',completedDate:'2026-10-29'},{...w,status:'completed',actualCents:0}]){const d=change(emptyMaintenance(),'works','save',item);assert.throws(()=>change(d,'works','convert',null,'w',{expenseId:'e'}),/maintenanceConversion/);}
});
test('review CRUD, due dates and calendar validation',()=>{
 const r={id:'r',apartmentId:'a',description:'Test',equipment:'boiler',lastDate:'2026-09-01',nextDate:'2026-10-28'};let d=change(emptyMaintenance(),'reviews','save',r);assert.equal(reviewDue(r,'2026-10-28'),'soon');assert.equal(reviewDue(r,'2026-10-29'),'overdue');assert.equal(reviewDue(r,'2026-09-01'),'later');d=change(d,'reviews','save',{...r,nextDate:'2026-11-30'},'r');assert.equal(d.reviews[0].nextDate,'2026-11-30');d=change(d,'reviews','delete',null,'r');assert.equal(d.reviews.length,0);
 for(const date of ['2026-02-30','2026-13-01','2026-2-01'])assert.throws(()=>change(emptyMaintenance(),'expenses','save',{...expense(),date}));assert.throws(()=>change(emptyMaintenance(),'reviews','save',{...r,nextDate:'2026-08-01'}));
});
test('BASIC denies all writes; authorized trial/permanent sources share policy without deleting data',()=>{
 const d={...emptyMaintenance(),expenses:[expense()]};for(const state of ['BASIC','UNKNOWN'])for(const operation of ['save','delete','convert'])assert.throws(()=>changeMaintenance(d,{kind:'expenses',operation,id:'e',item:expense()},{state}),/maintenancePremium/);
 for(const entitlement of [{state:'TRIAL'},{state:'PREMIUM',premiumSource:'OWNER_GRANT'},{state:'PREMIUM',premiumSource:'ADMIN_GIFT'},{state:'PREMIUM',premiumSource:'GOOGLE_PLAY_PURCHASE'}])assert.equal(changeMaintenance(d,{kind:'expenses',operation:'delete',id:'e'},entitlement).expenses.length,0);assert.equal(d.expenses.length,1);
});
test('offline repository persists, rejects stale writes/corruption and retains business keys',()=>{
 const map=new Map([['apartment-booking-manager:v1','business-unchanged']]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};const repo=createMaintenanceRepository(storage),old=repo.load(),next=change(old,'expenses','save',expense());repo.save(next,old);assert.deepEqual(createMaintenanceRepository(storage).load(),next);assert.throws(()=>repo.save(old,old),/maintenanceConflict/);assert.equal(map.get('apartment-booking-manager:v1'),'business-unchanged');map.set(MAINTENANCE_KEY,'corrupt');assert.throws(()=>repo.load());assert.equal(map.get(MAINTENANCE_KEY),'corrupt');
});
test('duplicate IDs, invalid money and duplicated work links are rejected without mutation',()=>{
 for(const amountCents of [-1,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>change(emptyMaintenance(),'expenses','save',expense('e','RON',amountCents)));const d={...emptyMaintenance(),expenses:[expense(),expense()]};assert.throws(()=>validateMaintenance(d));
});
