package ro.icdapps.apartmentbookingmanager;

import com.android.billingclient.api.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.auth.FirebaseAuth;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** One non-consumable INAPP product. Purchase tokens are sent to the server, never trusted as access. */
@CapacitorPlugin(name="BookingBilling")
public class BookingBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private PluginCall pendingPurchase;
    private String purchaseSubject;
    private boolean connecting;
    private String subject(){try{return FirebaseAuth.getInstance().getCurrentUser()==null?null:FirebaseAuth.getInstance().getCurrentUser().getUid();}catch(Exception e){return null;}}
    private boolean configured(){return getContext().getResources().getBoolean(R.bool.play_billing_enabled)&&!product().isEmpty();}
    private String product(){return getContext().getString(R.string.play_premium_product_id);}
    private String account(String uid)throws Exception{byte[] hash=MessageDigest.getInstance("SHA-256").digest(("ABM:firebase:"+uid).getBytes(StandardCharsets.UTF_8));StringBuilder value=new StringBuilder();for(byte b:hash)value.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return value.toString();}
    private void fail(PluginCall call,String code){call.reject("Google Play operation did not complete",code);}
    private void connected(PluginCall call,Runnable action){
        getActivity().runOnUiThread(()->{
            if(!configured()){fail(call,"billingUnavailable");return;}
            if(client==null)client=BillingClient.newBuilder(getContext()).setListener(this).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).enableAutoServiceReconnection().build();
            if(client.isReady()){action.run();return;}
            if(connecting){fail(call,"billingBusy");return;}connecting=true;
            client.startConnection(new BillingClientStateListener(){public void onBillingSetupFinished(BillingResult result){connecting=false;if(result.getResponseCode()==BillingClient.BillingResponseCode.OK)action.run();else fail(call,"billingUnavailable");}public void onBillingServiceDisconnected(){connecting=false;}});
        });
    }
    private interface Details {void ready(ProductDetails product,ProductDetails.OneTimePurchaseOfferDetails offer);}
    private void details(PluginCall call,Details callback){
        QueryProductDetailsParams params=QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(QueryProductDetailsParams.Product.newBuilder().setProductId(product()).setProductType(BillingClient.ProductType.INAPP).build())).build();
        client.queryProductDetailsAsync(params,(result,response)->{
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK||response.getProductDetailsList().size()!=1){fail(call,"billingUnavailable");return;}
            ProductDetails detail=response.getProductDetailsList().get(0);ProductDetails.OneTimePurchaseOfferDetails offer=detail.getOneTimePurchaseOfferDetails();
            if(!product().equals(detail.getProductId())||!BillingClient.ProductType.INAPP.equals(detail.getProductType())||offer==null){fail(call,"billingUnavailable");return;}
            callback.ready(detail,offer);
        });
    }
    @PluginMethod public void getProduct(PluginCall call){connected(call,()->details(call,(detail,offer)->call.resolve(new JSObject().put("available",true).put("productId",product()).put("price",offer.getFormattedPrice()))));}
    @PluginMethod public void purchase(PluginCall call){
        if(subject()==null){fail(call,"authenticationRequired");return;}
        final String uid=subject();connected(call,()->{
            if(pendingPurchase!=null){fail(call,"billingBusy");return;}
            details(call,(detail,offer)->getActivity().runOnUiThread(()->{
                if(pendingPurchase!=null){fail(call,"billingBusy");return;}
                if(!uid.equals(subject())){fail(call,"authenticationRequired");return;}
                try{
                    BillingFlowParams.ProductDetailsParams.Builder item=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(detail);
                    if(offer.getOfferToken()!=null&&!offer.getOfferToken().isEmpty())item.setOfferToken(offer.getOfferToken());
                    BillingFlowParams params=BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item.build())).setObfuscatedAccountId(account(uid)).build();
                    pendingPurchase=call;purchaseSubject=uid;
                    BillingResult launched=client.launchBillingFlow(getActivity(),params);
                    if(launched.getResponseCode()!=BillingClient.BillingResponseCode.OK){pendingPurchase=null;purchaseSubject=null;fail(call,launched.getResponseCode()==BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED?"purchaseAlreadyOwned":"billingUnavailable");}
                }catch(Exception e){pendingPurchase=null;purchaseSubject=null;fail(call,"billingUnavailable");}
            }));
        });
    }
    private JSObject receipt(Purchase purchase){
        if(!purchase.getProducts().contains(product()))return null;
        if(purchase.getPurchaseState()==Purchase.PurchaseState.PENDING)return new JSObject().put("status","pending");
        if(purchase.getPurchaseState()!=Purchase.PurchaseState.PURCHASED)return null;
        return new JSObject().put("status","purchased").put("purchaseToken",purchase.getPurchaseToken());
    }
    @Override public void onPurchasesUpdated(BillingResult result,List<Purchase> purchases){
        PluginCall call=pendingPurchase;String uid=purchaseSubject;pendingPurchase=null;purchaseSubject=null;
        if(call==null){notifyListeners("purchasesChanged",new JSObject());return;}
        if(uid==null||!uid.equals(subject())){fail(call,"authenticationRequired");return;}
        if(result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED){call.resolve(new JSObject().put("status","cancelled"));return;}
        if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK||purchases==null){fail(call,"billingUnavailable");return;}
        for(Purchase purchase:purchases){JSObject value=receipt(purchase);if(value!=null){call.resolve(value);return;}}
        fail(call,"purchaseRejected");
    }
    @PluginMethod public void restore(PluginCall call){
        final String uid=subject();if(uid==null){fail(call,"authenticationRequired");return;}
        connected(call,()->client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),(result,purchases)->{
            if(!uid.equals(subject())){fail(call,"authenticationRequired");return;}
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK){fail(call,"billingUnavailable");return;}
            JSArray values=new JSArray();for(Purchase purchase:purchases){JSObject value=receipt(purchase);if(value!=null)values.put(value);}call.resolve(new JSObject().put("purchases",values));
        }));
    }
    @Override protected void handleOnResume(){if(client!=null&&client.isReady()&&subject()!=null)notifyListeners("purchasesChanged",new JSObject());}
    @Override protected void handleOnDestroy(){if(pendingPurchase!=null)fail(pendingPurchase,"billingUnavailable");pendingPurchase=null;purchaseSubject=null;if(client!=null)client.endConnection();client=null;}
}
