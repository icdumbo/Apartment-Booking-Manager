import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarYear,monthStart} from '../src/month-navigation.js';
import {isoDay,dayNumber} from '../src/domain.js';
test('all twelve month choices start on the first day in the selected year',()=>{for(const year of [2025,2026,2027,2028])for(let month=0;month<12;month++){assert.equal(isoDay(monthStart(year,month)),`${year}-${String(month+1).padStart(2,'0')}-01`);assert.equal(calendarYear(monthStart(year,month)),year);}});
test('calendar year follows navigation across the December/January boundary',()=>{assert.equal(calendarYear(dayNumber('2026-12-31')),2026);assert.equal(calendarYear(dayNumber('2026-12-31')+30),2027);assert.equal(calendarYear(dayNumber('2026-01-01')-30),2025);});
