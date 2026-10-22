package ro.icdapps.apartmentbookingmanager;

import android.os.SystemClock;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.auth.FirebaseAuth;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.util.UUID;
import org.json.JSONObject;

// Signature and clock decisions stay native. Never trusts a JS UID, clock or PREMIUM flag.
@CapacitorPlugin(name="BookingAccess")
public class BookingAccessPlugin extends Plugin {
    private static final String PREFS="abm-verified-access",ALIAS="abm-access-cache-v1";
    private static final long TRIAL_MS=15L*86400000;
    private String nonce,requestSubject;
    private long requestElapsed;
    private int requestBoot;
    private String subject() {
        try { return FirebaseAuth.getInstance().getCurrentUser()==null?null:FirebaseAuth.getInstance().getCurrentUser().getUid(); }
        catch(Exception e) { return null; }
    }
    private int boot() { try { return Settings.Global.getInt(getContext().getContentResolver(),Settings.Global.BOOT_COUNT,-1); } catch(Exception e) { return -1; } }
    private byte[] decode(String value) { return Base64.decode(value,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING); }
    private String encode(byte[] value) { return Base64.encodeToString(value,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING); }
    private JSONObject claims(String proof) throws Exception {
        String key=getContext().getString(R.string.access_public_key_spki);
        if(key.isEmpty())throw new SecurityException("Access verifier is not configured");
        String[] parts=proof.split("\\.",-1);
        if(parts.length!=2||proof.length()>16384)throw new SecurityException("Invalid proof");
        PublicKey publicKey=KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(Base64.decode(key,Base64.DEFAULT)));
        Signature signature=Signature.getInstance("SHA256withRSA");signature.initVerify(publicKey);
        signature.update(parts[0].getBytes(StandardCharsets.US_ASCII));
        if(!signature.verify(decode(parts[1])))throw new SecurityException("Invalid signature");
        JSONObject c=new JSONObject(new String(decode(parts[0]),StandardCharsets.UTF_8));
        if(c.getInt("version")!=1||!"apartment-booking-manage-2d218".equals(c.getString("issuer"))||!getContext().getPackageName().equals(c.getString("audience"))||subject()==null||!subject().equals(c.getString("subject")))throw new SecurityException("Invalid binding");
        String state=c.getString("state"),source=c.optString("source");long issued=c.getLong("issuedAt");
        if(issued<0)throw new SecurityException("Invalid time");
        if("TRIAL".equals(state)) {
            long start=c.getLong("startedAt"),end=c.getLong("expiresAt");
            if(!"SERVER_TRIAL".equals(source)||start<0||end-start!=TRIAL_MS||issued<start||issued>=end)throw new SecurityException("Invalid trial");
        } else if("PREMIUM".equals(state)) {
            if(!"GOOGLE_PLAY_PURCHASE".equals(source)&&!"OWNER_GRANT".equals(source)&&!"ADMIN_GIFT".equals(source))throw new SecurityException("Invalid source");
            if(!c.isNull("expiresAt")&&(!"ADMIN_GIFT".equals(source)||c.getLong("expiresAt")<=issued))throw new SecurityException("Invalid expiry");
        } else if(!"BASIC".equals(state))throw new SecurityException("Invalid state");
        return c;
    }
    private SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(ALIAS)) {
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
            generator.generateKey();
        }
        return (SecretKey)store.getKey(ALIAS,null);
    }
    private void store(JSONObject record) throws Exception {
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());
        byte[] encrypted=cipher.doFinal(record.toString().getBytes(StandardCharsets.UTF_8));
        if(!getContext().getSharedPreferences(PREFS,0).edit().putString("record",encode(cipher.getIV())+"."+encode(encrypted)).commit())throw new SecurityException("Cannot retain proof");
    }
    private JSONObject loadRecord() throws Exception {
        String value=getContext().getSharedPreferences(PREFS,0).getString("record",null);
        if(value==null)return null;
        String[] parts=value.split("\\.");if(parts.length!=2)throw new SecurityException("Invalid cache");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,decode(parts[0])));
        return new JSONObject(new String(cipher.doFinal(decode(parts[1])),StandardCharsets.UTF_8));
    }
    private JSObject snapshot() throws Exception {
        JSONObject record=loadRecord();if(record==null)return new JSObject().put("state","BASIC");
        JSONObject c=claims(record.getString("proof"));String state=c.getString("state");
        JSObject result=new JSObject().put("state",state).put("subject",c.getString("subject")).put("premiumSource",c.opt("source"));
        if("BASIC".equals(state))return result;
        if(!c.isNull("expiresAt")) {
            long anchor=record.getLong("elapsed"),elapsed=SystemClock.elapsedRealtime();
            // A reboot loses the trusted monotonic time base. Do not use wall-clock fallback.
            if(boot()<0||boot()!=record.getInt("boot")||elapsed<anchor)return new JSObject().put("state","BASIC").put("subject",c.getString("subject")).put("needsOnlineTime",true);
            long remaining=OfflineAccessClock.remaining(c.getLong("expiresAt"),c.getLong("issuedAt"),anchor,elapsed,record.getInt("boot"),boot());
            if(remaining<=0)return new JSObject().put("state","BASIC").put("subject",c.getString("subject"));
            result.put("expiresAt",c.getLong("expiresAt")).put("remainingMs",remaining);
        }
        return result;
    }
    @PluginMethod public synchronized void beginVerification(PluginCall call) {
        if(subject()==null){call.reject("Sign in first","authenticationRequired");return;}
        if(getContext().getString(R.string.access_public_key_spki).isEmpty()){call.reject("Access verifier is not configured","licenseBackendUnavailable");return;}
        nonce=UUID.randomUUID().toString();requestSubject=subject();requestElapsed=SystemClock.elapsedRealtime();requestBoot=boot();
        call.resolve(new JSObject().put("nonce",nonce));
    }
    @PluginMethod public synchronized void acceptProof(PluginCall call) {
        try {
            String proof=call.getString("proof");JSONObject c=claims(proof);
            if(nonce==null||!nonce.equals(c.getString("nonce"))||!requestSubject.equals(subject())||requestBoot!=boot()||SystemClock.elapsedRealtime()-requestElapsed>30000)throw new SecurityException("Stale verification");
            // Anchor before network request: latency can shorten, never extend, a trial.
            store(new JSONObject().put("proof",proof).put("elapsed",requestElapsed).put("boot",requestBoot));nonce=null;
            call.resolve(snapshot());
        } catch(Exception e) { nonce=null;call.reject("Access proof could not be verified","invalidLicenseProof"); }
    }
    @PluginMethod public synchronized void getAccess(PluginCall call) {
        try {call.resolve(snapshot());}catch(Exception e){call.resolve(new JSObject().put("state","BASIC"));}
    }
    @PluginMethod public synchronized void clear(PluginCall call) {
        nonce=null;getContext().getSharedPreferences(PREFS,0).edit().clear().commit();call.resolve();
    }
}
