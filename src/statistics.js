import {dayNumber,DAY} from './domain.js?v=0.2.1';
import {canEditPayments} from './payments.js';
import {bookingCurrency,validateCurrency} from './currency.js';
import {selectCollections} from './collections.js';
function add(total,value){const result=total+value;if(!Number.isSafeInteger(result))throw new Error('collectionOverflow');return result;}
function roundRatio(amount,numerator,denominator){return Number((BigInt(amount)*BigInt(numerator)+BigInt(denominator)/2n)/BigInt(denominator));}
function bounds(year,month){const start=dayNumber(`${String(year).padStart(4,'0')}-${String(month??1).padStart(2,'0')}-01`),date=new Date(start*DAY);if(month)date.setUTCMonth(date.getUTCMonth()+1);else date.setUTCFullYear(date.getUTCFullYear()+1);return {start,end:date.getTime()/DAY};}
function unionNights(intervals){let nights=0;for(const entries of intervals.values()){entries.sort((a,b)=>a[0]-b[0]);let start,end;for(const [a,b] of entries){if(end===undefined||a>end){if(end!==undefined)nights+=end-start;start=a;end=b;}else end=Math.max(end,b);}if(end!==undefined)nights+=end-start;}return nights;}
// Read-only metrics from current booking and payment records; no financial cache or migration.
export function selectStatistics(state,{year,month,mode='monthly',apartmentId='',currency='RON'},entitlement){
 if(!canEditPayments(entitlement))throw new Error('statisticsPremium');
 if(!['monthly','annual','comparison'].includes(mode)||!Number.isInteger(year)||year<1||year>9999||!Number.isInteger(month)||month<1||month>12)throw new Error('invalidCollectionPeriod');validateCurrency(currency);
 const apartmentIds=new Set(state.apartments.filter(a=>!apartmentId||a.id===apartmentId).map(a=>a.id)),bookings=state.bookings.filter(b=>apartmentIds.has(b.apartmentId));
 function metrics(periodYear,periodMonth){
  const {start,end}=bounds(periodYear,periodMonth),intervals=new Map(),pricedIntervals=new Map(),seen=new Set();let bookingCount=0,pricedCount=0,unpricedCount=0,fullValue=0,allocatedValue=0,noHistoryValue=0,noHistoryCount=0;
  for(const booking of bookings){
   if(seen.has(booking.id))continue;seen.add(booking.id);const checkIn=dayNumber(booking.checkIn),checkOut=dayNumber(booking.checkOut),a=Math.max(start,checkIn),b=Math.min(end,checkOut);if(b<=a)continue;
   bookingCount++;if(!intervals.has(booking.apartmentId))intervals.set(booking.apartmentId,[]);intervals.get(booking.apartmentId).push([a,b]);
   if(bookingCurrency(booking)!==currency)continue;
   if(booking.totalAmountCents===undefined){unpricedCount++;continue;}
   pricedCount++;fullValue=add(fullValue,booking.totalAmountCents);allocatedValue=add(allocatedValue,roundRatio(booking.totalAmountCents,b-a,checkOut-checkIn));
   if(!pricedIntervals.has(booking.apartmentId))pricedIntervals.set(booking.apartmentId,[]);pricedIntervals.get(booking.apartmentId).push([a,b]);
   if(!booking.payments?.length){noHistoryCount++;noHistoryValue=add(noHistoryValue,booking.totalAmountCents);}
  }
  let receivedAmountCents=0,paymentCount=0,legacyAmountCents=0;
  for(const m of periodMonth?[periodMonth]:Array.from({length:12},(_,i)=>i+1)){
   const receipts=selectCollections(state,{year:periodYear,month:m,apartmentId,currency},entitlement);receivedAmountCents=add(receivedAmountCents,receipts.receivedAmountCents);paymentCount+=receipts.paymentCount;legacyAmountCents=receipts.legacyAmountCents;
  }
  const occupiedNights=unionNights(intervals),pricedNights=unionNights(pricedIntervals),capacity=(end-start)*apartmentIds.size;
  return {occupiedNights,bookingCount,capacity,availableNights:Math.max(0,capacity-occupiedNights),occupancy:capacity?occupiedNights/capacity*100:0,averageStay:bookingCount?occupiedNights/bookingCount:0,receivedAmountCents,paymentCount,averageNightValueCents:pricedNights?roundRatio(allocatedValue,1,pricedNights):undefined,averageBookingValueCents:pricedCount?roundRatio(fullValue,1,pricedCount):undefined,pricedCount,unpricedCount,noHistoryValue,noHistoryCount,legacyAmountCents,hasData:bookingCount>0||paymentCount>0};
 }
 const series=Array.from({length:12},(_,index)=>({month:index+1,...metrics(year,index+1)}));
 const current=mode==='annual'?metrics(year):series[month-1];
 const previousSeries=mode==='comparison'&&year>1?Array.from({length:12},(_,index)=>({month:index+1,...metrics(year-1,index+1)})):null;
 return {currency,year,month,mode,apartmentCount:apartmentIds.size,current,series,previous:previousSeries?.[month-1]??null,previousSeries};
}
