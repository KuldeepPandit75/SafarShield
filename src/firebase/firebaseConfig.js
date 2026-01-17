// src/firebase/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
   apiKey: "AIzaSyBPrV0l2Upzu-HtpF1yK8_HhXPE285EiJ4",
  authDomain: "safarapp-cc1f9.firebaseapp.com",
  projectId: "safarapp-cc1f9",
  storageBucket: "safarapp-cc1f9.firebasestorage.app",
  messagingSenderId: "843937678944",
  appId: "1:843937678944:web:61ae49ecaa58a93125a505",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
