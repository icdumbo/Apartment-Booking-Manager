// Transport only: generators and report data stay unchanged.
export async function saveExport({bytes,filename,mimeType},capacitor=globalThis.Capacitor){
 if(capacitor?.getPlatform?.()==='android'){
  const plugin=capacitor.Plugins?.BookingFileExport;
  if(typeof plugin?.saveFile!=='function')throw new Error('exportNativeUnavailable');
  if(bytes.length>24*1024*1024)throw new Error('exportFileTooLarge');
  let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  const result=await plugin.saveFile({data:btoa(binary),filename,mimeType});
  if(!['saved','cancelled'].includes(result?.status))throw new Error('exportSaveFailed');
  return {...result,filename:result.filename||filename};
 }
 const url=URL.createObjectURL(new Blob([bytes],{type:mimeType})),link=document.createElement('a');
 link.href=url;link.download=filename;document.body.append(link);
 try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 // A browser download has been requested; only Android confirms a completed write.
 return {status:'started',filename};
}
