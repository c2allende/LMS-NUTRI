/**
 * catalog-data.js — Datos del catálogo público LMS-CNDPR
 * Script global (no módulo ES). Disponible como CATALOG_OFFERINGS
 * y funciones helper globales.
 *
 * Las 5 ofertas corresponden exactamente a las páginas construidas en el proyecto.
 * offerTitle coincide con lo que los quiz controllers escribirán en Firestore.
 * introUrl apunta a la página de inicio de cada oferta.
 */

// ─── Constantes de sesión ─────────────────────────────────────────────────────
const KEY_ENROLLMENTS = 'lms_enrollments';

function _getEnrollments() {
    try {
        const raw = sessionStorage.getItem(KEY_ENROLLMENTS);
        return raw ? JSON.parse(raw) : ['dm2-actualizacion-clinica'];
    } catch (_) {
        return ['dm2-actualizacion-clinica'];
    }
}

// ─── Catálogo de ofertas ──────────────────────────────────────────────────────
const CATALOG_OFFERINGS = [

    // ── E1 ───────────────────────────────────────────────────────────────────
    {
        id: 'dm2-actualizacion-clinica',
        code: 'EC-2025-001',
        offerTitle: 'Manejo Nutricional de la Diabetes Tipo 2: Actualización Clínica',
        introUrl: 'modulo1_intro.html',
        type: 'curso',
        title: 'Manejo Nutricional de la Diabetes Tipo 2: Actualización Clínica',
        shortDescription: 'Fisiopatología, evaluación ADIME y terapia médica nutricional basada en guías ADA 2024. Con evaluación y certificado oficial.',
        longDescription: 'Este curso de 3 módulos provee al profesional de la nutrición y la dietética una actualización clínica rigurosa sobre la diabetes mellitus tipo 2, desde sus fundamentos fisiopatológicos hasta la aplicación del proceso de cuidado nutricional basado en evidencia. Incluye evaluación interactiva y certificado oficial al completar.',
        learningOutcomes: [
            'Describir los mecanismos fisiopatológicos centrales de la DM2 según las guías ADA 2024.',
            'Aplicar el proceso ADIME completo al paciente con DM2, integrando datos antropométricos, bioquímicos y dietéticos.',
            'Formular diagnósticos nutricionales en formato PES usando la terminología AND/ICDA.',
            'Diseñar estrategias de intervención nutricional individualizadas basadas en la evidencia.',
            'Interpretar indicadores bioquímicos clave y adaptar metas de tratamiento.',
        ],
        instructor: 'Lcda. Sofía M. Berríos Colón, MS, RDN, LD, CDCES',
        instructorBio: 'Nutricionista-Dietista con especialidad en cuidado y educación de la diabetes. Práctica clínica privada y docencia universitaria en San Juan, Puerto Rico.',
        hours: 15,
        modules: [
            { title: 'Fisiopatología y Evaluación Nutricional en DM2', hours: 5.00 },
            { title: 'Terapia Médica Nutricional: Estrategias de Intervención', hours: 5.00 },
            { title: 'Casos Clínicos y Práctica Profesional', hours: 5.00 },
        ],
        premium: true,
        enrolled: true,
        progress: 20,
    },

    // ── E2 ───────────────────────────────────────────────────────────────────
    {
        id: 'conteo-carbohidratos',
        code: 'EC-2025-002',
        offerTitle: 'Mini-Taller: Conteo de Carbohidratos',
        introUrl: 'taller_conteo_intro.html',
        type: 'taller',
        title: 'Conteo de Carbohidratos Avanzado: Metodología para el Paciente con Diabetes',
        shortDescription: 'Taller práctico intensivo para dominar el conteo de CHO básico y avanzado, índice glucémico y planificación de comidas.',
        longDescription: 'Taller práctico dirigido al profesional clínico que trabaja con pacientes con diabetes. Incluye métodos de conteo de carbohidratos por intercambio y por gramos, cálculo de dosis de insulina basado en CHO, interpretación del índice glucémico y aplicación con alimentos típicos de la gastronomía puertorriqueña.',
        learningOutcomes: [
            'Aplicar el método de conteo de CHO por intercambio y por gramos en la práctica clínica.',
            'Calcular la razón insulina:carbohidrato para la terapia de insulina intensiva.',
            'Identificar fuentes de CHO en la gastronomía puertorriqueña con sus equivalentes.',
            'Diseñar planes de alimentación con distribución CHO óptima para DM2.',
        ],
        instructor: 'Lcda. María L. Torres Rivera, RDN, LD, CDCES',
        instructorBio: 'Educadora de diabetes certificada con más de 12 años de experiencia clínica en programas de educación en diabetes en Puerto Rico.',
        hours: 3,
        modules: null,
        premium: false,
        enrolled: false,
        progress: 0,
    },

    // ── E3 ───────────────────────────────────────────────────────────────────
    {
        id: 'microbiota-intestinal',
        code: 'LM-2025-001',
        offerTitle: 'Microbiota Intestinal y Salud Metabólica',
        introUrl: 'lectura_microbiota_intro.html',
        type: 'lectura',
        title: 'Microbiota Intestinal y Salud Metabólica',
        shortDescription: 'Lectura dirigida sobre el rol de la microbiota en la resistencia a la insulina, ácidos grasos de cadena corta y estrategias dietéticas basadas en evidencia.',
        longDescription: 'Lectura científica que examina la evidencia actual sobre la microbiota intestinal y su relación con la diabetes tipo 2 y la resistencia a la insulina. Cubre los mecanismos de disbiosis, el papel de los AGCC, la translocación de LPS, y el uso clínico de probióticos y almidón resistente.',
        learningOutcomes: [
            'Identificar géneros bacterianos asociados a protección o riesgo metabólico según la evidencia actual.',
            'Explicar la producción de ácidos grasos de cadena corta y su importancia en la salud intestinal y metabólica.',
            'Describir el mecanismo de disbiosis e inflamación crónica como factor en la resistencia a la insulina.',
            'Aplicar criterios basados en evidencia para la recomendación de probióticos en el paciente con diabetes.',
            'Identificar fuentes dietéticas de almidón resistente aplicables en la gastronomía puertorriqueña.',
        ],
        instructor: 'Lcda. Sofía M. Berríos Colón, MS, RDN, LD, CDCES',
        instructorBio: 'Nutricionista-Dietista con especialidad en cuidado y educación de la diabetes. Práctica clínica privada y docencia universitaria en San Juan, Puerto Rico.',
        hours: 1,
        modules: null,
        premium: false,
        enrolled: false,
        progress: 0,
    },

    // ── E4 ───────────────────────────────────────────────────────────────────
    {
        id: 'nutricion-plant-based',
        code: 'PB-2025-001',
        offerTitle: 'Nutrición Plant-Based: Evidencia Clínica',
        introUrl: 'presentacion_plantbased_intro.html',
        type: 'presentacion',
        title: 'Nutrición Plant-Based: Evidencia Clínica',
        shortDescription: 'Presentación sobre la dieta plant-based: beneficios cardiovasculares, consideraciones clínicas en diabetes y manejo de nutrientes críticos.',
        longDescription: 'Presentación temática que revisa la evidencia científica actual sobre las dietas de base vegetal. Aborda la reducción del riesgo cardiovascular, las consideraciones clínicas en el paciente con diabetes bajo tratamiento farmacológico, el manejo de nutrientes críticos como la vitamina B12 y el hierro, y la definición de la dieta whole-food plant-based (WFPB).',
        learningOutcomes: [
            'Cuantificar la reducción de riesgo cardiovascular asociada a la dieta plant-based según la evidencia actual.',
            'Identificar los nutrientes que requieren atención especial o suplementación en la alimentación vegana.',
            'Evaluar las interacciones entre la dieta plant-based y los medicamentos hipoglucemiantes.',
            'Aplicar estrategias para optimizar la absorción del hierro no-hemo en dietas vegetarianas.',
            'Diferenciar los patrones plant-based según su nivel de procesamiento y evidencia clínica.',
        ],
        instructor: 'Lcda. Sofía M. Berríos Colón, MS, RDN, LD, CDCES',
        instructorBio: 'Nutricionista-Dietista con especialidad en cuidado y educación de la diabetes. Práctica clínica privada y docencia universitaria en San Juan, Puerto Rico.',
        hours: 1,
        modules: null,
        premium: false,
        enrolled: false,
        progress: 0,
    },

    // ── E5 ───────────────────────────────────────────────────────────────────
    {
        id: 'podcast-nutricoracon',
        code: 'POD-2025-001',
        offerTitle: 'NutriCorazón: Salud Cardiovascular y Nutrición',
        introUrl: 'podcast_nutricoracon_intro.html',
        type: 'podcast',
        title: 'NutriCorazón: Salud Cardiovascular y Nutrición',
        shortDescription: 'Episodio de podcast sobre nutrición cardiovascular: frutas, sodio, grasas, carnes procesadas y fibra. Con contexto específico para Puerto Rico.',
        longDescription: 'Episodio de podcast que explora la evidencia científica actual sobre la relación entre la alimentación y la salud cardiovascular. Cubre el impacto del consumo de frutas y vegetales, la reducción de sodio, la sustitución de grasas saturadas por insaturadas, el riesgo asociado a las carnes procesadas y el papel cardioprotector de la fibra dietética.',
        learningOutcomes: [
            'Cuantificar la reducción de riesgo cardiovascular asociada al consumo de frutas y vegetales según metaanálisis recientes.',
            'Explicar el efecto de la reducción de sodio en la presión arterial sistólica en personas hipertensas.',
            'Identificar la sustitución de grasa con mayor impacto sobre el LDL-C en la consejería nutricional.',
            'Describir el riesgo cardiovascular asociado al consumo regular de carnes procesadas.',
            'Aplicar recomendaciones de fibra dietética basadas en evidencia para la salud cardiovascular.',
        ],
        instructor: 'Lcda. Sofía M. Berríos Colón, MS, RDN, LD, CDCES',
        instructorBio: 'Nutricionista-Dietista con especialidad en cuidado y educación de la diabetes. Práctica clínica privada y docencia universitaria en San Juan, Puerto Rico.',
        hours: 0.5,
        modules: null,
        premium: false,
        enrolled: false,
        progress: 0,
    },

];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOfferingById(id) {
    return CATALOG_OFFERINGS.find(o => o.id === id) || null;
}

function getOfferingsByType(type) {
    return CATALOG_OFFERINGS.filter(o => o.type === type);
}

function searchOfferings(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return CATALOG_OFFERINGS;
    return CATALOG_OFFERINGS.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.shortDescription.toLowerCase().includes(q) ||
        o.instructor.toLowerCase().includes(q) ||
        o.type.toLowerCase().includes(q)
    );
}

function getEnrolledOfferings() {
    const enrollments = _getEnrollments();
    return CATALOG_OFFERINGS.filter(o => enrollments.includes(o.id));
}

function getNotEnrolledOfferings() {
    const enrollments = _getEnrollments();
    return CATALOG_OFFERINGS.filter(o => !enrollments.includes(o.id));
}

// Inicializar sessionStorage con la matrícula demo si no existe
(function initEnrollments() {
    if (!sessionStorage.getItem(KEY_ENROLLMENTS)) {
        sessionStorage.setItem(KEY_ENROLLMENTS, JSON.stringify(['dm2-actualizacion-clinica']));
    }
})();
