import {binary64,decode64} from './backup.js';
const CHUNK=48*1024;
function native(capacitor,methods){const plugin=capacitor?.Plugins?.BookingBackup;if(!plugin||methods.some(method=>typeof plugin[method]!=='function'))throw Error('backupNativeUnavailable');return plugin;}
function error(e,fallback){const key=e?.code??e?.message;return Error(['backupSpace','backupBusy','backupChanged','backupNativeUnavailable'].includes(key)?key:fallback);}
export async function saveBackup(snapshot,filename,capacitor=globalThis.Capacitor){
 if(capacitor?.getPlatform?.()==='android'){
  const plugin=native(capacitor,['beginExport','appendExport','finishExport','abortExport']);let handle;
  try{const start=await plugin.beginExport({filename,size:snapshot.size});if(start?.status==='cancelled')return {status:'cancelled'};if(start?.status!=='ready'||typeof start.handle!=='string')throw Error();handle=start.handle;
   for await(const part of snapshot.chunks())for(let offset=0;offset<part.length;offset+=CHUNK)await plugin.appendExport({handle,data:binary64(part.subarray(offset,offset+CHUNK))});
   const result=await plugin.finishExport({handle});if(result?.status!=='saved')throw Error();return result;
  }catch(e){if(handle)await plugin.abortExport({handle}).catch(()=>{});throw error(e,'backupWriteFailed');}
 }
 // Browsers without a user-selected streaming file sink require a Blob for download.
 const parts=[];for await(const chunk of snapshot.chunks())parts.push(chunk);const blob=new Blob(parts,{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}return {status:'started'};
}
export async function openNativeBackup(capacitor=globalThis.Capacitor){
 const plugin=native(capacitor,['selectBackup','readChunk','closeImport']);let picked;try{picked=await plugin.selectBackup();}catch(e){throw error(e,'backupReadFailed');}
 if(picked?.status==='cancelled')return null;if(picked?.status!=='selected'||typeof picked.handle!=='string'||!Number.isSafeInteger(picked.size)||picked.size<=0)throw Error('backupReadFailed');
 const handle=picked.handle;
 return {async *[Symbol.asyncIterator](){let offset=0;try{while(offset<picked.size){const result=await plugin.readChunk({handle,offset});const bytes=decode64(result.data,CHUNK);if(offset+bytes.length>picked.size||Boolean(result.done)!==(offset+bytes.length===picked.size))throw Error();offset+=bytes.length;yield bytes;}}catch(e){throw error(e,'backupReadFailed');}finally{await plugin.closeImport({handle}).catch(()=>{});}}};
}
