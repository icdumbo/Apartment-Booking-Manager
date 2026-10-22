import {bookingCurrency,validateCurrency} from './currency.js';
import {totalReceived,validatePaymentHistory} from './payments.js';
// Optional booking metadata. Money uses integer minor units (RON bani / EUR cents), never floating-point totals.
export const BOOKING_SOURCES=Object.freeze(['booking','airbnb','direct','other']);
export const BOOKING_EXTRA_FIELDS=Object.freeze(['persons','totalAmountCents','paidAmountCents','source','notes','currency']);
export function parseMoney(value){
 const text=String(value).trim();if(!text)return undefined;
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))throw new Error('invalidAmount');
 const [whole,fraction='']=text.replace(',','.').split('.');
 const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents))throw new Error('invalidAmount');return cents;
}
export function moneyInput(cents){return cents===undefined?'':`${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`;}
// Display currency consistently in both UI languages; input parsing remains locale-neutral.
export function formatMoney(cents,currency='RON'){
 validateCurrency(currency);
 if(cents===undefined)return '—';
 const [whole,fraction]=moneyInput(cents).split('.');
 return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${fraction} ${currency}`;
}
export const formatRON=cents=>formatMoney(cents,'RON');
export function bookingBalance(booking){return booking.totalAmountCents===undefined?undefined:booking.totalAmountCents-totalReceived(booking);}
export function validateBookingExtras(booking){
 validateCurrency(bookingCurrency(booking));
 validatePaymentHistory(booking);
 for(const key of ['totalAmountCents','paidAmountCents'])if(booking[key]!==undefined&&(!Number.isSafeInteger(booking[key])||booking[key]<0))throw new Error('invalidAmount');
 if((booking.paidAmountCents??0)>(booking.totalAmountCents??0))throw new Error('paidExceedsTotal');
 if(booking.persons!==undefined&&(!Number.isSafeInteger(booking.persons)||booking.persons<1))throw new Error('invalidPersons');
 if(booking.source!==undefined&&!BOOKING_SOURCES.includes(booking.source))throw new Error('invalidSource');
 if(booking.notes!==undefined&&(typeof booking.notes!=='string'||booking.notes.length>4000))throw new Error('invalidNotes');
}
export function readBookingExtras(values){
 const extra={};if(values.currency!==undefined)extra.currency=values.currency;
 for(const key of ['totalAmountCents','paidAmountCents']){const amount=parseMoney(values[key]??'');if(amount!==undefined)extra[key]=amount;}
 const persons=(values.persons??'').trim();if(persons){if(!/^\d+$/.test(persons))throw new Error('invalidPersons');extra.persons=Number(persons);}
 for(const key of ['source','notes'])if(values[key])extra[key]=values[key];
 validateBookingExtras(extra);return extra;
}
