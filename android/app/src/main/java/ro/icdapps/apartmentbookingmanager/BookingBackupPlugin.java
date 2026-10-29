package ro.icdapps.apartmentbookingmanager;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.StatFs;
import android.system.Os;
import android.system.StructStatVfs;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.util.*;
/** Chunked private-cache import and user-selected SAF export; no credentials or broad permissions. */
@CapacitorPlugin(name="BookingBackup")
public class BookingBackupPlugin extends Plugin {
    private static final int CHUNK=48*1024;
    private final Map<String,File> imports=new HashMap<>();
    private android.os.ParcelFileDescriptor exportFd;private OutputStream exportOutput;private Uri exportUri;private String exportHandle;
    private volatile boolean pending;
    private long exportExpected,exportWritten;
    private File directory(){File d=new File(getContext().getCacheDir(),"abm-backup-import");if(!d.isDirectory()&&!d.mkdirs())throw new IllegalStateException();return d;}
    @Override public void load(){try{File[] old=directory().listFiles();if(old!=null)for(File f:old)f.delete();}catch(Exception ignored){}}
    private static JSObject result(String status){JSObject r=new JSObject();r.put("status",status);return r;}
    private static String code(Exception e){String m=String.valueOf(e.getMessage()).toLowerCase(java.util.Locale.ROOT);return m.contains("space")||m.contains("enospc")||m.contains("edquot")||m.contains("quota")?"backupSpace":"backupReadFailed";}
    @PluginMethod public synchronized void selectBackup(PluginCall call){
        if(pending||!imports.isEmpty()||exportOutput!=null){call.reject("Backup busy","backupBusy");return;}pending=true;
        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,false);i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try{startActivityForResult(call,i,"backupSelected");}catch(Exception e){pending=false;call.reject("Cannot open backup picker","backupReadFailed");}
    }
    @ActivityCallback private void backupSelected(PluginCall call,ActivityResult result){
        if(call==null){pending=false;return;}if(result.getResultCode()==Activity.RESULT_CANCELED){pending=false;call.resolve(result("cancelled"));return;}
        Intent d=result.getData();Uri selected=d==null?null:d.getData();if(selected==null&&d!=null&&d.getClipData()!=null&&d.getClipData().getItemCount()==1)selected=d.getClipData().getItemAt(0).getUri();
        if(result.getResultCode()!=Activity.RESULT_OK||selected==null||!"content".equals(selected.getScheme())||(d.getClipData()!=null&&d.getClipData().getItemCount()>1)){pending=false;call.reject("Invalid backup selection","backupReadFailed");return;}
        final Uri uri=selected;
        execute(()->{File file=null;try{File dir=directory();file=File.createTempFile("import-",".json",dir);
            try(InputStream in=getContext().getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(file)){BackupInput.copy(in,out,bytes->{if(new StatFs(dir.getAbsolutePath()).getAvailableBytes()<bytes)throw new IOException("Insufficient space");});}
            String handle=UUID.randomUUID().toString();synchronized(this){imports.put(handle,file);}JSObject r=result("selected");r.put("handle",handle);r.put("size",file.length());pending=false;call.resolve(r);
        }catch(Exception e){if(file!=null)file.delete();pending=false;call.reject("Cannot copy backup to private cache",code(e));}});
    }
    @PluginMethod public void readChunk(PluginCall call){execute(()->{try{
        File file; synchronized(this){file=imports.get(call.getString("handle",""));}long offset=call.getLong("offset",-1L);if(file==null||offset<0||offset>file.length())throw new IOException();
        try(RandomAccessFile input=new RandomAccessFile(file,"r")){input.seek(offset);byte[] buffer=new byte[(int)Math.min(CHUNK,file.length()-offset)];input.readFully(buffer);JSObject r=new JSObject();r.put("data",Base64.encodeToString(buffer,Base64.NO_WRAP));r.put("done",offset+buffer.length==file.length());call.resolve(r);}
    }catch(Exception e){call.reject("Cannot read backup chunk","backupReadFailed");}});}
    @PluginMethod public synchronized void closeImport(PluginCall call){File f=imports.remove(call.getString("handle",""));if(f!=null)f.delete();call.resolve();}
    // Capacitor getLong accepts only Long; JSON byte sizes below 2 GiB arrive as Integer.
    private static long exportSize(PluginCall call){
        Object value=call.getData().opt("size");if(!(value instanceof Number))return 0L;
        double size=((Number)value).doubleValue();
        return Double.isFinite(size)&&size>0&&size<=9007199254740991d&&size==Math.rint(size)?((Number)value).longValue():0L;
    }
    @PluginMethod public synchronized void beginExport(PluginCall call){
        String filename=call.getString("filename","");if(exportSize(call)<=0){call.reject("Invalid backup size","backupWriteFailed");return;}if(pending||exportOutput!=null||!imports.isEmpty()){call.reject("Backup busy","backupBusy");return;}if(!filename.matches("[A-Za-z0-9._-]+\\.abmbackup\\.json")){call.reject("Invalid filename","backupWriteFailed");return;}
        pending=true;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");i.putExtra(Intent.EXTRA_TITLE,filename);i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try{startActivityForResult(call,i,"exportSelected");}catch(Exception e){pending=false;call.reject("Cannot open save picker","backupWriteFailed");}
    }
    @ActivityCallback private synchronized void exportSelected(PluginCall call,ActivityResult r){
        pending=false;if(call==null)return;if(r.getResultCode()==Activity.RESULT_CANCELED){call.resolve(result("cancelled"));return;}
        Uri uri=r.getData()==null?null:r.getData().getData();if(r.getResultCode()!=Activity.RESULT_OK||uri==null||!"content".equals(uri.getScheme())){call.reject("Invalid output document","backupWriteFailed");return;}
        try{exportUri=uri;exportFd=getContext().getContentResolver().openFileDescriptor(uri,"w");if(exportFd==null)throw new IOException();exportOutput=new android.os.ParcelFileDescriptor.AutoCloseOutputStream(exportFd);exportHandle=UUID.randomUUID().toString();exportExpected=exportSize(call);exportWritten=0;checkDestinationSpace(exportExpected);JSObject result=result("ready");result.put("handle",exportHandle);call.resolve(result);}
        catch(Exception e){abort();call.reject("Cannot open output document",code(e).equals("backupSpace")?"backupSpace":"backupWriteFailed");}
    }
    private void checkDestinationSpace(long bytes)throws IOException{
        StructStatVfs stat=null;try{if(exportFd!=null)stat=Os.fstatvfs(exportFd.getFileDescriptor());}catch(Exception ignored){/* Remote/pipe providers may not expose capacity; I/O failures remain explicit. */}
        if(stat!=null&&stat.f_blocks>0&&stat.f_bavail*stat.f_frsize<bytes)throw new IOException("Insufficient space");
    }
    @PluginMethod public void appendExport(PluginCall call){execute(()->{synchronized(this){try{
        if(exportOutput==null||!Objects.equals(exportHandle,call.getString("handle")))throw new IOException();String data=call.getString("data","");if(data.length()>4*((CHUNK+2)/3))throw new IOException();byte[] bytes=Base64.decode(data,Base64.DEFAULT);if(bytes.length==0||bytes.length>CHUNK)throw new IOException();checkDestinationSpace(bytes.length);exportOutput.write(bytes);exportWritten+=bytes.length;call.resolve();
    }catch(Exception e){abort();call.reject("Cannot write backup chunk",code(e).equals("backupSpace")?"backupSpace":"backupWriteFailed");}}});}
    @PluginMethod public synchronized void finishExport(PluginCall call){try{if(exportOutput==null||!Objects.equals(exportHandle,call.getString("handle"))||exportWritten!=exportExpected)throw new IOException();exportOutput.flush();exportOutput.close();exportOutput=null;exportFd=null;exportUri=null;exportHandle=null;call.resolve(result("saved"));}catch(Exception e){abort();call.reject("Cannot finish backup","backupWriteFailed");}}
    private synchronized void abort(){try{if(exportOutput!=null)exportOutput.close();else if(exportFd!=null)exportFd.close();}catch(Exception ignored){}try{if(exportUri!=null)getContext().getContentResolver().delete(exportUri,null,null);}catch(Exception ignored){}exportOutput=null;exportFd=null;exportUri=null;exportHandle=null;}
    @PluginMethod public synchronized void abortExport(PluginCall call){if(Objects.equals(exportHandle,call.getString("handle")))abort();call.resolve();}
    @Override protected synchronized void handleOnDestroy(){abort();for(File f:imports.values())f.delete();imports.clear();}
}
