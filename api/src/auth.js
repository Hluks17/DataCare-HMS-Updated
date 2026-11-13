const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
function initFirebase(){
 if(getApps().length)return;
 let credentials;
 if(process.env.FIREBASE_SERVICE_ACCOUNT) credentials=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
 else {const path=require('path').resolve(__dirname,'..',process.env.FIREBASE_SERVICE_ACCOUNT_PATH||'serviceAccountKey.json');credentials=require(path);}
 initializeApp({credential:cert(credentials)});
}
async function requireAuth(req,res,next){
 try{
  const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return res.status(401).json({error:'Missing token'});
  initFirebase();const decoded=await getAuth().verifyIdToken(h.slice(7));req.firebaseUser=decoded;
  const snap=await getFirestore().collection('users').doc(decoded.uid).get();req.user=snap.exists?snap.data():null;
  if(req.path!=='/auth/register'){
   if(!req.user)return res.status(403).json({error:'Account is not registered in DataCare.'});
   if(req.user.is_active===false)return res.status(403).json({error:'This account has been disabled.'});
   if(!decoded.email_verified)return res.status(403).json({error:'Please verify your email address sent to your email address before accessing DataCare.'});
   if(req.user.role!=='admin'&&!req.user.is_approved)return res.status(403).json({status:req.user.approval_status||'Pending',error:'Your account is awaiting administrator approval.'});
  }
  next();
 }catch(e){console.error('AUTH ERROR:',e.message);res.status(401).json({error:'Invalid or expired token'});}
}
const requireRole=(...roles)=>(req,res,next)=>!req.user?res.status(403).json({error:'Account not registered'}):!roles.includes(req.user.role)?res.status(403).json({error:'Not allowed for your role'}):next();
module.exports={requireAuth,requireRole,initFirebase};
