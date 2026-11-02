// Public information only. Never put credentials, tokens or private keys here.
// Publication remains blocked until these owner-supplied details are approved.
export const privacySettings=Object.freeze({controllerType:'individual',operator:null,contact:null,retentionPolicy:null,publicationApproved:false,
 automaticBackup:'excluded',webClientId:null,firebaseApiKey:null,deletionEndpoint:null});
export function isPrivacyPublicationReady(){return Boolean(privacySettings.publicationApproved&&privacySettings.operator&&privacySettings.contact&&privacySettings.retentionPolicy);}
