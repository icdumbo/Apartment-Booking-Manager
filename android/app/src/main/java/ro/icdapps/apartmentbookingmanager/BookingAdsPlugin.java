package ro.icdapps.apartmentbookingmanager;

import android.view.*;
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
    private boolean initializing,reserved,destroyed;
    private ConsentInformation consent(){return UserMessagingPlatform.getConsentInformation(getContext());}
    private void showAllowed(){
        if(!consent().canRequestAds()||banner!=null||initializing)return;
        View web=getBridge().getWebView();
        if(!(web.getParent() instanceof FrameLayout)||!(web.getLayoutParams() instanceof ViewGroup.MarginLayoutParams))return;
        parent=(FrameLayout)web.getParent();initializing=true;
        MobileAds.initialize(getContext(),status->getActivity().runOnUiThread(()->{
            initializing=false;if(destroyed||!consent().canRequestAds()||banner!=null)return;
            AdView next=new AdView(getContext());next.setAdUnitId(getContext().getString(R.string.admob_banner_id));next.setAdSize(AdSize.BANNER);
            next.setAdListener(new AdListener(){@Override public void onAdLoaded(){if(banner!=next)return;if(!reserved){ViewGroup.MarginLayoutParams layout=(ViewGroup.MarginLayoutParams)web.getLayoutParams();previousBottom=layout.bottomMargin;layout.bottomMargin=previousBottom+AdSize.BANNER.getHeightInPixels(getContext());web.setLayoutParams(layout);reserved=true;}next.setVisibility(View.VISIBLE);}});
            FrameLayout.LayoutParams layout=new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT,AdSize.BANNER.getHeightInPixels(getContext()),Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL);
            next.setVisibility(View.INVISIBLE);banner=next;parent.addView(next,layout);next.loadAd(new AdRequest.Builder().build());
        }));
    }
    private void hide(){if(banner==null)return;banner.destroy();parent.removeView(banner);banner=null;if(reserved){View web=getBridge().getWebView();ViewGroup.MarginLayoutParams layout=(ViewGroup.MarginLayoutParams)web.getLayoutParams();layout.bottomMargin=previousBottom;web.setLayoutParams(layout);reserved=false;}}
    @PluginMethod public void start(PluginCall call){getActivity().runOnUiThread(()->{
        consent().requestConsentInfoUpdate(getActivity(),new ConsentRequestParameters.Builder().build(),()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(getActivity(),error->{showAllowed();call.resolve();}),error->{showAllowed();call.resolve();});
    });}
    @PluginMethod public void privacy(PluginCall call){getActivity().runOnUiThread(()->UserMessagingPlatform.showPrivacyOptionsForm(getActivity(),error->{if(!consent().canRequestAds())hide();else showAllowed();call.resolve();}));}
    @Override protected void handleOnPause(){if(banner!=null)banner.pause();}
    @Override protected void handleOnResume(){if(banner!=null)banner.resume();}
    @Override protected void handleOnDestroy(){destroyed=true;hide();}
}
