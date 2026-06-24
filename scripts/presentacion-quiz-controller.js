/**
 * presentacion-quiz-controller.js
 * Evaluación: Tendencias en Alimentación Plant-Based — PB-2025-001
 * 5 preguntas de selección múltiple, 80% aprobación (4 de 5 correctas), reintento disponible.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 0.80;
const KEY_RESULT     = 'quiz_presentacion_plantbased_result';
const KEY_PASSED     = 'quiz_presentacion_plantbased_passed';

// ─── Banco de preguntas ───────────────────────────────────────────────────────

const QUESTIONS = [
    {
        id: 1,
        text: 'Según la evidencia actual, ¿cuánto reduce la dieta plant-based el riesgo de enfermedad cardiovascular?',
        options: [
            '5%',
            '10%',
            '16%',
            '30%'
        ],
        correct: 2,
        feedback: 'Un metaanálisis de 2023 publicado en JAMA Internal Medicine (n=432,000) encontró una reducción del 16% en riesgo de ECV y 19% en mortalidad cardiovascular en personas que seguían patrones de alimentación plant-based.'
    },
    {
        id: 2,
        text: '¿Cuál nutriente debe suplementarse SIEMPRE en una dieta vegana estricta?',
        options: [
            'Hierro',
            'Calcio',
            'Vitamina D',
            'Vitamina B12'
        ],
        correct: 3,
        feedback: 'La vitamina B12 se encuentra exclusivamente en productos de origen animal. Su deficiencia ocurre en el 52% de los veganos sin suplementación. Es la única suplementación universalmente obligatoria en dietas veganas, independientemente de la calidad del resto de la alimentación.'
    },
    {
        id: 3,
        text: 'Una paciente con DM2 bajo tratamiento con glibenclamida desea iniciar una dieta plant-based. ¿Cuál es la consideración clínica prioritaria?',
        options: [
            'Suspender la medicación antes de iniciar la dieta',
            'Monitorear hipoglucemia por el efecto glucémico aditivo',
            'Indicar suplemento de B12 antes de evaluar la dieta',
            'Derivar a endocrinología antes de cualquier cambio'
        ],
        correct: 1,
        feedback: 'Las dietas plant-based mejoran la sensibilidad a la insulina y reducen la glucemia. En pacientes bajo sulfonilureas como glibenclamida, este efecto puede ser aditivo y producir hipoglucemia. El monitoreo glucémico frecuente es la prioridad clínica al iniciar este patrón alimentario.'
    },
    {
        id: 4,
        text: 'Para mejorar la absorción del hierro no-hemo en una dieta vegetariana, ¿qué estrategia tiene mayor evidencia?',
        options: [
            'Consumir hierro con lácteos',
            'Tomar suplemento de hierro en ayunas',
            'Combinar alimentos ricos en hierro con vitamina C',
            'Cocinar en ollas de hierro fundido'
        ],
        correct: 2,
        feedback: 'La vitamina C (ácido ascórbico) convierte el hierro no-hemo (Fe³⁺) a la forma ferrosa (Fe²⁺), que es más soluble y biodisponible. Esta combinación puede aumentar la absorción 2–3 veces. Los lácteos, en cambio, inhiben la absorción de hierro por su contenido de calcio.'
    },
    {
        id: 5,
        text: '¿Cuál de los siguientes describe mejor una dieta "whole-food plant-based" (WFPB)?',
        options: [
            'Dieta vegana que incluye cualquier tipo de alimento de origen vegetal',
            'Dieta vegetariana que permite huevos y lácteos',
            'Dieta basada en alimentos vegetales integrales, mínimamente procesados',
            'Dieta flexitariana con predominio de vegetales'
        ],
        correct: 2,
        feedback: 'La dieta WFPB se distingue por enfatizar alimentos vegetales integrales y mínimamente procesados. Excluye no solo productos animales sino también aceites refinados y alimentos ultraprocesados de origen vegetal. Es el patrón con mayor evidencia en control glucémico y peso dentro del espectro plant-based.'
    }
];

// ─── Módulo de evaluación ─────────────────────────────────────────────────────

const PresentacionQuizApp = {

    init() {
        const saved = sessionStorage.getItem(KEY_RESULT);
        if (saved) {
            this._restoreResult(JSON.parse(saved));
        } else {
            this._renderQuestions();
            this._bindSubmit();
        }
    },

    // ── Renderizado de preguntas ──────────────────────────────────────────────

    _renderQuestions() {
        const container = document.getElementById('quiz-questions');
        if (!container) return;

        container.innerHTML = QUESTIONS.map((q, i) => `
            <fieldset id="q-fieldset-${i}" style="border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: var(--space-6); background: var(--color-surface); box-shadow: var(--shadow-xs); margin-bottom: var(--space-4);">
                <legend class="eyebrow" style="padding: 0 var(--space-2); color: var(--color-text-faint);">Pregunta ${q.id} de ${QUESTIONS.length}</legend>
                <p style="font-weight: var(--weight-bold); margin-bottom: var(--space-5);">${q.text}</p>
                <div style="display: grid; gap: var(--space-3);">
                    ${q.options.map((opt, j) => `
                        <label id="label-${i}-${j}" style="display: flex; align-items: flex-start; gap: var(--space-3); cursor: pointer; padding: var(--space-3) var(--space-4); border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg); transition: border-color 0.15s;">
                            <input type="radio" name="q${i}" value="${j}" style="margin-top: 0.2em; flex-shrink: 0;">
                            <span style="font-size: var(--text-sm);">${opt}</span>
                        </label>
                    `).join('')}
                </div>
                <div id="feedback-${i}" style="display: none; margin-top: var(--space-4); padding: var(--space-4); border-radius: var(--radius-md); border-left: 4px solid; font-size: var(--text-sm); line-height: var(--leading-relaxed);"></div>
            </fieldset>
        `).join('');
    },

    // ── Botón Enviar ──────────────────────────────────────────────────────────

    _bindSubmit() {
        const btn = document.getElementById('quiz-submit');
        if (!btn) return;
        btn.addEventListener('click', () => this._evaluate());
    },

    // ── Evaluación ────────────────────────────────────────────────────────────

    _evaluate() {
        for (let i = 0; i < QUESTIONS.length; i++) {
            if (!document.querySelector(`input[name="q${i}"]:checked`)) {
                alert('Por favor responde todas las preguntas antes de enviar la evaluación.');
                return;
            }
        }

        let correct = 0;
        const answers = [];

        QUESTIONS.forEach((q, i) => {
            const selected  = parseInt(document.querySelector(`input[name="q${i}"]:checked`).value);
            const isCorrect = selected === q.correct;
            if (isCorrect) correct++;
            answers.push({ questionIndex: i, selected, isCorrect });
            this._showFeedback(i, isCorrect, q.feedback, q.correct);
        });

        const score  = correct / QUESTIONS.length;
        const passed = score >= PASS_THRESHOLD;

        const result = { correct, total: QUESTIONS.length, score, passed, answers };
        sessionStorage.setItem(KEY_RESULT, JSON.stringify(result));
        sessionStorage.setItem(KEY_PASSED, passed ? 'true' : 'false');

        document.querySelectorAll('#quiz-questions input[type="radio"]').forEach(el => {
            el.disabled = true;
        });
        const submitBtn = document.getElementById('quiz-submit');
        if (submitBtn) submitBtn.disabled = true;

        this._showResult(result);
        this._updateCertLink(passed);
    },

    // ── Feedback por pregunta ─────────────────────────────────────────────────

    _showFeedback(index, isCorrect, feedbackText, correctIndex) {
        const correctLabel = document.getElementById(`label-${index}-${correctIndex}`);
        if (correctLabel) {
            correctLabel.style.borderColor = 'var(--color-success)';
            correctLabel.style.background  = 'var(--color-success-soft)';
        }

        if (!isCorrect) {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            if (selected) {
                const wrongLabel = selected.parentElement;
                wrongLabel.style.borderColor = 'var(--color-error)';
                wrongLabel.style.background  = 'var(--color-error-soft)';
            }
        }

        const fb = document.getElementById(`feedback-${index}`);
        if (!fb) return;
        fb.style.display     = 'block';
        fb.style.background  = isCorrect ? 'var(--color-success-soft)' : 'var(--color-error-soft)';
        fb.style.color       = isCorrect ? 'var(--color-success)'      : 'var(--color-error)';
        fb.style.borderColor = isCorrect ? 'var(--color-success)'      : 'var(--color-error)';
        fb.innerHTML         = `<strong>${isCorrect ? '✓ Correcto.' : '✗ Incorrecto.'}</strong> ${feedbackText}`;
    },

    // ── Panel de resultado ────────────────────────────────────────────────────

    _showResult(result) {
        const panel = document.getElementById('quiz-result');
        if (!panel) return;

        const pct    = Math.round(result.score * 100);
        const passed = result.passed;
        const color  = passed ? 'var(--color-success)' : 'var(--color-error)';
        const bg     = passed ? 'var(--color-success-soft)' : 'var(--color-error-soft)';

        panel.style.display = 'block';
        panel.innerHTML = `
            <div style="padding: var(--space-8); border-radius: var(--radius-xl); background: ${bg}; border: 2px solid ${color}; text-align: center;">
                <p style="font-size: var(--text-3xl); font-weight: var(--weight-bold); color: ${color}; line-height: 1;">${pct}%</p>
                <p style="font-size: var(--text-lg); font-weight: var(--weight-bold); margin-top: var(--space-2); color: ${color};">
                    ${passed ? '✓ Evaluación aprobada' : '✗ Evaluación no aprobada'}
                </p>
                <p style="color: var(--color-text-muted); margin-top: var(--space-3); font-size: var(--text-sm);">
                    ${result.correct} de ${result.total} preguntas correctas ·
                    ${passed
                        ? 'Ha cumplido el requisito mínimo de aprobación (80%).'
                        : 'Se requiere un mínimo de 80% para aprobar (4 de 5 correctas). Revise la retroalimentación y vuelva a intentarlo.'}
                </p>
                ${!passed ? `
                <div style="margin-top: var(--space-6); padding: var(--space-4); background: var(--color-warning-soft); color: var(--color-warning); border-radius: var(--radius-md); border-left: 4px solid var(--color-warning); font-size: var(--text-xs); text-align: left;">
                    ⚠️ MODO DEMO — En la versión de producción, solo los participantes que aprueban con ≥80% acceden al certificado.
                </div>
                <button onclick="PresentacionQuizApp._retry()" style="display: inline-block; margin-top: var(--space-4); padding: var(--space-3) var(--space-8); background: transparent; color: var(--color-text-muted); border-radius: var(--radius-pill); font-weight: var(--weight-bold); font-family: inherit; cursor: pointer; font-size: var(--text-sm); border: 1px solid var(--color-border);">↩ Reintentar evaluación</button>
                ` : ''}
                <a href="presentacion_plantbased_certificado.html" style="display: inline-block; margin-top: var(--space-4); padding: var(--space-3) var(--space-8); background: ${passed ? 'var(--color-primary)' : 'transparent'}; color: ${passed ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'}; border-radius: var(--radius-pill); font-weight: var(--weight-bold); text-decoration: none; font-size: var(--text-sm); border: 1px solid ${passed ? 'var(--color-primary)' : 'var(--color-border)'}; ${passed ? '' : 'pointer-events: none; opacity: 0.4;'}">🏆 Acceder a mi Certificado</a>
            </div>
        `;

        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ── Activar enlace al certificado en el footer ────────────────────────────

    _updateCertLink(passed) {
        ['cert-link', 'sidebar-cert-link'].forEach(id => {
            const link = document.getElementById(id);
            if (!link) return;
            link.style.pointerEvents = 'auto';
            link.style.opacity       = '1';
            if (passed && id === 'cert-link') {
                link.className = link.className.replace('btn-ghost', 'btn-primary');
            }
        });
    },

    // ── Reintentar (limpia sessionStorage y recarga) ──────────────────────────

    _retry() {
        sessionStorage.removeItem(KEY_RESULT);
        sessionStorage.removeItem(KEY_PASSED);
        window.location.reload();
    },

    // ── Restaurar resultado previo de la sesión ───────────────────────────────

    _restoreResult(result) {
        this._renderQuestions();

        result.answers.forEach(({ questionIndex, selected, isCorrect }) => {
            const input = document.querySelector(`input[name="q${questionIndex}"][value="${selected}"]`);
            if (input) input.checked = true;
            this._showFeedback(
                questionIndex,
                isCorrect,
                QUESTIONS[questionIndex].feedback,
                QUESTIONS[questionIndex].correct
            );
        });

        document.querySelectorAll('#quiz-questions input[type="radio"]').forEach(el => {
            el.disabled = true;
        });
        const submitBtn = document.getElementById('quiz-submit');
        if (submitBtn) submitBtn.disabled = true;

        this._showResult(result);
        this._updateCertLink(result.passed);
    }
};

// ─── Inicialización ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => PresentacionQuizApp.init());
