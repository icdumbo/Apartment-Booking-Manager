import {ownerFixture} from './owners.mjs';
export function maintenanceExportFixture(){
 const fixture=ownerFixture(),data=fixture.maintenance;
 Object.assign(data.works[0],{status:'completed',scheduledDate:'2026-10-02',completedDate:'2026-10-11',actualCents:1000,estimatedCents:1500,provider:'Furnizor Test Ștefan',notes:'Notă lucrare legată'});
 Object.assign(data.works[1],{currency:'EUR',actualCents:2500,estimatedCents:3000});
 Object.assign(data.works[2],{actualCents:9000,notes:'EXCLUDED_MAINTENANCE_NOTE'});delete data.works[3].actualCents;
 data.expenses.push({id:'linked-a',workId:data.works[0].id,apartmentId:'a',description:'Linked cost A',date:'2026-10-11',amountCents:1000,currency:'RON',category:'repairs'});
 data.expenses.push({id:'eur-b',apartmentId:'b',description:'EUR expense B',date:'2026-10-12',amountCents:2000,currency:'EUR',category:'repairs'});
 return {state:fixture.business,data};
}
