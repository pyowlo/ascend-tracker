import { getApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { collection, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDxn7r_7sSm-TuBSA9094jzKyqrJ7CkCzU",
  authDomain: "ascend-tracker-27bcf.firebaseapp.com",
  projectId: "ascend-tracker-27bcf",
  storageBucket: "ascend-tracker-27bcf.appspot.com",
  messagingSenderId: "288383892262",
  appId: "1:288383892262:web:3705969a27168fc6a79fe7",
  measurementId: "G-4JX8BYQ257",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const inventoryCollectionRef = collection(db, "inventory");
export const salesCollectionRef = collection(db, "sales");
export const schedulesCollectionRef = collection(db, "schedules");
export const expensesCollectionRef = collection(db, "expenses");

export const initializeAnalytics = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    return null;
  }

  return getAnalytics(app);
};
