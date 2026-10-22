import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDate,displayDate} from '../src/date-format.js';
test('all four manual formats normalize to the same genuine calendar date',()=>{
 for(const date of ['29102026','29/10/2026','29.10.2026','29-10-2026',' 29102026 ']){assert.equal(parseDate(date),'2026-10-29');assert.equal(displayDate(parseDate(date)),'29/10/2026');}
 for(const date of ['29022028','29.02.2028','29-02-2000'])assert.ok(parseDate(date));
});
test('impossible dates, non-leap century, partial and mixed formats fail',()=>{
 for(const date of ['31022026','29022027','29/02/1900','31.04.2026','00-10-2026','01/00/2026','01/01/0000','10/29/2026','1/2/2026','29/10-2026','2026-10-29','291026','291020260',null])assert.throws(()=>parseDate(date));
});
