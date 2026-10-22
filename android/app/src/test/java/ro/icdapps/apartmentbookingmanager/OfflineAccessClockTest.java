package ro.icdapps.apartmentbookingmanager;
import org.junit.Test;
import static org.junit.Assert.*;
public class OfflineAccessClockTest {
    @Test public void expiryUsesElapsedTimeIncludingSleepNotPhoneDate() {
        assertEquals(900,OfflineAccessClock.remaining(2000,1000,10,110,1,1));
        assertEquals(0,OfflineAccessClock.remaining(2000,1000,10,1010,1,1));
    }
    @Test public void rebootOrLostAnchorRequiresOnlineVerification() {
        assertEquals(0,OfflineAccessClock.remaining(2000,1000,10,11,1,2));
        assertEquals(0,OfflineAccessClock.remaining(2000,1000,10,9,1,1));
        assertEquals(0,OfflineAccessClock.remaining(2000,1000,10,11,1,-1));
    }
}
