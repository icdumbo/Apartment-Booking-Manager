// Compile and exercise the real plugin against small API doubles. This is not an Android device/emulator test.
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';import {join,dirname,resolve} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
const sources={
 'android/app/Activity.java':`package android.app; public class Activity {public static final int RESULT_OK=-1,RESULT_CANCELED=0;}`,
 'android/net/Uri.java':`package android.net; public class Uri {final String value;public Uri(String s){value=s;}public String getScheme(){return value.split(":")[0];}public String toString(){return value;}}`,
 'android/content/ClipData.java':`package android.content;import android.net.Uri;public class ClipData {final Uri[] uris;public ClipData(Uri...u){uris=u;}public int getItemCount(){return uris.length;}public Item getItemAt(int i){return new Item(uris[i]);}public static class Item{final Uri uri;Item(Uri u){uri=u;}public Uri getUri(){return uri;}}}`,
 'android/content/Intent.java':`package android.content;import android.net.Uri;import java.util.*;public class Intent {public static final String ACTION_GET_CONTENT="get-content",CATEGORY_OPENABLE="openable",EXTRA_ALLOW_MULTIPLE="multiple";public static final int FLAG_GRANT_READ_URI_PERMISSION=1;public String action,type;public int flags;public boolean multiple=true;public final Set<String> categories=new HashSet<>();public Uri uri;public ClipData clip;public Intent(String a){action=a;}public void addCategory(String c){categories.add(c);}public void setType(String t){type=t;}public void putExtra(String k,boolean b){multiple=b;}public void addFlags(int f){flags|=f;}public Uri getData(){return uri;}public ClipData getClipData(){return clip;}}`,
 'android/content/ContentResolver.java':`package android.content;import android.net.Uri;import java.io.*;public class ContentResolver {public InputStream stream;public boolean deny;public int opened;public InputStream openInputStream(Uri uri)throws IOException{opened++;if(deny)throw new SecurityException("private URI");return stream;}}`,
 'android/content/Context.java':`package android.content;public class Context {public final ContentResolver resolver=new ContentResolver();public ContentResolver getContentResolver(){return resolver;}}`,
 'android/util/Base64.java':`package android.util;public class Base64 {public static final int NO_WRAP=2;public static String encodeToString(byte[] bytes,int flags){return java.util.Base64.getEncoder().encodeToString(bytes);}}`,
 'androidx/activity/result/ActivityResult.java':`package androidx.activity.result;import android.content.Intent;public class ActivityResult {final int code;final Intent data;public ActivityResult(int c,Intent d){code=c;data=d;}public int getResultCode(){return code;}public Intent getData(){return data;}}`,
 'com/getcapacitor/JSObject.java':`package com.getcapacitor;public class JSObject extends java.util.HashMap<String,Object>{}`,
 'com/getcapacitor/PluginCall.java':`package com.getcapacitor;public class PluginCall {public JSObject result;public String code;public int replies;public void resolve(JSObject r){result=r;replies++;}public void reject(String message,String c){code=c;replies++;}}`,
 'com/getcapacitor/Plugin.java':`package com.getcapacitor;import android.content.*;public class Plugin {public final Context context=new Context();public Intent launched;public boolean failLaunch;public Context getContext(){return context;}public void startActivityForResult(PluginCall call,Intent intent,String callback){if(failLaunch)throw new IllegalStateException();launched=intent;}public void execute(Runnable run){run.run();}}`,
 'com/getcapacitor/PluginMethod.java':`package com.getcapacitor;public @interface PluginMethod {}`,
 'com/getcapacitor/annotation/ActivityCallback.java':`package com.getcapacitor.annotation;public @interface ActivityCallback {}`,
 'com/getcapacitor/annotation/CapacitorPlugin.java':`package com.getcapacitor.annotation;public @interface CapacitorPlugin {String name();}`,
 'ro/icdapps/apartmentbookingmanager/NativePhotoTest.java':`package ro.icdapps.apartmentbookingmanager;
import android.app.Activity;import android.content.*;import android.net.Uri;import androidx.activity.result.ActivityResult;import com.getcapacitor.*;import java.io.*;
public class NativePhotoTest {
 static void check(boolean v){if(!v)throw new AssertionError();}
 static void complete(BookingPhotoPlugin p,PluginCall call,int code,Intent data)throws Exception {var callback=BookingPhotoPlugin.class.getDeclaredMethod("photoSelected",PluginCall.class,ActivityResult.class);callback.setAccessible(true);callback.invoke(p,call,new ActivityResult(code,data));}
 static Intent data(String uri){Intent i=new Intent("result");if(uri!=null)i.uri=new Uri(uri);return i;}
 public static void main(String[] args)throws Exception {
  BookingPhotoPlugin p=new BookingPhotoPlugin();PluginCall first=new PluginCall();p.selectPhoto(first);check(p.launched.action.equals(Intent.ACTION_GET_CONTENT));check(p.launched.type.equals("image/*"));check(p.launched.categories.contains(Intent.CATEGORY_OPENABLE));check((p.launched.flags&Intent.FLAG_GRANT_READ_URI_PERMISSION)!=0);check(!p.launched.multiple);
  PluginCall duplicate=new PluginCall();p.selectPhoto(duplicate);check(duplicate.code.equals("photoLoadFailed"));complete(p,first,Activity.RESULT_CANCELED,null);check(first.result.get("status").equals("cancelled"));check(first.replies==1);
  for(String uri:new String[]{"content://media/external/images/media/42","content://com.android.providers.downloads.documents/document/42","content://com.google.android.apps.photos.content/item/42","content://other.provider/document/42"}){
   boolean[] closed={false};p.context.resolver.stream=new ByteArrayInputStream(new byte[]{1,2,3}){public void close(){closed[0]=true;}};PluginCall call=new PluginCall();p.selectPhoto(call);complete(p,call,Activity.RESULT_OK,data(uri));check(call.result.get("status").equals("selected"));check(call.result.get("data").equals("AQID"));check(call.result.size()==2);check(call.replies==1&&closed[0]);
  }
  PluginCall clip=new PluginCall();p.selectPhoto(clip);Intent clipped=data(null);clipped.clip=new ClipData(new Uri("content://local/document/1"));p.context.resolver.stream=new ByteArrayInputStream(new byte[]{4});complete(p,clip,Activity.RESULT_OK,clipped);check(clip.result.get("data").equals("BA=="));
  for(Intent invalid:new Intent[]{null,data(null),data("file:///private/path"),data("https://example.test/image")}){PluginCall call=new PluginCall();p.selectPhoto(call);int before=p.context.resolver.opened;complete(p,call,Activity.RESULT_OK,invalid);check(call.code.equals("photoLoadFailed"));check(p.context.resolver.opened==before);}
  PluginCall multi=new PluginCall();p.selectPhoto(multi);Intent multiple=data(null);multiple.clip=new ClipData(new Uri("content://local/1"),new Uri("content://local/2"));complete(p,multi,Activity.RESULT_OK,multiple);check(multi.code.equals("photoLoadFailed"));
  p.context.resolver.deny=true;PluginCall denied=new PluginCall();p.selectPhoto(denied);complete(p,denied,Activity.RESULT_OK,data("content://denied/1"));check(denied.code.equals("photoLoadFailed"));p.context.resolver.deny=false;
  for(InputStream stream:new InputStream[]{null,new ByteArrayInputStream(new byte[0]),new InputStream(){public int read()throws IOException{throw new IOException();}}}){p.context.resolver.stream=stream;PluginCall call=new PluginCall();p.selectPhoto(call);complete(p,call,Activity.RESULT_OK,data("content://unreadable/1"));check(call.code.equals("photoLoadFailed"));}
  p.context.resolver.stream=new InputStream(){int remaining=PhotoInput.MAX_BYTES+1;public int read(){return remaining-- >0?1:-1;}};PluginCall large=new PluginCall();p.selectPhoto(large);complete(p,large,Activity.RESULT_OK,data("content://large/1"));check(large.code.equals("photoTooLarge"));
  p.failLaunch=true;PluginCall failed=new PluginCall();p.selectPhoto(failed);check(failed.code.equals("photoLoadFailed"));p.failLaunch=false;PluginCall retry=new PluginCall();p.selectPhoto(retry);complete(p,retry,Activity.RESULT_CANCELED,null);check(retry.result.get("status").equals("cancelled"));
 }
}`
};
test('native callback contract: Data/ClipData, read grants, providers, bounded streams, cancellation and visible errors',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'abm-photo-native-'));
 try{const files=[];for(const [path,source] of Object.entries(sources)){const file=join(dir,path);await mkdir(dirname(file),{recursive:true});await writeFile(file,source);files.push(file);}
  const base=resolve('android/app/src/main/java/ro/icdapps/apartmentbookingmanager');
  const compile=spawnSync('java',['com.sun.tools.javac.Main','-d',dir,...files,join(base,'BookingPhotoPlugin.java'),join(base,'PhotoInput.java')],{encoding:'utf8'});assert.equal(compile.status,0,compile.stderr??compile.error?.message);
  const run=spawnSync('java',['-cp',dir,'ro.icdapps.apartmentbookingmanager.NativePhotoTest'],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);
 }finally{await rm(dir,{recursive:true,force:true});}
});
