import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldShowWelcome} from '../src/entry-screen.js';
test('new native user sees the introduction without requiring authentication',()=>{
 assert.equal(shouldShowWelcome({native:true,hasData:false,signedIn:false,dismissed:false}),true);
});
test('existing data, restored session or remembered dismissal skips introduction independently',()=>{
 const base={native:true,hasData:false,signedIn:false,dismissed:false};
 for(const field of ['hasData','signedIn','dismissed'])assert.equal(shouldShowWelcome({...base,[field]:true}),false);
 assert.equal(shouldShowWelcome({...base,native:false}),false);
});
