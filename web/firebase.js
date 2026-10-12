// ==========================================
// DATACARE HMS - FIREBASE CONFIGURATION
// ==========================================

// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ==========================================
// YOUR FIREBASE CONFIGURATION
// ==========================================
// Replace the values below with the Firebase
// configuration from your Firebase Console.
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDg77KeOEQHIcJt7S5Ff2J27VNopV3QRfc",
  authDomain: "datacare-hms.firebaseapp.com",
  projectId: "datacare-hms",
  storageBucket: "datacare-hms.firebasestorage.app",
  messagingSenderId: "865999563261",
  appId: "1:865999563261:web:a7b17dba477911fb0d5194",
  measurementId: "G-0MJLFPQ7FE"
};


// ==========================================
// INITIALIZE FIREBASE
// ==========================================

const app = initializeApp(firebaseConfig);


// ==========================================
// FIREBASE AUTHENTICATION
// ==========================================

const auth = getAuth(app);


// ==========================================
// FIRESTORE DATABASE
// ==========================================

const db = getFirestore(app);


// ==========================================
// EXPORT SERVICES
// ==========================================

export {
    app,
    auth,
    db
};