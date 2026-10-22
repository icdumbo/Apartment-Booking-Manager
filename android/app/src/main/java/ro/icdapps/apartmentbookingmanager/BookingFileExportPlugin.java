package ro.icdapps.apartmentbookingmanager;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

/** User-selected document only: no storage permission, directory access or network. */
@CapacitorPlugin(name = "BookingFileExport")
public class BookingFileExportPlugin extends Plugin {
    private volatile boolean pending;
    private volatile byte[] pendingData;
    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @PluginMethod
    public synchronized void saveFile(PluginCall call) {
        String name = call.getString("filename", "");
        String mime = call.getString("mimeType", "");
        String data = call.getString("data", "");
        if (!name.matches("[A-Za-z0-9._-]{1,180}") || data.isEmpty() || data.length() > 33554432 ||
            !(mime.equals("application/pdf") && name.endsWith(".pdf") || mime.equals(XLSX) && name.endsWith(".xlsx"))) {
            call.reject("Invalid export payload", "exportSaveFailed"); return;
        }
        if (pending) { call.reject("Another export is pending", "exportSaveFailed"); return; }
        try { pendingData = Base64.decode(data, Base64.DEFAULT); }
        catch (IllegalArgumentException error) { call.reject("Invalid file encoding", "exportSaveFailed"); return; }
        if (pendingData.length == 0 || pendingData.length > 24 * 1024 * 1024) {
            pendingData = null; call.reject("Invalid file size", "exportSaveFailed"); return;
        }
        // Do not let Capacitor serialize megabytes into an Android Activity state Bundle.
        call.getData().remove("data");
        pending = true;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, name);
        try { startActivityForResult(call, intent, "documentCreated"); }
        catch (Exception error) { pending = false; pendingData = null; call.reject("Cannot open document picker", "exportSaveFailed"); }
    }

    @ActivityCallback
    private void documentCreated(PluginCall call, ActivityResult result) {
        if (call == null) { pending = false; pendingData = null; return; }
        if (result.getResultCode() == Activity.RESULT_CANCELED) {
            pending = false; pendingData = null; JSObject response = new JSObject(); response.put("status", "cancelled"); call.resolve(response); return;
        }
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            pending = false; pendingData = null; call.reject("No writable document returned", "exportSaveFailed"); return;
        }
        // The chooser grants access to this newly created URI, never all storage.
        execute(() -> {
            try {
                byte[] bytes = pendingData; pendingData = null;
                if (bytes == null || bytes.length == 0 || bytes.length > 24 * 1024 * 1024) throw new IllegalArgumentException("Invalid size");
                try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
                    if (output == null) throw new java.io.IOException("Document is not writable");
                    output.write(bytes); output.flush();
                }
                String name = call.getString("filename", "");
                try (Cursor cursor = getContext().getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                    if (cursor != null && cursor.moveToFirst() && !cursor.isNull(0)) name = cursor.getString(0);
                } catch (Exception ignored) { /* Successful write; retain the proposed filename. */ }
                JSObject response = new JSObject(); response.put("status", "saved"); response.put("filename", name);
                pending = false; call.resolve(response);
            } catch (Exception error) {
                // Remove only the incomplete document just created by this export, if supported.
                try { getContext().getContentResolver().delete(uri, null, null); } catch (Exception ignored) { }
                pending = false; pendingData = null; call.reject("Could not write export document", "exportSaveFailed");
            }
        });
    }
}
