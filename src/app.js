import {configureDateInput} from './date-input.js';
import {createReportsScreen} from './reports-screen.js';
import {createStatisticsScreen} from './statistics-screen.js';
import {createCollectionsScreen} from './collections-screen.js';
import {assertCurrencyChange} from './currency.js';
import {canEditPayments,assertPaymentHistoryAccess} from './payments.js';
import {BOOKING_EXTRA_FIELDS,readBookingExtras} from './booking-values.js';
import {renderBookingFields,updateBookingSummary} from './booking-editor.js';
import {calendarYear,monthStart} from './month-navigation.js?v=0.2.4';
import {dayNumber,isoDay,today,validateApartment,validateBooking} from './domain.js?v=0.2.1';
import {createLocalRepository} from './storage.js?v=0.2.1';
import {removeOriginalDemo} from './demo-migration.js?v=0.2.5';
import {displayDate,parseDate} from './date-format.js?v=0.2.5';
import {renderTimeline} from './timeline.js?v=0.3.1';
import {initializeLanguage,selectLanguage,t,translateUI,translateError} from './i18n.js?v=0.3.1';
import {createAccessService,accessPolicy} from './access.js?v=1';
import {createOptionalAndroidAuth} from './native-auth.js';
const androidAuth=createOptionalAndroidAuth(undefined,{changed:()=>queueMicrotask(()=>render())});
const access=createAccessService(globalThis.localStorage,Date.now,androidAuth.provider);
const $=id=>document.getElementById(id);
initializeLanguage();
let repository,state,blocked=false;
try {
 repository=createLocalRepository();state=repository.load();
 if(!state){state={version:1,apartments:[],bookings:[]};repository.save(state);}
 const migrated=removeOriginalDemo(state);if(migrated!==state){repository.save(migrated);state=migrated;}
}catch(error){state={version:1,apartments:[],bookings:[]};blocked=true;$('notice').dataset.i18n='storageBlocked';}
// Start only after business storage has loaded successfully; existing trials are never renewed.
// Secure activation is explicit and server-backed. Never mint a local trial on startup.
let activeScreen='calendar';
let start=dayNumber(today())-2,days=30,editing;
let selectorYear=calendarYear(start);
const collectionsScreen=createCollectionsScreen({root:$('payments-panel'),getState:()=>state,getEntitlement:()=>access.snapshot(),openBooking:id=>{const booking=state.bookings.find(b=>b.id===id);if(booking)open('booking',booking);}});
const statisticsScreen=createStatisticsScreen({root:$('statistics-panel'),getState:()=>state,getEntitlement:()=>access.snapshot()});
const reportsScreen=createReportsScreen({root:$('reports-panel'),getState:()=>state,getEntitlement:()=>access.snapshot()});
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
function policy(){return accessPolicy(access.snapshot(),state.apartments);}
function render(){
 renderAccessStatus();renderApartments();if(activeScreen==='reports')reportsScreen.render();if(activeScreen==='payments')collectionsScreen.render();if(activeScreen==='statistics')statisticsScreen.render();if(editing?.payments)editing.payments.refresh();
 renderMonthSelector();renderTimeline($('timeline'),state,start,days,{editApartment:a=>open('apartment',a),editBooking:b=>openSavedBooking(b.id),newBooking:(apartmentId,checkIn)=>open('booking',null,{apartmentId,checkIn})});
 $('range').textContent=`${displayDate(isoDay(start))} – ${displayDate(isoDay(start+days-1))}`;
 $('summary').textContent=t('summary',{apartments:state.apartments.length,bookings:state.bookings.length});
 $('add-booking').disabled=blocked||!state.apartments.length;$('add-apartment').disabled=blocked||!policy().canAddApartment;$('add-apartment').title=!policy().canAddApartment?t('apartmentLimit'):'';
}
function renderAccessStatus(){
 const entitlement=access.snapshot(),expiry=entitlement.premiumExpiresAt??entitlement.expiresAt;
 const daysLeft=Math.max(0,Math.ceil((entitlement.remainingMs??((expiry??0)-Date.now()))/86400000));
 $('access-message').textContent=t(entitlement.unavailable?'statusUnavailable':entitlement.state==='TRIAL'?'statusTrial':entitlement.state==='PREMIUM'?(entitlement.premiumExpiresAt?'statusGift':'statusPremium'):'statusBasic',{days:daysLeft});
 $('access-details').textContent=t(entitlement.legacyTrialPending?'legacyTrialReview':entitlement.state==='TRIAL'?'trialTerms':entitlement.state==='BASIC'?'basicActive':entitlement.premiumExpiresAt?'premiumTemporary':'premiumActive',{date:expiry?displayDate(new Date(expiry).toISOString().slice(0,10)):''});
}
function renderApartments(){
 const list=$('apartment-list');list.replaceChildren();
 if(!state.apartments.length){const empty=document.createElement('p');empty.className='apartments-empty';empty.textContent=t('empty');list.append(empty);return;}
 const permissions=policy();
 for(const apartment of state.apartments){
  const card=document.createElement('button');card.type='button';card.className='apartment-card';card.onclick=()=>open('apartment',apartment);
  const photo=document.createElement('span');photo.className='apartment-photo';photo.textContent=t('noPhoto');
  const info=document.createElement('span');info.className='apartment-info';
  const name=document.createElement('strong');name.textContent=apartment.name;
  const address=document.createElement('span');address.textContent=[apartment.address,apartment.city].filter(Boolean).join(' · ');
  const count=document.createElement('small');count.textContent=t('apartmentBookings',{count:state.bookings.filter(b=>b.apartmentId===apartment.id).length});
  info.append(name,address,count);
  const action=document.createElement('span');action.className='apartment-badge';action.textContent=t(permissions.canManageApartment(apartment.id)?'apartmentDetails':'readOnly');
  card.append(photo,info,action);
  const entry=document.createElement('div');entry.className='apartment-entry';entry.append(card);
  const bookings=state.bookings.filter(b=>b.apartmentId===apartment.id).sort((a,b)=>a.checkIn.localeCompare(b.checkIn)||a.id.localeCompare(b.id));
  if(bookings.length){
   const details=document.createElement('details');details.className='apartment-reservations';const summary=document.createElement('summary');summary.textContent=t('apartmentBookings',{count:bookings.length});details.append(summary);
   for(const booking of bookings){const link=document.createElement('button');link.type='button';link.className='apartment-booking-link';link.dataset.bookingId=booking.id;link.textContent=`${booking.guest} · ${displayDate(booking.checkIn)} → ${displayDate(booking.checkOut)}`;link.onclick=()=>openSavedBooking(booking.id);details.append(link);}entry.append(details);
  }
  list.append(entry);
 }
}
function refreshStoredState(){
 try{const saved=repository.load();if(!saved)return false;const changed=JSON.stringify(saved)!==JSON.stringify(state);state=saved;return changed;}catch{ $('notice').dataset.i18n='storageBlocked';$('notice').textContent=t('storageBlocked');return null;}
}
function selectScreen(screen){
 const changed=!blocked&&!$('editor').open?refreshStoredState():false;if(changed===null)return;
 activeScreen=screen;if(changed)render();
 $('reports-panel').hidden=screen!=='reports';if(screen==='reports')reportsScreen.render();
 $('statistics-panel').hidden=screen!=='statistics';if(screen==='statistics')statisticsScreen.render();
 $('payments-panel').hidden=screen!=='payments';$('apartment-actions').hidden=['payments','statistics','reports'].includes(screen);if(screen==='payments')collectionsScreen.render();
 if(screen==='payments')$('open-menu').setAttribute('aria-current','page');else $('open-menu').removeAttribute('aria-current');
 $('calendar-panel').hidden=screen!=='calendar';$('apartments-panel').hidden=screen!=='apartments';$('add-booking').hidden=screen!=='calendar';
 const heading=document.querySelector('h1'),subtitle=$('screen-subtitle');
 heading.dataset.i18n=screen==='reports'?'navReports':screen==='calendar'?'heading':screen==='payments'?'navPayments':screen==='statistics'?'navStatistics':'navApartments';heading.textContent=t(heading.dataset.i18n);
 subtitle.dataset.i18n=screen==='reports'?'reportSubtitle':screen==='calendar'?'subtitle':screen==='payments'?'collectionsSubtitle':screen==='statistics'?'statisticsSubtitle':'apartmentsSubtitle';subtitle.textContent=t(subtitle.dataset.i18n);
 for(const link of document.querySelectorAll('[data-screen]')){if(link.dataset.screen===screen)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
}
for(const link of document.querySelectorAll('[data-screen]'))link.onclick=e=>{e.preventDefault();if($('app-menu').open)$('app-menu').close();selectScreen(link.dataset.screen);};
function textLabel(key){const label=document.createElement('label'),text=document.createElement('span');text.dataset.i18n=key;text.textContent=t(key);label.append(text);return label;}
function field(key,name,value='',type='text'){
 const label=textLabel(key),input=document.createElement('input');input.name=name;input.type=type==='date'?'text':type;input.value=type==='date'?displayDate(value):value;
 if(type==='date'){configureDateInput(input);input.dataset.dateLabel=key;input.setAttribute('aria-label',t(key)+' (DD/MM/YYYY)');}
 input.required=true;input.maxLength=type==='date'?10:name==='phone'?30:150;label.append(input);$('fields').append(label);return input;
}
function openSavedBooking(id){const booking=state.bookings.find(item=>item.id===id);if(booking)open('booking',booking);}
function titleKey(){return editing.kind==='apartment'?(editing.id?'apartmentDetails':'newApartment'):(editing.id?'bookingDetails':'newBooking');}
function formError(error){const source=error?.message??error;$('form-error').dataset.source=source;$('form-error').textContent=source?translateError(source):'';}
function open(kind,item=null,defaults={}){
 if(blocked)return;if(!$('editor').open){if(refreshStoredState()===null)return;if(item){item=state[kind==='apartment'?'apartments':'bookings'].find(record=>record.id===item.id);if(!item)return;}}if(kind==='apartment'&&!item&&!policy().canAddApartment)return;editing={kind,id:item?.id};$('editor-form').reset();$('fields').replaceChildren();formError('');$('delete').hidden=!item;$('editor-title').textContent=t(titleKey());
 if(kind==='apartment'){field('apartmentName','name',item?.name);field('address','address',item?.address);field('city','city',item?.city);}
 else editing.payments=renderBookingFields({container:$('fields'),state,item,defaults,field,textLabel,canManagePayments:()=>!blocked&&canEditPayments(access.snapshot())&&policy().canManageApartment($('fields').querySelector('[name=apartmentId]').value)});
 $('editor').classList.toggle('booking-editor',kind==='booking');
 const apartmentId=kind==='apartment'?item?.id:item?.apartmentId||defaults.apartmentId;
 const readOnly=apartmentId&&!policy().canManageApartment(apartmentId);
 if(kind==='booking'&&!item&&readOnly)return;
 for(const option of $('fields').querySelectorAll('select[name=apartmentId] option'))option.disabled=!policy().canManageApartment(option.value);
 for(const input of $('fields').querySelectorAll('input,select,textarea'))input.disabled=Boolean(readOnly)||input.dataset.currencyLocked==='true';
 $('editor-form').querySelector('[type=submit]').hidden=Boolean(readOnly);$('delete').hidden=!item||Boolean(readOnly);
 if(readOnly)formError('basicReadOnly');
 $('editor').showModal();
}
$('fields').addEventListener('input',()=>{if(editing?.kind==='booking')updateBookingSummary($('fields'));});
function persist(next){try{
 // A second open tab/file can share storage while retaining an older in-memory snapshot.
 const saved=repository.load();if(editing?.conflicted||!saved||JSON.stringify(saved)!==JSON.stringify(state)){if(editing)editing.conflicted=true;throw new Error('storageChanged');}
 const permissions=policy();
 for(const booking of next.bookings){const old=state.bookings.find(old=>old.id===booking.id);assertCurrencyChange(old,booking);assertPaymentHistoryAccess(old,booking,access.snapshot());}
 for(const kind of ['apartments','bookings']){
  for(const old of state[kind]){const changed=next[kind].find(v=>v.id===old.id);if(JSON.stringify(changed)!==JSON.stringify(old)&&!permissions.canManageApartment(kind==='apartments'?old.id:old.apartmentId))throw new Error('basicReadOnly');}
  for(const item of next[kind]){if(kind==='apartments'&&!state.apartments.some(a=>a.id===item.id)&&!permissions.canAddApartment)throw new Error('apartmentLimit');if(kind==='bookings'&&JSON.stringify(state.bookings.find(b=>b.id===item.id))!==JSON.stringify(item)&&!permissions.canManageApartment(item.apartmentId))throw new Error('basicReadOnly');}
 }
repository.save(next);state=next;render();return true;}catch(error){formError(['basicReadOnly','apartmentLimit','premiumPayments','currencyLocked','storageChanged'].includes(error.message)?error.message:'storageSave');return false;}}
$('editor-form').onsubmit=e=>{
 e.preventDefault();const values=Object.fromEntries(new FormData(e.target));for(const key in values)values[key]=values[key].trim();
 // Browser-native messages follow OS language, so show centralized translated validation instead.
 if([...$('fields').querySelectorAll('[required]')].some(input=>!input.value.trim())){formError('required');return;}
 const key=editing.kind==='apartment'?'apartments':'bookings';
 const old=state[key].find(v=>v.id===editing.id);
 if(editing.kind==='booking'){const currency=$('fields').querySelector('[name=currency]').value;if(currency!=='RON'||old?.currency!==undefined)values.currency=currency;else delete values.currency;}
 const item={...old,...values,id:editing.id||crypto.randomUUID()};
 try{
  if(editing.kind==='apartment'&&!editing.id&&!policy().canAddApartment)throw new Error('apartmentLimit');
  if(editing.kind==='booking'){if(editing.payments.hasPendingEntry())throw new Error('pendingPayment');editing.payments.validateCurrency();item.checkIn=parseDate(item.checkIn);item.checkOut=parseDate(item.checkOut);const extra=readBookingExtras(values);for(const field of BOOKING_EXTRA_FIELDS)delete item[field];Object.assign(item,extra,editing.payments.getLedger());}
  editing.kind==='apartment'?validateApartment(item):validateBooking(item,state);
  const next={...state,[key]:editing.id?state[key].map(v=>v.id===editing.id?item:v):[...state[key],item]};
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
function refreshLanguage(){translateUI();render();selectScreen(activeScreen);if(editing){$('editor-title').textContent=t(titleKey());if(editing.kind==='booking'){updateBookingSummary($('fields'));editing.payments?.refresh();}}if($('form-error').dataset.source)formError($('form-error').dataset.source);if($('confirmation').open)confirmationText();}
// Reusable language controls also stay accessible inside modal forms/confirmations.
for(const widget of document.querySelectorAll('.language-selector')){
 for(const [index,code,name] of [[0,'ro','Română'],[1,'en','English']]){
  if(index){const separator=document.createElement('span');separator.textContent='|';separator.setAttribute('aria-hidden','true');widget.append(separator);}
  const button=document.createElement('button');button.type='button';button.dataset.language=code;button.lang=code;button.textContent=code.toUpperCase();button.setAttribute('aria-label',name);
  button.onclick=()=>{if(!selectLanguage(code)&&!blocked)$('notice').dataset.i18n='languageSaveFailed';refreshLanguage();};widget.append(button);
 }
}
// Re-evaluate expiry on resume and while the offline app remains open. Mutation guards also recheck.
let displayedAccess=access.snapshot().state;
setInterval(()=>{const current=access.snapshot().state;if(current!==displayedAccess){displayedAccess=current;render();}else renderAccessStatus();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
$('close').onclick=$('cancel').onclick=()=>$('editor').close();$('add-apartment').onclick=()=>open('apartment');$('add-booking').onclick=()=>open('booking');
$('year-prev').onclick=()=>{selectorYear--;renderMonthSelector();};$('year-next').onclick=()=>{selectorYear++;renderMonthSelector();};
$('prev').onclick=()=>{start-=days;selectorYear=calendarYear(start);render();};$('next').onclick=()=>{start+=days;selectorYear=calendarYear(start);render();};
$('today').onclick=()=>{start=dayNumber(today())-2;selectorYear=calendarYear(start);render();};refreshLanguage();

// Optional account controls sit outside the calendar; BASIC never waits for Firebase.
if(androidAuth.available){
 const panel=$('account-controls'),signIn=$('google-sign-in'),signOut=$('google-sign-out'),status=$('auth-status');
 panel.hidden=false;
 function accountStatus(key){status.dataset.i18n=key;status.textContent=t(key);}
 function updateAccount(){const signedIn=Boolean(androidAuth.bridge.getCurrentUser());signIn.hidden=signedIn;signOut.hidden=!signedIn;accountStatus(signedIn?'authSignedIn':'authSignedOut');}
 androidAuth.bridge.onIdTokenChanged(updateAccount);
 async function act(operation){signIn.disabled=signOut.disabled=true;accountStatus('authPending');try{await operation();updateAccount();}catch(error){updateAccount();accountStatus(error.code==='authCancelled'?'authCancelled':'authError');}finally{signIn.disabled=signOut.disabled=false;}}
 signIn.onclick=()=>act(androidAuth.signIn);signOut.onclick=()=>act(androidAuth.signOut);
 const trial=$('activate-secure-trial');
 trial.onclick=async()=>{
  if(!confirm(t('secureTrialTerms')))return;
  trial.disabled=true;
  try{
   if(!androidAuth.configured)throw Error('licenseBackendUnavailable');
   // Legacy records cannot authorize a new server trial. Reconcile administratively first.
   if(globalThis.localStorage.getItem('apartment-booking-manager:access:v1')!==null)throw Error('legacyTrialReview');
   if(!androidAuth.bridge.getCurrentUser())await androidAuth.signIn();
   const verified=await androidAuth.secure.activateTrial();if(!verified||!['TRIAL','PREMIUM'].includes(verified.state))throw Error('licenseBackendUnavailable');render();
  }catch(error){accountStatus(error.message==='legacyTrialReview'?'legacyTrialReview':error.message==='licenseBackendUnavailable'?'licenseBackendUnavailable':'secureTrialError');}
  finally{trial.disabled=false;}
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden)androidAuth.secure.suspend();else androidAuth.secure.read().then(()=>androidAuth.secure.refresh()).then(render).catch(()=>{});});
 window.addEventListener('online',()=>androidAuth.secure.refresh().then(render).catch(()=>{}));
 setInterval(()=>androidAuth.secure.read().then(()=>{renderAccessStatus();if(navigator.onLine)return androidAuth.secure.refresh();}).catch(()=>{}),60000);
 androidAuth.initialize().then(updateAccount).catch(()=>{signIn.disabled=true;accountStatus('authError');});
 updateAccount();
}

// Navigation shortcuts reuse the existing editor, permissions and storage paths.
$('open-menu').onclick=()=>{
 for(const kind of ['apartment','booking'])$('menu-add-'+kind).disabled=$('add-'+kind).disabled;
 $('app-menu').showModal();
};
$('close-menu').onclick=()=>$('app-menu').close();
for(const kind of ['apartment','booking'])$('menu-add-'+kind).onclick=()=>{$('app-menu').close();$('add-'+kind).click();};
