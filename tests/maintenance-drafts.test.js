import test from 'node:test';import assert from 'node:assert/strict';
import {createMaintenanceDraftRepository,MAINTENANCE_DRAFT_KEY,assertDraftTarget} from '../src/maintenance-drafts.js';
import {readMaintenanceForm} from '../src/maintenance-form.js';
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const draft=id=>({recordId:id,values:{description:'Partial',scheduledDate:'28/10/',estimatedCents:'5,'}});
test('raw drafts persist independently per form; removal requires explicit matching entry',()=>{
 const storage=memory(),repo=createMaintenanceDraftRepository(storage);storage.setItem('business','intact');repo.put('works',draft('w'),null);repo.put('expenses',draft('e'),null);repo.put('reviews',draft('r'),null);
 const reopened=createMaintenanceDraftRepository(storage);assert.deepEqual(reopened.load().drafts.works,draft('w'));assert.equal(reopened.load().activeKind,'reviews');assert.throws(()=>repo.put('works',draft('other'),null),/maintenanceDraftConflict/);assert.throws(()=>repo.remove('works',draft('other')),/maintenanceDraftConflict/);
 repo.remove('reviews',draft('r'));assert.equal(repo.load().activeKind,'works');repo.remove('works',draft('w'));assert.ok(repo.load().drafts.expenses);repo.remove('expenses',draft('e'));assert.equal(storage.getItem(MAINTENANCE_DRAFT_KEY),null);assert.equal(storage.getItem('business'),'intact');
});
test('unreadable or unavailable draft storage is never reset or overwritten',()=>{
 const s=memory();s.setItem(MAINTENANCE_DRAFT_KEY,'broken');const repo=createMaintenanceDraftRepository(s);assert.throws(()=>repo.load(),/maintenanceDraftUnreadable/);assert.throws(()=>repo.put('works',draft('w'),null));assert.equal(s.getItem(MAINTENANCE_DRAFT_KEY),'broken');
 const denied={getItem:()=>null,setItem(){throw Error('quota');},removeItem(){throw Error('quota');}};assert.throws(()=>createMaintenanceDraftRepository(denied).put('works',draft('w'),null),/maintenanceDraftFailed/);
});
test('restored edits cannot overwrite updated/deleted records; new drafts cannot duplicate completed saves',()=>{
 const old={id:'w',description:'old'},d={id:'w',recordId:'w',baseRecord:old,values:{}};assert.doesNotThrow(()=>assertDraftTarget(d,{works:[old]},'works'));for(const works of [[],[{...old,description:'new'}]])assert.throws(()=>assertDraftTarget(d,{works},'works'),/maintenanceDraftStale/);assert.throws(()=>assertDraftTarget(draft('w'),{works:[old]},'works'),/maintenanceDraftStale/);
});
const apartments=[{id:'a'}],raw={apartmentId:'a',description:'Test AC',scheduledDate:'28/10/2026',completedDate:'28/10/2026',provider:'Test',estimatedCents:'500',actualCents:'6000',status:'completed',currency:'RON',notes:''};
test('work form accepts reported figures and completion dates; errors identify individual fields',()=>{
 for(const completedDate of ['28/10/2026','30102026']){const r=readMaintenanceForm('works',{...raw,completedDate},apartments);assert.deepEqual(r.errors,{});assert.equal(r.values.actualCents,600000);assert.equal(r.values.estimatedCents,50000);}
 const r=readMaintenanceForm('works',{...raw,description:'',scheduledDate:'31/02/2026',actualCents:'-5'},apartments);assert.deepEqual(r.errors,{description:'maintenanceRequired',scheduledDate:'maintenanceDateInvalid',actualCents:'invalidAmount'});
 assert.equal(readMaintenanceForm('works',{...raw,completedDate:'27/10/2026'},apartments).errors.completedDate,'maintenanceCompletionBefore');assert.equal(readMaintenanceForm('works',{...raw,apartmentId:'missing'},apartments).errors.apartmentId,'maintenanceChoose');
});
test('optional work amounts retain unspecified versus zero; review order has its own exact error',()=>{
 const r=readMaintenanceForm('works',{...raw,estimatedCents:'',actualCents:'0'},apartments);assert.deepEqual(r.errors,{});assert.equal(r.values.estimatedCents,undefined);assert.equal(r.values.actualCents,0);
 const review=readMaintenanceForm('reviews',{apartmentId:'a',description:'Test',equipment:'boiler',lastDate:'30/10/2026',nextDate:'28/10/2026'},apartments);assert.equal(review.errors.nextDate,'maintenanceReviewBefore');
 assert.equal(readMaintenanceForm('expenses',{apartmentId:'a',description:'Test',date:'28102026',category:'water',currency:'RON',amountCents:''},apartments).errors.amountCents,'maintenanceRequired');
});
