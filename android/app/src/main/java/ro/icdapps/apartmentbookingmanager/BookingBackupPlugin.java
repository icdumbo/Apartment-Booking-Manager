package ro.icdapps.apartmentbookingmanager;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
/** One user-selected backup stream. No broad storage permission, persisted grant or path from JS. */
@CapacitorPlugin(name="BookingBackup")
public class BookingBackupPlugin extends Plugin {
    private volatile boolean pending;
    @PluginMethod public synchronized void selectBackup(PluginCall call) {
        if(pending){call.reject("Backup selection pending","backupReadFailed");return;}pending=true;
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,false);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try{startActivityForResult(call,intent,"backupSelected");}catch(Exception error){pending=false;call.reject("Cannot open backup picker","backupReadFailed");}
    }
    @ActivityCallback private void backupSelected(PluginCall call,ActivityResult result) {
        if(call==null){pending=false;return;}
        if(result.getResultCode()==Activity.RESULT_CANCELED){pending=false;JSObject r=new JSObject();r.put("status","cancelled");call.resolve(r);return;}
        Intent data=result.getData();Uri selected=data==null?null:data.getData();
        if(selected==null&&data!=null&&data.getClipData()!=null&&data.getClipData().getItemCount()==1)selected=data.getClipData().getItemAt(0).getUri();
        if(result.getResultCode()!=Activity.RESULT_OK||selected==null||!"content".equals(selected.getScheme())||(data.getClipData()!=null&&data.getClipData().getItemCount()>1)){pending=false;call.reject("No readable backup","backupReadFailed");return;}
        final Uri uri=selected;
        execute(()->{try(InputStream input=getContext().getContentResolver().openInputStream(uri)){
            byte[] bytes=BackupInput.read(input);JSObject r=new JSObject();r.put("status","selected");r.put("data",Base64.encodeToString(bytes,Base64.NO_WRAP));pending=false;call.resolve(r);
        }catch(Exception error){pending=false;call.reject("Cannot read backup (maximum 24 MB)","backupReadFailed");}});
    }
}
