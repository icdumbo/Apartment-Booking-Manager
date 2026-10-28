// Android returns bytes read under its temporary URI grant, never a filesystem path.
export const MAX_PHOTO_INPUT=20*1024*1024;
const NATIVE_ERRORS=new Set(['photoTooLarge','photoLoadFailed']);
export async function selectAndroidPhoto(capacitor=globalThis.Capacitor){
 const plugin=capacitor?.Plugins?.BookingPhoto;
 if(typeof plugin?.selectPhoto!=='function')throw Error('photoNativeUnavailable');
 let result;
 try{result=await plugin.selectPhoto();}catch(error){throw Error(NATIVE_ERRORS.has(error?.code)?error.code:'photoLoadFailed');}
 if(result?.status==='cancelled')return null;
 if(result?.status!=='selected'||typeof result.data!=='string'||!result.data)throw Error('photoLoadFailed');
 if(result.data.length>4*Math.ceil(MAX_PHOTO_INPUT/3))throw Error('photoTooLarge');
 if(result.data.length%4!==0||/[^A-Za-z0-9+/=]/.test(result.data))throw Error('photoLoadFailed');
 let binary;try{binary=atob(result.data);}catch{throw Error('photoLoadFailed');}
 if(!binary.length)throw Error('photoLoadFailed');if(binary.length>MAX_PHOTO_INPUT)throw Error('photoTooLarge');
 const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Blob([bytes]); // Detect actual image format in the existing preparation pipeline.
}
export async function photoMime(file){
 const h=new Uint8Array(await file.slice(0,64).arrayBuffer());
 const ascii=(start,end)=>String.fromCharCode(...h.subarray(start,end));
 if(h[0]===255&&h[1]===216&&h[2]===255)return 'image/jpeg';
 if(h[0]===137&&ascii(1,4)==='PNG'&&h[4]===13&&h[5]===10&&h[6]===26&&h[7]===10)return 'image/png';
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
 if(ascii(4,8)==='ftyp'){
  const brands=[ascii(8,12)];for(let i=16;i+4<=h.length;i+=4)brands.push(ascii(i,i+4));
  if(brands.some(b=>['avif','avis'].includes(b)))return 'image/avif';
  if(brands.some(b=>['heic','heix','hevc','hevx','mif1','msf1'].includes(b)))return 'image/heif';
 }
 throw Error('photoInvalid');
}
