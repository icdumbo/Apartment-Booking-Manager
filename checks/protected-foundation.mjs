import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='84317b27fc2106c1e0406f4cfe36ff5f3c1fc425';
const additions=['src/privacy-settings.js','src/privacy-content.js','src/privacy-screen.js','src/account-deletion.js','src/legal','backend/privacy-worker.js','backend/deletion-requests.js','backend/checks/deletion.check.mjs','backend/migrations/0003_deletion_requests.sql','android/app/src/main/res/xml/backup_rules.xml','android/app/src/main/res/xml/data_extraction_rules.xml'];
additions.push('src/photo-lifecycle.js');
const integrations=['src/month-navigation.js','src/timeline.js','src/secure-access.js','src/backup.js','src/apartment-photo.js','backend/checks/worker-access.check.mjs','src/play-billing.js','src/app.js','backend/wrangler.jsonc','android/app/src/main/AndroidManifest.xml','android/app/build.gradle'];
// Explicit deletion-only additions; commercial/authentication/data sources remain protected.
additions.push('backend/deletion-executor.js','backend/firebase-deletion.js','backend/checks/deletion-execution.check.mjs','backend/checks/local-d1-sqlite.mjs','backend/migrations/0004_deletion_execution.sql');
additions.push('backend/trial-retention.js','backend/checks/trial-retention.check.mjs','backend/migrations/0005_trial_retention.sql');
additions.push('backend/migrations/0006_trial_retention_cursor.sql');
additions.push('backend/migrations/0007_approved_trial_policy.sql');
execFileSync('git',['diff','--exit-code',base,'HEAD','--','src','index.html','android','backend','package.json','package-lock.json','capacitor.config.json',':!src/styles.css',':!src/i18n.js',...additions.concat(integrations).map(p=>':!'+p)],{stdio:'pipe'});
const old=p=>execFileSync('git',['show',base+':'+p],{encoding:'utf8'}).replaceAll('\r\n','\n');
const current=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const approvedTrialCopy=[["secureTrialTerms:'Activezi 15 zile PREMIUM gratuite, fără card. Sunt necesare contul Google și internetul. Trialul se acordă o singură dată pe cont; reinstalarea nu îl reînnoiește. După expirare revii la BASIC gratuit, cu 3 apartamente administrabile. Toate datele rămân păstrate. După repornirea telefonului, trialul necesită reconectare pentru verificarea timpului. Confirmi activarea?'","secureTrialTerms:'Activezi voluntar 15 zile PREMIUM gratuite, fără card, cu Google Sign-In și internet. Serverul decide eligibilitatea și termenul. Istoricul trialului se păstrează maximum 6 luni calendaristice de la început; după eliminarea istoricului sau recrearea contului, repetarea poate fi posibilă. Reinstalarea nu resetează un trial existent pe server. La expirare revii la BASIC gratuit, cu limita de 3 apartamente, fără ștergerea datelor. După repornirea telefonului este necesar internet pentru verificarea timpului. Confirmi activarea?'"],["secureTrialTerms:'Activate 15 free PREMIUM days, without a card. A Google account and internet are required. Each account receives one trial; reinstalling does not renew it. Afterwards, free BASIC allows 3 managed apartments. All data is retained. After rebooting your phone, reconnect to verify trial time. Confirm activation?'","secureTrialTerms:'You voluntarily activate 15 free PREMIUM days, without a card, using Google Sign-In and internet access. The server decides eligibility and expiry. Trial history is retained for at most 6 calendar months from its start; repetition may be possible after history removal or account recreation. Reinstalling does not reset an existing server trial. On expiry you return to free BASIC with its 3-apartment limit, without deleting data. Internet is required to verify time after restarting the phone. Activate?'"],["legacyTrialReview:'Există un istoric de trial pe acest dispozitiv. Nu acordăm un trial nou; este necesară asocierea istoricului cu contul pe server.'","legacyTrialReview:'Există istoric local vechi. La activare, eligibilitatea este decisă exclusiv de server; istoricul local nu acordă și nu blochează un trial.'"],["legacyTrialReview:'This device has an existing trial record. No new trial will be granted; the record needs server-side account reconciliation.'","legacyTrialReview:'Old local trial history exists. Eligibility is decided exclusively by the server when activating; local history neither grants nor blocks a trial.'"]];
let expectedCopy=old('src/i18n.js');for(const [before,after] of approvedTrialCopy){assert.ok(expectedCopy.includes(before));expectedCopy=expectedCopy.replace(before,after);}
assert.equal(current('src/i18n.js'),expectedCopy,'Only the approved trial disclosures may change');
const manifest=current('android/app/src/main/AndroidManifest.xml').replace('        android:fullBackupContent="@xml/backup_rules"\n','').replace('        android:dataExtractionRules="@xml/data_extraction_rules"\n','').replace('android:allowBackup="false"','android:allowBackup="true"');
assert.equal(manifest,old('android/app/src/main/AndroidManifest.xml'),'Only the approved backup exclusions may change');
const config=JSON.parse(current('backend/wrangler.jsonc')),previous=JSON.parse(old('backend/wrangler.jsonc'));
assert.equal(config.main,'privacy-worker.js');assert.equal(config.vars.DELETION_REQUESTS_ENABLED,'false');delete config.vars.DELETION_REQUESTS_ENABLED;config.main=previous.main;
for(const name of ['TRIAL_RETENTION_ENABLED','TRIAL_RETENTION_BACKEND_VERIFIED','TRIAL_RETENTION_POLICY_APPROVED','DELETION_EXECUTION_ENABLED','DELETION_BACKEND_VERIFIED','DELETION_RETENTION_APPROVED','DELETION_MAINTENANCE_VERIFIED']){assert.equal(config.vars[name],'false');delete config.vars[name];}
assert.deepEqual(config,previous,'Existing server configuration and commercial switches must remain exact');
function version(text){let n=0;const normalized=text.replace(/^(\s*versionCode )\d+$/gm,(_,p)=>{n++;return p+'0';}).replace(/^(\s*versionName )"\d+\.\d+\.\d+"$/gm,(_,p)=>{n++;return p+'"0.0.0"';});assert.equal(n,2);return normalized;}
assert.equal(version(current('android/app/build.gradle')),version(old('android/app/build.gradle')));
assert.ok(Number(current('android/app/build.gradle').match(/^\s*versionCode (\d+)$/m)[1])>=23);
console.log('Protected functional sources unchanged; only explicit privacy integration and version metadata allowed.');

assert.equal(current('backend/checks/worker-access.check.mjs').replace('../.worker-build/privacy-worker.js','../.worker-build/index.js'),old('backend/checks/worker-access.check.mjs'),'Existing Worker assertions unchanged; only bundle entrypoint may change');

const originalBilling=old('src/play-billing.js');
assert.ok(originalBilling.includes("if(!found)await secure.refresh();return {status:found?'verified':pending?'pending':'notFound'};"));
assert.equal(current('src/play-billing.js'),originalBilling.replace("if(!found)await secure.refresh();return {status:found?'verified':pending?'pending':'notFound'};","if(!found){const verified=await secure.refresh();if(signedIn()!==uid)throw Error('authenticationRequired');found=verified?.state==='PREMIUM'&&verified?.premiumSource==='GOOGLE_PLAY_PURCHASE';}return {status:found?'verified':pending?'pending':'notFound'};"),'Only signed-server restoration status and its account check may change');

// Exact authorized stability fixes; all other functional changes remain rejected.
const stabilitySources={
 "src/secure-access.js": "5eb64dce23f3c063c2fc2d358dc2d357a8f4c18f061d54f08902b03eb0f3bdce",
 "src/backup.js": "2ed1636e976f9d7bf504b5a8c1b0adcc009cd74cfbec1372118244504c373d92",
 "src/apartment-photo.js": "139792afbc444747bd7bf05b9de588a9902ec582f30c0f330dd333da430e6cad",
 "src/photo-lifecycle.js": "4beebc20809ac65b8dcf0432f18b97412f041d68cba4dbbc5160e7536c63fc29"
};
for(const [path,hash] of Object.entries(stabilitySources))assert.equal(createHash('sha256').update(current(path)).digest('hex'),hash,'Only reviewed stability fixes are authorized: '+path);

// Keep the reviewed calendar and apartment UI changes exact.
assert.equal(createHash('sha256').update(current("src/app.js")).digest('hex'), '0618a0c6384010e4d9701bb770c5e6feab5632b5469b1e5509f7d7145606fe5d');
assert.equal(createHash('sha256').update(current("src/month-navigation.js")).digest('hex'), 'e46dbe22fabf1c7c2e79a5091aa963b88008a23ce189ee68dfbd13f9d0850eec');
assert.equal(createHash('sha256').update(current("src/timeline.js")).digest('hex'), 'c9173b93b26834214331df5df8ccc7befef07a8c73c1edbce99b3ce901f5d0ca');
