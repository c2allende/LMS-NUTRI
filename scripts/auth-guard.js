import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { getUserProfile } from "./user-service.js";

/**
 * AUTH GUARD: Protege las páginas privadas.
 * Verifica autenticación y estado del perfil en Firestore.
 */
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        setTimeout(() => {
            if (!auth.currentUser) {
                window.location.href = "index.html";
            }
        }, 1000);
        return;
    }

    try {
        let profile = await getUserProfile(user.uid);

        if (!profile) {
            await signOut(auth);
            window.location.href = "index.html";
            return;
        }

        if (profile.status === "inactive" || profile.status === "archived" || profile.accessRevoked === true) {
            await signOut(auth);
            sessionStorage.setItem("auth_redirect_message", "Tu acceso no está activo.");
            window.location.href = "index.html";
            return;
        }

    } catch (error) {
        console.error("Error en verificación:", error);
        window.location.href = "index.html";
    }
});
