import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.2/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA9fxtoh8eKtmfDVVhUNsrh_OgqEgicASA",
    authDomain: "team7-system-solution.firebaseapp.com",
    projectId: "team7-system-solution",
    storageBucket: "team7-system-solution.firebasestorage.app",
    messagingSenderId: "792809055808",
    appId: "1:792809055808:web:00352b6d1fbb75485921a5",
    measurementId: "G-1LHZFFFDYY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export the real Firebase SDK functions seamlessly for the rest of the application
export {
    auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail,
    db, collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, setDoc,
    storage, ref, uploadBytesResumable, getDownloadURL
};
