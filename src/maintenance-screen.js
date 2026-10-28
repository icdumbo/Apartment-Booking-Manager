import {createMaintenanceDraftRepository,assertDraftTarget} from './maintenance-drafts.js';
import {readMaintenanceForm} from './maintenance-form.js';
import {createMaintenanceRepository,maintenanceAllowed,changeMaintenance,selectMaintenance,CATEGORIES,WORK_STATUSES,EQUIPMENT,reviewDue} from './maintenance.js';
import {t,translateError} from './i18n.js?v=0.3.1';
import {displayDate,parseDate} from './date-format.js?v=0.2.5';
import {configureDateInput} from './date-input.js';
import {formatMoney,moneyInput,parseMoney} from './booking-values.js';
import {today} from './domain.js?v=0.2.1';
import {CURRENCIES} from './currency.js';
export function createMaintenanceScreen({root,getState,getEntitlement,upgrade}){
 const repository=createMaintenanceRepository(),draftRepository=createMaintenanceDraftRepository();let initialized=false,expectedDraft=null,draftWarning='',data,kind='expenses',draft=null,filters={apartmentId:'',category:'',start:'',end:''};
 function node(tag,value,parent=root){const el=document.createElement(tag);if(value!==undefined)el.textContent=value;parent.append(el);return el;}
 function button(label,action,parent){const el=node('button',t(label),parent);el.type='button';el.onclick=action;return el;}
 function message(error,focus=true){const el=root.querySelector('.maintenance-error');if(!el)return;el.textContent=translateError(error);if(focus&&!root.hidden){el.tabIndex=-1;el.scrollIntoView({block:'center'});el.focus({preventScroll:true});}}
 function persistDraft(){
  try{draftRepository.put(kind,draft,expectedDraft);expectedDraft=structuredClone(draft);draftWarning='';return true;}catch(error){draftWarning=error.message;message(error,false);return false;}
 }
 function capture(force=false){const form=root.querySelector('form');if(!draft||form?.dataset.draftId!==draft.recordId)return true;
  const values=Object.fromEntries(new FormData(form));if(JSON.stringify(values)!==JSON.stringify(draft.values)||force===true){draft.values=values;return persistDraft();}return !draftWarning;
 }
 function restore(selected){try{const doc=draftRepository.load();kind=selected??doc.activeKind;draft=doc.drafts[kind]?structuredClone(doc.drafts[kind]):null;expectedDraft=draft?structuredClone(draft):null;}catch(error){draftWarning=error.message;draft=null;expectedDraft=null;}}
 function begin(row){if(draft)return;draft={recordId:row?.id??crypto.randomUUID(),values:{}};if(row){draft.id=row.id;draft.baseRecord=structuredClone(row);draft.item=row;}render();}
 function cancelDraft(){try{draftRepository.remove(kind,expectedDraft);draft=null;expectedDraft=null;draftWarning='';render();}catch(error){message(error);}}
 function fieldErrors(form,errors){
  for(const input of form.querySelectorAll('[name]')){const key=errors[input.name],error=form.querySelector('[data-error-for="'+input.name+'"]');input.setAttribute('aria-invalid',String(Boolean(key)));if(error)error.textContent=key?t(key):'';}
  const first=Object.keys(errors)[0];if(first){message({message:'maintenanceCheckFields'},false);const input=form.elements.namedItem(first);input.scrollIntoView({block:'center'});input.focus({preventScroll:true});}
 }
 function execute(command){try{
  if(!maintenanceAllowed(getEntitlement()))throw Error('maintenancePremium');
  if(command.item){if(!getState().apartments.some(a=>a.id===command.item.apartmentId))throw Error('maintenanceApartmentMissing');assertDraftTarget(draft,repository.load(),kind);}
  const next=changeMaintenance(data,command,getEntitlement());repository.save(next,data);data=next;
  if(command.operation==='save'&&!selectMaintenance(data,kind,filters).rows.some(row=>row.id===command.item.id))filters={apartmentId:'',category:'',start:'',end:''};
  if(command.operation==='save'){
   try{draftRepository.remove(kind,expectedDraft);draftWarning='';}catch(error){draftWarning=error.message;}
   draft=null;expectedDraft=null;
  }
  render();if(command.operation==='save'){const card=[...root.querySelectorAll('.maintenance-card')].find(el=>el.dataset.recordId===command.item.id);card?.scrollIntoView({block:'nearest'});}
 }catch(error){message({message:/^maintenance|^invalidCurrency$/.test(error.message)?error.message:'maintenanceSaveFailed'});}}
 function label(parent,key,name,value='',options){const wrap=node('label',undefined,parent);node('span',t(key),wrap);const input=node(options?'select':name==='description'||name==='notes'?'textarea':'input',undefined,wrap);input.name=name;const prefix=parent.tagName==='FORM'?'maintenance-field-':'maintenance-filter-';input.id=prefix+name;
  if(options)for(const [v,l] of options){const opt=node('option',l,input);opt.value=v;}
  input.value=value??'';if(/Date$/.test(name)||name==='date'){configureDateInput(input);try{input.value=value?displayDate(value):'';}catch{input.value=value;}}if(/Cents$/.test(name)){input.inputMode='decimal';input.value=typeof value==='string'?value:moneyInput(value);}const error=node('span','',wrap);error.className='maintenance-field-error';error.dataset.errorFor=name;error.id=prefix+'error-'+name;input.setAttribute('aria-describedby',error.id);return input;
 }
 function editor(){
  const form=node('form',undefined,root);form.className='maintenance-editor';form.dataset.draftId=draft.recordId;form.noValidate=true;node('h2',t('maintenanceEdit'),form);
  const row=Object.keys(draft.values).length?draft.values:draft.item??{},apartments=getState().apartments.map(a=>[a.id,a.name]);if(row.apartmentId&&!apartments.some(([id])=>id===row.apartmentId))apartments.unshift([row.apartmentId,t('maintenanceApartmentMissing')]);
  label(form,'apartment','apartmentId',row.apartmentId??apartments[0]?.[0],apartments);label(form,'maintenanceDescription','description',row.description);
  if(kind==='expenses'){label(form,'maintenanceDate','date',row.date??today());label(form,'maintenanceCategory','category',row.category??'maintenance',CATEGORIES.map(v=>[v,t('maintenanceCategory_'+v)]));label(form,'maintenanceAmount','amountCents',row.amountCents);}
  if(kind==='works'){
   label(form,'maintenanceScheduled','scheduledDate',row.scheduledDate??today());label(form,'maintenanceCompleted','completedDate',row.completedDate);label(form,'maintenanceProvider','provider',row.provider);label(form,'maintenanceEstimated','estimatedCents',row.estimatedCents);label(form,'maintenanceActual','actualCents',row.actualCents);label(form,'maintenanceStatus','status',row.status??'planned',WORK_STATUSES.map(v=>[v,t('maintenanceStatus_'+v)]));
  }
  if(kind==='reviews'){label(form,'maintenanceEquipment','equipment',row.equipment??'boiler',EQUIPMENT.map(v=>[v,t('maintenanceEquipment_'+v)]));label(form,'maintenanceLast','lastDate',row.lastDate);label(form,'maintenanceNext','nextDate',row.nextDate);}
  if(kind!=='reviews')label(form,'collectionCurrency','currency',row.currency??'RON',CURRENCIES.map(v=>[v,v]));label(form,'notes','notes',row.notes);
  const error=root.querySelector('.maintenance-error');form.append(error);const actions=node('div',undefined,form);actions.className='maintenance-actions';button('cancel',cancelDraft,actions);const save=node('button',t('save'),actions);save.type='submit';save.className='primary';
  form.addEventListener('input',capture);form.addEventListener('change',capture);
  if(!Object.keys(draft.values).length){draft.values=Object.fromEntries(new FormData(form));delete draft.item;persistDraft();}
  if(draftWarning)message({message:draftWarning},false);
  form.onsubmit=event=>{event.preventDefault();try{capture();const {values,errors}=readMaintenanceForm(kind,Object.fromEntries(new FormData(form)),getState().apartments);fieldErrors(form,errors);if(Object.keys(errors).length)return;execute({kind,operation:'save',id:draft.id,item:{...values,id:draft.recordId}});}catch(error){message({message:/^maintenance/.test(error.message)?error.message:'maintenanceSaveFailed'});}};
 }
 function render(){
  capture();if(!initialized){restore();initialized=true;}
  root.replaceChildren();const error=node('p','',root);error.className='maintenance-error';error.setAttribute('role','alert');
  if(!maintenanceAllowed(getEntitlement())){const locked=node('div',undefined,root);locked.className='collections-locked';node('h2',t('maintenancePremium'),locked);node('p',t('maintenanceBenefits'),locked);button('maintenanceUpgrade',upgrade,locked);return;}
  try{if(!draft||!data)data=repository.load();}catch{error.textContent=t('maintenanceStorage');return;}
  const tabs=node('nav',undefined,root);tabs.className='maintenance-tabs';for(const name of ['expenses','works','reviews']){const b=button('maintenance_'+name,()=>{if(!capture(true))return;restore(name);data=undefined;render();},tabs);b.setAttribute('aria-pressed',String(kind===name));}
  const controls=node('div',undefined,root);controls.className='maintenance-filters';
  for(const [name,key,options] of [['apartmentId','apartment',[['',t('allApartments')],...getState().apartments.map(a=>[a.id,a.name])]],...(kind==='expenses'?[['category','maintenanceCategory',[['',t('maintenanceAllCategories')],...CATEGORIES.map(c=>[c,t('maintenanceCategory_'+c)])]]]:[]),['start','reportStart'],['end','reportEnd']]){
   const input=label(controls,key,name,filters[name],options);if(name==='start'||name==='end'){configureDateInput(input);input.value=filters[name]?displayDate(filters[name]):'';}
   input.onchange=()=>{try{filters[name]=name==='start'||name==='end'?input.value?parseDate(input.value):'':input.value;render();}catch{error.textContent=t('maintenanceInvalid');}};
  }
  node('p',t(kind==='expenses'?'maintenanceExpenseBasis':kind==='works'?'maintenanceWorkBasis':'maintenanceReviewBasis'),root);
  const add=button('maintenanceAdd',()=>begin(),root);add.id='maintenance-add';add.className='primary';add.disabled=Boolean(draft)||!getState().apartments.length;
  if(draft)editor();else if(draftWarning)message({message:draftWarning},false);
  let result;try{result=selectMaintenance(data,kind,filters);}catch{error.textContent=t('maintenanceInvalid');return;}
  const totals=node('div',undefined,root);totals.className='maintenance-totals';for(const [currency,sum] of Object.entries(result.totals))node('strong',formatMoney(sum,currency),totals);
  const list=node('div',undefined,root);list.className='maintenance-list';if(!result.rows.length)node('p',t('maintenanceEmpty'),list);
  for(const row of result.rows){
   const card=node('article',undefined,list);card.className='maintenance-card';card.dataset.recordId=row.id;const heading=node('div',undefined,card);node('h3',row.description,heading);node('strong',getState().apartments.find(a=>a.id===row.apartmentId)?.name??t('maintenanceApartmentMissing'),heading);
   if(kind==='expenses'){node('p',`${displayDate(row.date)} · ${t('maintenanceCategory_'+row.category)}`,card);node('strong',formatMoney(row.amountCents,row.currency),card);if(row.workId)node('p',t('maintenanceLinkedExpense'),card);}
   if(kind==='works'){node('p',`${t('maintenanceStatus_'+row.status)} · ${displayDate(row.scheduledDate)}`,card);if(row.completedDate)node('p',`${t('maintenanceCompleted')}: ${displayDate(row.completedDate)}`,card);if(row.provider)node('p',row.provider,card);node('p',`${t('maintenanceEstimated')}: ${formatMoney(row.estimatedCents,row.currency)} · ${t('maintenanceActual')}: ${formatMoney(row.actualCents,row.currency)}`,card);}
   if(kind==='reviews'){node('p',t('maintenanceEquipment_'+row.equipment),card);if(row.lastDate)node('p',`${t('maintenanceLast')}: ${displayDate(row.lastDate)}`,card);const due=reviewDue(row,today());node('p',`${t('maintenanceNext')}: ${displayDate(row.nextDate)} · ${t('maintenanceDue_'+due)}`,card).className='maintenance-due-'+due;}
   if(row.notes)node('p',row.notes,card);const actions=node('div',undefined,card);actions.className='maintenance-actions';
   if(!row.workId){const edit=button('maintenanceEdit',()=>begin(row),actions);edit.disabled=Boolean(draft);}
   button('delete',()=>{if(confirm(t('maintenanceDelete')))execute({kind,id:row.id,operation:'delete'});},actions);
   if(kind==='works'){const linked=data.expenses.some(e=>e.workId===row.id);if(linked)node('span',t('maintenanceAlreadyLinked'),actions);else if(row.status==='completed'&&row.completedDate&&row.actualCents!==undefined)button('maintenanceConvert',()=>execute({kind,id:row.id,operation:'convert',expenseId:crypto.randomUUID()}),actions);}
  }
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)capture(true);});
 window.addEventListener('pagehide',()=>capture(true));
 return {render,hasDraft(){try{return Object.keys(draftRepository.load().drafts).length>0;}catch{return false;}}};
}
