import {dayNumber,DAY} from './domain.js?v=0.2.1';
import {canEditPayments} from './payments.js';
import {bookingCurrency,validateCurrency} from './currency.js';
import {bookingBalance} from './booking-values.js';
function addMoney(total,amount){const result=total+amount;if(!Number.isSafeInteger(result))throw new Error('collectionOverflow');return result;}
// Read-only projection of existing bookings. Never stores, migrates or duplicates receipts.
export function selectCollections(state,{year,month,apartmentId='',currency='RON'},entitlement){
 if(!canEditPayments(entitlement))throw new Error('premiumPayments');
 validateCurrency(currency);
 if(!Number.isInteger(year)||year<1||year>9999||!Number.isInteger(month)||month<1||month>12)throw new Error('invalidCollectionPeriod');
 const start=dayNumber(`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}-01`),endDate=new Date(start*DAY);endDate.setUTCMonth(endDate.getUTCMonth()+1);const end=endDate.getTime()/DAY;
 const apartments=new Map(state.apartments.map(a=>[a.id,a]));
 const rows=[],legacy=[];let receivedAmountCents=0,outstandingAmountCents=0,legacyAmountCents=0,unpricedStays=0;
 for(const booking of state.bookings){
  if(bookingCurrency(booking)!==currency||(apartmentId&&booking.apartmentId!==apartmentId))continue;
  const apartment=apartments.get(booking.apartmentId);
  for(const payment of booking.payments??[]){
   const date=dayNumber(payment.date);if(date<start||date>=end)continue;
   rows.push({bookingId:booking.id,guest:booking.guest,apartmentId:booking.apartmentId,apartment:apartment?.name??'',payment});receivedAmountCents=addMoney(receivedAmountCents,payment.amountCents);
  }
  const unresolved=booking.payments===undefined?(booking.paidAmountCents??0):(booking.legacyPaidAmountCents??0);
  if(unresolved>0){legacy.push({bookingId:booking.id,guest:booking.guest,apartment:apartment?.name??'',amountCents:unresolved});legacyAmountCents=addMoney(legacyAmountCents,unresolved);}
  if(dayNumber(booking.checkIn)<end&&dayNumber(booking.checkOut)>start){const balance=bookingBalance(booking);if(balance===undefined)unpricedStays++;else outstandingAmountCents=addMoney(outstandingAmountCents,balance);}
 }
 rows.sort((a,b)=>b.payment.date.localeCompare(a.payment.date)||a.bookingId.localeCompare(b.bookingId)||a.payment.id.localeCompare(b.payment.id));
 return {currency,rows,paymentCount:rows.length,receivedAmountCents,outstandingAmountCents,unpricedStays,legacy,legacyAmountCents};
}
