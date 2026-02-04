<div align="center">

<img src="https://raw.githubusercontent.com/projectkieru/kieru-frontend/refs/heads/main/public/kieru_full_logo.webp" alt="Kieru Secure" width="340" height="120">

<h3>Zero-Knowledge Secret Sharing Platform</h3>

<p>Client-side encryption with self-destructing secrets. Your data never leaves your browser unencrypted.</p>

<p>
<a href="https://kieru-secure.vercel.app"><strong>Live Application</strong></a> •
<a href="https://github.com/projectkieru/kieru-frontend/issues"><strong>Report Issue</strong></a> •
<a href="https://github.com/projectkieru/kieru-frontend/issues"><strong>Request Feature</strong></a>
</p>

<p>
<img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React">
<img src="https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="TailwindCSS">
<img src="https://img.shields.io/badge/Firebase-12.7-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase">
<img src="https://img.shields.io/badge/Web_Crypto_API-Native-4285F4?style=flat-square&logo=google-chrome&logoColor=white" alt="Web Crypto API">
</p>

</div>

---

## Overview

**Kieru Secure Frontend** is the client-side application for the zero-knowledge secret sharing platform. All encryption and decryption happens entirely in the browser using the native Web Crypto API—your plaintext data never leaves your device.

### Core Principles

- **Client-Side Encryption** — AES-256-GCM encryption using Web Crypto API
- **Zero-Knowledge Architecture** — Decryption keys transmitted via URL fragments (never sent to server)
- **Cross-Tab Session Sync** — Login/logout state synchronized across browser tabs
- **Passwordless Authentication** — Magic link sign-in via Firebase
- **Responsive Design** — Mobile-first UI with Tailwind CSS

---

## Security Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                          │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Web Crypto API                          │  │
│  │                                                          │  │
│  │  1. generateKey()     → AES-256-GCM Key (256-bit)        │  │
│  │  2. encryptData()     → Ciphertext (IV + Encrypted)      │  │
│  │  3. Key stored in     → URL Fragment (#key=...)          │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│                              ▼                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Client                            │  │
│  │                                                          │  │
│  │  • Sends ONLY encrypted payload to backend               │  │
│  │  • Key NEVER transmitted to server                       │  │
│  │  • Duplicate request detection                           │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (Encrypted Payload Only)
                              ▼
                    ┌─────────────────┐
                    │  Kieru Backend  │
                    │  (Stores only   │
                    │   ciphertext)   │
                    └─────────────────┘
```

### URL Fragment Security

The decryption key is stored in the URL fragment (`#key=...`), which:

- ✅ Is **never sent** to the server (per HTTP specification)
- ✅ Stays **only in the browser**
- ✅ Can be shared via link (copy/paste)
- ✅ Disappears when secret is viewed

---

## Features

| Feature                | Description                                                            |
| ---------------------- | ---------------------------------------------------------------------- |
| **Create Secrets**     | Encrypt text or files with AES-256-GCM, set view limits and expiration |
| **View Secrets**       | Decrypt shared secrets using the key from URL fragment                 |
| **Secret History**     | Dashboard to track created secrets with access logs                    |
| **Profile Management** | Update password for password-protected secrets                         |
| **Magic Link Auth**    | Passwordless email authentication via Firebase                         |
| **Guest Mode**         | Anonymous access with limited features                                 |
| **Google Sign-In**     | One-click OAuth authentication                                         |
| **Cross-Tab Sync**     | Automatic logout across all browser tabs                               |

---

## Technology Stack

<table>
  <tr>
    <th>Layer</th>
    <th>Technology</th>
    <th>Purpose</th>
  </tr>
  <tr>
    <td><strong>Framework</strong></td>
    <td>React 19.2</td>
    <td>Component-based SPA architecture</td>
  </tr>
  <tr>
    <td><strong>Build Tool</strong></td>
    <td>Vite 7.2</td>
    <td>Fast development server, optimized production builds</td>
  </tr>
  <tr>
    <td><strong>Styling</strong></td>
    <td>Tailwind CSS 3.4</td>
    <td>Utility-first responsive design</td>
  </tr>
  <tr>
    <td><strong>Routing</strong></td>
    <td>React Router 7.11</td>
    <td>Client-side navigation with lazy loading</td>
  </tr>
  <tr>
    <td><strong>Authentication</strong></td>
    <td>Firebase 12.7</td>
    <td>Magic link, Google OAuth, Anonymous auth</td>
  </tr>
  <tr>
    <td><strong>Icons</strong></td>
    <td>Lucide React</td>
    <td>Lightweight, customizable icon library</td>
  </tr>
  <tr>
    <td><strong>Encryption</strong></td>
    <td>Web Crypto API</td>
    <td>Native browser AES-256-GCM encryption</td>
  </tr>
  <tr>
    <td><strong>Deployment</strong></td>
    <td>Vercel</td>
    <td>Edge deployment with automatic SSL</td>
  </tr>
</table>

---

## Project Structure

```
kieru-frontend/
├── public/
│   ├── kieru_full_logo.webp      # Full logo
│   ├── kieru_logo_only.webp      # Icon only
│   ├── kieru-favicon.svg         # Favicon
│   └── login_bg.webp             # Login background
│
├── src/
│   ├── components/
│   │   ├── layout/               # Navigation, sidebar, app shell
│   │   └── ui/                   # Reusable UI components
│   │
│   ├── context/
│   │   ├── AuthContext.jsx       # Authentication state + cross-tab sync
│   │   ├── AssetsContext.jsx     # Subscription limits, plan data
│   │   └── ToastContext.jsx      # Toast notification system
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx     # Magic link + social login
│   │   │   └── ProtectedAppLayout.jsx
│   │   ├── creation/
│   │   │   └── CreateSecretPage.jsx  # Secret creation with encryption
│   │   ├── dashboard/
│   │   │   ├── HomePage.jsx      # Dashboard home
│   │   │   ├── MySecretsPage.jsx # Secret history + logs
│   │   │   ├── ProfilePage.jsx   # User profile
│   │   │   └── AnalyticsPage.jsx # Usage statistics
│   │   └── view/
│   │       └── ViewSecretPage.jsx    # Decrypt + reveal secrets
│   │
│   ├── utils/
│   │   ├── crypto.js             # AES-256-GCM encryption/decryption
│   │   ├── apiClient.js          # API request handler with deduplication
│   │   ├── authService.js        # Backend authentication service
│   │   ├── firebase.js           # Firebase configuration
│   │   └── toast.js              # Toast utility functions
│   │
│   ├── config/
│   │   └── navigationConfig.js   # Navigation menu configuration
│   │
│   ├── App.jsx                   # Root router configuration
│   └── main.jsx                  # Application entry point
│
├── vercel.json                   # Vercel deployment + API proxy
├── vite.config.js                # Vite configuration + dev proxy
└── tailwind.config.js            # Tailwind CSS configuration
```

---

## Encryption Implementation

### Key Generation

```javascript
// AES-256-GCM (256-bit key)
const key = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
```

### Encryption Flow

```javascript
// 1. Generate random IV (12 bytes)
const iv = window.crypto.getRandomValues(new Uint8Array(12));

// 2. Encrypt with AES-GCM
const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedData);

// 3. Combine IV + Ciphertext → Base64
const combined = [iv, new Uint8Array(encrypted)];
return btoa(combined);
```

### Shareable Link Format

```
https://kieru-secure.vercel.app/view/a8f3b2c1#key=dGhpcyBpcyBhIHNlY3JldCBrZXk
                                    │           │
                                    │           └── Decryption key (never sent to server)
                                    └── Secret ID (sent to server)
```

---

## Environment Variables

Create a `.env` file in the project root:

```bash
# Firebase Configuration
VITE_API_KEY=your_firebase_api_key
VITE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_PROJECT_ID=your-project-id
VITE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_MESSAGING_SENDER_ID=123456789
VITE_APP_ID=1:123456789:web:abcdef
VITE_MEASUREMENT_ID=G-XXXXXXXXXX

# Backend API URL (for Vite dev server proxy)
VITE_BACKEND_URL=https://your-backend.onrender.com
```

---

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# 1. Clone repository
git clone https://github.com/projectkieru/kieru-frontend.git
cd kieru-frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Firebase credentials

# 4. Start development server
npm run dev
```

Application will start on `http://localhost:5173`

### Available Scripts

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Start development server with HMR |
| `npm run build`   | Build production bundle           |
| `npm run preview` | Preview production build locally  |
| `npm run lint`    | Run ESLint                        |

---

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

### Manual Build

```bash
# Build production bundle
npm run build

# Output in dist/ folder
# Deploy to any static hosting provider
```

### API Proxy Configuration

**Development (`vite.config.js`):**

```javascript
proxy: {
   '/api': {
      target: process.env.VITE_BACKEND_URL,
      changeOrigin: true,
      secure: true
   }
}
```

**Production (`vercel.json`):**

```json
{
   "rewrites": [
      {
         "source": "/api/(.*)",
         "destination": "https://your-backend.onrender.com/api/$1"
      }
   ]
}
```

---

## Authentication Flow

```
┌─────────────┐    Magic Link    ┌─────────────┐
│   User      │ ───────────────► │   Firebase  │
│   Email     │                  │   Auth      │
└─────────────┘                  └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ AuthContext │
                                 │             │
                                 │ • JWT Token │
                                 │ • User State│
                                 │ • Cross-Tab │
                                 │   Sync      │
                                 └──────┬──────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │  Backend    │
                                 │  Sync       │
                                 │             │
                                 │ • Profile   │
                                 │ • Limits    │
                                 └─────────────┘
```

### Supported Auth Methods

| Method           | Description              |
| ---------------- | ------------------------ |
| **Magic Link**   | Passwordless email link  |
| **Google OAuth** | One-click Google sign-in |
| **Guest Mode**   | Anonymous Firebase auth  |

---

## Cross-Tab Session Sync

When a user logs out in one tab, all other tabs automatically logout:

```javascript
// Listen for localStorage changes from other tabs
window.addEventListener('storage', event => {
   if (event.key === 'auth_token' && event.newValue === null) {
      signOut(auth); // Logout this tab too
   }
});
```

---

## Related Repositories

| Repository                                                        | Description                                  |
| ----------------------------------------------------------------- | -------------------------------------------- |
| [kieru-backend](https://github.com/imkrishnaaaaaaa/kieru-backend) | Spring Boot REST API with PostgreSQL + Redis |

---

## Project Information

**Author:** [Murali Krishna Sana](https://github.com/imkrishnaaaaaaa)

**Contact:** [imkrishna1311@gmail.com](mailto:imkrishna1311@gmail.com)

**Frontend Repository:** [github.com/projectkieru/kieru-frontend](https://github.com/projectkieru/kieru-frontend)

**Backend Repository:** [github.com/imkrishnaaaaaaa/kieru-backend](https://github.com/imkrishnaaaaaaa/kieru-backend)

**Live Application:** [kieru-secure.vercel.app](https://kieru-secure.vercel.app)

---

<div align="center">

### Report Issues or Suggest Features

Found a bug or have an idea? [Open an issue](https://github.com/projectkieru/kieru-frontend/issues)

---

**Built with React • Encrypted with Web Crypto API • Deployed on Vercel**

© 2026 Kieru Secure. All rights reserved.

</div>
