import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
  getDatabase,
  ref,
  set,
  push,
  get,
  onValue,
  update,
  remove
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";


const firebaseConfig = {

  apiKey:
  "AIzaSyDWdysUraHDxL5ePiCvkUetGh_Hdfgi00Q",

  authDomain:
  "aakash-earth-festival.firebaseapp.com",

  databaseURL:
  "https://aakash-earth-festival-default-rtdb.firebaseio.com",

  projectId:
  "aakash-earth-festival",

  storageBucket:
  "aakash-earth-festival.firebasestorage.app",

  messagingSenderId:
  "743953965657",

  appId:
  "1:743953965657:web:1b08d2b6fbf519888c8748",

  measurementId:
  "G-3M2F396NMM"

};


const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

const storage = getStorage(app);


export {

  db,
  storage,

  ref,
  set,
  push,
  get,
  onValue,
  update,
  remove,

  storageRef,
  uploadBytes,
  getDownloadURL

};