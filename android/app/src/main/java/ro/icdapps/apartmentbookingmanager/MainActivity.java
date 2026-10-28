package ro.icdapps.apartmentbookingmanager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BookingAuthPlugin.class);
        registerPlugin(BookingAccessPlugin.class);
        registerPlugin(BookingFileExportPlugin.class);
        registerPlugin(BookingPhotoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
