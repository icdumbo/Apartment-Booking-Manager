import {displayDate,parseDate} from './date-format.js?v=0.2.5';
// Normalize complete valid input only; leave incomplete/invalid text for translated validation.
export function configureDateInput(input){
 input.placeholder='DD/MM/YYYY';input.inputMode='numeric';input.maxLength=10;
 const normalize=()=>{try{input.value=displayDate(parseDate(input.value));}catch{}};
 input.addEventListener('input',normalize);input.addEventListener('blur',normalize);
}
