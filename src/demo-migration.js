import {dayNumber} from './domain.js?v=0.2.1';
const apartments=[['demo-a','Apartament Marina','Strada Exemplu 1','Constanța'],['demo-b','Studio Lumina','Strada Exemplu 2','Lumina'],['demo-c','Apartament Sunset','Strada Exemplu 3','Năvodari']];
const bookings=[['demo-1','demo-a','Client Demo A','confirmed'],['demo-2','demo-a','Client Demo B','confirmed'],['demo-3','demo-b','Client Demo C','confirmed'],['demo-4','demo-c','Client Demo D','confirmed'],['demo-5','demo-b','Client Demo E','unconfirmed'],['demo-6','demo-c','Client Demo F','unconfirmed']];
export function removeOriginalDemo(state){
 if(state.migrations?.originalDemoRemoved)return state;
 // IDs plus original field values; never remove user records just by their name.
 const originalApartments=new Set(state.apartments.filter(a=>apartments.some(([id,name,address,city])=>a.id===id&&a.name===name&&a.address===address&&a.city===city)).map(a=>a.id));
 const offsets={'demo-1':[-2,3],'demo-2':[3,7],'demo-3':[1,5],'demo-4':[7,11],'demo-5':[5,9],'demo-6':[11,16]};
 const anchors=new Map();for(const b of state.bookings){const o=offsets[b.id];if(!o)continue;const anchor=dayNumber(b.checkIn)-o[0];if(dayNumber(b.checkOut)-o[1]===anchor)anchors.set(anchor,(anchors.get(anchor)||0)+1);}
 const ranked=[...anchors].sort((a,b)=>b[1]-a[1]);const originalAnchor=ranked[0]?.[1]>=2&&ranked[0]?.[1]!==ranked[1]?.[1]?ranked[0][0]:null;
 const remaining=state.bookings.filter(b=>!bookings.some(([id,apartmentId,guest,status])=>originalAnchor!==null&&dayNumber(b.checkIn)-offsets[id][0]===originalAnchor&&dayNumber(b.checkOut)-offsets[id][1]===originalAnchor&&b.id===id&&b.apartmentId===apartmentId&&originalApartments.has(apartmentId)&&b.guest===guest&&b.phone==='0700 000 000'&&(b.status??'confirmed')===status));
 return {...state,bookings:remaining,apartments:state.apartments.filter(a=>!originalApartments.has(a.id)||remaining.some(b=>b.apartmentId===a.id)),migrations:{...state.migrations,originalDemoRemoved:true}};
}
