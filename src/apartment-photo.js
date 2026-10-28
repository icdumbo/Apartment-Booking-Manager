import {selectAndroidPhoto,photoMime,MAX_PHOTO_INPUT} from './photo-picker.js';
import {t} from './i18n.js?v=0.3.1';
const MAX_INPUT=MAX_PHOTO_INPUT,MAX_STORED=512*1024;
let connection;
function database(){
 if(connection)return connection;
 connection=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(Error('photoStorageFailed'));return;}
  const request=indexedDB.open('apartment-booking-manager:photos',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('photos');
  request.onerror=()=>reject(Error('photoStorageFailed'));
  request.onblocked=()=>reject(Error('photoStorageFailed'));
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=undefined;};resolve(db);};
 }).catch(error=>{connection=undefined;throw error;});
 return connection;
}
async function operation(mode,action){
 try{
  const db=await database();
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction('photos',mode),request=action(tx.objectStore('photos'));let result;
   request.onsuccess=()=>{result=request.result;};
   tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('photoStorageFailed'));
  });
 }catch{throw Error('photoStorageFailed');}
}
export const apartmentPhotos={
 read:id=>operation('readonly',store=>store.get(id)),
 write:blob=>{const id=crypto.randomUUID();return operation('readwrite',store=>store.put(blob,id)).then(()=>id);},
 remove:id=>id?operation('readwrite',store=>store.delete(id)):Promise.resolve()
};
// All saved images are local, bounded JPEG blobs. No external or temporary URL is persisted.
export async function prepareApartmentPhoto(file){
 if(!file?.size)throw Error('photoInvalid');if(file.size>MAX_INPUT)throw Error('photoTooLarge');
 // Document providers may omit MIME or label JPEG/PNG as application/octet-stream.
 // Validate bytes rather than trusting metadata or the filename; SVG stays rejected.
 const mime=await photoMime(file);file=new Blob([file],{type:mime});
 let image,url;
 try{
  if(globalThis.createImageBitmap)image=await createImageBitmap(file,{imageOrientation:'from-image'});
  else{url=URL.createObjectURL(file);image=new Image();image.src=url;await image.decode();}
  const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
  if(!width||!height||width*height>64000000)throw Error('photoTooLarge');
  const scale=Math.min(1,1280/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
  const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.82,.65,.45]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size<=MAX_STORED)return blob;}
  throw Error('photoTooLarge');
 }catch(error){throw Error(error.message==='photoTooLarge'?'photoTooLarge':'photoInvalid');}
 finally{image?.close?.();if(url)URL.revokeObjectURL(url);}
}
export function paintApartmentPhoto(node,id){
 let active=true,url;
 node.classList.remove('has-photo');node.textContent=t('noPhoto');
 if(id)apartmentPhotos.read(id).then(blob=>{
  if(!active||!node.isConnected)return;
  if(!(blob instanceof Blob)||blob.type!=='image/jpeg'){node.textContent=t('photoUnavailable');return;}
  url=URL.createObjectURL(blob);const image=document.createElement('img');image.src=url;image.alt=t('apartmentPhoto');node.replaceChildren(image);node.classList.add('has-photo');
 }).catch(()=>{if(active&&node.isConnected)node.textContent=t('photoUnavailable');});
 return ()=>{active=false;if(url)URL.revokeObjectURL(url);};
}
export function createApartmentPhotoEditor(root,originalId,{canManage,onBusy}){
 const section=document.createElement('section');section.className='apartment-photo-editor';root.prepend(section);
 const heading=document.createElement('strong');heading.dataset.i18n='apartmentPhoto';heading.textContent=t('apartmentPhoto');
 const preview=document.createElement('div');preview.className='apartment-photo apartment-photo-preview';
 const commands=document.createElement('div');commands.className='photo-commands';
 const select=document.createElement('button');select.type='button';select.id='select-apartment-photo';
 const remove=document.createElement('button');remove.type='button';remove.id='remove-apartment-photo';remove.dataset.i18n='photoRemove';remove.textContent=t('photoRemove');
 const input=document.createElement('input');input.type='file';input.id='apartment-photo-file';input.accept='image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif';input.hidden=true;input.setAttribute('aria-label',t('photoSelect'));
 const message=document.createElement('p');message.className='photo-message';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 commands.append(select,remove,input);section.append(heading,preview,commands,message);
 let id=originalId,blob,busy=false,active=true,statusKey='',previewURL,disposeView=()=>{};
 function status(key,error=false){statusKey=key;message.textContent=key?t(key):'';message.classList.toggle('photo-error',error);}
 function refresh(){
  select.dataset.i18n=id||blob?'photoReplace':'photoSelect';select.textContent=t(select.dataset.i18n);
  select.disabled=busy||!canManage();remove.hidden=!id&&!blob;remove.disabled=busy||!canManage();input.disabled=busy||!canManage();input.setAttribute('aria-label',t('photoSelect'));
  if(statusKey)message.textContent=t(statusKey);const image=preview.querySelector('img');if(image)image.alt=t('apartmentPhoto');else if(!id&&!blob)preview.textContent=t('noPhoto');
 }
 function show(){
  disposeView();if(previewURL){URL.revokeObjectURL(previewURL);previewURL=undefined;}
  if(blob){previewURL=URL.createObjectURL(blob);const image=document.createElement('img');image.src=previewURL;image.alt=t('apartmentPhoto');preview.replaceChildren(image);preview.classList.add('has-photo');}
  else disposeView=paintApartmentPhoto(preview,id);
  refresh();
 }
 async function receive(source){
  if(busy||!canManage())return;
  busy=true;onBusy(true);status('photoProcessing');refresh();
  try{const file=await source();if(!file){if(active)status('photoCancelled');return;}const next=await prepareApartmentPhoto(file);if(active&&canManage()){blob=next;id=undefined;status('photoPending');show();}}
  catch(error){if(active)status(['photoTooLarge','photoInvalid','photoNativeUnavailable'].includes(error.message)?error.message:'photoLoadFailed',true);}
  finally{busy=false;input.value='';if(active){onBusy(false);refresh();}}
 }
 select.onclick=()=>{
  if(busy||!canManage())return;
  if(globalThis.Capacitor?.getPlatform?.()==='android')receive(()=>selectAndroidPhoto());
  else{input.value='';input.click();}
 };
 input.onchange=()=>{const file=input.files?.[0];if(file)receive(()=>file);};
 remove.onclick=()=>{if(busy||!canManage())return;blob=undefined;id=undefined;status('photoPending');show();};
 show();
 return {
  refresh,isBusy:()=>busy,
  async prepare(){if(busy)throw Error('photoProcessing');if(blob)return {id:await apartmentPhotos.write(blob),created:true};return {id,created:false};},
  async rollback(prepared){if(prepared?.created)await apartmentPhotos.remove(prepared.id).catch(()=>{});},
  async committed(prepared){if(originalId&&originalId!==prepared.id)await apartmentPhotos.remove(originalId).catch(()=>{});},
  dispose(){active=false;disposeView();if(previewURL)URL.revokeObjectURL(previewURL);}
 };
}
