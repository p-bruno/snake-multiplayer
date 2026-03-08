// ============================================================
// 🔥 ÉTAPE 1 : Remplace ces valeurs par celles de ton projet Firebase
// Va sur https://console.firebase.google.com
// → Crée un projet → Ajoute une app Web → Copie firebaseConfig
// ============================================================

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyBgXyfCuL5IrAnXMKMxhEtq457_NQgGsNA",
  authDomain: "snale-dafec.firebaseapp.com",
  databaseURL: "https://snale-dafec-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "snale-dafec",
  storageBucket: "snale-dafec.firebasestorage.app",
  messagingSenderId: "1039382875958",
  appId: "1:1039382875958:web:e0869c2a6557ed303d2d97",
  measurementId: "G-FPWCC6Q39B"
};

// ============================================================
// 🔥 ÉTAPE 2 : Dans Firebase Console → Realtime Database
// → Créer une base de données → Mode test (pour commencer)
// → Coller cette règle dans "Règles" :
// {
//   "rules": {
//     ".read": true,
//     ".write": true
//   }
// }
// ============================================================
