import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {selectAndroidPhoto,photoMime,MAX_PHOTO_INPUT} from '../src/photo-picker.js';
const adapter=selectPhoto=>({Plugins:{BookingPhoto:{selectPhoto}}});
test('native picker copies bytes without a path/URI, and ignores provider MIME metadata',async()=>{
 const bytes=Buffer.from([137,80,78,71,13,10,26,10,1,2,3]);let count=0;
 const photo=await selectAndroidPhoto(adapter(async()=>{count++;return {status:'selected',data:bytes.toString('base64'),mimeType:'application/octet-stream'};}));assert.equal(count,1);assert.deepEqual(Buffer.from(await photo.arrayBuffer()),bytes);assert.equal(await photoMime(photo),'image/png');
 for(const mime of ['', 'application/octet-stream','wrong/type'])assert.equal(await photoMime(new Blob([bytes],{type:mime})),'image/png');
});
test('cancellation retains caller state; absent/malformed/missing URI response is not silently accepted',async()=>{
 assert.equal(await selectAndroidPhoto(adapter(async()=>({status:'cancelled'}))),null);
 await assert.rejects(selectAndroidPhoto({}),/photoNativeUnavailable/);
 for(const response of [undefined,{}, {status:'selected'}, {status:'selected',data:''},{status:'selected',data:'===='}, {status:'selected',data:'?123'}, {status:'selected',data:'content://provider/private'}])await assert.rejects(selectAndroidPhoto(adapter(async()=>response)),/photoLoadFailed/);
 for(const code of ['photoLoadFailed','photoTooLarge','provider/secret-uri'])await assert.rejects(selectAndroidPhoto(adapter(async()=>{throw {code,message:'private URI'};})),new RegExp(code==='photoTooLarge'?'photoTooLarge':'photoLoadFailed'));
});
test('20 MB native payload is accepted; greater sizes rejected before/after base64 decode',async()=>{
 const bytes=Buffer.alloc(MAX_PHOTO_INPUT);bytes[0]=255;const blob=await selectAndroidPhoto(adapter(async()=>({status:'selected',data:bytes.toString('base64')})));assert.equal(blob.size,MAX_PHOTO_INPUT);
 // 20 MiB + 1 has the same encoded length as 20 MiB; decoded bound remains essential.
 for(const size of [MAX_PHOTO_INPUT+1,MAX_PHOTO_INPUT+4])await assert.rejects(selectAndroidPhoto(adapter(async()=>({status:'selected',data:Buffer.alloc(size).toString('base64')}))),/photoTooLarge/);
});
test('format is checked from magic bytes, not suffix or provider declaration; SVG/corruption is rejected',async()=>{
 assert.equal(await photoMime(new Blob([new Uint8Array([255,216,255,224])])),'image/jpeg');assert.equal(await photoMime(new Blob(['RIFF1234WEBP'])),'image/webp');
 assert.equal(await photoMime(new Blob(['0000ftypavif0000'])),'image/avif');assert.equal(await photoMime(new Blob(['0000ftypheic0000'])),'image/heif');
 for(const source of ['<svg xmlns="http://www.w3.org/2000/svg"/>','corrupt',''])await assert.rejects(photoMime(new Blob([source],{type:'image/jpeg'})),/photoInvalid/);
});
test('native bounded stream reader handles unknown length, partial reads, zero reads, oversized and denied providers',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'abm-photo-reader-'));
 try{
  await writeFile(join(dir,'PhotoInputTest.java'),`package ro.icdapps.apartmentbookingmanager;
import java.io.*;import java.util.*;
public class PhotoInputTest {
 static void check(boolean value){if(!value)throw new AssertionError();}
 static class Provider extends InputStream {int left; boolean zero; Provider(int count,boolean zero){left=count;this.zero=zero;} public int read(){if(left==0)return -1;left--;return 7;} public int read(byte[] b,int offset,int length){if(zero){zero=false;return 0;}if(left==0)return -1;int count=Math.min(length,Math.min(73,left));Arrays.fill(b,offset,offset+count,(byte)7);left-=count;return count;}}
 public static void main(String[] args)throws Exception {
  check(Arrays.equals(PhotoInput.read(new ByteArrayInputStream(new byte[]{1,2,3})),new byte[]{1,2,3}));
  check(PhotoInput.read(new Provider(30000,true)).length==30000);
  check(PhotoInput.read(new Provider(PhotoInput.MAX_BYTES,false)).length==PhotoInput.MAX_BYTES);
  try{PhotoInput.read(new Provider(PhotoInput.MAX_BYTES+1,false));throw new AssertionError();}catch(PhotoInput.TooLarge expected){}
  try{PhotoInput.read(null);throw new AssertionError();}catch(IOException expected){}
  try{PhotoInput.read(new ByteArrayInputStream(new byte[0]));throw new AssertionError();}catch(IOException expected){}
  try{PhotoInput.read(new InputStream(){public int read()throws IOException{throw new IOException("unreadable");}});throw new AssertionError();}catch(IOException expected){}
  try{PhotoInput.read(new InputStream(){public int read(){throw new SecurityException("no temporary grant");}});throw new AssertionError();}catch(SecurityException expected){}
 }
}`);
  const compile=spawnSync('java',['com.sun.tools.javac.Main','-d',dir,resolve('android/app/src/main/java/ro/icdapps/apartmentbookingmanager/PhotoInput.java'),join(dir,'PhotoInputTest.java')],{encoding:'utf8'});assert.equal(compile.status,0,compile.stderr??compile.error?.message);
  const run=spawnSync('java',['-cp',dir,'ro.icdapps.apartmentbookingmanager.PhotoInputTest'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 }finally{await rm(dir,{recursive:true,force:true});}
});
