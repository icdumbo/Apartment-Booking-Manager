import test from 'node:test';
import assert from 'node:assert/strict';
import {saveExport} from '../src/file-export.js';
const file={bytes:new Uint8Array([0,1,127,128,255]),filename:'Test.pdf',mimeType:'application/pdf'};
test('Android bridge preserves binary bytes, name and type and awaits a saved result',async()=>{
 let request;const android={getPlatform:()=> 'android',Plugins:{BookingFileExport:{saveFile:async data=>{request=data;return {status:'saved',filename:'Renamed.pdf'};}}}};
 const result=await saveExport(file,android);assert.deepEqual(Buffer.from(request.data,'base64'),Buffer.from(file.bytes));assert.equal(request.filename,file.filename);assert.equal(request.mimeType,file.mimeType);assert.equal(result.filename,'Renamed.pdf');assert.equal(result.status,'saved');
});
test('cancellation is distinct; missing, failing and malformed native adapters reject without web fallback',async()=>{
 assert.equal((await saveExport(file,{getPlatform:()=> 'android',Plugins:{BookingFileExport:{saveFile:async()=>({status:'cancelled'})}}})).status,'cancelled');
 await assert.rejects(saveExport(file,{getPlatform:()=> 'android'}),/exportNativeUnavailable/);
 for(const saveFile of [async()=>{throw Error('native write failed');},async()=>({status:'unexpected'})])await assert.rejects(saveExport(file,{getPlatform:()=> 'android',Plugins:{BookingFileExport:{saveFile}}}));
});
test('large Android files are rejected before sending any native request',async()=>{
 let called=false;await assert.rejects(saveExport({...file,bytes:new Uint8Array(24*1024*1024+1)},{getPlatform:()=> 'android',Plugins:{BookingFileExport:{saveFile:async()=>{called=true;}}}}),/exportFileTooLarge/);assert.equal(called,false);
});
