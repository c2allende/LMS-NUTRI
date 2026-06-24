/**
 * CONFIGURACIÓN DE FIREBASE PARA EL NUEVO LMS
 * Reemplaza los valores a continuación con los de tu nuevo proyecto en la consola de Firebase.
 * Ruta: Firebase Console > Configuración del Proyecto > General > Tus apps
 */
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO_ID",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// Inicialización de Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
