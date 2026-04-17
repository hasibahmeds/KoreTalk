// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRYkq8KvlKych8zsZxh_dSEWE2ehR7T4E",
  authDomain: "react-web-9283c.firebaseapp.com",
  projectId: "react-web-9283c",
  storageBucket: "react-web-9283c.firebasestorage.app",
  messagingSenderId: "900245367602",
  appId: "1:900245367602:web:a491f917f96ebe8e07852b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { auth };
