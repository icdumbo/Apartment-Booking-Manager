// Offline booking ledger. Legacy aggregates retain unknown date/method until explicitly detailed.
export const PAYMENT_METHODS=Object.freeze(['cash','card','transfer','other']);
export const canEditPayments=entitlement=>['TRIAL','PREMIUM'].includes(entitlement.state);
export function totalReceived(booking){
 if(booking.payments===undefined)return booking.paidAmountCents??0;
 let total=booking.legacyPaidAmountCents??0;
 for(const payment of booking.payments){total+=payment.amountCents;if(!Number.isSafeInteger(total))throw new Error('invalidAmount');}
 return total;
}
export function validatePayment(payment){
 if(!payment||typeof payment.id!=='string'||!payment.id||!Number.isSafeInteger(payment.amountCents)||payment.amountCents<=0)throw new Error('invalidPayment');
 if(typeof payment.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(payment.date))throw new Error('invalidPaymentDate');
 const time=Date.parse(payment.date+'T00:00:00Z');if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==payment.date)throw new Error('invalidPaymentDate');
 if(!PAYMENT_METHODS.includes(payment.method))throw new Error('invalidPaymentMethod');
 if(payment.notes!==undefined&&(typeof payment.notes!=='string'||payment.notes.length>2000))throw new Error('invalidPaymentNotes');
}
export function validatePaymentHistory(booking){
 if(booking.payments===undefined){if(booking.legacyPaidAmountCents!==undefined)throw new Error('invalidPaymentHistory');return;}
 if(!Array.isArray(booking.payments))throw new Error('invalidPaymentHistory');
 if(booking.legacyPaidAmountCents!==undefined&&(!Number.isSafeInteger(booking.legacyPaidAmountCents)||booking.legacyPaidAmountCents<0))throw new Error('invalidPaymentHistory');
 const ids=new Set();for(const payment of booking.payments){validatePayment(payment);if(ids.has(payment.id))throw new Error('invalidPaymentHistory');ids.add(payment.id);}
 if(booking.paidAmountCents!==totalReceived(booking))throw new Error('invalidPaymentHistory');
}
export function paymentLedger(booking){
 return {payments:structuredClone(booking.payments??[]),legacyPaidAmountCents:booking.payments===undefined?(booking.paidAmountCents??0):(booking.legacyPaidAmountCents??0),paidAmountCents:totalReceived(booking)};
}
export function upsertPayment(booking,payment,{fromLegacy=false}={}){
 validatePayment(payment);const ledger=paymentLedger(booking),index=ledger.payments.findIndex(p=>p.id===payment.id);
 if(fromLegacy){if(index!==-1||payment.amountCents>ledger.legacyPaidAmountCents)throw new Error('legacyPaymentLimit');ledger.legacyPaidAmountCents-=payment.amountCents;}
 if(index===-1)ledger.payments.push({...payment});else ledger.payments[index]={...ledger.payments[index],...payment};
 ledger.paidAmountCents=totalReceived(ledger);
 if(ledger.paidAmountCents>(booking.totalAmountCents??0))throw new Error('paidExceedsTotal');return ledger;
}
export function removePayment(booking,id){const ledger=paymentLedger(booking);ledger.payments=ledger.payments.filter(p=>p.id!==id);ledger.paidAmountCents=totalReceived(ledger);return ledger;}
export function assertPaymentHistoryAccess(before,after,entitlement){
 if(!canEditPayments(entitlement)&&['payments','legacyPaidAmountCents'].some(key=>JSON.stringify(before?.[key])!==JSON.stringify(after[key])))throw new Error('premiumPayments');
}
