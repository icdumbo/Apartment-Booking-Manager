import {calendarYear,monthStart} from './month-navigation.js?v=0.2.4';
import {dayNumber,isoDay,today,validateApartment,validateBooking} from './domain.js?v=0.2.1';
import {createLocalRepository} from './storage.js?v=0.2.1';
import {removeOriginalDemo} from './demo-migration.js?v=0.2.5';
import {displayDate,parseDate} from './date-format.js?v=0.2.5';
import {renderTimeline} from './timeline.js?v=0.3.0';
import {initializeLanguage,selectLanguage,t,translateUI,translateError} from './i18n.js?v=0.3.0';
const $=id=>document.getElementById(id);
initializeLanguage();
let repository,state,blocked=false;
try {
 repository=createLocalRepository();state=repository.load();
 if(!state){state={version:1,apartments:[],bookings:[]};repository.save(state);}
 const migrated=removeOriginalDemo(state);if(migrated!==state){repository.save(migrated);state=migrated;}
}catch(error){state={version:1,apartments:[],bookings:[]};blocked=true;$('notice').dataset.i18n='storageBlocked';}
let start=dayNumber(today())-2,days=30,editing;
let selectorYear=calendarYear(start);
function renderMonthSelector(){
 $('selector-year').textContent=selectorYear;const currentDate=new Date(start*86400000);
 $('month-options').replaceChildren();
 t('monthsShort').forEach((name,month)=>{
  const button=document.createElement('button');button.type='button';button.textContent=name;button.setAttribute('aria-label',`${name} ${selectorYear}`);
  const active=currentDate.getUTCFullYear()===selectorYear&&currentDate.getUTCMonth()===month;
  const nextDate=new Date(currentDate);nextDate.setUTCMonth(nextDate.getUTCMonth()+1,1);
  const upcoming=nextDate.getUTCFullYear()===selectorYear&&nextDate.getUTCMonth()===month;
  button.className='month-option'+(active?' active':upcoming?' upcoming':'');button.setAttribute('aria-pressed',String(active));
  button.onclick=()=>{start=monthStart(selectorYear,month);render();};$('month-options').append(button);
 });
}
function render(){
 renderMonthSelector();renderTimeline($('timeline'),state,start,days,{editApartment:a=>open('apartment',a),editBooking:b=>open('booking',b),newBooking:(apartmentId,checkIn)=>open('booking',null,{apartmentId,checkIn})});
 $('range').textContent=`${displayDate(isoDay(start))} – ${displayDate(isoDay(start+days-1))}`;
 $('summary').textContent=t('summary',{apartments:state.apartments.length,bookings:state.bookings.length});
 $('add-booking').disabled=blocked||!state.apartments.length;$('add-apartment').disabled=blocked;
}
function textLabel(key){const label=document.createElement('label'),text=document.createElement('span');text.dataset.i18n=key;text.textContent=t(key);label.append(text);return label;}
function field(key,name,value='',type='text'){
 const label=textLabel(key),input=document.createElement('input');input.name=name;input.type=type==='date'?'text':type;input.value=type==='date'?displayDate(value):value;
 if(type==='date'){input.placeholder='DD/MM/YYYY';input.inputMode='text';input.pattern='[0-9]{2}/[0-9]{2}/[0-9]{4}';input.dataset.dateLabel=key;input.setAttribute('aria-label',t(key)+' (DD/MM/YYYY)');}
 input.required=true;input.maxLength=type==='date'?10:name==='phone'?30:150;label.append(input);$('fields').append(label);return input;
}
function titleKey(){return editing.kind==='apartment'?(editing.id?'apartmentDetails':'newApartment'):(editing.id?'bookingDetails':'newBooking');}
function formError(error){const source=error?.message??error;$('form-error').dataset.source=source;$('form-error').textContent=source?translateError(source):'';}
function open(kind,item=null,defaults={}){
 if(blocked)return;editing={kind,id:item?.id};$('editor-form').reset();$('fields').replaceChildren();formError('');$('delete').hidden=!item;$('editor-title').textContent=t(titleKey());
 if(kind==='apartment'){field('apartmentName','name',item?.name);field('address','address',item?.address);field('city','city',item?.city);}
 else{
  const label=textLabel('apartment'),select=document.createElement('select');select.name='apartmentId';select.required=true;
  for(const a of state.apartments){const option=document.createElement('option');option.value=a.id;option.textContent=a.name;select.append(option);}
  select.value=item?.apartmentId||defaults.apartmentId||state.apartments[0]?.id;label.append(select);$('fields').append(label);
  const statusLabel=textLabel('bookingStatus'),status=document.createElement('select');status.name='status';
  for(const value of ['confirmed','unconfirmed']){const option=document.createElement('option');option.value=value;option.dataset.i18n=value;option.textContent=t(value);status.append(option);}
  status.value=item?.status||'confirmed';statusLabel.append(status);$('fields').append(statusLabel);
  field('guest','guest',item?.guest);field('phone','phone',item?.phone,'tel');const checkIn=item?.checkIn||defaults.checkIn||today();
  field('checkIn','checkIn',checkIn,'date');field('checkOut','checkOut',item?.checkOut||isoDay(dayNumber(checkIn)+1),'date');
 }
 $('editor').showModal();
}
function persist(next){try{repository.save(next);state=next;render();return true;}catch{formError('storageSave');return false;}}
$('editor-form').onsubmit=e=>{
 e.preventDefault();const values=Object.fromEntries(new FormData(e.target));for(const key in values)values[key]=values[key].trim();
 // Browser-native messages follow OS language, so show centralized translated validation instead.
 if([...$('fields').querySelectorAll('[required]')].some(input=>!input.value.trim())){formError('required');return;}
 const item={...values,id:editing.id||crypto.randomUUID()};
 try{
  if(editing.kind==='booking'){item.checkIn=parseDate(item.checkIn);item.checkOut=parseDate(item.checkOut);}
  editing.kind==='apartment'?validateApartment(item):validateBooking(item,state);
  const key=editing.kind==='apartment'?'apartments':'bookings';const next={...state,[key]:editing.id?state[key].map(v=>v.id===editing.id?item:v):[...state[key],item]};
  if(persist(next))$('editor').close();
 }catch(error){formError(error);}
};
function confirmationText(){
 const apartment=editing.kind==='apartment',count=apartment?state.bookings.filter(b=>b.apartmentId===editing.id).length:0;
 $('confirmation-text').textContent=t(apartment?(count?'deleteApartmentBookings':'deleteApartment'):'deleteBooking',{count});
}
$('delete').onclick=()=>{confirmationText();$('confirmation').returnValue='cancel';$('confirmation').showModal();};
$('confirmation').addEventListener('close',()=>{
 if($('confirmation').returnValue!=='delete')return;
 const next=editing.kind==='apartment'?{...state,apartments:state.apartments.filter(a=>a.id!==editing.id),bookings:state.bookings.filter(b=>b.apartmentId!==editing.id)}:{...state,bookings:state.bookings.filter(b=>b.id!==editing.id)};
 if(persist(next))$('editor').close();
});
function refreshLanguage(){translateUI();render();if(editing)$('editor-title').textContent=t(titleKey());if($('form-error').dataset.source)formError($('form-error').dataset.source);if($('confirmation').open)confirmationText();}
// Reusable language controls also stay accessible inside modal forms/confirmations.
for(const widget of document.querySelectorAll('.language-selector')){
 for(const [index,code,name] of [[0,'ro','Română'],[1,'en','English']]){
  if(index){const separator=document.createElement('span');separator.textContent='|';separator.setAttribute('aria-hidden','true');widget.append(separator);}
  const button=document.createElement('button');button.type='button';button.dataset.language=code;button.lang=code;button.textContent=code.toUpperCase();button.setAttribute('aria-label',name);
  button.onclick=()=>{if(!selectLanguage(code)&&!blocked)$('notice').dataset.i18n='languageSaveFailed';refreshLanguage();};widget.append(button);
 }
}
$('close').onclick=$('cancel').onclick=()=>$('editor').close();$('add-apartment').onclick=()=>open('apartment');$('add-booking').onclick=()=>open('booking');
$('year-prev').onclick=()=>{selectorYear--;renderMonthSelector();};$('year-next').onclick=()=>{selectorYear++;renderMonthSelector();};
$('prev').onclick=()=>{start-=days;selectorYear=calendarYear(start);render();};$('next').onclick=()=>{start+=days;selectorYear=calendarYear(start);render();};
$('today').onclick=()=>{start=dayNumber(today())-2;selectorYear=calendarYear(start);render();};$('days').onchange=e=>{days=Number(e.target.value);render();};refreshLanguage();
