// Prepare an email draft. The user sends it from their email application.
export function deletionMailto(contact,copy){
 if(typeof contact!=='string'||!/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(contact))throw Error('Invalid support address');
 return 'mailto:'+contact+'?subject='+encodeURIComponent(copy.deletion)+'&body='+encodeURIComponent(copy.requestTemplate);
}

export function renderDeletionRequest(root,contact,copy){
 const form=document.createElement('form');
 const intro=document.createElement('p');intro.textContent=copy.scope;
 const label=document.createElement('label');label.textContent=copy.requestTemplateLabel;
 const preview=document.createElement('textarea');preview.readOnly=true;preview.rows=4;preview.style.cssText='display:block;width:100%;margin-block:8px;resize:vertical;font:inherit;';preview.value=copy.requestTemplate;label.append(preview);
 const open=document.createElement('a');open.href=deletionMailto(contact,copy);open.textContent=copy.openEmail;
 const support=document.createElement('p');support.textContent=copy.deletionSupportLabel+contact;
 const note=document.createElement('p');note.textContent=copy.emailNotice;
 form.addEventListener('submit',event=>event.preventDefault());
 form.append(intro,label,open,support,note);root.append(form);
}
