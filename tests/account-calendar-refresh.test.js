import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createLocalRepository} from '../src/storage.js';

const source=readFileSync(process.env.ABM_APP_SOURCE||new URL('../src/app.js',import.meta.url),'utf8');
const dataset={version:1,apartments:[{id:'a',name:'Test apartment',address:'Test street',city:'Test city',photoId:'test-photo'}],bookings:[{id:'b',apartmentId:'a',guest:'Test guest',phone:'0700000000',checkIn:'2026-11-18',checkOut:'2026-11-20',currency:'RON',totalAmountCents:10000,paidAmountCents:0}]};
function fixture(){
 const values=new Map([['apartment-booking-manager:v1',JSON.stringify(dataset)]]);
 let writes=0;
 const storage={getItem:key=>values.get(key)??null,setItem(key,value){writes++;values.set(key,value);}};
 return {repository:createLocalRepository(storage),values,writes:()=>writes};
}
function session(repository){
 const elements={editor:{open:false},notice:{dataset:{},textContent:''}};
 const context=vm.createContext({repository,state:{version:1,apartments:[],bookings:[]},blocked:false,renders:0,$:id=>elements[id],t:key=>key,render(){context.renders++;}});
 vm.runInContext(source.slice(source.indexOf('function refreshStoredState(){'),source.indexOf('function selectScreen(')),context);
 return {context,elements,refresh:()=>vm.runInContext('refreshSessionState()',context)};
}
test('account and resume callbacks invoke the storage refresh used by the calendar',()=>{
 assert.match(source,/changed:\(\)=>queueMicrotask\(refreshSessionState\)/);
 assert.match(source,/visibilitychange[^\n]+refreshSessionState\(\)/);
});
test('sign-in, sign-out, account switch and restart retain the same installation data without writes',()=>{
 const f=fixture(),s=session(f.repository);
 for(const identity of ['test-a',null,'test-b']){
  s.context.identity=identity;s.refresh();
  assert.equal(JSON.stringify(s.context.state),JSON.stringify(dataset));
  assert.equal(s.context.renders,identity==='test-a'?1:identity===null?2:3);
 }
 assert.deepEqual(createLocalRepository({getItem:key=>f.values.get(key)??null}).load(),dataset);
 assert.equal(f.writes(),0);
});
test('a transient storage failure preserves the displayed data and recovers on the next session event',()=>{
 const f=fixture();let unavailable=false;
 const s=session({load(){if(unavailable)throw Error('temporarily unavailable');return f.repository.load();}});
 s.refresh();unavailable=true;s.refresh();
 assert.equal(JSON.stringify(s.context.state),JSON.stringify(dataset));
 assert.equal(s.context.renders,1);
 unavailable=false;s.context.blocked=true;s.refresh();
 assert.equal(s.context.blocked,true);assert.equal(s.context.renders,2);
 assert.equal(f.writes(),0);
});
test('an open editor keeps its snapshot for the existing save conflict check',()=>{
 const f=fixture(),s=session(f.repository);s.refresh();
 const snapshot=s.context.state;
 f.values.set('apartment-booking-manager:v1',JSON.stringify({...dataset,apartments:[{...dataset.apartments[0],name:'Changed elsewhere'}]}));
 s.elements.editor.open=true;s.refresh();assert.equal(s.context.state,snapshot);
 s.elements.editor.open=false;s.refresh();assert.equal(s.context.state.apartments[0].name,'Changed elsewhere');
 assert.equal(f.writes(),0);
});
test('startup photo maintenance failure never replaces already loaded apartments and bookings with an empty state',async()=>{
 const f=fixture(),notice={dataset:{}};
 const context=vm.createContext({createLocalRepository:()=>f.repository,recoverLocalBackup:async()=>{},cleanupBackupStages:async()=>{throw Error('maintenance failed');},beginPhotoSession:async()=>{},apartmentPhotos:{},commercialRelease:true,$:()=>notice});
 const startup=source.slice(source.indexOf('let repository,state,blocked=false;'),source.indexOf('// Start only after'));
 const result=await vm.runInContext(`(async()=>{${startup};return {state,blocked};})()`,context);
 assert.equal(JSON.stringify(result.state),JSON.stringify(dataset));
 assert.equal(result.blocked,true);assert.equal(f.writes(),0);
});
