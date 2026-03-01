// ============================================
// FIREBASE CONFIGURATION
// Replace these values with your Firebase project config
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

// 🔥 REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ============================================
// SAMPLE DATA — Pre-populate Firestore with this
// Run once via Firebase Console or admin panel
// ============================================
/*
Photos collection structure:
{
  id: auto-generated,
  url: "https://...",
  thumbnail: "https://...",  // optional compressed version
  title: "Wedding Day",
  category: "Wedding",       // Wedding | Pre-Wedding | Events | Fashion
  featured: true,            // show on homepage
  order: 1,                  // sort order
  createdAt: Timestamp
}

Categories collection structure:
{
  id: auto-generated,
  name: "Wedding",
  slug: "wedding"
}
*/
