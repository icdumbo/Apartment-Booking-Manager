import {dayNumber,isoDay,today} from './domain.js?v=0.2.1';
export function demoState() {
 const t=dayNumber(today());
 const apartments=[{id:'demo-a',name:'Apartament Marina',address:'Strada Exemplu 1',city:'Constanța'},{id:'demo-b',name:'Studio Lumina',address:'Strada Exemplu 2',city:'Lumina'},{id:'demo-c',name:'Apartament Sunset',address:'Strada Exemplu 3',city:'Năvodari'}];
 const booking=(id,apartmentId,guest,start,end,status='confirmed')=>({id,apartmentId,guest,phone:'0700 000 000',checkIn:isoDay(t+start),checkOut:isoDay(t+end),status});
 return {version:1,apartments,bookings:[booking('demo-1','demo-a','Client Demo A',-2,3),booking('demo-2','demo-a','Client Demo B',3,7),booking('demo-3','demo-b','Client Demo C',1,5),booking('demo-5','demo-b','Client Demo E',5,9,'unconfirmed'),booking('demo-4','demo-c','Client Demo D',7,11),booking('demo-6','demo-c','Client Demo F',11,16,'unconfirmed')]};
}
