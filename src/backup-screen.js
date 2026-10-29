import {prepareBackupExport,parseBackup,restoreBackup,backupCounts,disposeBackup} from './backup.js';
import {saveBackup,openNativeBackup} from './backup-io.js';
import {t,translateError} from './i18n.js?v=0.3.1';
export function createBackupScreen({root,ready=()=>true,reload=()=>location.reload()}){
 let candidate=null,busy=false,messageKey='',filename='';
 const text=(tag,key,parent=root)=>{const el=document.createElement(tag);el.textContent=t(key);parent.append(el);return el;};
 function notice(key){messageKey=key;const status=root.querySelector('.backup-status');if(status)status.textContent=t(key,{filename});}
 function error(reason){const key=reason?.message;notice(key?.startsWith('backup')?key:'backupOperationFailed');}
 async function run(action){if(busy)return;if(!ready()){notice('backupRecoveryFailed');return;}busy=true;render();try{await action();}catch(reason){error(reason);}finally{busy=false;render();}}
 async function receive(bytes){if(candidate)await disposeBackup(candidate);candidate=null;candidate=await parseBackup(bytes);notice('backupValidated');}
 function render(){
  root.replaceChildren();text('p','backupScope');text('p','backupPrivate');
  const actions=document.createElement('div');actions.className='backup-actions';root.append(actions);
  const exportButton=text('button','backupExport',actions);exportButton.type='button';exportButton.disabled=busy;
  exportButton.onclick=()=>run(async()=>{notice('backupWorking');const snapshot=await prepareBackupExport();filename='Apartment-Booking-Manager-'+new Date().toISOString().slice(0,10)+'.abmbackup.json';const result=await saveBackup(snapshot,filename);notice(result.status==='cancelled'?'backupCancelled':result.status==='saved'?'backupSaved':'backupDownloaded');});
  const importButton=text('button','backupImport',actions);importButton.type='button';importButton.disabled=busy;
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;input.id='backup-file';root.append(input);
  importButton.onclick=()=>{
   if(globalThis.Capacitor?.getPlatform?.()==='android')run(async()=>{if(candidate)await disposeBackup(candidate);candidate=null;const source=await openNativeBackup();if(!source){notice('backupCancelled');return;}await receive(source);});
   else{input.value='';input.click();}
  };
  input.onchange=()=>{const file=input.files?.[0];if(!file)return;run(async()=>{if(candidate)await disposeBackup(candidate);candidate=null;await receive(file);});};
  const status=text('p',messageKey||'backupLimit');status.className='backup-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');if(messageKey)status.textContent=t(messageKey,{filename});
  if(candidate){
   const preview=document.createElement('section');preview.className='backup-preview';root.append(preview);text('h3','backupPreview',preview);const date=candidate.createdAt.slice(0,10).split('-').reverse().join('/')+' '+candidate.createdAt.slice(11,16)+' UTC';text('p','backupCreated',preview).textContent=t('backupCreated',{date});
   const list=document.createElement('dl');preview.append(list);for(const [key,count] of Object.entries(backupCounts(candidate))){text('dt','backupCount_'+key,list);const value=document.createElement('dd');value.textContent=String(count);list.append(value);}
   text('p','backupWarning',preview);const confirm=document.createElement('label');confirm.className='backup-confirm';const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='backup-replace-confirm';confirm.append(checkbox);text('span','backupConsent',confirm);preview.append(confirm);
   const restore=text('button','backupRestore',preview);restore.type='button';restore.className='danger';restore.disabled=true;checkbox.disabled=busy;checkbox.onchange=()=>restore.disabled=busy||!checkbox.checked;
   restore.onclick=()=>{if(!checkbox.checked||busy)return;run(async()=>{notice('backupWorking');await restoreBackup(candidate);await disposeBackup(candidate);candidate=null;notice('backupRestored');});};
   const cancel=text('button','cancel',preview);cancel.type='button';cancel.disabled=busy;cancel.onclick=async()=>{await disposeBackup(candidate).catch(()=>{});candidate=null;notice('backupCancelled');render();};
  }
  if(messageKey==='backupRestored'){const restart=text('button','backupReload');restart.type='button';restart.onclick=reload;}
  root.querySelectorAll('button').forEach(b=>{if(busy)b.disabled=true;});
 }
 return {render,isBusy:()=>busy,needsReload:()=>messageKey==='backupRestored',reload};
}
