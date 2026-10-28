import {parseDate} from './date-format.js?v=0.2.5';
import {parseMoney} from './booking-values.js';
import {CURRENCIES} from './currency.js';
import {CATEGORIES,WORK_STATUSES,EQUIPMENT} from './maintenance.js';
export function readMaintenanceForm(kind,raw,apartments){
 const values={},errors={};
 const text=(name,required=false)=>{const value=String(raw[name]??'').trim();values[name]=value;if(required&&!value)errors[name]='maintenanceRequired';else if(value.length>4000)errors[name]='maintenanceTextLong';};
 const date=(name,required=false)=>{const value=String(raw[name]??'').trim();values[name]='';if(!value){if(required)errors[name]='maintenanceRequired';return;}try{values[name]=parseDate(value);}catch{errors[name]='maintenanceDateInvalid';}};
 const money=(name,required=false)=>{try{values[name]=parseMoney(raw[name]??'');if(required&&values[name]===undefined)errors[name]='maintenanceRequired';}catch{errors[name]='invalidAmount';}};
 const choice=(name,allowed)=>{values[name]=String(raw[name]??'');if(!allowed.includes(values[name]))errors[name]='maintenanceChoose';};
 choice('apartmentId',apartments.map(a=>a.id));text('description',true);text('notes');
 if(kind==='expenses'){date('date',true);choice('category',CATEGORIES);money('amountCents',true);}
 if(kind==='works'){
  date('scheduledDate',true);date('completedDate');text('provider');money('estimatedCents');money('actualCents');choice('status',WORK_STATUSES);
  if(values.completedDate&&values.scheduledDate&&values.completedDate<values.scheduledDate)errors.completedDate='maintenanceCompletionBefore';
 }
 if(kind==='reviews'){
  choice('equipment',EQUIPMENT);date('lastDate');date('nextDate',true);
  if(values.lastDate&&values.nextDate&&values.nextDate<values.lastDate)errors.nextDate='maintenanceReviewBefore';
 }
 if(kind!=='reviews')choice('currency',CURRENCIES);
 return {values,errors};
}
