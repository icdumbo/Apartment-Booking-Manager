import {barGeometry,dayNumber,isoDay,today} from './domain.js';
export function renderTimeline(root,state,start,days,{editApartment,editBooking,newBooking}) {
 root.replaceChildren(); root.style.setProperty('--days',days);
 const head=document.createElement('div');head.className='timeline-head';
 const corner=document.createElement('div');corner.className='apartment-label corner';corner.textContent='APARTAMENTE';head.append(corner);
 const dates=document.createElement('div');dates.className='day-grid';
 const current=dayNumber(today());
 for(let i=0;i<days;i++){const n=start+i;const date=new Date(n*86400000);const el=document.createElement('div');el.className='day-heading'+(n===current?' current':''); const weekday=document.createElement('small');weekday.textContent=new Intl.DateTimeFormat('ro',{weekday:'short',timeZone:'UTC'}).format(date);const num=document.createElement('strong');num.textContent=date.getUTCDate();el.append(weekday,num);dates.append(el);}head.append(dates);root.append(head);
 for(const a of state.apartments){const row=document.createElement('div');row.className='timeline-row';const label=document.createElement('button');label.className='apartment-label';label.title='Modifică apartamentul';const name=document.createElement('strong');name.textContent=a.name;const address=document.createElement('small');address.textContent=`${a.city} · ${a.address}`;label.append(name,address);label.onclick=()=>editApartment(a);row.append(label);
 const track=document.createElement('div');track.className='track';const cells=document.createElement('div');cells.className='day-grid cells';
 for(let i=0;i<days;i++){const cell=document.createElement('button');cell.className='day-cell'+(start+i===current?' current':'');cell.setAttribute('aria-label',`Adaugă rezervare: ${a.name}, ${isoDay(start+i)}`);cell.onclick=()=>newBooking(a.id,isoDay(start+i));cells.append(cell);}track.append(cells);
 for(const b of state.bookings.filter(b=>b.apartmentId===a.id)){const g=barGeometry(b,start,days);if(!g)continue;const bar=document.createElement('button');bar.className='booking';bar.style.left=`${g.left*64}px`;bar.style.width=`${g.width*64}px`;bar.textContent=b.guest;bar.title=`${b.guest} · ${b.checkIn} → ${b.checkOut} · ${b.phone}`;bar.setAttribute('aria-label',bar.title);bar.onclick=()=>editBooking(b);track.append(bar);}row.append(track);root.append(row);}
 if(!state.apartments.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Adaugă primul apartament pentru a începe.';root.append(empty);}
}
