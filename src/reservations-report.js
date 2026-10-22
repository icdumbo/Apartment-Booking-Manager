import {dayNumber} from './domain.js?v=0.2.1';
import {bookingCurrency,validateCurrency} from './currency.js';
import {canEditPayments,totalReceived} from './payments.js';
import {bookingBalance} from './booking-values.js';
// Read-only projection: inclusive filter dates, check-out excluded; full current amounts.
export function selectReservationsReport(state,{start,end,apartmentId='',status='all',currency='RON'},entitlement){
 if(!canEditPayments(entitlement))throw new Error('reportPremium');
 validateCurrency(currency);
 let first,last;try{first=dayNumber(start);last=dayNumber(end);}catch{throw new Error('reportInvalidPeriod');}
 if(first>last||!['all','confirmed','unconfirmed'].includes(status))throw new Error('reportInvalidPeriod');
 const apartments=new Map(state.apartments.map(a=>[a.id,a.name]));
 const result={rows:[],totalAmountCents:0,receivedAmountCents:0,balanceCents:0,legacyAmountCents:0,unpricedCount:0,currency};
 function add(key,value){result[key]+=value;if(!Number.isSafeInteger(result[key]))throw new Error('collectionOverflow');}
 for(const booking of state.bookings){
  if(bookingCurrency(booking)!==currency||(apartmentId&&booking.apartmentId!==apartmentId)||(status!=='all'&&booking.status!==status)||dayNumber(booking.checkIn)>last||dayNumber(booking.checkOut)<=first)continue;
  const received=totalReceived(booking),balance=bookingBalance(booking),legacy=booking.payments===undefined?(booking.paidAmountCents??0):(booking.legacyPaidAmountCents??0);
  result.rows.push({bookingId:booking.id,guest:booking.guest,apartment:apartments.get(booking.apartmentId)??'',checkIn:booking.checkIn,checkOut:booking.checkOut,nights:dayNumber(booking.checkOut)-dayNumber(booking.checkIn),status:booking.status,totalAmountCents:booking.totalAmountCents,receivedAmountCents:received,balanceCents:balance,legacyAmountCents:legacy});
  add('receivedAmountCents',received);add('legacyAmountCents',legacy);
  if(booking.totalAmountCents===undefined)result.unpricedCount++;else{add('totalAmountCents',booking.totalAmountCents);add('balanceCents',balance);}
 }
 result.rows.sort((a,b)=>a.checkIn.localeCompare(b.checkIn)||a.bookingId.localeCompare(b.bookingId));return result;
}
