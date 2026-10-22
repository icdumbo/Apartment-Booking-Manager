// A reservation owns its currency; payment amounts inherit it. No exchange rates or conversion.
export const CURRENCIES=Object.freeze(['RON','EUR']);
export const bookingCurrency=booking=>booking?.currency===undefined?'RON':booking.currency;
export function validateCurrency(currency){if(!CURRENCIES.includes(currency))throw new Error('invalidCurrency');}
export const hasRecordedPayments=booking=>Boolean(booking?.payments?.length||(booking?.paidAmountCents??0)>0||(booking?.legacyPaidAmountCents??0)>0);
export function assertCurrencyChange(before,after){
 validateCurrency(bookingCurrency(after));
 if(hasRecordedPayments(before)&&bookingCurrency(before)!==bookingCurrency(after))throw new Error('currencyLocked');
}
