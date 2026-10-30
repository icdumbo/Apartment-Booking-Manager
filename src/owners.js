// Local apartment metadata only. Names share one logical identity after NFC/case/space normalization.
export const NO_OWNER='unassigned';
export function normalizeOwner(value){
 if(typeof value!=='string')throw Error('ownerInvalid');
 const name=value.normalize('NFC').trim().replace(/\s+/gu,' ');
 if(name.length>200||/[\u0000-\u001f\u007f]/u.test(value))throw Error('ownerInvalid');return name;
}
export function ownerId(value){const name=normalizeOwner(value??'');return name?'name:'+name.toLocaleLowerCase('ro-RO'):NO_OWNER;}
export function owners(apartments){
 const values=new Map();for(const apartment of apartments){const name=normalizeOwner(apartment.owner??'');if(name&&!values.has(ownerId(name)))values.set(ownerId(name),{id:ownerId(name),name});}
 return [...values.values()].sort((a,b)=>a.name.localeCompare(b.name,'ro'));
}
export function existingOwnerName(value,apartments){const name=normalizeOwner(value);return owners(apartments).find(owner=>owner.id===ownerId(name))?.name??name;}
export function ownerApartments(apartments,selected=''){return selected?apartments.filter(a=>ownerId(a.owner)===selected):apartments;}
export function ownerScope(state,selected=''){
 if(!selected)return state;const apartments=ownerApartments(state.apartments,selected),ids=new Set(apartments.map(a=>a.id));
 return {...state,apartments,bookings:state.bookings.filter(b=>ids.has(b.apartmentId))};
}
export function ownerLabel(apartments,selected,t){return !selected?t('allOwners'):selected===NO_OWNER?t('withoutOwner'):owners(apartments).find(owner=>owner.id===selected)?.name??t('ownerUnavailable');}
export function ownerOptions(select,apartments,selected,t){
 select.replaceChildren();for(const [value,label] of [['',t('allOwners')],[NO_OWNER,t('withoutOwner')],...owners(apartments).map(owner=>[owner.id,owner.name])]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
 if(selected&&!Array.from(select.options).some(o=>o.value===selected)){const option=document.createElement('option');option.value=selected;option.textContent=t('ownerUnavailable');select.append(option);}select.value=selected;
}
