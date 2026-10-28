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

/** Reads only the picker-returned content URI; no path resolution, persisted grants or storage permission. */
@CapacitorPlugin(name = "BookingPhoto")
public class BookingPhotoPlugin extends Plugin {
    private volatile boolean pending;

    @PluginMethod
    public synchronized void selectPhoto(PluginCall call) {
        if (pending) { call.reject("Photo selection already pending", "photoLoadFailed"); return; }
        pending = true;
        // GET_CONTENT preserves Android Photo Picker / Google Photos as well as its Browse action.
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("image/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { startActivityForResult(call, intent, "photoSelected"); }
        catch (Exception error) { pending = false; call.reject("Cannot open photo picker", "photoLoadFailed"); }
    }

    @ActivityCallback
    private void photoSelected(PluginCall call, ActivityResult result) {
        if (call == null) { pending = false; return; }
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            pending = false;
            JSObject response = new JSObject(); response.put("status", "cancelled"); call.resolve(response); return;
        }
        Intent data = result.getData();
        Uri selected = data == null ? null : data.getData();
        if (selected == null && data != null && data.getClipData() != null && data.getClipData().getItemCount() == 1) {
            selected = data.getClipData().getItemAt(0).getUri();
        }
        if (result.getResultCode() != Activity.RESULT_OK || selected == null ||
            !"content".equals(selected.getScheme()) ||
            (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 1)) {
            pending = false; call.reject("No readable photo returned", "photoLoadFailed"); return;
        }
        final Uri uri = selected;
        // Android grants temporary access to this exact URI, including third-party providers.
        // Copy its bytes now, while the grant is valid; WebView never has to reopen content://.
        execute(() -> {
            try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
                byte[] bytes = PhotoInput.read(input);
                JSObject response = new JSObject();
                response.put("status", "selected");
                response.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
                pending = false; call.resolve(response);
            } catch (PhotoInput.TooLarge error) {
                pending = false; call.reject("Image exceeds 20 MB", "photoTooLarge");
            } catch (Exception error) {
                // Never send provider URIs, filenames or exception details to JS/logs.
                pending = false; call.reject("Cannot read selected photo", "photoLoadFailed");
            }
        });
    }
}
