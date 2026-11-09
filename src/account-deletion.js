// Prepare an email draft. The user sends it from their email application.
export function deletionMailto(contact,copy,body=copy.requestTemplate){
 if(typeof contact!=='string'||!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(contact))throw Error('Invalid support address');
 return 'mailto:'+contact+'?subject='+encodeURIComponent(copy.deletion)+'&body='+encodeURIComponent(body);
}

export function renderDeletionRequest(root,contact,copy,{enterEmail=false}={}){
 const form=document.createElement('form');
 const intro=document.createElement('p');intro.textContent=copy.scope;
 const label=document.createElement('label');label.textContent=copy.requestTemplateLabel;
 const preview=document.createElement('textarea');preview.readOnly=true;preview.rows=4;preview.style.cssText='display:block;width:100%;margin-block:8px;resize:vertical;font:inherit;';preview.value=copy.requestTemplate;label.append(preview);
 const open=document.createElement('a');open.href=deletionMailto(contact,copy);open.textContent=copy.openEmail;
 const support=document.createElement('p');support.textContent=copy.deletionSupportLabel+contact;
 const note=document.createElement('p');note.textContent=copy.emailNotice;
 form.append(intro);
 if(enterEmail){
  const account=document.createElement('label');
  account.textContent=copy.requestAccountEmail;
  const email=document.createElement('input');
  email.type='email';email.autocomplete='email';email.required;
  email.style.cssText='display:block;width:100%;max-width:100%;box-sizing:border-box;margin-block:8px';
  account.append(email);form.append(account);
  const send=document.createElement('button');
  send.type='submit';send.textContent=copy.sendRequestEmail;
  send.style.cssText='display:block;min-height:44px;max-width:100%;white-space:normal';
  const error=document.createElement('p');
  error.id='deletion-email-error';error.hidden=true;error.setAttribute('role','alert');
  email.setAttribute('aria-describedby',error.id);
  open.hidden=true;
  form.noValidate=true;
  function updateDraft(){
   const body=email.validity.valid?copy.requestTemplate.replace(/\[[^\]]+\]$/,()=>email.value):copy.requestTemplate;
   preview.value=body;open.href=deletionMailto(contact,copy,body);
   if(email.validity.valid){error.hidden=true;email.removeAttribute('aria-invalid');}
  }
  email.addEventListener('input',updateDraft);
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(!email.validity.valid){
    error.textContent=copy.invalidAccountEmail;error.hidden=false;
    email.setAttribute('aria-invalid','true');email.focus();return;
   }
   updateDraft();
   open.click();
  });
  form.append(label,send,error,open,support,note);
 }else{
  form.append(label,open,support,note);
 }
 root.append(form);
}
