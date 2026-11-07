import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarYear,monthStart,monthLength} from '../src/month-navigation.js';
import {isoDay,dayNumber} from '../src/domain.js';
test('all twelve month choices start on the first day in the selected year',()=>{for(const year of [2025,2026,2027,2028])for(let month=0;month<12;month++){assert.equal(isoDay(monthStart(year,month)),`${year}-${String(month+1).padStart(2,'0')}-01`);assert.equal(calendarYear(monthStart(year,month)),year);}});
test('calendar year follows navigation across the December/January boundary',()=>{assert.equal(calendarYear(dayNumber('2026-12-31')),2026);assert.equal(calendarYear(dayNumber('2026-12-31')+30),2027);assert.equal(calendarYear(dayNumber('2026-01-01')-30),2025);});

test('month length follows actual dates and Gregorian leap years',()=>{
 for(const [year,month,length] of [[2026,1,28],[2028,1,29],[2100,1,28],[2000,1,29],[2026,6,31],[2026,7,31],[2026,9,31],[2026,10,30],[2026,11,31]])assert.equal(monthLength(year,month),length);
});
