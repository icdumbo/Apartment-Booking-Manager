import {createPrivateKey,sign} from 'node:crypto';
export const PROOF_ISSUER='apartment-booking-manage-2d218';
export const PROOF_AUDIENCE='ro.icdapps.apartmentbookingmanager';
// Private PEM must come from server Secret Manager, never the app or repository.
export function createProofSigner(privatePem){
 const key=createPrivateKey(privatePem);
 if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails.modulusLength<3072)throw Error('RSA 3072+ signing key required');
 return claims=>{
  const payload=Buffer.from(JSON.stringify({...claims,issuer:PROOF_ISSUER,audience:PROOF_AUDIENCE})).toString('base64url');
  return payload+'.'+sign('RSA-SHA256',Buffer.from(payload),key).toString('base64url');
 };
}
