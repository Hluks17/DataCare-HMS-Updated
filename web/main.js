
import { auth, API_BASE } from './firebase.js';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

let currentUser=null, token=null, registering=false, loginPending=false;
const $=id=>document.getElementById(id);
window.showNotification=(message,type)=>notice(message,type);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'R'+Number(v||0).toFixed(2);
function notice(message,type='success'){
 let el=$('notification');
 if(!el){
  el=document.createElement('div');
  el.id='notification';
  el.className='notification-popup';
  el.setAttribute('role',type==='error'?'alert':'status');
  el.setAttribute('aria-live',type==='error'?'assertive':'polite');
  document.body.appendChild(el);
 }
 el.textContent=message;
 el.className='notification-popup show '+type;
 if(notice.timer)clearTimeout(notice.timer);
 notice.timer=setTimeout(()=>el.classList.remove('show'),6000);
}

function authErrorMessage(err){
 const messages={
  'auth/invalid-credential':'Login failed: the email address or password is incorrect.',
  'auth/wrong-password':'Login failed: the password is incorrect.',
  'auth/user-not-found':'Login failed: no account was found with that email address.',
  'auth/user-disabled':'Login failed: this account has been disabled. Please contact the administrator.',
  'auth/invalid-email':'Please enter a valid email address.',
  'auth/too-many-requests':'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed':'Connection problem. Check your internet connection and try again.',
  'auth/email-already-in-use':'Registration failed: an account already exists with this email address. Try logging in or use another email.',
  'auth/weak-password':'Registration failed: choose a stronger password.',
  'auth/operation-not-allowed':'This sign-in method is currently disabled. Please contact the administrator.'
 };
 return messages[err?.code]||err?.message||'Something went wrong. Please try again.';
}

async function api(path, options = {}) {
    const user = auth.currentUser;

    if (!user) {
        throw new Error('No Firebase user is signed in. Please log in again.');
    }

    token = await user.getIdToken(true);

    const res = await fetch(API_BASE + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            'Authorization': 'Bearer ' + token
        }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(
            data.error || data.errors?.join(', ') || `Request failed (${res.status})`
        );
    }

    return data;
}

function setAuthScreen(show){$('authScreen')?.style.setProperty('display',show?'flex':'none');$('application')?.style.setProperty('display',show?'none':'flex');}
window.showRegister=()=>{$('loginBox').style.display='none';$('registerBox').style.display='block';};
window.showLogin=()=>{$('registerBox').style.display='none';$('loginBox').style.display='block';};
window.logout=async()=>{await signOut(auth);currentUser=null;token=null;location.href=location.pathname.includes('/pages/')?'../index.html':'index.html';};

async function registerUser(e){
 e.preventDefault(); if(registering)return; registering=true;
 const b={first_name:$('registerFirstName').value.trim(),last_name:$('registerLastName').value.trim(),
  phone_number:$('registerPhone').value.trim(),id_number:$('registerIdNumber').value.trim(),
  email:$('registerEmail').value.trim().toLowerCase(),password:$('registerPassword').value};
 const strong=/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;
 if(!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(b.email)){notice('Enter a valid email address.','error');registering=false;return;}
 if(!strong.test(b.password)){notice('Password needs 10+ characters, uppercase, lowercase, a number and a special character.','error');registering=false;return;}
 if(!/^(?:0[678]\d{8}|\+27[678]\d{8})$/.test(b.phone_number.replace(/[\s()-]/g,''))){notice('Enter a valid South African cell number.','error');registering=false;return;}
 if(!/^\d{13}$/.test(b.id_number)){notice('South African ID must contain exactly 13 digits.','error');registering=false;return;}
 try{
  const cred=await createUserWithEmailAndPassword(auth,b.email,b.password);
  await sendEmailVerification(cred.user);
  token=await cred.user.getIdToken(true);
  const result=await api('/auth/register',{method:'POST',body:JSON.stringify(b)});
  await signOut(auth); token=null;
  $('registerForm').reset();window.showLogin();
  notice(result.message||'Registration submitted. Please verify your email sent to your email address and wait for administrator approval.');
 }catch(err){notice(authErrorMessage(err),'error');if(auth.currentUser && !currentUser)await signOut(auth).catch(()=>{});}
 finally{registering=false;}
}
async function loginUser(e){
 e.preventDefault();
 if(loginPending)return;
 loginPending=true;
 try{
  await signInWithEmailAndPassword(auth,$('loginEmail').value.trim(),$('loginPassword').value);
  // The success message is shown after the API confirms the account and loads its dashboard.
 }catch(err){
  loginPending=false;
  notice(authErrorMessage(err),'error');
 }
}
function bindAuthForms(){
 if($('loginForm')&&!$('loginForm').dataset.bound){$('loginForm').addEventListener('submit',loginUser);$('loginForm').dataset.bound='1';}
 if($('registerForm')&&!$('registerForm').dataset.bound){$('registerForm').addEventListener('submit',registerUser);$('registerForm').dataset.bound='1';}
}
function applyRoleNavigation(){
 const role=currentUser?.role;
 const access={
  admin:['dashboard','services','patient','appointments','prescriptions','billing','reports','users'],
  doctor:['dashboard','services','appointments','prescriptions'],
  patient:['dashboard','services','appointments','prescriptions','billing']
 };
 const allowed=new Set(access[role]||['dashboard']);
 const nav=document.querySelector('.sidebar-nav');
 if(!nav)return;
 nav.querySelectorAll('a[data-page]').forEach(link=>{
  const visible=allowed.has(link.dataset.page);
  link.hidden=!visible;
  link.setAttribute('aria-hidden',String(!visible));
  if(!visible)link.removeAttribute('aria-current');
 });
 nav.querySelectorAll('.nav-title').forEach(title=>{
  let next=title.nextElementSibling;
  let hasVisible=false;
  while(next&&!next.classList.contains('nav-title')){
   if(next.matches('a[data-page]')&&!next.hidden)hasVisible=true;
   next=next.nextElementSibling;
  }
  title.hidden=!hasVisible;
 });
}

function shell(){
 const main=document.querySelector('.main-content'); if(!main)return;
 main.querySelectorAll('.content-section,.dashboard-content').forEach(x=>x.style.display='none');
 let head=main.querySelector('.topbar');
 if(head){
  const h=head.querySelector('h1');if(h)h.textContent='DataCare Dashboard';
  const p=head.querySelector('p');if(p)p.textContent='Your secure hospital management workspace';
 }
 let root=$('datacareWorkspace');
 if(!root){root=document.createElement('section');root.id='datacareWorkspace';root.className='content-section';main.appendChild(root);}
 root.innerHTML=`<div class="dc-welcome"><div><h2>Welcome, ${esc(currentUser.full_name)}</h2><p>Signed in as <b>${esc(currentUser.role.toUpperCase())}</b> · Account-specific access is active.</p></div><span class="dc-id">${esc(currentUser.patient_number||currentUser.specialisation||'Staff account')}</span></div><div id="dcContent"></div>`;
 applyRoleNavigation();
}
const styles=`
<style>
#datacareWorkspace{padding:22px}.dc-welcome{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#eef4fb;border:1px solid #d5e2f0;padding:20px;border-radius:14px;margin-bottom:18px}.dc-welcome h2{margin:0 0 6px}.dc-welcome p{margin:0;color:#53677f}.dc-id{font-size:12px;font-weight:700;background:#fff;padding:9px 12px;border-radius:20px}
.dc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin:16px 0}.dc-card{background:#fff;border:1px solid #dce5ef;border-radius:13px;padding:18px;box-shadow:0 4px 18px #102a4612;min-width:0}.dc-card h3{margin:0 0 14px;color:#102b4e}.dc-card p{color:#5b6d82}.dc-card form{display:grid;gap:10px}.dc-card label{font-size:13px;font-weight:600;color:#263d59}.dc-card input,.dc-card select,.dc-card textarea{width:100%;padding:10px;border:1px solid #cbd8e6;border-radius:8px;font:inherit;background:#fff}.dc-card button,.dc-btn{border:0;border-radius:8px;padding:10px 14px;background:#1769aa;color:white;font-weight:700;cursor:pointer}.dc-card button.secondary{background:#5b6d82}.dc-card button.danger{background:#b42318}.dc-table-wrap{overflow:auto}.dc-table{border-collapse:collapse;width:100%;font-size:13px}.dc-table th,.dc-table td{padding:10px;border-bottom:1px solid #e0e8f1;text-align:left;white-space:nowrap}.dc-table th{background:#f1f5fa}.dc-actions{display:flex;gap:6px}.dc-actions button{padding:7px 9px}.dc-stat{font-size:25px;font-weight:800;color:#1769aa}.dc-muted{font-size:12px;color:#64758a}.dc-inline{display:flex;gap:8px;flex-wrap:wrap}.dc-inline>*{flex:1}.dc-empty{padding:20px;color:#64758a;text-align:center}.dc-note{padding:10px;background:#fff8e6;border-radius:8px;color:#72520a;font-size:13px}
 .dc-feature-page[hidden]{display:none!important}.dc-section-heading{display:flex;justify-content:space-between;align-items:flex-end;margin:4px 0 18px}.dc-section-heading h2{margin:0 0 5px;color:#102b4e;font-size:24px}.dc-section-heading p{margin:0;color:#64758a}.dc-feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}.dc-feature-grid>.dc-card{height:100%;min-width:0}.dc-feature-grid>.dc-card:only-child{grid-column:1/-1}.dc-report-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dc-report-stats p{margin:0;padding:12px;background:#f1f6fc;border-radius:8px}.sidebar-nav a.active{background:#1769aa!important;color:#fff!important;border-left:4px solid #60a5fa}.sidebar-nav a[hidden],.sidebar-nav .nav-title[hidden]{display:none!important}.dc-empty-state{grid-column:1/-1}@media(max-width:850px){.dc-feature-grid{grid-template-columns:1fr}.dc-welcome{align-items:flex-start;flex-direction:column}#datacareWorkspace{padding:14px}}
</style>`;
document.head.insertAdjacentHTML('beforeend',styles);


const featureLabels={
 dashboard:['Dashboard','Your hospital workspace at a glance.'],
 services:['Hospital Services','View the services offered by the hospital.'],
 patient:['Patient Management','Review patient records and manage registrations.'],
 appointments:['Appointments','View, request and manage appointments.'],
 prescriptions:['Prescriptions','Review and manage prescriptions.'],
 billing:['Billing System','Review invoices and payment records.'],
 reports:['Reports & Analytics','Review key hospital activity and totals.'],
 users:['User Management','Manage doctor accounts and hospital access.']
};
function showFeaturePage(page){
 const allowedLink=document.querySelector(`.sidebar-nav a[data-page="${page}"]`);
 const target=document.querySelector(`[data-feature-view="${page}"]`);
 if(!target||!allowedLink||allowedLink.hidden)return;
 document.querySelectorAll('[data-feature-view]').forEach(section=>section.hidden=section!==target);
 document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link=>{
  const active=link.dataset.page===page;
  link.classList.toggle('active',active);
  if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 });
 const heading=featureLabels[page]||featureLabels.dashboard;
 const topTitle=document.querySelector('.topbar h1');
 const topSubtitle=document.querySelector('.topbar p');
 if(topTitle)topTitle.textContent=heading[0];
 if(topSubtitle)topSubtitle.textContent=heading[1];
 const workspaceHeading=document.querySelector('#datacareWorkspace .dc-page-title');
 if(workspaceHeading)workspaceHeading.textContent=heading[0];
 const workspaceDescription=document.querySelector('#datacareWorkspace .dc-page-description');
 if(workspaceDescription)workspaceDescription.textContent=heading[1];
 history.replaceState(null,'','#'+page);
 document.querySelector('.main-content')?.scrollTo({top:0,behavior:'smooth'});
}
function setupFeatureViews(groups,extras={}){
 const host=$('dcContent');
 if(!host)return;
 const cards=Array.from(host.querySelectorAll('.dc-card'));
 const byTitle=new Map(cards.map(c=>[c.querySelector('h3')?.textContent.trim(),c]));
 const assigned=new Set();
 const wrapper=document.createElement('div');
 wrapper.id='dcFeatureViews';
 Object.entries(groups).forEach(([page,titles])=>{
  const section=document.createElement('section');
  section.className='dc-feature-page';
  section.dataset.featureView=page;
  const label=featureLabels[page]||featureLabels.dashboard;
  section.innerHTML=`<div class="dc-section-heading"><div><h2 class="dc-page-title">${label[0]}</h2><p class="dc-page-description">${label[1]}</p></div></div><div class="dc-feature-grid"></div>`;
  const grid=section.querySelector('.dc-feature-grid');
  titles.forEach(title=>{const c=byTitle.get(title);if(c){grid.appendChild(c);assigned.add(c);}});
  (extras[page]||[]).forEach(item=>{
   if(item instanceof Node){grid.appendChild(item);return;}
   const template=document.createElement('template');
   template.innerHTML=String(item).trim();
   if(template.content.firstElementChild)grid.appendChild(template.content.firstElementChild);
  });
  if(grid.children.length===0){grid.innerHTML='<div class="dc-card dc-empty-state">No information is available in this section yet.</div>';}
  wrapper.appendChild(section);
 });
 // Keep any card not explicitly assigned on the dashboard instead of losing content.
 const dashboard=wrapper.querySelector('[data-feature-view="dashboard"] .dc-feature-grid');
 cards.forEach(c=>{if(!assigned.has(c))dashboard?.appendChild(c);});
 host.replaceChildren(wrapper);
 const nav=document.querySelector('.sidebar-nav');
 if(nav&&!nav.dataset.featureBound){
  nav.addEventListener('click',e=>{
   const link=e.target.closest('a[data-page]');
   if(!link)return;
   e.preventDefault();
   showFeaturePage(link.dataset.page);
   document.querySelector('.sidebar')?.classList.remove('open');
  });
  nav.dataset.featureBound='1';
 }
 const initial=location.hash.slice(1);
 const valid=initial&&wrapper.querySelector(`[data-feature-view="${initial}"]`)&&!document.querySelector(`.sidebar-nav a[data-page="${initial}"]`)?.hidden?initial:'dashboard';
 showFeaturePage(valid);
}

function card(title,body){return `<div class="dc-card"><h3>${title}</h3>${body}</div>`;}
function table(headers,rows){return `<div class="dc-table-wrap"><table class="dc-table"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td class="dc-empty" colspan="${headers.length}">No records found.</td></tr>`}</tbody></table></div>`;}
function input(label,id,type='text',extra=''){return `<label>${label}<input id="${id}" type="${type}" ${extra} required></label>`;}
function select(label,id,opts){return `<label>${label}<select id="${id}" required><option value="">Choose...</option>${opts.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('')}</select></label>`;}
async function loadAdmin(){
 const [summary,regs,docs,pats,wards,services,meds,invoices]=await Promise.all([
  api('/reports/summary'),api('/admin/registrations'),api('/doctors'),api('/patients'),api('/admin/wards'),api('/services'),api('/medications'),api('/admin/invoices')
 ]);
 $('dcContent').innerHTML=`
 <div class="dc-grid">${[['Patients',summary.patients],['Doctors',summary.doctors],['Appointments',summary.appointments],['Prescriptions',summary.prescriptions]].map(([k,v])=>card(k,`<div class="dc-stat">${v}</div>`)).join('')}</div>
 <div class="dc-grid">
 ${card('Pending patient registrations',table(['Patient','Email','Cell','ID number','Action'],regs.map(u=>`<tr><td>${esc(u.first_name)} ${esc(u.last_name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone_number)}</td><td>${esc(u.id_number)}</td><td class="dc-actions"><button data-approve="${u.user_id}">Approve</button><button class="danger" data-reject="${u.user_id}">Reject</button></td></tr>`).join('')))}
 ${card('Add a doctor',`<form id="doctorForm">${input('First name','docFirst')}${input('Surname','docLast')}${input('Email','docEmail','email')}${input('Cell number','docPhone','tel')}${input('Specialisation','docSpec')}${input('Department','docDept')}${input('Temporary password','docPass','password','minlength="10"')}<button>Add doctor login</button><p class="dc-muted">The doctor account is created by an administrator. Share the temporary password securely.</p></form>`)}
 ${card('Register a patient',`<form id="patientAdminForm">${input('First name','patFirst')}${input('Surname','patLast')}${input('Cell number','patPhone','tel')}${input('South African ID number','patId','text','maxlength="13" minlength="13"') }<button>Add patient</button><p class="dc-muted">This creates a hospital patient record and patient number, not a login account.</p></form>`)}
 ${card('Add a ward bed',`<form id="wardForm">${input('Ward name','wardName')}${input('Bed number','bedNo','number','min="1"')}<button>Add bed</button></form>`)}
 ${card('Allocate a patient to a ward',`<form id="admitForm">${select('Patient','admitPatient',pats.map(p=>({value:p.patient_id,label:`${p.patient_number} — ${p.first_name} ${p.last_name}`})))}${select('Available bed','admitWard',wards.filter(w=>w.status==='Available').map(w=>({value:w.ward_id,label:`${w.ward_name} / Bed ${w.bed_number}`})))}${select('Responsible doctor','admitDoctor',docs.map(d=>({value:d.doctor_id,label:`${d.full_name} — ${d.specialisation}`})))}${input('Admission date','admitDate','date')}<button>Allocate ward</button></form>`)}
 ${card('Create a prescription and bill',`<form id="adminRxForm">${select('Patient','adminRxPatient',pats.map(p=>({value:p.patient_id,label:`${p.patient_number} — ${p.first_name} ${p.last_name}`})))}${select('Doctor','adminRxDoctor',docs.map(d=>({value:d.doctor_id,label:`${d.full_name} — ${d.specialisation}`})))}${select('Consultation/service','adminRxService',services.map(s=>({value:s.service_id,label:`${s.name} (${money(s.price)})`})))}${select('Medication','adminRxMedication',meds.map(m=>({value:m.medication_id,label:`${m.name} ${m.strength||''} (${money(m.unit_price)})`})))}${input('Quantity','adminRxQty','number','min="1" value="1"')}${input('Dosage instructions','adminRxDosage')}<button>Create prescription and bill</button></form>`)}
 ${card('Book an appointment for a patient',`<form id="adminAppointmentForm">${select('Patient','adminApPatient',pats.map(p=>({value:p.patient_id,label:`${p.patient_number} — ${p.first_name} ${p.last_name}`})))}${select('Doctor','adminApDoctor',docs.map(d=>({value:d.doctor_id,label:`${d.full_name} — ${d.specialisation}`})))}${input('Date','adminApDate','date')}${input('Time','adminApTime','time')}<button>Book appointment</button></form>`)}
 </div>
 <div class="dc-grid">${card('Doctors',table(['Doctor','Specialisation','Availability'],docs.map(d=>`<tr><td>${esc(d.full_name)}</td><td>${esc(d.specialisation)}</td><td>${esc(d.availability)}</td></tr>`).join('')))}${card('Patient directory',table(['Patient number','Name','Cell'],pats.map(p=>`<tr><td>${esc(p.patient_number)}</td><td>${esc(p.first_name)} ${esc(p.last_name)}</td><td>${esc(p.phone_number)}</td></tr>`).join('')))}${card('Billing records',table(['Invoice','Patient','Date','Total','Status'],invoices.map(i=>`<tr><td>${esc(i.invoice_number)}</td><td>${esc(i.patient_number)} — ${esc(i.patient_name)}</td><td>${esc(i.billing_date)}</td><td>${money(i.total)}</td><td>${esc(i.payment_status)}</td></tr>`).join('')))}</div>`;
 const extraAdmin={
  services:[card('Hospital services',table(['Service','Description','Price'],services.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.description||'')}</td><td>${money(s.price)}</td></tr>`).join('')))],
  reports:[card('Hospital activity summary',`<div class="dc-report-stats"><p><b>Patients:</b> ${Number(summary.patients)||0}</p><p><b>Doctors:</b> ${Number(summary.doctors)||0}</p><p><b>Appointments:</b> ${Number(summary.appointments)||0}</p><p><b>Prescriptions:</b> ${Number(summary.prescriptions)||0}</p></div>`)]
 };
 setupFeatureViews({dashboard:['Patients','Doctors','Appointments','Prescriptions'],patient:['Pending patient registrations','Register a patient','Patient directory','Add a ward bed','Allocate a patient to a ward'],users:['Add a doctor','Doctors'],appointments:['Book an appointment for a patient'],prescriptions:['Create a prescription and bill'],billing:['Billing records'],services:[],reports:[]},extraAdmin);
 $('dcContent').querySelectorAll('[data-approve],[data-reject]').forEach(b=>b.onclick=async()=>{try{await api('/admin/registrations/'+(b.dataset.approve||b.dataset.reject),{method:'PATCH',body:JSON.stringify({status:b.dataset.approve?'Approved':'Rejected'})});notice('Registration updated.');loadAdmin();}catch(e){notice(e.message,'error');}});
 bindForm('doctorForm',async()=>{await api('/admin/doctors',{method:'POST',body:JSON.stringify({first_name:$('docFirst').value,last_name:$('docLast').value,email:$('docEmail').value,phone_number:$('docPhone').value,specialisation:$('docSpec').value,department_name:$('docDept').value,temporary_password:$('docPass').value})});notice('Success! The doctor account has been created.','success');await loadAdmin();});
 bindForm('patientAdminForm',async()=>{await api('/admin/patients',{method:'POST',body:JSON.stringify({first_name:$('patFirst').value,last_name:$('patLast').value,phone_number:$('patPhone').value,id_number:$('patId').value})});notice('Success! The patient record has been added.','success');await loadAdmin();});
 bindForm('wardForm',async()=>{await api('/admin/wards',{method:'POST',body:JSON.stringify({ward_name:$('wardName').value,bed_number:Number($('bedNo').value)})});notice('Ward bed added.');loadAdmin();});
 bindForm('admitForm',async()=>{await api('/admin/admissions',{method:'POST',body:JSON.stringify({patient_id:Number($('admitPatient').value),ward_id:Number($('admitWard').value),doctor_id:Number($('admitDoctor').value)||null,admission_date:$('admitDate').value})});notice('Ward allocated.');loadAdmin();});
 bindForm('adminRxForm',async()=>{await api('/prescriptions',{method:'POST',body:JSON.stringify({patient_id:Number($('adminRxPatient').value),doctor_id:Number($('adminRxDoctor').value),service_id:Number($('adminRxService').value),items:[{medication_id:Number($('adminRxMedication').value),quantity:Number($('adminRxQty').value),dosage:$('adminRxDosage').value}]})});notice('Prescription and bill created.');loadAdmin();});
 bindForm('adminAppointmentForm',async()=>{await api('/admin/appointments',{method:'POST',body:JSON.stringify({patient_id:Number($('adminApPatient').value),doctor_id:Number($('adminApDoctor').value),appointment_date:$('adminApDate').value,appointment_time:$('adminApTime').value})});notice('Appointment booked and patient notified.');loadAdmin();});
}
function bindForm(id,fn){
 const f=$(id);
 if(f)f.onsubmit=async e=>{
  e.preventDefault();
  const submit=f.querySelector('button[type="submit"]')||f.querySelector('button');
  if(submit){submit.disabled=true;submit.dataset.originalText=submit.textContent;submit.textContent='Please wait...';}
  try{await fn();}
  catch(err){notice(err.message||'The action could not be completed. Please check the information and try again.','error');}
  finally{
   if(submit){submit.disabled=false;submit.textContent=submit.dataset.originalText||'Submit';}
  }
 };
}
async function loadDoctor(){
 const [appointments,pats,meds,services]=await Promise.all([api('/appointments/doctor'),api('/patients'),api('/medications'),api('/services')]);
 $('dcContent').innerHTML=`<div class="dc-grid">
 ${card('Appointment requests and schedule',table(['Patient','Patient no.','Date','Time','Status','Action'],appointments.map(a=>`<tr><td>${esc(a.patient_name)}</td><td>${esc(a.patient_number)}</td><td>${esc(a.appointment_date)}</td><td>${esc(a.appointment_time)}</td><td>${esc(a.status)}</td><td class="dc-actions">${a.status==='Pending'?`<input type="date" id="confirmDate${a.appointment_id}" value="${esc(a.appointment_date)}"><input type="time" id="confirmTime${a.appointment_id}" value="${esc(String(a.appointment_time).slice(0,5))}"><button data-confirm="${a.appointment_id}">Confirm</button>`:''}${a.status==='Confirmed'?`<button class="secondary" data-complete="${a.appointment_id}">Complete</button>`:''}</td></tr>`).join('')))}
 ${card('Prescribe medication and create bill',`<form id="rxForm">${select('Patient','rxPatient',pats.map(p=>({value:p.patient_id,label:`${p.patient_number} — ${p.first_name} ${p.last_name}`})))}${select('Consultation/service','rxService',services.map(s=>({value:s.service_id,label:`${s.name} (${money(s.price)})`})))}${select('Medication','rxMedication',meds.map(m=>({value:m.medication_id,label:`${m.name} ${m.strength||''} (${money(m.unit_price)})`})))}${input('Quantity','rxQty','number','min="1" value="1"')}${input('Dosage instructions','rxDosage') }<label>Notes<textarea id="rxNotes"></textarea></label><button>Issue prescription</button><p class="dc-muted">Medication is added to the patient's bill only if the patient chooses it during payment.</p></form>`)}
 </div>`;
 const extraDoctor={dashboard:[card('Your schedule',`<div class="dc-report-stats"><p><b>Total appointments:</b> ${appointments.length}</p><p><b>Pending requests:</b> ${appointments.filter(a=>a.status==='Pending').length}</p></div>`)],services:[card('Hospital services',table(['Service','Description','Price'],services.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.description||'')}</td><td>${money(s.price)}</td></tr>`).join('')))]};
 setupFeatureViews({dashboard:[],appointments:['Appointment requests and schedule'],prescriptions:['Prescribe medication and create bill'],services:[]},extraDoctor);
 $('dcContent').querySelectorAll('[data-confirm]').forEach(b=>b.onclick=async()=>{try{await api('/appointments/'+b.dataset.confirm+'/confirm',{method:'PATCH',body:JSON.stringify({ward_allocation:'',appointment_date:$('confirmDate'+b.dataset.confirm).value,appointment_time:$('confirmTime'+b.dataset.confirm).value})});notice('Appointment confirmed; patient notified.');loadDoctor();}catch(e){notice(e.message,'error');}});
 $('dcContent').querySelectorAll('[data-complete]').forEach(b=>b.onclick=async()=>{try{await api('/appointments/'+b.dataset.complete+'/status',{method:'PATCH',body:JSON.stringify({status:'Completed'})});notice('Appointment updated.');loadDoctor();}catch(e){notice(e.message,'error');}});
 bindForm('rxForm',async()=>{await api('/prescriptions',{method:'POST',body:JSON.stringify({patient_id:Number($('rxPatient').value),service_id:Number($('rxService').value),items:[{medication_id:Number($('rxMedication').value),quantity:Number($('rxQty').value),dosage:$('rxDosage').value}],notes:$('rxNotes').value})});notice('Prescription issued and consultation bill created.');loadDoctor();});
}
async function loadPatient(){
 const [profile,doctors,appointments,prescriptions,invoices,services]=await Promise.all([api('/patients/me'),api('/doctors'),api('/appointments/mine'),api('/prescriptions/mine'),api('/invoices/mine'),api('/services')]);
 $('dcContent').innerHTML=`<div class="dc-grid">
 ${card('My patient details',`<p><b>Patient number:</b> ${esc(profile.patient_number)}</p><p><b>Name:</b> ${esc(profile.first_name)} ${esc(profile.last_name)}</p><p><b>Cell:</b> ${esc(profile.phone_number)}</p>`)}
 ${card('Request an appointment',`<form id="patientAppointmentForm">${select('Choose a doctor','patientDoctor',doctors.map(d=>({value:d.doctor_id,label:`${d.full_name} — ${d.specialisation}`})))}${input('Preferred date','patientDate','date')}${input('Preferred time','patientTime','time')}<button>Send appointment request</button><p class="dc-muted">Your appointment is not confirmed until the doctor accepts it.</p></form>`)}
 ${card('My appointments',table(['Doctor','Speciality','Date','Time','Ward','Status'],appointments.map(a=>`<tr><td>${esc(a.doctor_name)}</td><td>${esc(a.specialisation)}</td><td>${esc(a.appointment_date)}</td><td>${esc(a.appointment_time)}</td><td>${esc(a.ward_allocation||'Not allocated')}</td><td>${esc(a.status)}</td></tr>`).join('')))}
 ${card('My prescriptions',table(['Date','Doctor','Medication / instructions'],prescriptions.map(p=>`<tr><td>${esc(p.prescription_date)}</td><td>${esc(p.doctor_name)}</td><td>${(p.items||[]).map(i=>`${esc(i.medication)} ${esc(i.strength)} — ${esc(i.dosage)} (x${i.quantity})`).join('<br>')}</td></tr>`).join('')))}
 ${card('My bills',table(['Invoice','Date','Total','Status','Action'],invoices.map(i=>`<tr><td>${esc(i.invoice_number)}</td><td>${esc(i.billing_date)}</td><td>${money(i.total)}</td><td>${esc(i.payment_status)}</td><td>${i.payment_status!=='Paid'?`<button data-pay="${i.invoice_id}">View / Pay</button>`:'Paid'}</td></tr>`).join('')))}
 </div><div id="paymentPanel"></div>`;
 const extraPatient={services:[card('Hospital services',table(['Service','Description','Price'],services.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.description||'')}</td><td>${money(s.price)}</td></tr>`).join('')))]};
 setupFeatureViews({dashboard:['My patient details'],appointments:['Request an appointment','My appointments'],prescriptions:['My prescriptions'],billing:['My bills'],services:[]},extraPatient);
 bindForm('patientAppointmentForm',async()=>{await api('/appointments',{method:'POST',body:JSON.stringify({doctor_id:Number($('patientDoctor').value),appointment_date:$('patientDate').value,appointment_time:$('patientTime').value})});notice('Appointment request sent to the doctor.');loadPatient();});
 $('dcContent').querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>paymentForm(b.dataset.pay));
}
async function paymentForm(id){
 try{
  const inv=await api('/invoices/'+id);
  $('paymentPanel').innerHTML=card(`Pay invoice ${esc(inv.invoice_number)}`,`<p>Consultation and other charges: <b>${money(inv.total)}</b></p>${table(['Description','Qty','Unit price','Line total'],inv.lines.map(l=>`<tr><td>${esc(l.description)}</td><td>${l.quantity}</td><td>${money(l.unit_price)}</td><td>${money(l.line_total)}</td></tr>`).join(''))}<form id="payForm"><label><input type="checkbox" id="includeMeds"> Add prescribed medication to this bill</label><label>Payment method<select id="payMethod"><option value="Online Demo">Online demo payment</option><option value="Medical Aid">Medical aid</option></select></label><div id="aidFields" style="display:none">${input('Medical aid name','aidName')}${input('Medical aid membership number','aidNo')}</div><label><input type="checkbox" id="delivery"> Deliver medication to my address</label><div id="deliveryFields" style="display:none">${input('Delivery address','deliveryAddress')}</div><p class="dc-note">This is a demonstration payment only. No real bank/card transaction takes place.</p><button>Confirm payment</button></form>`);
  $('payMethod').onchange=()=>{$('aidFields').style.display=$('payMethod').value==='Medical Aid'?'grid':'none';};
  $('delivery').onchange=()=>{$('deliveryFields').style.display=$('delivery').checked?'grid':'none';};
  $('includeMeds').onchange=()=>{if(!$('includeMeds').checked){$('delivery').checked=false;$('deliveryFields').style.display='none';}};
  bindForm('payForm',async()=>{const include=$('includeMeds').checked;const paid=await api('/invoices/'+id+'/pay',{method:'POST',body:JSON.stringify({payment_method:$('payMethod').value,medical_aid_name:$('aidName')?.value,medical_aid_number:$('aidNo')?.value,medication_included:include,delivery_required:include&&$('delivery').checked,delivery_address:$('deliveryAddress')?.value})});notice(`Payment recorded: ${money(paid.amount_paid)}. ${paid.message}`);loadPatient();});
 }catch(e){notice(e.message,'error');}
}
async function loadNotifications(){
 try{const ns=await api('/notifications');if(!ns.length)return;const host=$('dcContent');const dashboard=host.querySelector('[data-feature-view="dashboard"] .dc-feature-grid');if(dashboard)dashboard.insertAdjacentHTML('beforeend',card('Notifications',ns.map(n=>`<p>${esc(n.message)} <span class="dc-muted">${esc(n.created_at)}</span></p>`).join('')));}catch{}
}
async function loadWorkspace(){
 shell();
 if(currentUser.role==='admin')await loadAdmin();
 else if(currentUser.role==='doctor')await loadDoctor();
 else if(currentUser.role==='patient')await loadPatient();
 await loadNotifications();
}

function bindITSupport(){
 const trigger=$('itSupportCard');
 if(!trigger||trigger.dataset.bound)return;
 trigger.dataset.bound='1';
 const open=()=>{
  if($('itSupportDialog'))return;
  const overlay=document.createElement('div');
  overlay.id='itSupportDialog';
  overlay.className='dc-support-overlay';
  overlay.setAttribute('role','presentation');
  overlay.innerHTML=`<section class="dc-support-dialog" role="dialog" aria-modal="true" aria-labelledby="dcSupportTitle" aria-describedby="dcSupportMessage"><button type="button" class="dc-support-close" aria-label="Close">&times;</button><div class="dc-support-icon"><i class="fa-solid fa-headset" aria-hidden="true"></i></div><h2 id="dcSupportTitle">IT Support</h2><p id="dcSupportMessage">Need assistance? Contact system administrator on whatsapp 0614537875 for help.</p><button type="button" class="dc-support-ok">OK</button></section>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('.dc-support-close').addEventListener('click',close);
  overlay.querySelector('.dc-support-ok').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  overlay.querySelector('.dc-support-ok').focus();
  overlay._escapeHandler=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',overlay._escapeHandler);}};
  document.addEventListener('keydown',overlay._escapeHandler);
 };
 trigger.addEventListener('click',open);
 trigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
}

bindAuthForms();
bindITSupport();
onAuthStateChanged(auth,async user=>{
 if(registering)return;
 if(!user){currentUser=null;token=null;if(location.pathname.toLowerCase().includes('/pages/')){location.href='../index.html';return;}setAuthScreen(true);return;}
 try{
  token=await user.getIdToken(true);
  currentUser=await api('/auth/me');
  setAuthScreen(false);
  document.querySelectorAll('#currentUserName').forEach(e=>e.textContent=currentUser.full_name);
  document.querySelectorAll('#currentUserRole').forEach(e=>e.textContent=currentUser.role);
  await loadWorkspace();
  if(loginPending){
   notice('Login successful. Welcome to DataCare!','success');
   loginPending=false;
  }
 }catch(e){
  loginPending=false;
  notice(e.message||'Login failed. The system could not load your account.','error');
  currentUser=null;token=null;await signOut(auth).catch(()=>{});setAuthScreen(true);
 }
});
