import {CURRENCIES} from './currency.js';
// Presentation metadata only. Totals remain owned by selectReservationsReport.
export const REPORT_METRICS=[
 ['statisticsBookings','count'],['reportTotal','totalAmountCents'],
 ['reportReceived','receivedAmountCents'],['remainingAmount','balanceCents']
];
export function reportGroups(result){
 const rank=code=>{const index=CURRENCIES.indexOf(code);return index<0?CURRENCIES.length:index;};
 return Object.values(result.totalsByCurrency).sort((a,b)=>rank(a.currency)-rank(b.currency)||a.currency.localeCompare(b.currency));
}
// Group only the already filtered projection; never inspect another owner's amounts/notes.
export function reportApartmentGroups(state,result){
 const bookings=new Map(state.bookings.map(b=>[b.id,b.apartmentId])),groups=new Map();
 for(const row of result.rows){const id=bookings.get(row.bookingId);if(!groups.has(id))groups.set(id,{id,name:row.apartment,totalsByCurrency:{}});const totals=groups.get(id).totalsByCurrency;
  const group=totals[row.currency]??={currency:row.currency,count:0,totalAmountCents:0,receivedAmountCents:0,balanceCents:0};group.count++;
  for(const field of ['totalAmountCents','receivedAmountCents','balanceCents']){group[field]+=row[field]??0;if(!Number.isSafeInteger(group[field]))throw Error('collectionOverflow');}
 }
 return [...groups.values()];
}
