import {dayNumber} from './domain.js?v=0.2.1';
export function displayDate(iso){dayNumber(iso);return `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}`;}
export function parseDate(text){if(!/^\d{2}\/\d{2}\/\d{4}$/.test(text))throw new Error('Introdu data în format DD/MM/YYYY.');const [d,m,y]=text.split('/');const iso=`${y}-${m}-${d}`;dayNumber(iso);return iso;}
