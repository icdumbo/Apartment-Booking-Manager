// Raw form text stays separate from validated records, including incomplete/invalid input.
export const MAINTENANCE_DRAFT_KEY='apartment-booking-manager:maintenance-drafts:v1';
const kinds=['expenses','works','reviews'];
const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
function validate(doc){
 if(doc?.version!==1||!kinds.includes(doc.activeKind)||!doc.drafts||typeof doc.drafts!=='object'||Array.isArray(doc.drafts))throw Error('maintenanceDraftUnreadable');
 for(const [kind,draft] of Object.entries(doc.drafts)){
  if(!kinds.includes(kind)||!draft||typeof draft.recordId!=='string'||!draft.recordId||!draft.values||typeof draft.values!=='object'||Array.isArray(draft.values)||Object.values(draft.values).some(v=>typeof v!=='string'||v.length>16000))throw Error('maintenanceDraftUnreadable');
  if(draft.id!==undefined&&(draft.id!==draft.recordId||!draft.baseRecord||draft.baseRecord.id!==draft.id))throw Error('maintenanceDraftUnreadable');
 }
 return doc;
}
export function createMaintenanceDraftRepository(storage=globalThis.localStorage){
 const load=()=>{try{const raw=storage.getItem(MAINTENANCE_DRAFT_KEY);return raw===null?{version:1,activeKind:'expenses',drafts:{}}:validate(JSON.parse(raw));}catch{throw Error('maintenanceDraftUnreadable');}};
 function update(kind,draft,expected){
  const doc=load();if(!same(doc.drafts[kind],expected))throw Error('maintenanceDraftConflict');
  if(draft){doc.drafts[kind]=structuredClone(draft);doc.activeKind=kind;}else{delete doc.drafts[kind];if(!doc.drafts[doc.activeKind])doc.activeKind=Object.keys(doc.drafts)[0]??kind;}
  validate(doc);try{if(Object.keys(doc.drafts).length)storage.setItem(MAINTENANCE_DRAFT_KEY,JSON.stringify(doc));else storage.removeItem(MAINTENANCE_DRAFT_KEY);}catch{throw Error('maintenanceDraftFailed');}
 }
 return {load,put:(kind,draft,expected)=>update(kind,draft,expected),remove:(kind,expected)=>update(kind,null,expected)};
}
export function assertDraftTarget(draft,data,kind){
 const record=data[kind].find(row=>row.id===draft.recordId);
 if(draft.id?!same(record,draft.baseRecord):Boolean(record))throw Error('maintenanceDraftStale');
}
