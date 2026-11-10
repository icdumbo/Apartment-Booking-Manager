import {maintenanceAllowed,selectMaintenance,validateMaintenance} from './maintenance.js';
import {ownerId,ownerLabel} from './owners.js';
import {t} from './i18n.js?v=0.3.1';
import {displayDate} from './date-format.js?v=0.2.5';

// Read-only persisted records. Drafts and entitlement metadata never enter exports.
export function selectMaintenanceExport(state,data,filters={},access){
 if(!access?.readOnlyExports&&!maintenanceAllowed(access))throw Error('maintenancePremium');
 validateMaintenance(data);
 const expenses=selectMaintenance(data,'expenses',filters,state.apartments).rows;
 const works=selectMaintenance(data,'works',filters,state.apartments).rows;
 const apartments=new Map(state.apartments.map(a=>[a.id,a]));
 // A converted cost belongs to its expense/date, even when that expense lies
 // outside this period/category. Never reintroduce it through the work row.
 const linked=new Set(data.expenses.filter(e=>e.workId).map(e=>e.workId));
 const rows=[...expenses.map(row=>({...row,kind:'expenses',exportDate:row.date,amountCents:row.amountCents,countedCents:row.amountCents})),...works.map(row=>({...row,kind:'works',exportDate:row.scheduledDate,amountCents:row.actualCents,countedCents:linked.has(row.id)?0:row.actualCents,linked:linked.has(row.id)}))].map(row=>{
  const apartment=apartments.get(row.apartmentId),key=apartment?ownerId(apartment.owner):'missing';
  return {...row,apartment:apartment?.name??t('maintenanceApartmentMissing'),ownerId:key,owner:apartment?ownerLabel(state.apartments,key,t):t('ownerUnavailable')};
 }).sort((a,b)=>b.exportDate.localeCompare(a.exportDate)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
 const totals={},byApartment=new Map(),byOwner=new Map();
 function add(groups,row){
  const sum=groups[row.currency]??={currency:row.currency,expensesCents:0,workCostsCents:0,totalCents:0,estimatedCents:0,unknownWorks:0};
  for(const [field,value] of [['expensesCents',row.kind==='expenses'?row.amountCents:0],['workCostsCents',row.kind==='works'?row.countedCents??0:0],['totalCents',row.countedCents??0],['estimatedCents',row.kind==='works'?row.estimatedCents??0:0],['unknownWorks',row.kind==='works'&&row.actualCents===undefined?1:0]]){
   sum[field]+=value;if(!Number.isSafeInteger(sum[field]))throw Error('collectionOverflow');
  }
 }
 for(const row of rows){
  if(!byApartment.has(row.apartmentId))byApartment.set(row.apartmentId,{id:row.apartmentId,name:row.apartment,owner:row.owner,totals:{}});
  if(!byOwner.has(row.ownerId))byOwner.set(row.ownerId,{id:row.ownerId,name:row.owner,totals:{}});
  add(totals,row);add(byApartment.get(row.apartmentId).totals,row);add(byOwner.get(row.ownerId).totals,row);
 }
 const owner=ownerLabel(state.apartments,filters.ownerId,t);
 const selectedApartment=filters.apartmentId?apartments.get(filters.apartmentId):null;
 // Metadata must not disclose another owner's apartment on inconsistent filters.
 const apartment=filters.apartmentId?(selectedApartment&&(!filters.ownerId||ownerId(selectedApartment.owner)===filters.ownerId)?selectedApartment.name:t('maintenanceApartmentMissing')):t('allApartments');
 const period=`${filters.start?displayDate(filters.start):t('maintenanceExportOpenStart')} – ${filters.end?displayDate(filters.end):t('maintenanceExportOpenEnd')}`;
 const metadata=`${t('maintenanceExportPeriod')}: ${period} · ${t('apartmentOwner')}: ${owner} · ${t('apartment')}: ${apartment} · ${t('maintenanceCategory')}: ${filters.category?t('maintenanceCategory_'+filters.category):t('maintenanceAllCategories')}`;
 return {rows,totals,byApartment:[...byApartment.values()],byOwner:[...byOwner.values()],metadata};
}
export const maintenanceExportMetrics=[['maintenanceExportExpenses','expensesCents'],['maintenanceExportWorkCosts','workCostsCents'],['maintenanceExportTotal','totalCents'],['maintenanceEstimated','estimatedCents']];
export const maintenanceExportColumns=['maintenanceExportType','maintenanceExportDate','apartmentOwner','apartment','maintenanceDescription','maintenanceAmount','collectionCurrency','maintenanceCategory','maintenanceStatus','maintenanceScheduled','maintenanceCompleted','maintenanceProvider','maintenanceEstimated','maintenanceExportCounted','maintenanceExportLinked','notes'];
export function maintenanceExportValues(row){return [t('maintenance_'+row.kind),displayDate(row.exportDate),row.owner,row.apartment,row.description,row.amountCents===undefined?undefined:row.amountCents/100,row.currency,row.kind==='expenses'?t('maintenanceCategory_'+row.category):'',row.status?t('maintenanceStatus_'+row.status):'',row.scheduledDate?displayDate(row.scheduledDate):'',row.completedDate?displayDate(row.completedDate):'',row.provider??'',row.estimatedCents===undefined?undefined:row.estimatedCents/100,row.countedCents===undefined?undefined:row.countedCents/100,row.workId||row.linked?t('maintenanceExportLinkedNote'):'',row.notes??''];}
