import {dayNumber} from './domain.js?v=0.2.1';
import {bookingCurrency,validateCurrency} from './currency.js';
import {canEditPayments,totalReceived} from './payments.js';
import {bookingBalance} from './booking-values.js';
// Read-only projection: inclusive filter dates, check-out excluded; full current amounts.
export function selectReservationsReport(state,{start,end,apartmentId='',status='all',currency='ALL'},entitlement){
 if(!canEditPayments(entitlement))throw new Error('reportPremium');
 if(currency!=='ALL')validateCurrency(currency);
 let first,last;try{first=dayNumber(start);last=dayNumber(end);}catch{throw new Error('reportInvalidPeriod');}
 if(first>last||!['all','confirmed','unconfirmed'].includes(status))throw new Error('reportInvalidPeriod');
 const apartments=new Map(state.apartments.map(a=>[a.id,a.name]));
 const totalsByCurrency={};
 const result={rows:[],unpricedCount:0,currency,totalsByCurrency};
 function add(group,key,value){group[key]+=value;if(!Number.isSafeInteger(group[key]))throw new Error('collectionOverflow');}
 for(const booking of state.bookings){
  const code=bookingCurrency(booking);validateCurrency(code);
  if((currency!=='ALL'&&code!==currency)||(apartmentId&&booking.apartmentId!==apartmentId)||(status!=='all'&&booking.status!==status)||dayNumber(booking.checkIn)>last||dayNumber(booking.checkOut)<=first)continue;
  const group=totalsByCurrency[code]??= {currency:code,count:0,totalAmountCents:0,receivedAmountCents:0,balanceCents:0,legacyAmountCents:0,unpricedCount:0};group.count++;
  const received=totalReceived(booking),balance=bookingBalance(booking),legacy=booking.payments===undefined?(booking.paidAmountCents??0):(booking.legacyPaidAmountCents??0);
  result.rows.push({bookingId:booking.id,currency:code,guest:booking.guest,apartment:apartments.get(booking.apartmentId)??'',checkIn:booking.checkIn,checkOut:booking.checkOut,nights:dayNumber(booking.checkOut)-dayNumber(booking.checkIn),status:booking.status,totalAmountCents:booking.totalAmountCents,receivedAmountCents:received,balanceCents:balance,legacyAmountCents:legacy});
  add(group,'receivedAmountCents',received);add(group,'legacyAmountCents',legacy);
  if(booking.totalAmountCents===undefined){result.unpricedCount++;group.unpricedCount++;}else{add(group,'totalAmountCents',booking.totalAmountCents);add(group,'balanceCents',balance);}
 }
 if(currency!=='ALL'){const group=totalsByCurrency[currency]?? {currency,count:0,totalAmountCents:0,receivedAmountCents:0,balanceCents:0,legacyAmountCents:0,unpricedCount:0};totalsByCurrency[currency]=group;Object.assign(result,group);}
 result.rows.sort((a,b)=>a.checkIn.localeCompare(b.checkIn)||a.bookingId.localeCompare(b.bookingId));return result;
}
