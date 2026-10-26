import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {giftSql,writeGiftSql} from '../backend/scripts/gift-sql.mjs';
test('gift SQL encodes custom UIDs, scopes writes to gifts and validates duration',()=>{
 const uid="fixture'); DELETE FROM trials;--";
 const sql=giftSql({action:'grant',uid,permanent:true});
 assert.ok(!sql.includes(uid));assert.ok(sql.includes(Buffer.from(uid).toString('hex')));
 assert.ok(sql.includes("'ADMIN_GIFT'"));assert.ok(!sql.includes('DELETE'));
 assert.ok(!sql.includes('GOOGLE_PLAY_PURCHASE'));
 for(const options of [{uid:''},{uid:'\ud800'},{uid:' x'},{uid:'x\n'},{uid:'x'.repeat(129)},{uid:'x',permanent:true,expiresAt:'2099-01-01T00:00:00Z'},{uid:'x',expiresAt:'2099-02-30T00:00:00Z'},{uid:'x',expiresAt:'2020-01-01T00:00:00Z'}])assert.throws(()=>giftSql({action:'grant',...options}));
 assert.throws(()=>giftSql({action:'revoke',uid:'x',permanent:true}));
 assert.match(giftSql({action:'grant',uid:'fixture',expiresAt:'2099-01-01T00:00:00Z'}),/strftime/);
 assert.match(giftSql({action:'revoke',uid:'fixture'}),/UPDATE licenses SET status='revoked'.*AND source='ADMIN_GIFT'/);
 assert.ok(!/INSERT|UPDATE|DELETE/.test(giftSql({action:'check',uid:'fixture'})));
});
test('CLI only creates a local SQL file and refuses overwrite or ambiguous arguments',()=>{
 const dir=mkdtempSync(join(tmpdir(),'abm-gift-'));
 try{
  const file=join(dir,'gift.sql');const args=['grant','--uid','fictional-user','--permanent','--out',file];
  writeGiftSql(args);const original=readFileSync(file,'utf8');
  assert.throws(()=>writeGiftSql(args));assert.equal(readFileSync(file,'utf8'),original);
  assert.throws(()=>writeGiftSql(['grant','--uid','one','--uid','two','--permanent','--out',file]));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
