import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret,defineBoolean} from 'firebase-functions/params';
import {createHash} from 'node:crypto';
import {createTrialHandler,createTrialRepository} from './trial-handler.js';
import {createProofSigner} from './proof.js';
initializeApp({projectId:'apartment-booking-manage-2d218'});
const owner=defineSecret('ABM_OWNER_SUBJECT');
const signingKey=defineSecret('ABM_ACCESS_PRIVATE_KEY');
// Enable only after legacy-account cutover is prepared. Missing setting never starts trials.
const allowNewTrials=defineBoolean('ABM_NEW_TRIALS_ENABLED',{default:false});
const id=subject=>createHash('sha256').update(subject).digest('hex');
export const access=onRequest({region:'europe-west1',secrets:[owner,signingKey],maxInstances:2,concurrency:20,timeoutSeconds:15,memory:'256MiB',cors:['https://localhost']},async(req,res)=>{
 res.set('Cache-Control','no-store');
 if(req.method!=='POST'){res.status(405).json({error:'methodNotAllowed'});return;}
 if((req.rawBody?.length??0)>2048||!req.is('application/json')){res.status(400).json({error:'invalidRequest'});return;}
 try{
  const database=getFirestore();
  const trials=createTrialRepository({database,documentForSubject:subject=>database.collection('accessTrials').doc(id(subject)),allowNewTrials:allowNewTrials.value()});
  const handler=createTrialHandler({verifyIdToken:(token,revoked)=>getAuth().verifyIdToken(token,revoked),readOwnerSubject:async()=>owner.value(),
   // No purchase/gift issuance or Billing in this stage. Read only server-owned records.
   readVerifiedPurchase:async subject=>{const doc=await database.collection('verifiedPurchases').doc(id(subject)).get();return doc.exists?doc.data():null;},
   readGift:async subject=>{const doc=await database.collection('accessGifts').doc(id(subject)).get();return doc.exists?doc.data():null;},
   trialRepository:trials,signProof:createProofSigner(signingKey.value())});
  const result=await handler({method:req.method,authorization:req.get('authorization'),body:req.body});
  res.status(result.status).json(result.body);
 }catch{res.status(503).json({error:'verificationUnavailable'});}
});
