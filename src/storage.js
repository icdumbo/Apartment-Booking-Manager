import {validateApartment,validateBooking} from './domain.js?v=0.2';
const KEY='apartment-booking-manager:v1';
export function validateState(state) {
  if (state?.version!==1 || !Array.isArray(state.apartments) || !Array.isArray(state.bookings)) throw new Error('Format de date incompatibil.');
  const ids=new Set();
  for (const a of state.apartments) { if (!a.id || ids.has(a.id)) throw new Error('Identificator apartament invalid.'); ids.add(a.id); validateApartment(a); }
  ids.clear();
  for (const b of state.bookings) { if (!b.id || ids.has(b.id)) throw new Error('Identificator rezervare invalid.'); ids.add(b.id); validateBooking(b,state); }
  return state;
}
// Adapter contract: load() -> state | null; save(state) -> void.
// A remote adapter can replace this module without changing domain or timeline rules.
export function createLocalRepository(storage=globalThis.localStorage) {
  return {load(){const raw=storage.getItem(KEY); return raw===null?null:validateState(JSON.parse(raw));},save(state){validateState(state); storage.setItem(KEY,JSON.stringify(state));}};
}
