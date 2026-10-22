package ro.icdapps.apartmentbookingmanager;

// Pure time policy, independently testable without a device/wall clock.
public final class OfflineAccessClock {
    private OfflineAccessClock() {}
    public static long remaining(long expiresAt,long issuedAt,long anchor,long elapsed,int anchorBoot,int currentBoot) {
        if(currentBoot<0||currentBoot!=anchorBoot||anchor<0||elapsed<anchor||expiresAt<=issuedAt)return 0;
        return Math.max(0,(expiresAt-issuedAt)-(elapsed-anchor));
    }
}
