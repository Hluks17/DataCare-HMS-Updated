// ============================================================
// DATACARE HOSPITAL MANAGEMENT SYSTEM
// main.js
// ============================================================

// ============================================================
// FIREBASE IMPORTS
// ============================================================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ============================================================
// ROLE PERMISSIONS
// ============================================================

const rolePermissions = {

    "Patient": [
        "dashboard",
        "services",
        "appointments",
        "prescriptions",
        "billing"
    ],

    "Receptionist": [
        "dashboard",
        "services",
        "patient",
        "appointments"
    ],

    "Doctor": [
        "dashboard",
        "patient",
        "appointments",
        "prescriptions",
        "reports"
    ],

    "Nurse": [
        "dashboard",
        "patient",
        "appointments"
    ],

    "Pharmacist": [
        "dashboard",
        "prescriptions"
    ],

    "Billing Clerk": [
        "dashboard",
        "billing",
        "reports"
    ],

    "Hospital Manager": [
        "dashboard",
        "services",
        "patient",
        "appointments",
        "prescriptions",
        "billing",
        "reports"
    ],

    "System Administrator": [
        "dashboard",
        "services",
        "patient",
        "appointments",
        "prescriptions",
        "billing",
        "reports",
        "users"
    ]

};


// ============================================================
// CURRENT USER INFORMATION
// ============================================================

let currentUser = null;
let currentUserData = null;
let registrationInProgress = false;

// ============================================================
// PAGE INFORMATION
// ============================================================

function getCurrentPage() {

    const path = window.location.pathname.toLowerCase();

    if (path.endsWith("services.html")) {
        return "services";
    }

    if (path.endsWith("patient.html")) {
        return "patient";
    }

    if (path.endsWith("appointments.html")) {
        return "appointments";
    }

    if (path.endsWith("prescriptions.html")) {
        return "prescriptions";
    }

    if (path.endsWith("billing.html")) {
        return "billing";
    }

    if (path.endsWith("reports.html")) {
        return "reports";
    }

    return "dashboard";
}


// ============================================================
// CHECK WHETHER CURRENT PAGE IS INSIDE /pages/
// ============================================================

function isInsidePagesFolder() {

    return window.location.pathname
        .toLowerCase()
        .includes("/pages/");

}


// ============================================================
// GET INDEX PAGE PATH
// ============================================================

function getIndexPath() {

    if (isInsidePagesFolder()) {
        return "../index.html";
    }

    return "index.html";

}


// ============================================================
// GET LOGIN SCREEN
// ============================================================

function showLoginPage() {

    const authScreen =
        document.getElementById("authScreen");

    const application =
        document.getElementById("application");


    if (authScreen) {

        authScreen.style.display = "flex";

    }


    if (application) {

        application.style.display = "none";

    }

}


// ============================================================
// SHOW APPLICATION
// ============================================================

function showApplication() {

    const authScreen =
        document.getElementById("authScreen");

    const application =
        document.getElementById("application");


    if (authScreen) {

        authScreen.style.display = "none";

    }


    if (application) {

        application.style.display = "flex";

    }

}


// ============================================================
// SHOW LOGIN BOX
// ============================================================

window.showLogin = function () {

    const loginBox =
        document.getElementById("loginBox");

    const registerBox =
        document.getElementById("registerBox");


    if (loginBox) {

        loginBox.style.display = "block";

    }


    if (registerBox) {

        registerBox.style.display = "none";

    }

};


// ============================================================
// SHOW REGISTER BOX
// ============================================================

window.showRegister = function () {

    const loginBox =
        document.getElementById("loginBox");

    const registerBox =
        document.getElementById("registerBox");


    if (loginBox) {

        loginBox.style.display = "none";

    }


    if (registerBox) {

        registerBox.style.display = "block";

    }

};


// ============================================================
// NOTIFICATION
// ============================================================

window.showNotification = function (
    message,
    type = "success"
) {

    const notification =
        document.getElementById("notification");

    const notificationMessage =
        document.getElementById(
            "notificationMessage"
        );


    if (
        !notification ||
        !notificationMessage
    ) {

        alert(message);

        return;

    }


    notificationMessage.textContent =
        message;


    notification.classList.remove(
        "error"
    );


    if (type === "error") {

        notification.classList.add(
            "error"
        );

    }


    notification.classList.add(
        "show"
    );


    setTimeout(() => {

        notification.classList.remove(
            "show"
        );

    }, 3500);

};


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// FORMAT CURRENCY
// ============================================================

function formatCurrency(value) {

    const number =
        Number(value) || 0;


    return new Intl.NumberFormat(
        "en-ZA",
        {
            style: "currency",
            currency: "ZAR"
        }
    ).format(number);

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

    if (!value) {

        return "-";

    }


    try {

        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;

        }


        return date.toLocaleDateString(
            "en-ZA"
        );

    } catch (error) {

        return value;

    }

}


// ============================================================
// DISPLAY CURRENT DATE
// ============================================================

function displayCurrentDate() {

    const dateElement =
        document.getElementById(
            "currentDate"
        );


    if (!dateElement) {

        return;

    }


    const today =
        new Date();


    dateElement.textContent =
        today.toLocaleDateString(
            "en-ZA",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );

}


// ============================================================
// GENERATE SIMPLE ID
// ============================================================

function generateID(prefix) {

    const randomNumber =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    return `${prefix}-${randomNumber}`;

}


// ============================================================
// UPDATE USER INFORMATION ON PAGE
// ============================================================

function updateUserInformation() {

    if (!currentUserData) {

        return;

    }


    const firstName =
        currentUserData.firstName || "";


    const lastName =
        currentUserData.lastName || "";


    const fullName =
        `${firstName} ${lastName}`
            .trim() ||
        "User";


    const role =
        currentUserData.role ||
        "User";


    document
        .querySelectorAll(
            "#currentUserName"
        )
        .forEach(element => {

            element.textContent =
                fullName;

        });


    document
        .querySelectorAll(
            "#currentUserRole"
        )
        .forEach(element => {

            element.textContent =
                role;

        });

}


// ============================================================
// HIDE UNAUTHORIZED NAVIGATION LINKS
// ============================================================

function applyRolePermissions() {

    if (!currentUserData) {

        return;

    }


    const role =
        currentUserData.role;


    const allowedPages =
        rolePermissions[role] ||
        ["dashboard"];


    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(link => {

            const page =
                link.getAttribute(
                    "data-page"
                );


            if (!page) {

                return;

            }


            if (
                allowedPages.includes(
                    page
                )
            ) {

                link.style.display = "";

            } else {

                link.style.display = "none";

            }

        });


    // --------------------------------------------------------
    // SYSTEM TITLE
    // --------------------------------------------------------

    document
        .querySelectorAll(
            ".nav-title"
        )
        .forEach(title => {

            const text =
                title.textContent
                    .trim()
                    .toUpperCase();


            if (text === "SYSTEM") {

                const usersLink =
                    document.querySelector(
                        '[data-page="users"]'
                    );


                if (
                    !usersLink ||
                    usersLink.style.display ===
                    "none"
                ) {

                    title.style.display =
                        "none";

                } else {

                    title.style.display = "";

                }

            }

        });


    // --------------------------------------------------------
    // PROTECT CURRENT PAGE
    // --------------------------------------------------------

    const currentPage =
        getCurrentPage();


    if (
        !allowedPages.includes(
            currentPage
        )
    ) {

        showNotification(
            "You do not have permission to access this page.",
            "error"
        );


        setTimeout(() => {

            window.location.href =
                getIndexPath();

        }, 700);


        return;

    }

}


// ============================================================
// ACTIVE SIDEBAR LINK
// ============================================================

function setActiveNavigation() {

    const currentPage =
        getCurrentPage();


    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(link => {

            const page =
                link.getAttribute(
                    "data-page"
                );


            if (
                page === currentPage
            ) {

                link.classList.add(
                    "active"
                );

            } else {

                link.classList.remove(
                    "active"
                );

            }

        });

}


/* =========================================================
   MOBILE SIDEBAR MENU
========================================================= */

function setupMobileMenu() {

    const sidebar = document.querySelector(".sidebar");

    if (!sidebar) {
        return;
    }

    let overlay = document.getElementById("sidebarOverlay");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "sidebarOverlay";
        overlay.className = "sidebar-overlay";
        document.body.appendChild(overlay);
    }

    const menuButton = document.getElementById("mobileMenuBtn");

    function openMobileMenu() {
        sidebar.classList.add("mobile-open");
        overlay.classList.add("show");
        document.body.classList.add("menu-open");
    }

    function closeMobileMenu() {
        sidebar.classList.remove("mobile-open");
        overlay.classList.remove("show");
        document.body.classList.remove("menu-open");
    }

    function toggleMobileMenu() {
        if (sidebar.classList.contains("mobile-open")) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    /* Hamburger button */
    if (
        menuButton &&
        menuButton.dataset.initialized !== "true"
    ) {
        menuButton.addEventListener(
            "click",
            toggleMobileMenu
        );

        menuButton.dataset.initialized = "true";
    }

    /* Dark overlay */
    if (
        overlay.dataset.initialized !== "true"
    ) {
        overlay.addEventListener(
            "click",
            closeMobileMenu
        );

        overlay.dataset.initialized = "true";
    }

    /* Close menu after clicking a navigation link */
    const sidebarLinks =
        sidebar.querySelectorAll("a");

    sidebarLinks.forEach(function (link) {

        if (
            link.dataset.mobileClose !== "true"
        ) {

            link.addEventListener(
                "click",
                function () {

                    if (window.innerWidth <= 900) {
                        closeMobileMenu();
                    }

                }
            );

            link.dataset.mobileClose = "true";
        }

    });

}

// ============================================================
// NAVIGATION SETUP
// ============================================================

function setupNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(link => {

            const href =
                link.getAttribute(
                    "href"
                );


            if (
                !href ||
                href === "#"
            ) {

                if (
                    link.dataset.initialized ===
                    "true"
                ) {

                    return;

                }


                link.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        const message =
                            link.getAttribute(
                                "data-message"
                            );


                        if (message) {

                            showNotification(
                                message
                            );

                        }

                    }
                );


                link.dataset.initialized =
                    "true";

            }

        });

}


// ============================================================
// REGISTER USER
// ============================================================

async function registerUser() {

    const firstName =
        document.getElementById("registerFirstName").value.trim();

    const lastName =
        document.getElementById("registerLastName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;

    const role =
        document.getElementById("registerRole").value;


    // Validate fields
    if (!firstName ||
        !lastName ||
        !email ||
        !password ||
        !role) {

        showNotification(
            "Please complete all registration fields.",
            "error"
        );

        return;
    }


    // Validate password
    if (password.length < 6) {

        showNotification(
            "Password must be at least 6 characters.",
            "error"
        );

        return;
    }


    try {

        registrationInProgress = true;


        // Create Firebase account
        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        // Save user information to Firestore
        await setDoc(
            doc(db, "users", user.uid),
            {
                uid: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: email,
                role: role,
                createdAt: new Date().toISOString()
            }
        );


        // Registration completed
        showNotification(
            "Registration complete! You can now login.",
            "success"
        );


        // Firebase automatically logs the new user in.
        // Sign them out so they can login normally.
        await signOut(auth);


        // Clear registration form
        document.getElementById("registerForm").reset();


        // Show login screen
        showLogin();


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );


        let message =
            "Registration failed. Please try again.";


        if (error.code === "auth/email-already-in-use") {

            message =
                "This email is already registered.";

        }

        else if (error.code === "auth/invalid-email") {

            message =
                "Please enter a valid email address.";

        }

        else if (error.code === "auth/weak-password") {

            message =
                "Password is too weak. Use at least 6 characters.";

        }

        else if (error.code === "auth/network-request-failed") {

            message =
                "Network error. Please check your internet connection.";

        }


        showNotification(
            message,
            "error"
        );


    } finally {

        registrationInProgress = false;

    }

}


// ============================================================
// LOGIN USER
// ============================================================

async function loginUser(event) {

    event.preventDefault();


    const email =
        document
            .getElementById(
                "loginEmail"
            )
            ?.value
            .trim();


    const password =
        document
            .getElementById(
                "loginPassword"
            )
            ?.value;


    if (
        !email ||
        !password
    ) {

        showNotification(
            "Please enter your email and password.",
            "error"
        );

        return;

    }


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        showNotification(
            "Login successful."
        );


        const loginForm =
            document.getElementById(
                "loginForm"
            );


        if (loginForm) {

            loginForm.reset();

        }


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        let message =
            "Login failed. Please check your details.";


        switch (error.code) {

            case "auth/invalid-credential":

                message =
                    "Incorrect email or password.";

                break;


            case "auth/user-not-found":

                message =
                    "No account was found with this email.";

                break;


            case "auth/wrong-password":

                message =
                    "Incorrect password.";

                break;


            case "auth/invalid-email":

                message =
                    "Please enter a valid email address.";

                break;


            case "auth/user-disabled":

                message =
                    "This account has been disabled.";

                break;


            case "auth/too-many-requests":

                message =
                    "Too many login attempts. Please try again later.";

                break;


            case "auth/network-request-failed":

                message =
                    "Network error. Please check your internet connection.";

                break;


            default:

                if (
                    error.message
                ) {

                    console.error(
                        error.message
                    );

                }

        }


        showNotification(
            message,
            "error"
        );

    }

}


// ============================================================
// INITIALIZE AUTH FORMS
// ============================================================
//
// THIS IS THE IMPORTANT FIX.
//
// Login and registration must be initialized BEFORE
// Firebase detects a logged-in user.
//
// Previously these listeners were inside
// initializeCurrentPage(), which only ran after login.
// ============================================================

function initializeAuthForms() {

    const loginForm =
        document.getElementById(
            "loginForm"
        );


    if (
        loginForm &&
        loginForm.dataset.initialized !==
        "true"
    ) {

        loginForm.addEventListener(
            "submit",
            loginUser
        );


        loginForm.dataset.initialized =
            "true";

    }


    const registerForm =
        document.getElementById(
            "registerForm"
        );


    if (
        registerForm &&
        registerForm.dataset.initialized !==
        "true"
    ) {

        registerForm.addEventListener(
            "submit",
            registerUser
        );


        registerForm.dataset.initialized =
            "true";

    }

}


// ============================================================
// LOGOUT
// ============================================================

window.logout = async function () {

    try {

        await signOut(auth);


        currentUser = null;

        currentUserData = null;


        window.location.href =
            getIndexPath();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );


        showNotification(
            "Unable to logout. Please try again.",
            "error"
        );

    }

};


// ============================================================
// GET CURRENT USER PROFILE
// ============================================================

async function getUserProfile(user) {

    try {

        const userReference =
            doc(
                db,
                "users",
                user.uid
            );


        const userSnapshot =
            await getDoc(
                userReference
            );


        if (
            userSnapshot.exists()
        ) {

            return userSnapshot.data();

        }


        // ----------------------------------------------------
        // If profile doesn't exist, create a basic profile.
        // ----------------------------------------------------

        const basicProfile = {

            uid:
                user.uid,

            email:
                user.email || "",

            firstName:
                "User",

            lastName:
                "",

            role:
                "Patient",

            createdAt:
                new Date().toISOString()

        };


        await setDoc(
            userReference,
            basicProfile
        );


        return basicProfile;


    } catch (error) {

        console.error(
            "Unable to retrieve user profile:",
            error
        );


        return null;

    }

}


// ============================================================
// AUTHENTICATION STATE
// ============================================================

onAuthStateChanged(
    auth,
    async (user) => {

        // ----------------------------------------------------
        // ALWAYS INITIALIZE AUTH FORMS
        // ----------------------------------------------------

        initializeAuthForms();


        // ----------------------------------------------------
        // USER IS LOGGED IN
        // ----------------------------------------------------

        if (user) {

            currentUser =
                user;


            currentUserData =
                await getUserProfile(
                    user
                );


            if (!currentUserData) {

                showNotification(
                    "Unable to load your account information.",
                    "error"
                );


                showLoginPage();


                return;

            }


            showApplication();


            updateUserInformation();


            applyRolePermissions();


            setActiveNavigation();


            setupNavigation();


            displayCurrentDate();


            initializeCurrentPage();

        }


        // ----------------------------------------------------
        // USER IS NOT LOGGED IN
        // ----------------------------------------------------

        else {

            currentUser =
                null;


            currentUserData =
                null;


            // ------------------------------------------------
            // If user is on a protected page, return to index.
            // ------------------------------------------------

            if (
                isInsidePagesFolder()
            ) {

                window.location.href =
                    getIndexPath();


                return;

            }


            showLoginPage();


            // Make sure login forms are ready.
            initializeAuthForms();

        }

    }
);


// ============================================================
// PATIENT MANAGEMENT
// ============================================================

async function savePatient(event) {

    event.preventDefault();


    if (!currentUser) {

        showNotification(
            "Please login first.",
            "error"
        );

        return;

    }


    const firstName =
        document
            .getElementById(
                "patientFirstName"
            )
            ?.value
            .trim();


    const lastName =
        document
            .getElementById(
                "patientLastName"
            )
            ?.value
            .trim();


    const gender =
        document
            .getElementById(
                "patientGender"
            )
            ?.value;


    const dob =
        document
            .getElementById(
                "patientDOB"
            )
            ?.value;


    const phone =
        document
            .getElementById(
                "patientPhone"
            )
            ?.value
            .trim();


    const address =
        document
            .getElementById(
                "patientAddress"
            )
            ?.value
            .trim();


    const medicalHistory =
        document
            .getElementById(
                "medicalHistory"
            )
            ?.value
            .trim();


    const emergencyContact =
        document
            .getElementById(
                "emergencyContact"
            )
            ?.value
            .trim();


    if (
        !firstName ||
        !lastName ||
        !gender ||
        !dob ||
        !phone ||
        !address
    ) {

        showNotification(
            "Please complete all required patient fields.",
            "error"
        );

        return;

    }


    try {

        const patientID =
            generateID("PAT");


        await addDoc(
            collection(
                db,
                "patients"
            ),
            {

                patientID:
                    patientID,

                firstName:
                    firstName,

                lastName:
                    lastName,

                gender:
                    gender,

                dateOfBirth:
                    dob,

                phone:
                    phone,

                address:
                    address,

                medicalHistory:
                    medicalHistory,

                emergencyContact:
                    emergencyContact,

                createdBy:
                    currentUser.uid,

                createdAt:
                    new Date().toISOString()

            }
        );


        showNotification(
            "Patient registered successfully."
        );


        document
            .getElementById(
                "patientFormElement"
            )
            ?.reset();


        if (
            typeof window.hidePatientForm ===
            "function"
        ) {

            window.hidePatientForm();

        }


        await loadPatients();


        updateDashboardStatistics();


    } catch (error) {

        console.error(
            "Save patient error:",
            error
        );


        showNotification(
            "Unable to save patient record.",
            "error"
        );

    }

}


// ============================================================
// LOAD PATIENTS
// ============================================================

async function loadPatients() {

    const tableBody =
        document.getElementById(
            "patientTableBody"
        );


    if (!tableBody) {

        return;

    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "patients"
                )
            );


        tableBody.innerHTML =
            "";


        if (
            snapshot.empty
        ) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="empty-state">

                        <i class="fa-solid fa-users"></i>

                        <p>
                            No patient records found.
                        </p>

                    </td>

                </tr>

            `;


            return;

        }


        snapshot.forEach(
            documentSnapshot => {

                const patient =
                    documentSnapshot.data();


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHTML(
                            patient.patientID || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            `${patient.firstName || ""}
                             ${patient.lastName || ""}`
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            patient.gender || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(
                                patient.dateOfBirth
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            patient.phone || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            patient.emergencyContact || "-"
                        )}
                    </td>

                `;


                tableBody.appendChild(
                    row
                );

            }
        );


        setupPatientSearch();


    } catch (error) {

        console.error(
            "Load patients error:",
            error
        );


        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty-state">

                    Unable to load patient records.

                </td>

            </tr>

        `;

    }

}


// ============================================================
// PATIENT SEARCH
// ============================================================

function setupPatientSearch() {

    const searchInput =
        document.getElementById(
            "patientSearch"
        );


    if (!searchInput) {

        return;

    }


    if (
        searchInput.dataset.initialized ===
        "true"
    ) {

        return;

    }


    searchInput.dataset.initialized =
        "true";


    searchInput.addEventListener(
        "input",
        () => {

            const search =
                searchInput.value
                    .toLowerCase()
                    .trim();


            document
                .querySelectorAll(
                    "#patientTableBody tr"
                )
                .forEach(row => {

                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        text.includes(
                            search
                        )
                            ? ""
                            : "none";

                });

        }
    );

}


// ============================================================
// APPOINTMENTS
// ============================================================

async function saveAppointment(event) {

    event.preventDefault();


    if (!currentUser) {

        showNotification(
            "Please login first.",
            "error"
        );

        return;

    }


    const patient =
        document
            .getElementById(
                "appointmentPatient"
            )
            ?.value
            .trim();


    const doctor =
        document
            .getElementById(
                "appointmentDoctor"
            )
            ?.value
            .trim();


    const date =
        document
            .getElementById(
                "appointmentDate"
            )
            ?.value;


    const time =
        document
            .getElementById(
                "appointmentTime"
            )
            ?.value;


    const type =
        document
            .getElementById(
                "appointmentType"
            )
            ?.value;


    const ward =
        document
            .getElementById(
                "wardAllocation"
            )
            ?.value
            .trim();


    if (
        !patient ||
        !doctor ||
        !date ||
        !time ||
        !type
    ) {

        showNotification(
            "Please complete all required appointment fields.",
            "error"
        );

        return;

    }


    try {

        const appointmentID =
            generateID("APT");


        await addDoc(
            collection(
                db,
                "appointments"
            ),
            {

                appointmentID:
                    appointmentID,

                patient:
                    patient,

                doctor:
                    doctor,

                date:
                    date,

                time:
                    time,

                appointmentType:
                    type,

                wardAllocation:
                    ward,

                status:
                    "Confirmed",

                createdBy:
                    currentUser.uid,

                createdAt:
                    new Date().toISOString()

            }
        );


        showNotification(
            "Appointment saved successfully."
        );


        document
            .getElementById(
                "appointmentFormElement"
            )
            ?.reset();


        if (
            typeof window.hideAppointmentForm ===
            "function"
        ) {

            window.hideAppointmentForm();

        }


        await loadAppointments();


        updateDashboardStatistics();


    } catch (error) {

        console.error(
            "Save appointment error:",
            error
        );


        showNotification(
            "Unable to save appointment.",
            "error"
        );

    }

}


// ============================================================
// LOAD APPOINTMENTS
// ============================================================

async function loadAppointments() {

    const tableBody =
        document.getElementById(
            "appointmentTableBody"
        );


    if (!tableBody) {

        return;

    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "appointments"
                )
            );


        tableBody.innerHTML =
            "";


        if (
            snapshot.empty
        ) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="empty-state">

                        <i class="fa-solid fa-calendar-xmark"></i>

                        <p>
                            No appointments found.
                        </p>

                    </td>

                </tr>

            `;


            return;

        }


        snapshot.forEach(
            documentSnapshot => {

                const appointment =
                    documentSnapshot.data();


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHTML(
                            appointment.appointmentID || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            appointment.patient || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            appointment.doctor || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(
                                appointment.date
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            appointment.time || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            appointment.appointmentType || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            appointment.wardAllocation || "-"
                        )}
                    </td>

                    <td>

                        <span class="status pending">

                            ${escapeHTML(
                                appointment.status ||
                                "Confirmed"
                            )}

                        </span>

                    </td>

                `;


                tableBody.appendChild(
                    row
                );

            }
        );


        setupAppointmentSearch();


    } catch (error) {

        console.error(
            "Load appointments error:",
            error
        );

    }

}


// ============================================================
// APPOINTMENT SEARCH
// ============================================================

function setupAppointmentSearch() {

    const searchInput =
        document.getElementById(
            "appointmentSearch"
        );


    if (!searchInput) {

        return;

    }


    if (
        searchInput.dataset.initialized ===
        "true"
    ) {

        return;

    }


    searchInput.dataset.initialized =
        "true";


    searchInput.addEventListener(
        "input",
        () => {

            const search =
                searchInput.value
                    .toLowerCase()
                    .trim();


            document
                .querySelectorAll(
                    "#appointmentTableBody tr"
                )
                .forEach(row => {

                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        text.includes(
                            search
                        )
                            ? ""
                            : "none";

                });

        }
    );

}


// ============================================================
// PRESCRIPTIONS
// ============================================================

async function savePrescription(event) {

    event.preventDefault();


    if (!currentUser) {

        showNotification(
            "Please login first.",
            "error"
        );

        return;

    }


    const patient =
        document
            .getElementById(
                "prescriptionPatient"
            )
            ?.value
            .trim();


    const doctor =
        document
            .getElementById(
                "prescriptionDoctor"
            )
            ?.value
            .trim();


    const medication =
        document
            .getElementById(
                "medication"
            )
            ?.value
            .trim();


    const dosage =
        document
            .getElementById(
                "dosage"
            )
            ?.value
            .trim();


    const notes =
        document
            .getElementById(
                "prescriptionNotes"
            )
            ?.value
            .trim();


    const date =
        document
            .getElementById(
                "prescriptionDate"
            )
            ?.value;


    if (
        !patient ||
        !doctor ||
        !medication ||
        !dosage ||
        !date
    ) {

        showNotification(
            "Please complete all required prescription fields.",
            "error"
        );

        return;

    }


    try {

        const prescriptionID =
            generateID("RX");


        await addDoc(
            collection(
                db,
                "prescriptions"
            ),
            {

                prescriptionID:
                    prescriptionID,

                patientID:
                    patient,

                doctorID:
                    doctor,

                medication:
                    medication,

                dosage:
                    dosage,

                notes:
                    notes,

                prescriptionDate:
                    date,

                status:
                    "Active",

                createdBy:
                    currentUser.uid,

                createdAt:
                    new Date().toISOString()

            }
        );


        showNotification(
            "Prescription saved successfully."
        );


        document
            .getElementById(
                "prescriptionFormElement"
            )
            ?.reset();


        if (
            typeof window.hidePrescriptionForm ===
            "function"
        ) {

            window.hidePrescriptionForm();

        }


        await loadPrescriptions();


        updateDashboardStatistics();


    } catch (error) {

        console.error(
            "Save prescription error:",
            error
        );


        showNotification(
            "Unable to save prescription.",
            "error"
        );

    }

}


// ============================================================
// LOAD PRESCRIPTIONS
// ============================================================

async function loadPrescriptions() {

    const tableBody =
        document.getElementById(
            "prescriptionTableBody"
        );


    if (!tableBody) {

        return;

    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "prescriptions"
                )
            );


        tableBody.innerHTML =
            "";


        if (
            snapshot.empty
        ) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="empty-state">

                        <i class="fa-solid fa-prescription-bottle-medical"></i>

                        <p>
                            No prescriptions found.
                        </p>

                    </td>

                </tr>

            `;


            return;

        }


        snapshot.forEach(
            documentSnapshot => {

                const prescription =
                    documentSnapshot.data();


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHTML(
                            prescription.prescriptionID || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            prescription.patientID || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            prescription.doctorID || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            prescription.medication || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            prescription.dosage || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(
                                prescription.prescriptionDate
                            )
                        )}
                    </td>

                    <td>

                        <span class="status paid">

                            ${escapeHTML(
                                prescription.status ||
                                "Active"
                            )}

                        </span>

                    </td>

                `;


                tableBody.appendChild(
                    row
                );

            }
        );


        setupPrescriptionSearch();


    } catch (error) {

        console.error(
            "Load prescriptions error:",
            error
        );

    }

}


// ============================================================
// PRESCRIPTION SEARCH
// ============================================================

function setupPrescriptionSearch() {

    const searchInput =
        document.getElementById(
            "prescriptionSearch"
        );


    if (!searchInput) {

        return;

    }


    if (
        searchInput.dataset.initialized ===
        "true"
    ) {

        return;

    }


    searchInput.dataset.initialized =
        "true";


    searchInput.addEventListener(
        "input",
        () => {

            const search =
                searchInput.value
                    .toLowerCase()
                    .trim();


            document
                .querySelectorAll(
                    "#prescriptionTableBody tr"
                )
                .forEach(row => {

                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        text.includes(
                            search
                        )
                            ? ""
                            : "none";

                });

        }
    );

}


// ============================================================
// BILLING
// ============================================================

async function saveBilling(event) {

    event.preventDefault();


    if (!currentUser) {

        showNotification(
            "Please login first.",
            "error"
        );

        return;

    }


    const patient =
        document
            .getElementById(
                "billingPatient"
            )
            ?.value
            .trim();


    const invoiceNumber =
        document
            .getElementById(
                "invoiceNumber"
            )
            ?.value
            .trim();


    const consultationFee =
        Number(
            document
                .getElementById(
                    "consultationFee"
                )
                ?.value ||
            0
        );


    const medicationCost =
        Number(
            document
                .getElementById(
                    "medicationCost"
                )
                ?.value ||
            0
        );


    const medicalAid =
        document
            .getElementById(
                "medicalAid"
            )
            ?.value
            .trim();


    const paymentMethod =
        document
            .getElementById(
                "paymentMethod"
            )
            ?.value;


    const outstandingBalance =
        Number(
            document
                .getElementById(
                    "outstandingBalance"
                )
                ?.value ||
            0
        );


    if (
        !patient ||
        !invoiceNumber
    ) {

        showNotification(
            "Patient ID and invoice number are required.",
            "error"
        );

        return;

    }


    const total =
        consultationFee +
        medicationCost;


    let status =
        "Paid";


    if (
        outstandingBalance > 0
    ) {

        status =
            "Outstanding";

    }


    try {

        await addDoc(
            collection(
                db,
                "billing"
            ),
            {

                invoiceNumber:
                    invoiceNumber,

                patientID:
                    patient,

                consultationFee:
                    consultationFee,

                medicationCost:
                    medicationCost,

                totalAmount:
                    total,

                medicalAid:
                    medicalAid,

                paymentMethod:
                    paymentMethod,

                outstandingBalance:
                    outstandingBalance,

                status:
                    status,

                createdBy:
                    currentUser.uid,

                createdAt:
                    new Date().toISOString()

            }
        );


        showNotification(
            "Invoice saved successfully."
        );


        document
            .getElementById(
                "billingFormElement"
            )
            ?.reset();


        if (
            typeof window.hideBillingForm ===
            "function"
        ) {

            window.hideBillingForm();

        }


        await loadBilling();


        updateDashboardStatistics();


    } catch (error) {

        console.error(
            "Save billing error:",
            error
        );


        showNotification(
            "Unable to save invoice.",
            "error"
        );

    }

}


// ============================================================
// LOAD BILLING
// ============================================================

async function loadBilling() {

    const tableBody =
        document.getElementById(
            "billingTableBody"
        );


    if (!tableBody) {

        return;

    }


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "billing"
                )
            );


        tableBody.innerHTML =
            "";


        if (
            snapshot.empty
        ) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="empty-state">

                        <i class="fa-solid fa-file-invoice-dollar"></i>

                        <p>
                            No billing records found.
                        </p>

                    </td>

                </tr>

            `;


            updateBillingStatistics(
                []
            );


            return;

        }


        const records =
            [];


        snapshot.forEach(
            documentSnapshot => {

                const billing =
                    documentSnapshot.data();


                records.push(
                    billing
                );


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td>
                        ${escapeHTML(
                            billing.invoiceNumber || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            billing.patientID || "-"
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            billing.consultationFee
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            billing.medicationCost
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            billing.medicalAid || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            billing.paymentMethod || "-"
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            billing.outstandingBalance
                        )}
                    </td>

                    <td>

                        <span class="status pending">

                            ${escapeHTML(
                                billing.status || "-"
                            )}

                        </span>

                    </td>

                `;


                tableBody.appendChild(
                    row
                );

            }
        );


        updateBillingStatistics(
            records
        );


        setupBillingSearch();


    } catch (error) {

        console.error(
            "Load billing error:",
            error
        );

    }

}


// ============================================================
// BILLING STATISTICS
// ============================================================

function updateBillingStatistics(
    records
) {

    const totalInvoices =
        document.getElementById(
            "totalInvoices"
        );


    const paidInvoices =
        document.getElementById(
            "paidInvoices"
        );


    const outstandingInvoices =
        document.getElementById(
            "outstandingInvoices"
        );


    if (!records) {

        records =
            [];

    }


    const paid =
        records

            .filter(
                item =>
                    item.status ===
                    "Paid"
            )

            .reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.totalAmount ||
                        0
                    ),
                0
            );


    const outstanding =
        records

            .reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.outstandingBalance ||
                        0
                    ),
                0
            );


    if (totalInvoices) {

        totalInvoices.textContent =
            records.length;

    }


    if (paidInvoices) {

        paidInvoices.textContent =
            formatCurrency(
                paid
            );

    }


    if (outstandingInvoices) {

        outstandingInvoices.textContent =
            formatCurrency(
                outstanding
            );

    }

}


// ============================================================
// BILLING SEARCH
// ============================================================

function setupBillingSearch() {

    const searchInput =
        document.getElementById(
            "billingSearch"
        );


    if (!searchInput) {

        return;

    }


    if (
        searchInput.dataset.initialized ===
        "true"
    ) {

        return;

    }


    searchInput.dataset.initialized =
        "true";


    searchInput.addEventListener(
        "input",
        () => {

            const search =
                searchInput.value
                    .toLowerCase()
                    .trim();


            document
                .querySelectorAll(
                    "#billingTableBody tr"
                )
                .forEach(row => {

                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        text.includes(
                            search
                        )
                            ? ""
                            : "none";

                });

        }
    );

}


// ============================================================
// DASHBOARD STATISTICS
// ============================================================

async function updateDashboardStatistics() {

    const totalPatients =
        document.getElementById(
            "totalPatients"
        );


    const totalAppointments =
        document.getElementById(
            "totalAppointments"
        );


    const totalPrescriptions =
        document.getElementById(
            "totalPrescriptions"
        );


    const totalBilling =
        document.getElementById(
            "totalBilling"
        );


    if (
        !totalPatients &&
        !totalAppointments &&
        !totalPrescriptions &&
        !totalBilling
    ) {

        return;

    }


    try {

        const [
            patientsSnapshot,
            appointmentsSnapshot,
            prescriptionsSnapshot,
            billingSnapshot
        ] =
            await Promise.all([

                getDocs(
                    collection(
                        db,
                        "patients"
                    )
                ),

                getDocs(
                    collection(
                        db,
                        "appointments"
                    )
                ),

                getDocs(
                    collection(
                        db,
                        "prescriptions"
                    )
                ),

                getDocs(
                    collection(
                        db,
                        "billing"
                    )
                )

            ]);


        const billingRecords =
            [];


        billingSnapshot.forEach(
            snapshot => {

                billingRecords.push(
                    snapshot.data()
                );

            }
        );


        const totalRevenue =
            billingRecords.reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.totalAmount ||
                        0
                    ),
                0
            );


        if (totalPatients) {

            totalPatients.textContent =
                patientsSnapshot.size;

        }


        if (totalAppointments) {

            totalAppointments.textContent =
                appointmentsSnapshot.size;

        }


        if (totalPrescriptions) {

            totalPrescriptions.textContent =
                prescriptionsSnapshot.size;

        }


        if (totalBilling) {

            totalBilling.textContent =
                formatCurrency(
                    totalRevenue
                );

        }


        // ----------------------------------------------------
        // Reports
        // ----------------------------------------------------

        const reportPatients =
            document.getElementById(
                "reportPatients"
            );


        const reportAppointments =
            document.getElementById(
                "reportAppointments"
            );


        const reportPrescriptions =
            document.getElementById(
                "reportPrescriptions"
            );


        const reportRevenue =
            document.getElementById(
                "reportRevenue"
            );


        if (reportPatients) {

            reportPatients.textContent =
                patientsSnapshot.size;

        }


        if (reportAppointments) {

            reportAppointments.textContent =
                appointmentsSnapshot.size;

        }


        if (reportPrescriptions) {

            reportPrescriptions.textContent =
                prescriptionsSnapshot.size;

        }


        if (reportRevenue) {

            reportRevenue.textContent =
                formatCurrency(
                    totalRevenue
                );

        }


        createDashboardChart(
            appointmentsSnapshot
        );


        createReportCharts(
            patientsSnapshot,
            billingRecords
        );


    } catch (error) {

        console.error(
            "Dashboard statistics error:",
            error
        );

    }

}


// ============================================================
// DASHBOARD APPOINTMENT CHART
// ============================================================

let appointmentChartInstance =
    null;


function createDashboardChart(
    appointmentsSnapshot
) {

    const canvas =
        document.getElementById(
            "appointmentChart"
        );


    if (!canvas) {

        return;

    }


    // --------------------------------------------------------
    // Make sure Chart.js exists
    // --------------------------------------------------------

    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;

    }


    let confirmed =
        0;

    let pending =
        0;

    let cancelled =
        0;


    appointmentsSnapshot.forEach(
        snapshot => {

            const appointment =
                snapshot.data();


            const status =
                appointment.status ||
                "Confirmed";


            if (
                status ===
                "Confirmed"
            ) {

                confirmed++;

            } else if (
                status ===
                "Pending"
            ) {

                pending++;

            } else if (
                status ===
                "Cancelled"
            ) {

                cancelled++;

            }

        }
    );


    if (
        appointmentChartInstance
    ) {

        appointmentChartInstance.destroy();

    }


    appointmentChartInstance =
        new Chart(
            canvas,
            {

                type:
                    "doughnut",

                data: {

                    labels: [

                        "Confirmed",

                        "Pending",

                        "Cancelled"

                    ],

                    datasets: [

                        {

                            data: [

                                confirmed,

                                pending,

                                cancelled

                            ]

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        }

                    }

                }

            }
        );

}


// ============================================================
// REPORT CHARTS
// ============================================================

let patientReportChartInstance =
    null;

let billingReportChartInstance =
    null;


function createReportCharts(
    patientsSnapshot,
    billingRecords
) {

    if (
        typeof Chart ===
        "undefined"
    ) {

        console.error(
            "Chart.js is not loaded."
        );

        return;

    }


    // --------------------------------------------------------
    // PATIENT REPORT CHART
    // --------------------------------------------------------

    const patientCanvas =
        document.getElementById(
            "patientReportChart"
        );


    if (patientCanvas) {

        if (
            patientReportChartInstance
        ) {

            patientReportChartInstance.destroy();

        }


        let male =
            0;

        let female =
            0;

        let other =
            0;


        patientsSnapshot.forEach(
            snapshot => {

                const patient =
                    snapshot.data();


                if (
                    patient.gender ===
                    "Male"
                ) {

                    male++;

                } else if (
                    patient.gender ===
                    "Female"
                ) {

                    female++;

                } else {

                    other++;

                }

            }
        );


        patientReportChartInstance =
            new Chart(
                patientCanvas,
                {

                    type:
                        "bar",

                    data: {

                        labels: [

                            "Male",

                            "Female",

                            "Other"

                        ],

                        datasets: [

                            {

                                label:
                                    "Patients",

                                data: [

                                    male,

                                    female,

                                    other

                                ]

                            }

                        ]

                    },

                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        scales: {

                            y: {

                                beginAtZero:
                                    true

                            }

                        }

                    }

                }
            );

    }


    // --------------------------------------------------------
    // BILLING REPORT CHART
    // --------------------------------------------------------

    const billingCanvas =
        document.getElementById(
            "billingReportChart"
        );


    if (billingCanvas) {

        if (
            billingReportChartInstance
        ) {

            billingReportChartInstance.destroy();

        }


        let paid =
            0;

        let outstanding =
            0;


        billingRecords.forEach(
            billing => {

                paid +=
                    Number(
                        billing.totalAmount ||
                        0
                    ) -
                    Number(
                        billing.outstandingBalance ||
                        0
                    );


                outstanding +=
                    Number(
                        billing.outstandingBalance ||
                        0
                    );

            }
        );


        billingReportChartInstance =
            new Chart(
                billingCanvas,
                {

                    type:
                        "doughnut",

                    data: {

                        labels: [

                            "Paid",

                            "Outstanding"

                        ],

                        datasets: [

                            {

                                data: [

                                    paid,

                                    outstanding

                                ]

                            }

                        ]

                    },

                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        plugins: {

                            legend: {

                                position:
                                    "bottom"

                            }

                        }

                    }

                }
            );

    }

}


// ============================================================
// INITIALIZE CURRENT PAGE
// ============================================================

function initializeCurrentPage() {

    setupMobileMenu();
    const page =
        getCurrentPage();


    // --------------------------------------------------------
    // NOTE:
    // Login/Register initialization has deliberately been
    // moved OUT of this function.
    //
    // It is handled by initializeAuthForms().
    // --------------------------------------------------------


    // --------------------------------------------------------
    // Patient
    // --------------------------------------------------------

    const patientForm =
        document.getElementById(
            "patientFormElement"
        );


    if (
        patientForm &&
        patientForm.dataset.initialized !==
        "true"
    ) {

        patientForm.addEventListener(
            "submit",
            savePatient
        );


        patientForm.dataset.initialized =
            "true";

    }


    // --------------------------------------------------------
    // Appointment
    // --------------------------------------------------------

    const appointmentForm =
        document.getElementById(
            "appointmentFormElement"
        );


    if (
        appointmentForm &&
        appointmentForm.dataset.initialized !==
        "true"
    ) {

        appointmentForm.addEventListener(
            "submit",
            saveAppointment
        );


        appointmentForm.dataset.initialized =
            "true";

    }


    // --------------------------------------------------------
    // Prescription
    // --------------------------------------------------------

    const prescriptionForm =
        document.getElementById(
            "prescriptionFormElement"
        );


    if (
        prescriptionForm &&
        prescriptionForm.dataset.initialized !==
        "true"
    ) {

        prescriptionForm.addEventListener(
            "submit",
            savePrescription
        );


        prescriptionForm.dataset.initialized =
            "true";

    }


    // --------------------------------------------------------
    // Billing
    // --------------------------------------------------------

    const billingForm =
        document.getElementById(
            "billingFormElement"
        );


    if (
        billingForm &&
        billingForm.dataset.initialized !==
        "true"
    ) {

        billingForm.addEventListener(
            "submit",
            saveBilling
        );


        billingForm.dataset.initialized =
            "true";

    }


    // --------------------------------------------------------
    // Load page data
    // --------------------------------------------------------

    if (
        page ===
        "dashboard"
    ) {

        updateDashboardStatistics();

    }


    if (
        page ===
        "patient"
    ) {

        loadPatients();

    }


    if (
        page ===
        "appointments"
    ) {

        loadAppointments();

    }


    if (
        page ===
        "prescriptions"
    ) {

        loadPrescriptions();

    }


    if (
        page ===
        "billing"
    ) {

        loadBilling();

    }


    if (
        page ===
        "reports"
    ) {

        updateDashboardStatistics();

    }

}


// ============================================================
// INITIAL DOM SETUP
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeAuthForms();

        displayCurrentDate();

    }
);


// ============================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// ============================================================

window.loadPatients =
    loadPatients;


window.loadAppointments =
    loadAppointments;


window.loadPrescriptions =
    loadPrescriptions;


window.loadBilling =
    loadBilling;


window.updateDashboardStatistics =
    updateDashboardStatistics;


// ============================================================
// DEBUG INFORMATION
// ============================================================

window.DataCareHMS = {

    getCurrentUser:
        () =>
            currentUser,

    getCurrentUserData:
        () =>
            currentUserData,

    getCurrentPage:
        () =>
            getCurrentPage(),

    permissions:
        rolePermissions

};


// ============================================================
// END OF MAIN.JS
// ============================================================