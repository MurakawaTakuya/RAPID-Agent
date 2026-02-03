import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Firebase設定が存在するかチェック
const isFirebaseConfigured =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId;

// Firebase アプリが既に初期化されている場合は再利用
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
} else {
  console.warn(
    "Firebase configuration is missing. Please set environment variables in .env.local"
  );
}

export { auth };
