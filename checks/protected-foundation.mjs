import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base='84317b27fc2106c1e0406f4cfe36ff5f3c1fc425';
const additions=['src/privacy-settings.js','src/privacy-content.js','src/privacy-screen.js','src/account-deletion.js','src/legal','backend/privacy-worker.js','backend/deletion-requests.js','backend/checks/deletion.check.mjs','backend/migrations/0003_deletion_requests.sql','android/app/src/main/res/xml/backup_rules.xml','android/app/src/main/res/xml/data_extraction_rules.xml'];
const integrations=['backend/checks/worker-access.check.mjs','src/app.js','backend/wrangler.jsonc','android/app/src/main/AndroidManifest.xml','android/app/build.gradle'];
// Explicit deletion-only additions; commercial/authentication/data sources remain protected.
additions.push('backend/deletion-executor.js','backend/firebase-deletion.js','backend/checks/deletion-execution.check.mjs','backend/checks/local-d1-sqlite.mjs','backend/migrations/0004_deletion_execution.sql');
additions.push('backend/trial-retention.js','backend/checks/trial-retention.check.mjs','backend/migrations/0005_trial_retention.sql');
additions.push('backend/migrations/0006_trial_retention_cursor.sql');
additions.push('backend/migrations/0007_approved_trial_policy.sql');
execFileSync('git',['diff','--exit-code',base,'HEAD','--','src','index.html','android','backend','package.json','package-lock.json','capacitor.config.json',':!src/styles.css',...additions.concat(integrations).map(p=>':!'+p)],{stdio:'pipe'});
const old=p=>execFileSync('git',['show',base+':'+p],{encoding:'utf8'}).replaceAll('\r\n','\n');
const current=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const app=current('src/app.js').replace("import {mountPrivacy} from './privacy-screen.js';\n",'').replace('mountPrivacy({auth:androidAuth});\n','');
assert.equal(app,old('src/app.js'),'Existing app code must remain exact; only the privacy mount is authorized');
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
