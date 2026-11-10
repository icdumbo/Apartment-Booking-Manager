package ro.icdapps.apartmentbookingmanager;

public class TrialAdGateTest {
    private static void check(boolean expected, boolean foreground, String consentSubject,
                              String trialSubject, boolean updated, boolean umpAllows) {
        if (TrialAdGate.canRequest(foreground, consentSubject, trialSubject, updated, umpAllows) != expected) {
            throw new AssertionError("Unexpected ad decision");
        }
    }

    public static void main(String[] args) {
        check(true, true, "trial", "trial", true, true);
        check(false, true, "trial", null, true, true);
        check(false, true, "trial", "switched", true, true);
        check(false, true, "trial", "trial", false, true);
        check(false, true, "trial", "trial", true, false);
        check(false, false, "trial", "trial", true, true);
        check(false, true, null, null, true, true);
    }
}
