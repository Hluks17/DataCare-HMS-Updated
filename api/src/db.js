const { getFirestore } = require('firebase-admin/firestore');
function store(){ return getFirestore(); }
async function all(name){ const s=await store().collection(name).get(); return s.docs.map(d=>d.data()); }
async function byId(name,id){ const s=await store().collection(name).doc(String(id)).get(); return s.exists?s.data():null; }
async function nextId(name){ const ref=store().collection('_counters').doc(name); return store().runTransaction(async tx=>{const d=await tx.get(ref);const n=(d.exists?Number(d.data().value):0)+1;tx.set(ref,{value:n},{merge:true});return n;}); }
async function create(name,data,id){ const ref=store().collection(name).doc(id===undefined?undefined:String(id)); await ref.set({...data,[`${name.slice(0,-1)}_id`]:id===undefined?ref.id:id}); return ref.id; }
async function put(name,id,data){await store().collection(name).doc(String(id)).set(data,{merge:true});}
async function remove(name,id){await store().collection(name).doc(String(id)).delete();}
async function find(name,field,value){const s=await store().collection(name).where(field,'==',value).get();return s.docs.map(d=>d.data());}
module.exports={store,all,byId,nextId,create,put,remove,find};
