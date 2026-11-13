require('dotenv').config();
const path=require('path');
const {initializeApp,cert,getApps}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
async function main(){
 let c;if(process.env.FIREBASE_SERVICE_ACCOUNT)c=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);else c=require(path.resolve(__dirname,'..',process.env.FIREBASE_SERVICE_ACCOUNT_PATH||'serviceAccountKey.json'));
 if(!getApps().length)initializeApp({credential:cert(c)});const db=getFirestore();
 const services=[{service_id:1,name:'General Consultation',price:450},{service_id:2,name:'Follow-up Consultation',price:250},{service_id:3,name:'Specialist Consultation',price:750}];
 const meds=[{medication_id:1,name:'Paracetamol',strength:'500 mg',unit_price:25,stock_qty:100},{medication_id:2,name:'Ibuprofen',strength:'200 mg',unit_price:35,stock_qty:80},{medication_id:3,name:'Amoxicillin',strength:'250 mg',unit_price:65,stock_qty:50}];
 for(const x of services)await db.collection('services').doc(String(x.service_id)).set(x,{merge:true});
 for(const x of meds)await db.collection('medications').doc(String(x.medication_id)).set(x,{merge:true});
 await db.collection('_counters').doc('services').set({value:Math.max(...services.map(x=>x.service_id))},{merge:true});
 await db.collection('_counters').doc('medications').set({value:Math.max(...meds.map(x=>x.medication_id))},{merge:true});
 console.log('Default demonstration services and medication catalogue added. Review prices and stock before using.');
}
main().catch(e=>{console.error(e.message);process.exit(1);});
