import {dayNumber} from './domain.js?v=0.2.1';
export function displayDate(iso){dayNumber(iso);return `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}`;}
export function parseDate(text){
 const match=typeof text==='string'?text.trim().match(/^(\d{2})([/.-]?)(\d{2})\2(\d{4})$/):null;
 if(!match)throw new Error('Introdu data în format DD/MM/YYYY.');
 const [,d,,m,y]=match,iso=`${y}-${m}-${d}`;
 if(Number(y)===0)throw new Error('Data este invalidă.');dayNumber(iso);return iso;
}
