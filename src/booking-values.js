// Optional booking metadata. Money uses integer bani (RON / 100), never floating-point totals.
export const BOOKING_SOURCES=Object.freeze(['booking','airbnb','direct','other']);
export const BOOKING_EXTRA_FIELDS=Object.freeze(['persons','totalAmountCents','paidAmountCents','source','notes']);
export function parseMoney(value){
 const text=String(value).trim();if(!text)return undefined;
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))throw new Error('invalidAmount');
 const [whole,fraction='']=text.replace(',','.').split('.');
 const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents))throw new Error('invalidAmount');return cents;
}
export function moneyInput(cents){return cents===undefined?'':`${Math.floor(cents/100)}.${String(cents%100).padStart(2,'0')}`;}
export function bookingBalance(booking){return booking.totalAmountCents===undefined?undefined:booking.totalAmountCents-(booking.paidAmountCents??0);}
export function validateBookingExtras(booking){
 for(const key of ['totalAmountCents','paidAmountCents'])if(booking[key]!==undefined&&(!Number.isSafeInteger(booking[key])||booking[key]<0))throw new Error('invalidAmount');
 if((booking.paidAmountCents??0)>(booking.totalAmountCents??0))throw new Error('paidExceedsTotal');
 if(booking.persons!==undefined&&(!Number.isSafeInteger(booking.persons)||booking.persons<1))throw new Error('invalidPersons');
 if(booking.source!==undefined&&!BOOKING_SOURCES.includes(booking.source))throw new Error('invalidSource');
 if(booking.notes!==undefined&&(typeof booking.notes!=='string'||booking.notes.length>4000))throw new Error('invalidNotes');
}
export function readBookingExtras(values){
 const extra={};
 for(const key of ['totalAmountCents','paidAmountCents']){const amount=parseMoney(values[key]??'');if(amount!==undefined)extra[key]=amount;}
 const persons=(values.persons??'').trim();if(persons){if(!/^\d+$/.test(persons))throw new Error('invalidPersons');extra.persons=Number(persons);}
 for(const key of ['source','notes'])if(values[key])extra[key]=values[key];
 validateBookingExtras(extra);return extra;
}
