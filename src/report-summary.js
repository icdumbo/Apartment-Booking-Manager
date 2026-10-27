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
