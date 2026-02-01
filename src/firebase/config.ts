import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Configurazione Firebase - usa variabili d'ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza Firestore
export const db = getFirestore(app);

// Abilita persistenza offline per Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistenza offline non disponibile: app aperta in più tab');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistenza offline non supportata da questo browser');
  }
});

// Inizializza Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
