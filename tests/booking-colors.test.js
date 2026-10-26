import test from 'node:test';
import assert from 'node:assert/strict';
import {bookingColor,BOOKING_PALETTE} from '../src/timeline.js';
test('booking colors depend only on stable identity, never status, dates or ordering',()=>{
 const booking={id:'stable-identity',status:'confirmed',checkIn:'2026-10-01'};
 const before=bookingColor(booking.id);
 booking.status='unconfirmed';booking.checkIn='2026-11-01';
 assert.equal(bookingColor(booking.id),before);
 assert.equal(BOOKING_PALETTE.length,8);
 assert.ok(BOOKING_PALETTE.includes(before));
 const colors=Array.from({length:32},(_,i)=>bookingColor(`booking-${i}`));
 assert.equal(new Set(colors).size,8);
 for(let i=1;i<colors.length;i++)assert.notEqual(colors[i],colors[i-1]);
});
