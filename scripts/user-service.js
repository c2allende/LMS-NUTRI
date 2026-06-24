import { db, auth } from "./firebase-config.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc, 
    serverTimestamp,
    collection,
    query,
    orderBy,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Crea o actualiza el perfil de un usuario en Firestore.
 */
export async function createUserProfile(user, additionalData = {}) {
    if (!user) return;
    const userRef = doc(db, "usuarios", user.uid);
    const profile = {
        uid: user.uid,
        email: user.email,
        displayName: additionalData.displayName || user.displayName || "Usuario",
        role: additionalData.role || "participant",
        status: additionalData.status || "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    try {
        await setDoc(userRef, profile, { merge: true });
        return profile;
    } catch (error) {
        console.error("Error al crear perfil:", error);
        throw error;
    }
}

/**
 * Obtiene el perfil de un usuario desde Firestore.
 */
export async function getUserProfile(uid) {
    if (!uid) return null;
    try {
        const userRef = doc(db, "usuarios", uid);
        const snap = await getDoc(userRef);
        return snap.exists() ? snap.data() : null;
    } catch (error) {
        console.error("Error en lectura de perfil:", error);
        throw error; 
    }
}

/**
 * Verifica si el usuario actual tiene rol de administrador.
 */
export async function isAdmin(uid) {
    const profile = await getUserProfile(uid);
    return profile?.role === "admin" && profile?.status === "active";
}
