import {assertCurrencyChange} from './currency.js';
import {t} from './i18n.js?v=0.3.1';
import {displayDate,parseDate} from './date-format.js?v=0.2.5';
import {parseMoney,formatMoney,moneyInput} from './booking-values.js';
import {PAYMENT_METHODS,paymentLedger,upsertPayment,removePayment} from './payments.js';
export function renderPaymentHistory(container,{booking,canManage,onChange,getTotal,getPaid,getCurrency}){
 let draft=structuredClone(booking??{}),changed=false,editingId=null,fromLegacy=false;
 const section=document.createElement('fieldset');section.className='payment-history';
 function text(tag,key,parent=section){const el=document.createElement(tag);el.dataset.i18n=key;el.textContent=t(key);parent.append(el);return el;}
 text('legend','paymentHistory');const legacy=text('p','legacyPayments');const access=text('p','premiumPayments');
 const list=document.createElement('div');list.className='payment-list';section.append(list);
 const commands=document.createElement('div');commands.className='payment-commands';section.append(commands);
 function button(key,parent,click){const el=text('button',key,parent);el.type='button';el.onclick=click;return el;}
 const add=button('addPayment',commands,()=>start(false)),convert=button('detailLegacyPayment',commands,()=>start(true));
 const form=document.createElement('div');form.className='payment-entry';form.hidden=true;section.append(form);
 function input(key,type='text'){
  const label=text('label',key,form),span=document.createElement('span');span.dataset.i18n=key;span.textContent=t(key);label.removeAttribute('data-i18n');label.replaceChildren(span);
  const control=document.createElement(type==='select'?'select':type==='textarea'?'textarea':'input');if(type==='text')control.type='text';control.dataset.paymentField=key;
  if(key==='paymentAmount'){control.inputMode='decimal';control.maxLength=18;}if(key==='paymentDate'){control.placeholder='DD/MM/YYYY';control.maxLength=10;}
  if(type==='textarea'){control.maxLength=2000;control.rows=2;}label.append(control);return control;
 }
 const date=input('paymentDate'),amount=input('paymentAmount'),method=input('paymentMethod','select'),notes=input('paymentNotes','textarea');
 for(const value of ['',...PAYMENT_METHODS]){const option=document.createElement('option');option.value=value;option.dataset.i18n=value?'method_'+value:'choosePaymentMethod';option.textContent=t(option.dataset.i18n);method.append(option);}
 const mode=text('p','newPaymentHint',form),error=document.createElement('p');error.className='payment-error';error.setAttribute('role','alert');form.append(error);
 const apply=button('savePayment',form,()=>{
  try{
   requireAccess();const value=parseMoney(amount.value);const payment={id:editingId??crypto.randomUUID(),date:parseDate(date.value),amountCents:value,method:method.value,notes:notes.value.trim()};
   draft={...draft,currency:getCurrency(),...upsertPayment(current(),payment,{fromLegacy})};changed=true;form.hidden=true;notify();
  }catch(reason){error.dataset.i18n=reason.message==='Introdu data în format DD/MM/YYYY.'||reason.message==='Data este invalidă.'?'invalidPaymentDate':reason.message;error.textContent=t(error.dataset.i18n);}
 });
 button('cancel',form,()=>{form.hidden=true;});
 function current(){return {...draft,currency:getCurrency(),totalAmountCents:getTotal(),...(draft.payments===undefined?{paidAmountCents:getPaid()}: {})};}
 function validateCurrencySelection(){assertCurrencyChange(draft,{...draft,currency:getCurrency()});}
 function requireAccess(){if(!canManage())throw new Error('premiumPayments');validateCurrencySelection();}
 function start(legacyMode,payment){
  if(!canManage())return;editingId=payment?.id??null;fromLegacy=legacyMode;
  date.value=payment?displayDate(payment.date):'';amount.value=payment?moneyInput(payment.amountCents):legacyMode?moneyInput(paymentLedger(draft.payments===undefined?{...draft,paidAmountCents:getPaid()}:draft).legacyPaidAmountCents):'';method.value=payment?.method??'';notes.value=payment?.notes??'';error.textContent='';error.removeAttribute('data-i18n');mode.dataset.i18n=legacyMode?'legacyPaymentHint':'newPaymentHint';mode.textContent=t(mode.dataset.i18n);form.hidden=false;
 }
 function notify(){refresh();onChange(draft);}
 function refresh(){
  const allowed=canManage();let aggregate;try{aggregate=getPaid();}catch{aggregate=undefined;}
  const ledger=paymentLedger(draft.payments===undefined?{...draft,paidAmountCents:aggregate}:draft);
  amount.setAttribute('aria-label',t('paymentAmountCurrency',{currency:getCurrency()}));amount.parentElement.querySelector('span').textContent=t('paymentAmountCurrency',{currency:getCurrency()});
  legacy.hidden=ledger.legacyPaidAmountCents<=0;legacy.textContent=t('legacyPayments',{amount:formatMoney(ledger.legacyPaidAmountCents,getCurrency())});access.hidden=allowed;
  add.disabled=convert.disabled=apply.disabled=!allowed;convert.hidden=ledger.legacyPaidAmountCents<=0;
  for(const control of form.querySelectorAll('input,select,textarea'))control.disabled=!allowed;
  list.replaceChildren();
  if(!ledger.payments.length)text('p','noPayments',list);
  for(const payment of ledger.payments){
   const row=document.createElement('div');row.className='payment-row';const description=document.createElement('span');description.textContent=`${displayDate(payment.date)} · ${t('method_'+payment.method)}`;
   const sum=document.createElement('strong');sum.textContent=formatMoney(payment.amountCents,getCurrency());row.append(description,sum);
   if(payment.notes){const note=document.createElement('p');note.textContent=payment.notes;row.append(note);}
   const edit=button('editPayment',row,()=>start(false,payment));edit.disabled=!allowed;
   const remove=button('delete',row,()=>{
    if(!canManage())return;
    if(remove.dataset.confirm!=='yes'){remove.dataset.confirm='yes';remove.textContent=t('confirmPaymentDelete');return;}
    draft={...draft,...removePayment(draft,payment.id)};changed=true;form.hidden=true;notify();
   });remove.disabled=!allowed;list.append(row);
  }
 }
 container.append(section);refresh();
 return {refresh,validateCurrency:validateCurrencySelection,getLedger(){if(changed)return paymentLedger(draft);return draft.payments===undefined?{}:{payments:structuredClone(draft.payments),paidAmountCents:draft.paidAmountCents,...(draft.legacyPaidAmountCents===undefined?{}:{legacyPaidAmountCents:draft.legacyPaidAmountCents})};},hasPendingEntry(){return !form.hidden;}};
}
