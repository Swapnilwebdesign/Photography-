# Lumière Studio — Photography Portfolio

A premium photography portfolio website with Firebase-powered admin panel.

---

## 📁 Folder Structure

```
lumiere-portfolio/
├── index.html              # Homepage
├── css/
│   └── main.css            # All styles (dark/light theme, responsive)
├── js/
│   ├── firebase-config.js  # 🔥 Firebase config (EDIT THIS)
│   ├── main.js             # Homepage logic
│   ├── portfolio.js        # Portfolio gallery logic
│   └── admin.js            # Admin dashboard logic
├── pages/
│   ├── portfolio.html      # Masonry gallery with filters
│   ├── about.html          # About page
│   ├── services.html       # Services & pricing
│   └── contact.html        # Contact form
├── admin/
│   ├── login.html          # Admin login
│   └── dashboard.html      # Admin dashboard
├── firebase.json           # Firebase hosting config
└── .firebaserc             # Firebase project config
```

---

## 🔥 Firebase Setup (Step by Step)

### Step 1 — Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Name it (e.g. `lumiere-studio`)
4. Enable/disable Google Analytics (optional)
5. Click **"Create project"**

### Step 2 — Enable Authentication
1. In Firebase Console → **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable **Email/Password**
4. Create your admin user:
   - Go to **Users** tab → **Add user**
   - Enter your admin email and a strong password
   - Note the UID shown

### Step 3 — Create Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **Production mode** (recommended) or Start mode
3. Select a region (e.g. `asia-south1` for India)
4. Click **Enable**

#### Firestore Security Rules
Go to **Firestore → Rules** and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read for photos and categories
    match /photos/{photoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /categories/{catId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Anyone can submit inquiries, only auth can read
    match /inquiries/{id} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

### Step 4 — Enable Firebase Storage
1. Go to **Storage** → **Get started**
2. Choose **Production mode**
3. Select region (same as Firestore)

#### Storage Security Rules
Go to **Storage → Rules** and paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{filename} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Step 5 — Get Your Config
1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **"Your apps"** → Click **"<>"** (web app)
3. Register app (name it anything)
4. Copy the `firebaseConfig` object

### Step 6 — Update firebase-config.js
Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← Your actual key
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## 🚀 Deploy to Firebase Hosting

### Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Login
```bash
firebase login
```

### Initialize (from project folder)
```bash
firebase init hosting
```
- Select your Firebase project
- Set public directory to: `.` (current directory)
- Configure as single-page app: **No**
- Set up GitHub deploys: Optional

### Deploy
```bash
firebase deploy
```

Your site will be live at: `https://your-project-id.web.app`

---

## 🎨 Customization Guide

### Change Studio Name
Find and replace `Lumière Studio` and `Lumière` across all HTML files.

### Change WhatsApp Number
Find `wa.me/911234567890` in all files and replace with your number (country code + number, no + sign).

### Change Contact Info
Edit `pages/contact.html` — update address, phone, email.

### Change Services & Prices
Edit `pages/services.html` — update service descriptions and prices.

### Change Colors
Edit the CSS variables in `css/main.css`:
```css
:root {
  --accent: #c9a96e;  /* Main gold color */
  ...
}
```

---

## 👤 Admin Panel Usage

1. Go to `/admin/login.html`
2. Login with your Firebase Auth email/password
3. **Upload Photo**: Click "Upload Photo" in sidebar → drag/drop image → fill details → submit
4. **Manage Photos**: Click "Manage Photos" → hover over any photo to edit category/title or delete
5. **Categories**: Add custom categories (e.g. "Maternity", "Newborn")
6. **Inquiries**: View all contact form submissions

---

## 📱 Features Summary

- ✅ Dark/Light theme toggle (persisted)
- ✅ Smooth scroll-reveal animations
- ✅ Masonry gallery with category filters
- ✅ Lightbox with keyboard navigation (←→ Esc)
- ✅ Lazy image loading
- ✅ Floating WhatsApp button
- ✅ Contact form saves to Firestore
- ✅ Admin login with Firebase Auth
- ✅ Photo upload to Firebase Storage
- ✅ Edit photo category/title/featured status
- ✅ Delete photos (removes from Storage + Firestore)
- ✅ View contact inquiries in admin
- ✅ Counter animations on homepage
- ✅ Mobile responsive design
- ✅ Firebase Hosting ready
