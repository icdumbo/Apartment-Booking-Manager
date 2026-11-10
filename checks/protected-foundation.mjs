import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='84317b27fc2106c1e0406f4cfe36ff5f3c1fc425';
const additions=['backend/deletion-staging-worker.js','backend/checks/deletion-staging.check.mjs','src/local-data-deletion.js','backend/checks/deletion-receipt.check.mjs','src/privacy-settings.js','src/privacy-content.js','src/privacy-screen.js','src/account-deletion.js','src/legal','backend/privacy-worker.js','backend/deletion-requests.js','backend/checks/deletion.check.mjs','backend/migrations/0003_deletion_requests.sql','android/app/src/main/res/xml/backup_rules.xml','android/app/src/main/res/xml/data_extraction_rules.xml'];
additions.push('src/photo-lifecycle.js');
const integrations=['backend/firebase-token.js','src/month-navigation.js','src/timeline.js','src/secure-access.js','src/backup.js','src/apartment-photo.js','backend/checks/worker-access.check.mjs','src/play-billing.js','src/app.js','backend/wrangler.jsonc','android/app/src/main/AndroidManifest.xml','android/app/build.gradle'];
// Explicit deletion-only additions; commercial/authentication/data sources remain protected.
additions.push('backend/deletion-executor.js','backend/firebase-deletion.js','backend/checks/deletion-execution.check.mjs','backend/checks/local-d1-sqlite.mjs','backend/migrations/0004_deletion_execution.sql');
additions.push('backend/trial-retention.js','backend/checks/trial-retention.check.mjs','backend/migrations/0005_trial_retention.sql');
additions.push('backend/migrations/0006_trial_retention_cursor.sql');
additions.push('backend/migrations/0007_approved_trial_policy.sql');
const commercialIntegrations=["src/access.js","src/native-auth.js","src/entry-screen.js","src/backup-screen.js","src/maintenance-screen.js","src/maintenance-export.js","src/reports-screen.js","src/reservations-report.js","src/collections-screen.js","android/app/src/main/java/ro/icdapps/apartmentbookingmanager/BookingAdsPlugin.java","android/app/src/main/java/ro/icdapps/apartmentbookingmanager/BookingAccessPlugin.java","android/app/src/main/java/ro/icdapps/apartmentbookingmanager/TrialAdGate.java"];
integrations.push(...commercialIntegrations,'src/xlsx.js');
execFileSync('git',['diff','--exit-code',base,'HEAD','--','src','index.html','android','backend','package.json','package-lock.json','capacitor.config.json',':!src/styles.css',':!src/i18n.js',...additions.concat(integrations).map(p=>':!'+p)],{stdio:'pipe'});
const old=p=>execFileSync('git',['show',base+':'+p],{encoding:'utf8'}).replaceAll('\r\n','\n');
const current=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const approvedTrialCopy=[["secureTrialTerms:'Activezi 15 zile PREMIUM gratuite, fără card. Sunt necesare contul Google și internetul. Trialul se acordă o singură dată pe cont; reinstalarea nu îl reînnoiește. După expirare revii la BASIC gratuit, cu 3 apartamente administrabile. Toate datele rămân păstrate. După repornirea telefonului, trialul necesită reconectare pentru verificarea timpului. Confirmi activarea?'","secureTrialTerms:'Activezi voluntar 15 zile PREMIUM gratuite, fără card, cu Google Sign-In și internet. Serverul decide eligibilitatea și termenul. Istoricul trialului se păstrează maximum 6 luni calendaristice de la început; după eliminarea istoricului sau recrearea contului, repetarea poate fi posibilă. Reinstalarea nu resetează un trial existent pe server. La expirare revii la BASIC gratuit, cu limita de 3 apartamente, fără ștergerea datelor. După repornirea telefonului este necesar internet pentru verificarea timpului. Confirmi activarea?'"],["secureTrialTerms:'Activate 15 free PREMIUM days, without a card. A Google account and internet are required. Each account receives one trial; reinstalling does not renew it. Afterwards, free BASIC allows 3 managed apartments. All data is retained. After rebooting your phone, reconnect to verify trial time. Confirm activation?'","secureTrialTerms:'You voluntarily activate 15 free PREMIUM days, without a card, using Google Sign-In and internet access. The server decides eligibility and expiry. Trial history is retained for at most 6 calendar months from its start; repetition may be possible after history removal or account recreation. Reinstalling does not reset an existing server trial. On expiry you return to free BASIC with its 3-apartment limit, without deleting data. Internet is required to verify time after restarting the phone. Activate?'"],["legacyTrialReview:'Există un istoric de trial pe acest dispozitiv. Nu acordăm un trial nou; este necesară asocierea istoricului cu contul pe server.'","legacyTrialReview:'Există istoric local vechi. La activare, eligibilitatea este decisă exclusiv de server; istoricul local nu acordă și nu blochează un trial.'"],["legacyTrialReview:'This device has an existing trial record. No new trial will be granted; the record needs server-side account reconciliation.'","legacyTrialReview:'Old local trial history exists. Eligibility is decided exclusively by the server when activating; local history neither grants nor blocks a trial.'"]];
let expectedCopy=old('src/i18n.js');for(const [before,after] of approvedTrialCopy){assert.ok(expectedCopy.includes(before));expectedCopy=expectedCopy.replace(before,after);}
const releaseCopy=current('src/i18n.js');
assert.equal(releaseCopy.replace(/const commercialCopy=[\s\S]*?;\nexport function t/,'export function t').replace("(globalThis.document?.documentElement.dataset.commercialRelease==='true'?commercialCopy[language][key]:undefined)??",''),expectedCopy,'Existing web disclosures must remain unchanged');
assert.equal(createHash('sha256').update(releaseCopy).digest('hex'),'339868fb37b9be2e2474aa2347a7513740eba65fe9e25b6990c203084246095b');
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
 "src/secure-access.js": "6300a7af273d85d896f7e067783749dedafeea57a2333dfc2f6d071200963099",
 "src/backup.js": "db7ddb3f67dfaaa927b4bdf2c6cc6967704b0b2151e81018eebcf3089d0cbd8d",
 "src/apartment-photo.js": "139792afbc444747bd7bf05b9de588a9902ec582f30c0f330dd333da430e6cad",
 "src/photo-lifecycle.js": "4beebc20809ac65b8dcf0432f18b97412f041d68cba4dbbc5160e7536c63fc29"
};
for(const [path,hash] of Object.entries(stabilitySources))assert.equal(createHash('sha256').update(current(path)).digest('hex'),hash,'Only reviewed stability fixes are authorized: '+path);

// Keep the reviewed calendar and apartment UI changes exact.
assert.equal(createHash('sha256').update(current("src/app.js")).digest('hex'), '46c617ff81cad83d8ca913697e5e44a877c1384d5835cae8f40c4e4beed10a3b');
assert.equal(createHash('sha256').update(current("src/month-navigation.js")).digest('hex'), 'e46dbe22fabf1c7c2e79a5091aa963b88008a23ce189ee68dfbd13f9d0850eec');
assert.equal(createHash('sha256').update(current("src/timeline.js")).digest('hex'), 'c9173b93b26834214331df5df8ccc7befef07a8c73c1edbce99b3ce901f5d0ca');

assert.equal(createHash('sha256').update(current('backend/firebase-token.js')).digest('hex'), 'a96273e12b2e7ed7cd7e1171ac89f57aba60a199df33433f2555dabbcfc22a43','Only the reviewed explicit Firebase project parameter may change');

const commercialHashes={
 "src/access.js": "acb8cd81ee566c9fd23743ec8f787dec88c09c28c2f0b43c275a055a57a2f0e1",
 "src/native-auth.js": "48e5471bf17498a6bcc2db661a040466ad02c7a60d156a0459f1a8d84b33cc62",
 "src/entry-screen.js": "36186fa193d8f518833270c36b7d7be268ca02c339f4571b555e3ed08ebc95da",
 "src/backup-screen.js": "494c40200ea8b6f8e7125ff88d12049a9216073ecacbe0aa4cf776e8af0dc574",
 "src/maintenance-screen.js": "902f11cb5df08687b2fcaa641ef63a1ea511a16e009a68eef6a238183c2bafe0",
 "src/maintenance-export.js": "1b85444b89e21461d0c79e85d9c31e9569384e6c4d061b68d194462ff68a9e33",
 "src/reports-screen.js": "b1f2706e6d038855a3dababab4a689709c3c7641271b844a9c5541d6948b35d7",
 "src/reservations-report.js": "fd35a6a8152be0cb739c7a52f1d9c264676239680a80e0f77d43e8ea75a7a71a",
 "src/collections-screen.js": "4caee5d1a2527f5f10834cf63534d0fb181dbbd785eeb2369e066132160dfe96",
 "android/app/src/main/java/ro/icdapps/apartmentbookingmanager/BookingAdsPlugin.java": "f0bfb1cc51a5113e44b262b551c40af55b662b848ab0f05f5a445b407a3fe2b0",
 "android/app/src/main/java/ro/icdapps/apartmentbookingmanager/BookingAccessPlugin.java": "aeea98e285f3b74098e754b6470f0085bcdd6f5f0e7b8611e8a77bdcd5798575",
 "android/app/src/main/java/ro/icdapps/apartmentbookingmanager/TrialAdGate.java": "a7d7a3acc6281175832a62e9e03954441cc74838a15137827f31f6f227acdec7"
};
for(const [path,hash] of Object.entries(commercialHashes))assert.equal(createHash('sha256').update(current(path)).digest('hex'),hash,'Only reviewed commercial changes are authorized: '+path);

assert.equal(createHash('sha256').update(current('src/xlsx.js')).digest('hex'),'b714000079bc9900ed050522b608f63fc6c28e2cb0e7c4930b0aaa9fbf388d51','Only the reviewed worksheet protection may change');
