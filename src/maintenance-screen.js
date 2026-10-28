import {createMaintenanceRepository,maintenanceAllowed,changeMaintenance,selectMaintenance,CATEGORIES,WORK_STATUSES,EQUIPMENT,reviewDue} from './maintenance.js';
import {t,translateError} from './i18n.js?v=0.3.1';
import {displayDate,parseDate} from './date-format.js?v=0.2.5';
import {configureDateInput} from './date-input.js';
import {formatMoney,moneyInput,parseMoney} from './booking-values.js';
import {today} from './domain.js?v=0.2.1';
import {CURRENCIES} from './currency.js';
export function createMaintenanceScreen({root,getState,getEntitlement,upgrade}){
 const repository=createMaintenanceRepository();let data,kind='expenses',draft=null,filters={apartmentId:'',category:'',start:'',end:''};
 function node(tag,value,parent=root){const el=document.createElement(tag);if(value!==undefined)el.textContent=value;parent.append(el);return el;}
 function button(label,action,parent){const el=node('button',t(label),parent);el.type='button';el.onclick=action;return el;}
 function message(error){const el=root.querySelector('.maintenance-error');el.textContent=translateError(error);}
 function execute(command){try{if(!maintenanceAllowed(getEntitlement()))throw Error('maintenancePremium');if(command.item&&!getState().apartments.some(a=>a.id===command.item.apartmentId))throw Error('maintenanceApartmentMissing');const next=changeMaintenance(data,command,getEntitlement());repository.save(next,data);data=next;draft=null;render();}catch(error){message({message:/^maintenance|^invalidCurrency$/.test(error.message)?error.message:'maintenanceSaveFailed'});}}
 function label(parent,key,name,value='',options){const wrap=node('label',undefined,parent);node('span',t(key),wrap);const input=node(options?'select':name==='description'||name==='notes'?'textarea':'input',undefined,wrap);input.name=name;
  if(options)for(const [v,l] of options){const opt=node('option',l,input);opt.value=v;}
  input.value=value??'';if(/Date$/.test(name)||name==='date'){configureDateInput(input);try{input.value=value?displayDate(value):'';}catch{input.value=value;}}if(/Cents$/.test(name)){input.inputMode='decimal';input.value=typeof value==='string'?value:moneyInput(value);}return input;
 }
 function editor(){
  const form=node('form',undefined,root);form.className='maintenance-editor';form.noValidate=true;node('h2',t('maintenanceEdit'),form);
  const row=draft.item??{},apartments=getState().apartments.map(a=>[a.id,a.name]);if(row.apartmentId&&!apartments.some(([id])=>id===row.apartmentId))apartments.unshift([row.apartmentId,t('maintenanceApartmentMissing')]);
  label(form,'apartment','apartmentId',row.apartmentId??apartments[0]?.[0],apartments);label(form,'maintenanceDescription','description',row.description);
  if(kind==='expenses'){label(form,'maintenanceDate','date',row.date??today());label(form,'maintenanceCategory','category',row.category??'maintenance',CATEGORIES.map(v=>[v,t('maintenanceCategory_'+v)]));label(form,'maintenanceAmount','amountCents',row.amountCents);}
  if(kind==='works'){
   label(form,'maintenanceScheduled','scheduledDate',row.scheduledDate??today());label(form,'maintenanceCompleted','completedDate',row.completedDate);label(form,'maintenanceProvider','provider',row.provider);label(form,'maintenanceEstimated','estimatedCents',row.estimatedCents);label(form,'maintenanceActual','actualCents',row.actualCents);label(form,'maintenanceStatus','status',row.status??'planned',WORK_STATUSES.map(v=>[v,t('maintenanceStatus_'+v)]));
  }
  if(kind==='reviews'){label(form,'maintenanceEquipment','equipment',row.equipment??'boiler',EQUIPMENT.map(v=>[v,t('maintenanceEquipment_'+v)]));label(form,'maintenanceLast','lastDate',row.lastDate);label(form,'maintenanceNext','nextDate',row.nextDate);}
  if(kind!=='reviews')label(form,'collectionCurrency','currency',row.currency??'RON',CURRENCIES.map(v=>[v,v]));label(form,'notes','notes',row.notes);
  const actions=node('div',undefined,form);actions.className='maintenance-actions';button('cancel',()=>{draft=null;render();},actions);const save=node('button',t('save'),actions);save.type='submit';save.className='primary';
  form.onsubmit=event=>{event.preventDefault();try{const values=Object.fromEntries(new FormData(form));for(const key in values){values[key]=values[key].trim();if(/Date$/.test(key)||key==='date')values[key]=values[key]?parseDate(values[key]):'';if(/Cents$/.test(key))values[key]=parseMoney(values[key]);}if(kind==='expenses'&&values.amountCents===undefined)throw Error('maintenanceInvalid');execute({kind,operation:'save',id:draft.id,item:{...values,id:draft.id??crypto.randomUUID()}});}catch(error){message({message:['invalidAmount'].includes(error.message)?error.message:'maintenanceInvalid'});}};
 }
 function render(){
  // Language/access refresh must not silently discard a form in progress.
  const previous=root.querySelector('form');if(draft&&previous){const values=Object.fromEntries(new FormData(previous));for(const key in values){try{if(/Date$/.test(key)||key==='date')values[key]=values[key]?parseDate(values[key]):'';if(/Cents$/.test(key))values[key]=parseMoney(values[key]);}catch{ /* Preserve incomplete input through a language refresh. */ }}draft.item=values;}
  root.replaceChildren();const error=node('p','',root);error.className='maintenance-error';error.setAttribute('role','alert');
  if(!maintenanceAllowed(getEntitlement())){draft=null;const locked=node('div',undefined,root);locked.className='collections-locked';node('h2',t('maintenancePremium'),locked);node('p',t('maintenanceBenefits'),locked);button('maintenanceUpgrade',upgrade,locked);return;}
  try{if(!draft||!data)data=repository.load();}catch{error.textContent=t('maintenanceStorage');return;}
  const tabs=node('nav',undefined,root);tabs.className='maintenance-tabs';for(const name of ['expenses','works','reviews']){const b=button('maintenance_'+name,()=>{draft=null;kind=name;render();},tabs);b.setAttribute('aria-pressed',String(kind===name));}
  const controls=node('div',undefined,root);controls.className='maintenance-filters';
  for(const [name,key,options] of [['apartmentId','apartment',[['',t('allApartments')],...getState().apartments.map(a=>[a.id,a.name])]],...(kind==='expenses'?[['category','maintenanceCategory',[['',t('maintenanceAllCategories')],...CATEGORIES.map(c=>[c,t('maintenanceCategory_'+c)])]]]:[]),['start','reportStart'],['end','reportEnd']]){
   const input=label(controls,key,name,filters[name],options);if(name==='start'||name==='end'){configureDateInput(input);input.value=filters[name]?displayDate(filters[name]):'';}
   input.onchange=()=>{try{filters[name]=name==='start'||name==='end'?input.value?parseDate(input.value):'':input.value;render();}catch{error.textContent=t('maintenanceInvalid');}};
  }
  node('p',t(kind==='expenses'?'maintenanceExpenseBasis':kind==='works'?'maintenanceWorkBasis':'maintenanceReviewBasis'),root);
  const add=button('maintenanceAdd',()=>{draft={};render();},root);add.id='maintenance-add';add.className='primary';add.disabled=!getState().apartments.length;
  if(draft)editor();
  let result;try{result=selectMaintenance(data,kind,filters);}catch{error.textContent=t('maintenanceInvalid');return;}
  const totals=node('div',undefined,root);totals.className='maintenance-totals';for(const [currency,sum] of Object.entries(result.totals))node('strong',formatMoney(sum,currency),totals);
  const list=node('div',undefined,root);list.className='maintenance-list';if(!result.rows.length)node('p',t('maintenanceEmpty'),list);
  for(const row of result.rows){
   const card=node('article',undefined,list);card.className='maintenance-card';const heading=node('div',undefined,card);node('h3',row.description,heading);node('strong',getState().apartments.find(a=>a.id===row.apartmentId)?.name??t('maintenanceApartmentMissing'),heading);
   if(kind==='expenses'){node('p',`${displayDate(row.date)} · ${t('maintenanceCategory_'+row.category)}`,card);node('strong',formatMoney(row.amountCents,row.currency),card);if(row.workId)node('p',t('maintenanceLinkedExpense'),card);}
   if(kind==='works'){node('p',`${t('maintenanceStatus_'+row.status)} · ${displayDate(row.scheduledDate)}`,card);if(row.completedDate)node('p',`${t('maintenanceCompleted')}: ${displayDate(row.completedDate)}`,card);if(row.provider)node('p',row.provider,card);node('p',`${t('maintenanceEstimated')}: ${formatMoney(row.estimatedCents,row.currency)} · ${t('maintenanceActual')}: ${formatMoney(row.actualCents,row.currency)}`,card);}
   if(kind==='reviews'){node('p',t('maintenanceEquipment_'+row.equipment),card);if(row.lastDate)node('p',`${t('maintenanceLast')}: ${displayDate(row.lastDate)}`,card);const due=reviewDue(row,today());node('p',`${t('maintenanceNext')}: ${displayDate(row.nextDate)} · ${t('maintenanceDue_'+due)}`,card).className='maintenance-due-'+due;}
   if(row.notes)node('p',row.notes,card);const actions=node('div',undefined,card);actions.className='maintenance-actions';
   if(!row.workId)button('maintenanceEdit',()=>{draft={id:row.id,item:row};render();},actions);
   button('delete',()=>{if(confirm(t('maintenanceDelete')))execute({kind,id:row.id,operation:'delete'});},actions);
   if(kind==='works'){const linked=data.expenses.some(e=>e.workId===row.id);if(linked)node('span',t('maintenanceAlreadyLinked'),actions);else if(row.status==='completed'&&row.completedDate&&row.actualCents!==undefined)button('maintenanceConvert',()=>execute({kind,id:row.id,operation:'convert',expenseId:crypto.randomUUID()}),actions);}
  }
 }
 return {render};
}
