import {dayNumber} from './domain.js?v=0.2.1';
import {validateCurrency} from './currency.js';
export const MAINTENANCE_KEY='apartment-booking-manager:maintenance:v1';
export const CATEGORIES=['maintenance','water','electricity','gas','internet','cleaning','repairs','other'];
export const WORK_STATUSES=['planned','ongoing','completed','cancelled'];
export const EQUIPMENT=['boiler','airConditioner','installations','other'];
export const maintenanceAllowed=access=>['PREMIUM','TRIAL'].includes(access?.state);
export const emptyMaintenance=()=>({version:1,expenses:[],works:[],reviews:[]});
const fail=()=>{throw Error('maintenanceInvalid');};
function date(value){if(typeof value!=='string')fail();try{dayNumber(value);}catch{fail();}}
function text(value,required=false){if(typeof value!=='string'||value.length>4000||(required&&!value.trim()))fail();}
function money(value,optional=false){if(value===undefined&&optional)return;if(!Number.isSafeInteger(value)||value<0)fail();}
export function validateMaintenance(data){
 if(data?.version!==1)fail();const ids=new Set();
 for(const kind of ['expenses','works','reviews']){
  if(!Array.isArray(data[kind]))fail();
  for(const item of data[kind]){
   if(!item?.id||typeof item.id!=='string'||ids.has(item.id))fail();ids.add(item.id);text(item.apartmentId,true);text(item.description,true);text(item.notes??'');
   if(kind==='expenses'){date(item.date);validateCurrency(item.currency);money(item.amountCents);if(!CATEGORIES.includes(item.category))fail();}
   if(kind==='works'){date(item.scheduledDate);if(item.completedDate)date(item.completedDate);if(item.completedDate&&item.completedDate<item.scheduledDate)fail();validateCurrency(item.currency);money(item.estimatedCents,true);money(item.actualCents,true);text(item.provider??'');if(!WORK_STATUSES.includes(item.status))fail();}
   if(kind==='reviews'){date(item.nextDate);if(item.lastDate){date(item.lastDate);if(item.nextDate<item.lastDate)fail();}if(!EQUIPMENT.includes(item.equipment))fail();}
  }
 }
 const linked=new Set();for(const expense of data.expenses)if(expense.workId){if(linked.has(expense.workId))fail();linked.add(expense.workId);const work=data.works.find(w=>w.id===expense.workId);if(!work||work.apartmentId!==expense.apartmentId||work.currency!==expense.currency||work.actualCents!==expense.amountCents)fail();}
 return data;
}
export function changeMaintenance(data,command,access){
 if(!maintenanceAllowed(access))throw Error('maintenancePremium');validateMaintenance(data);const next=structuredClone(data),{kind,id,item,operation}=command;
 if(!['expenses','works','reviews'].includes(kind))fail();const old=next[kind].find(row=>row.id===id);
 if(operation==='convert'){
  const work=next.works.find(row=>row.id===id);if(kind!=='works'||!work||work.status!=='completed'||!work.completedDate||work.actualCents===undefined)throw Error('maintenanceConversion');
  if(next.expenses.some(row=>row.workId===id))throw Error('maintenanceAlreadyLinked');
  next.expenses.push({id:command.expenseId,workId:id,apartmentId:work.apartmentId,date:work.completedDate,category:'repairs',description:work.description,amountCents:work.actualCents,currency:work.currency,notes:work.notes??''});
 }else if(operation==='delete'){
  if(!old)fail();if(kind==='works'&&next.expenses.some(row=>row.workId===id))throw Error('maintenanceLinked');next[kind]=next[kind].filter(row=>row.id!==id);
 }else if(operation==='save'){
  if(!item?.id||(id&&!old)||(!id&&next[kind].some(row=>row.id===item.id))||(id&&item.id!==id))fail();
  if(old?.workId)throw Error('maintenanceLinked');if(item.workId)throw Error('maintenanceLinked');
  if(kind==='works'&&old&&next.expenses.some(row=>row.workId===old.id)&&(old.apartmentId!==item.apartmentId||old.currency!==item.currency||old.actualCents!==item.actualCents))throw Error('maintenanceLinked');
  next[kind]=old?next[kind].map(row=>row.id===id?{...old,...item}:row):[...next[kind],item];
 }else fail();return validateMaintenance(next);
}
export function createMaintenanceRepository(storage=globalThis.localStorage){
 const load=()=>{const raw=storage.getItem(MAINTENANCE_KEY);return raw===null?emptyMaintenance():validateMaintenance(JSON.parse(raw));};
 return {load,save(next,expected){validateMaintenance(next);if(JSON.stringify(load())!==JSON.stringify(expected))throw Error('maintenanceConflict');storage.setItem(MAINTENANCE_KEY,JSON.stringify(next));}};
}
export function selectMaintenance(data,kind,filters={}){
 validateMaintenance(data);if(filters.start)date(filters.start);if(filters.end)date(filters.end);if(filters.start&&filters.end&&filters.end<filters.start)fail();
 const dateKey=kind==='expenses'?'date':kind==='works'?'scheduledDate':'nextDate';
 const rows=data[kind].filter(row=>(!filters.apartmentId||row.apartmentId===filters.apartmentId)&&(!filters.category||kind!=='expenses'||row.category===filters.category)&&(!filters.start||row[dateKey]>=filters.start)&&(!filters.end||row[dateKey]<=filters.end)).sort((a,b)=>(kind==='reviews'?a[dateKey].localeCompare(b[dateKey]):b[dateKey].localeCompare(a[dateKey]))||a.id.localeCompare(b.id));
 const totals={};if(kind==='expenses')for(const row of rows){totals[row.currency]=(totals[row.currency]??0)+row.amountCents;if(!Number.isSafeInteger(totals[row.currency]))fail();}return {rows,totals};
}
export function reviewDue(review,today){const days=dayNumber(review.nextDate)-dayNumber(today);return days<0?'overdue':days<=30?'soon':'later';}
