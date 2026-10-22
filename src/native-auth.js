import {createSecureAccess} from './secure-access.js';
import {billingAdapter} from './access.js';
// A deployed, authenticated backend URL can be set here in a future reviewed change.
// Never read endpoint/entitlement/privileged identity from editable local storage.
export const LICENSE_ENDPOINT=null;
export function createNativeAuthBridge(plugin){
 let user=null,revision=0,handle,disposed=false;
 const listeners=new Set();
 const update=value=>{if(disposed)return;revision++;user=value?.user??null;for(const callback of listeners)callback();};
 return {
  async initialize(){handle=await plugin.addListener('idTokenChanged',update);const request=revision;const current=await plugin.getCurrentUser();if(request===revision)update(current);},
  getCurrentUser:()=>user,
  async getIdToken(expected){if(user?.uid!==expected.uid)throw Error('authenticationRequired');const response=await plugin.getIdToken();if(user?.uid!==expected.uid||typeof response.token!=='string')throw Error('authenticationRequired');return response.token;},
  async signInWithGoogle(){const response=await plugin.signInWithGoogle();update(response);},
  async signOut(){user=null;revision++;for(const callback of listeners)callback();await plugin.signOut();},
  onIdTokenChanged(callback){listeners.add(callback);return ()=>listeners.delete(callback);},
  async dispose(){disposed=true;revision++;user=null;listeners.clear();await handle?.remove();handle=null;}
 };
}
export function createOptionalAndroidAuth(capacitor=globalThis.Capacitor,{changed=()=>{}}={}){
 const plugin=capacitor?.getPlatform?.()==='android'?capacitor.Plugins?.BookingAuth:null;
 if(!plugin)return {available:false,provider:billingAdapter};
 const bridge=createNativeAuthBridge(plugin);
 const access=createSecureAccess({bridge,plugin:capacitor.Plugins?.BookingAccess,endpoint:LICENSE_ENDPOINT,changed});
 return {available:true,provider:access.provider,bridge,
  configured:access.configured,secure:access,
  async initialize(){bridge.onIdTokenChanged(()=>{access.sessionChanged().then(()=>access.refresh()).catch(()=>{});});await bridge.initialize();await access.sessionChanged();},
  async signIn(){await bridge.signInWithGoogle();},
  async signOut(){await access.signOut();await bridge.signOut();}
 };
}
