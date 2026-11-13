require('dotenv').config();
const path=require('path');
const {initializeApp,cert,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
async function main(){
 const email=(process.argv[2]||'').trim().toLowerCase();
 if(!email){console.error('Usage: npm run add-admin -- admin@example.com');process.exit(1);}
 const allowed=(process.env.ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(allowed.length<1||allowed.length>2||new Set(allowed).size!==allowed.length){console.error('Set ADMIN_EMAILS to one or two different administrator email addresses in api/.env.');process.exit(1);}
 if(!allowed.includes(email)){console.error('This email is not in the two-administrator allowlist.');process.exit(1);}
 let credential;if(process.env.FIREBASE_SERVICE_ACCOUNT)credential=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);else credential=require(path.resolve(__dirname,'..',process.env.FIREBASE_SERVICE_ACCOUNT_PATH||'serviceAccountKey.json'));
 if(!getApps().length)initializeApp({credential:cert(credential)});
 const fb=await getAuth().getUserByEmail(email);if(!fb.emailVerified){console.error('Verify this Firebase Authentication email before provisioning it as an administrator.');process.exit(1);}
 const displayName=(process.argv.slice(3).join(' ').trim()||fb.displayName||email.split('@')[0]).trim();
 const parts=displayName.split(/\s+/),first=parts.shift(),last=parts.join(' ')||'-';
 const user={user_id:fb.uid,uid:fb.uid,email,first_name:first,last_name:last,role:'admin',is_active:true,is_approved:true,approval_status:'Approved',created_at:new Date().toISOString()};
 await getFirestore().collection('users').doc(fb.uid).set(user,{merge:true});
 console.log('Administrator provisioned:',email,'Firebase UID:',fb.uid);
}
main().catch(e=>{console.error('Could not provision administrator:',e.message);process.exit(1);});
