import {dayNumber} from './domain.js?v=0.2.1';
export function calendarYear(start){return new Date(start*86400000).getUTCFullYear();}
export function monthStart(year,month){return dayNumber(`${String(year).padStart(4,'0')}-${String(month+1).padStart(2,'0')}-01`);}
