package ro.icdapps.apartmentbookingmanager;

final class TrialAdGate {
    private TrialAdGate() {}

    static boolean canRequest(boolean foreground, String consentSubject, String verifiedTrialSubject,
                              boolean consentUpdated, boolean umpAllowsAds) {
        return foreground && consentUpdated && umpAllowsAds
                && consentSubject != null && consentSubject.equals(verifiedTrialSubject);
    }
}
