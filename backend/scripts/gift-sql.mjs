import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Offline administrator helper only. No credentials, network, or database execution.
// The operator must first verify this UID in the project's Firebase Auth console.
export function giftSql({action,uid,permanent,expiresAt},now=Date.now()){
 if(typeof uid!=='string'||!uid.length||!uid.isWellFormed()||[...uid].length>128||uid!==uid.trim()||/[\u0000-\u001f\u007f]/u.test(uid))throw Error('Invalid Firebase UID');
 // Encode, rather than interpolate a SQL literal: custom UIDs cannot inject SQL.
 const subject="CAST(X'"+Buffer.from(uid,'utf8').toString('hex')+"' AS TEXT)";
 const where=`subject=${subject} AND source='ADMIN_GIFT'`;
 const check=`SELECT subject,source,status,permanent,expires_at FROM licenses WHERE ${where};`;
 if(action==='check'||action==='revoke'){
  if(permanent!==undefined||expiresAt!==undefined)throw Error('Duration is only valid for grant');
  return (action==='revoke'?`UPDATE licenses SET status='revoked' WHERE ${where};\n`:'')+check+'\n';
 }
 if(action!=='grant')throw Error('Use grant, check, or revoke');
 let expiry=null;
 if(permanent===true){if(expiresAt!==undefined)throw Error('Choose permanent OR expiry');}
 else{
  if(permanent!==undefined||typeof expiresAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(expiresAt))throw Error('Use --permanent OR --expires-at YYYY-MM-DDTHH:mm:ssZ');
  expiry=Date.parse(expiresAt);
  if(!Number.isSafeInteger(expiry)||new Date(expiry).toISOString()!==expiresAt.replace('Z','.000Z')||expiry<=now)throw Error('Expiry must be a valid future UTC time');
 }
 // One atomic upsert, limited to ADMIN_GIFT. D1 also checks the temporary deadline
 // using its own clock. Purchase rows and immutable trial history are untouched.
 const guard=expiry===null?'1':`${expiry}>CAST(strftime('%s','now') AS INTEGER)*1000`;
 return `INSERT INTO licenses(subject,source,status,permanent,expires_at) SELECT ${subject},'ADMIN_GIFT','active',${expiry===null?1:0},${expiry===null?'NULL':expiry} WHERE ${guard} ON CONFLICT(subject,source) DO UPDATE SET status='active',permanent=excluded.permanent,expires_at=excluded.expires_at;\n${check}\n`;
}

export function writeGiftSql(args){
 const [action,...flags]=args;const options={action};let output;
 for(let i=0;i<flags.length;i++){
  const flag=flags[i];
  if(flag==='--permanent'){if(options.permanent!==undefined)throw Error('Duplicate option');options.permanent=true;continue;}
  const key={'--uid':'uid','--expires-at':'expiresAt','--out':'output'}[flag];
  if(!key||!flags[i+1]||flags[i+1].startsWith('--'))throw Error('Invalid option');
  if(key==='output'){if(output!==undefined)throw Error('Duplicate output');output=flags[++i];}
  else{if(options[key]!==undefined)throw Error('Duplicate option');options[key]=flags[++i];}
 }
 if(!output)throw Error('Specify --out for a private local SQL file');
 const sql=giftSql(options);
 writeFileSync(output,sql,{flag:'wx',mode:0o600});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{writeGiftSql(process.argv.slice(2));console.log('SQL prepared locally. Nothing executed. Existing files are never overwritten.');}
 catch{console.error('SQL not prepared: check UID, action, duration and output path; use a new filename.');process.exitCode=1;}
}
