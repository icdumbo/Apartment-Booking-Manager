export const DAY = 86400000;
export function dayNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Data este invalidă.');
  const n = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0,10) !== value) throw new Error('Data este invalidă.');
  return n / DAY;
}
export function isoDay(n) { return new Date(n * DAY).toISOString().slice(0,10); }
export function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function overlaps(a,b) { return a.apartmentId === b.apartmentId && a.checkIn < b.checkOut && b.checkIn < a.checkOut; }
export function validateApartment(a) {
  if (!a.name.trim() || !a.address.trim() || !a.city.trim()) throw new Error('Completează numele, adresa și localitatea.');
}
export function validateBooking(b,state) {
  if (b.status!==undefined && !['confirmed','unconfirmed'].includes(b.status)) throw new Error('Status de rezervare invalid.');
  if (!state.apartments.some(a=>a.id===b.apartmentId)) throw new Error('Selectează un apartament existent.');
  if (!b.guest.trim()) throw new Error('Introdu numele clientului.');
  if (!/^[+\d\s().-]{6,30}$/.test(b.phone) || b.phone.replace(/\D/g,'').length < 6) throw new Error('Introdu un număr de telefon valid (minimum 6 cifre).');
  if (dayNumber(b.checkOut) <= dayNumber(b.checkIn)) throw new Error('Check-out trebuie să fie după check-in.');
  if (state.bookings.some(other=>other.id!==b.id && overlaps(b,other))) throw new Error('Perioada se suprapune cu o rezervare existentă pentru acest apartament.');
}
export function barGeometry(b,start,days) {
  const left = dayNumber(b.checkIn)-start+0.5;
  const right = dayNumber(b.checkOut)-start+0.5;
  if (right<=0 || left>=days) return null;
  return {left:Math.max(0,left),width:Math.min(days,right)-Math.max(0,left)};
}
export function monthSegments(start,days) {
 const segments=[];
 for(let i=0;i<days;i++){const date=isoDay(start+i),key=date.slice(0,7);const previous=segments.at(-1);if(previous?.key===key)previous.days++;else segments.push({key,start:i,days:1});}
 return segments;
}
export function handoverDays(bookings) {
 return [...new Set(bookings.filter(out=>bookings.some(incoming=>incoming.id!==out.id&&incoming.apartmentId===out.apartmentId&&incoming.checkIn===out.checkOut)).map(b=>b.checkOut))].sort();
}
