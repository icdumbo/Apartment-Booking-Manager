package ro.icdapps.apartmentbookingmanager;

import android.view.*;
import android.os.Handler;
import android.os.Looper;
import java.util.Objects;
import android.widget.FrameLayout;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.*;
import com.google.android.ump.*;

/** Optional banner only. No subscription, entitlement, guest or booking data is sent to ads. */
@CapacitorPlugin(name="BookingAds")
public class BookingAdsPlugin extends Plugin {
    private AdView banner;
    private FrameLayout parent;
    private int previousBottom;
    private boolean initializing,reserved,destroyed,foreground=true,started,consentReady;
    private String trialSubject;
    private int consentGeneration;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable reconcileTask=this::reconcile;
    private String verifiedTrialSubject(){
        PluginHandle handle=getBridge().getPlugin("BookingAccess");
        return handle!=null&&handle.getInstance() instanceof BookingAccessPlugin access?access.verifiedTrialSubject():null;
    }
    private boolean mayRequest(){return TrialAdGate.canRequest(foreground,trialSubject,verifiedTrialSubject(),consentReady,consent().canRequestAds());}
    private void reconcile(){
        handler.removeCallbacks(reconcileTask);
        if(destroyed||!foreground||!started)return;
        String subject=verifiedTrialSubject();
        if(!Objects.equals(subject,trialSubject)){
            trialSubject=subject;consentReady=false;int generation=++consentGeneration;
            hide();
            if(subject!=null)consent().requestConsentInfoUpdate(getActivity(),new ConsentRequestParameters.Builder().build(),
                ()->{if(generation!=consentGeneration||!foreground||!subject.equals(verifiedTrialSubject()))return;
                    UserMessagingPlatform.loadAndShowConsentFormIfRequired(getActivity(),error->{
                        if(generation!=consentGeneration||error!=null)return;
                        consentReady=true;showAllowed();
                    });},
                error->{/* Fail closed when consent could not be refreshed. */});
        }
        if(!mayRequest())hide();else showAllowed();
        handler.postDelayed(reconcileTask,1000);
    }
    private ConsentInformation consent(){return UserMessagingPlatform.getConsentInformation(getContext());}
    private void showAllowed(){
        if(!mayRequest()||banner!=null||initializing)return;
        View web=getBridge().getWebView();
        if(!(web.getParent() instanceof FrameLayout)||!(web.getLayoutParams() instanceof ViewGroup.MarginLayoutParams))return;
        parent=(FrameLayout)web.getParent();initializing=true;
        MobileAds.initialize(getContext(),status->getActivity().runOnUiThread(()->{
            initializing=false;if(destroyed||!mayRequest()||banner!=null)return;
            AdView next=new AdView(getContext());next.setAdUnitId(getContext().getString(R.string.admob_banner_id));next.setAdSize(AdSize.BANNER);
            next.setAdListener(new AdListener(){@Override public void onAdLoaded(){if(banner!=next)return;if(!mayRequest()){hide();return;}if(!reserved){ViewGroup.MarginLayoutParams layout=(ViewGroup.MarginLayoutParams)web.getLayoutParams();previousBottom=layout.bottomMargin;layout.bottomMargin=previousBottom+AdSize.BANNER.getHeightInPixels(getContext());web.setLayoutParams(layout);reserved=true;}next.setVisibility(View.VISIBLE);}});
            FrameLayout.LayoutParams layout=new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT,AdSize.BANNER.getHeightInPixels(getContext()),Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL);
            next.setVisibility(View.INVISIBLE);banner=next;parent.addView(next,layout);next.loadAd(new AdRequest.Builder().build());
        }));
    }
    private void hide(){if(banner==null)return;banner.destroy();parent.removeView(banner);banner=null;if(reserved){View web=getBridge().getWebView();ViewGroup.MarginLayoutParams layout=(ViewGroup.MarginLayoutParams)web.getLayoutParams();layout.bottomMargin=previousBottom;web.setLayoutParams(layout);reserved=false;}}
    @PluginMethod public void start(PluginCall call){getActivity().runOnUiThread(()->{started=true;reconcile();call.resolve();});}
    @PluginMethod public void privacy(PluginCall call){getActivity().runOnUiThread(()->{
        UserMessagingPlatform.showPrivacyOptionsForm(getActivity(),error->{
            if(error!=null)consentReady=false;
            if(!mayRequest())hide();else showAllowed();
            call.resolve();
        });
    });}
    @Override protected void handleOnPause(){foreground=false;handler.removeCallbacks(reconcileTask);hide();}
    @Override protected void handleOnResume(){foreground=true;reconcile();}
    @Override protected void handleOnDestroy(){destroyed=true;handler.removeCallbacks(reconcileTask);hide();}
}
