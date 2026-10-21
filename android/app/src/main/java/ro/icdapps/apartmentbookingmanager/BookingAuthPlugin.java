package ro.icdapps.apartmentbookingmanager;

import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.*;
import androidx.credentials.exceptions.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.*;
import com.google.firebase.auth.*;

@CapacitorPlugin(name = "BookingAuth")
public class BookingAuthPlugin extends Plugin {
    private FirebaseAuth auth;
    private CredentialManager credentials;
    private FirebaseAuth.IdTokenListener listener;
    private CancellationSignal cancellation;
    private boolean signingIn;
    private int generation;

    @Override public void load() {
        try {
            auth = FirebaseAuth.getInstance();
            credentials = CredentialManager.create(getContext());
            listener = value -> notifyListeners("idTokenChanged", session(), true);
            auth.addIdTokenListener(listener);
        } catch (Exception ignored) { auth = null; }
    }
    private JSObject session() {
        JSObject result = new JSObject();
        FirebaseUser user = auth == null ? null : auth.getCurrentUser();
        result.put("user", user == null ? org.json.JSONObject.NULL : new JSObject().put("uid", user.getUid()));
        return result;
    }
    private boolean ready(PluginCall call) {
        if (auth != null && credentials != null) return true;
        call.reject("Authentication is not configured", "authUnavailable"); return false;
    }
    @PluginMethod public void getCurrentUser(PluginCall call) { call.resolve(session()); }
    @PluginMethod public void getIdToken(PluginCall call) {
        if (!ready(call)) return;
        FirebaseUser user = auth.getCurrentUser(); final int request = generation;
        if (user == null) { call.reject("Sign in first", "authenticationRequired"); return; }
        user.getIdToken(false).addOnCompleteListener(task -> {
            if (!task.isSuccessful() || request != generation || auth.getCurrentUser() == null || !auth.getCurrentUser().getUid().equals(user.getUid())) {
                call.reject("Session unavailable", "authenticationRequired"); return;
            }
            call.resolve(new JSObject().put("token", task.getResult().getToken()));
        });
    }
    @PluginMethod public void signInWithGoogle(PluginCall call) {
        if (!ready(call)) return;
        getActivity().runOnUiThread(() -> {
            if (signingIn) { call.reject("Sign-in already in progress", "authBusy"); return; }
            signingIn = true; final int request = ++generation;
            cancellation = new CancellationSignal();
            try {
                GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(getContext().getString(R.string.default_web_client_id)).build();
                GetCredentialRequest credentialRequest = new GetCredentialRequest.Builder().addCredentialOption(option).build();
                credentials.getCredentialAsync(getActivity(), credentialRequest, cancellation, ContextCompat.getMainExecutor(getContext()),
                    new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                        @Override public void onResult(GetCredentialResponse response) {
                            if (request != generation) { finishError(call, "authCancelled"); return; }
                            try {
                                Credential credential = response.getCredential();
                                if (!(credential instanceof CustomCredential) || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                                    finishError(call, "authFailed"); return;
                                }
                                GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(((CustomCredential) credential).getData());
                                auth.signInWithCredential(GoogleAuthProvider.getCredential(google.getIdToken(), null)).addOnCompleteListener(task -> {
                                    signingIn = false;
                                    if (request != generation) { auth.signOut(); call.reject("Sign-in cancelled", "authCancelled"); return; }
                                    if (!task.isSuccessful()) { call.reject("Google sign-in failed", "authFailed"); return; }
                                    call.resolve(session());
                                });
                            } catch (Exception ignored) { finishError(call, "authFailed"); }
                        }
                        @Override public void onError(GetCredentialException error) {
                            finishError(call, error instanceof GetCredentialCancellationException ? "authCancelled" : "authFailed");
                        }
                    });
            } catch (Exception ignored) { finishError(call, "authFailed"); }
        });
    }
    private void finishError(PluginCall call, String code) { signingIn = false; call.reject("Google sign-in did not complete", code); }
    @PluginMethod public void signOut(PluginCall call) {
        if (!ready(call)) return;
        generation++; if (cancellation != null) cancellation.cancel(); auth.signOut();
        credentials.clearCredentialStateAsync(new ClearCredentialStateRequest(), null, ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override public void onResult(Void result) { call.resolve(); }
                @Override public void onError(ClearCredentialException error) { call.reject("Signed out; credential chooser reset failed", "credentialClearFailed"); }
            });
    }
    @Override protected void handleOnDestroy() {
        generation++; if (cancellation != null) cancellation.cancel();
        if (auth != null && listener != null) auth.removeIdTokenListener(listener);
    }
}
