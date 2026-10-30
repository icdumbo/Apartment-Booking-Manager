package ro.icdapps.apartmentbookingmanager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BookingAuthPlugin.class);
        registerPlugin(BookingAccessPlugin.class);
        registerPlugin(BookingBillingPlugin.class);
        if (BuildConfig.COMMERCIAL_ADS_ENABLED) {
            try { registerPlugin(Class.forName("ro.icdapps.apartmentbookingmanager.BookingAdsPlugin").asSubclass(com.getcapacitor.Plugin.class)); }
            catch (ClassNotFoundException e) { throw new IllegalStateException("Ads configuration mismatch"); }
        }
        registerPlugin(BookingFileExportPlugin.class);
        registerPlugin(BookingPhotoPlugin.class);
        registerPlugin(BookingBackupPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
