'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase 콘솔에서 받은 설정값
const firebaseConfig = {
  apiKey: "AIzaSyClz4U5zoQKha-diynO0zANikQWp9108SU",
  authDomain: "django-login-448411.firebaseapp.com",
  projectId: "django-login-448411",
  storageBucket: "django-login-448411.firebasestorage.app",
  messagingSenderId: "246970475250",
  appId: "1:246970475250:web:af7d3f9f437bcef183a66b"
};

// 앱 중복 초기화 방지
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 필요한 서비스 내보내기
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;