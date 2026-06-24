/**
 * podcast-quiz-controller.js
 * Evaluación: La Nutrición y el Corazón — POD-2025-001
 * 5 preguntas de selección múltiple, 80% aprobación (4 de 5 correctas), reintento disponible.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 0.80;
const KEY_RESULT     = 'quiz_podcast_nutricoracon_result';
const KEY_PASSED     = 'quiz_podcast_nutricoracon_passed';

// ─── Banco de preguntas ───────────────────────────────────────────────────────

const QUESTIONS = [
    {
        id: 1,
        text: '¿Cuánto reduce el riesgo cardiovascular el consumo de 5 o más porciones de frutas y vegetales diarias, según la evidencia actual?',
        options: [
            '5%',
            '9%',
            '13%',
            '20%'
        ],
        correct: 2,
        feedback: 'Metaanálisis recientes demuestran una reducción de aproximadamente 13% en riesgo cardiovascular con el consumo de 5 o más porciones diarias de frutas y vegetales, mediada por fibra, antioxidantes, potasio y fitoquímicos.'
    },
    {
        id: 2,
        text: '¿Cuál es el efecto de reducir 1,000 mg/día de sodio en la presión arterial sistólica de personas hipertensas?',
        options: [
            '−1.5 mmHg',
            '−3.2 mmHg',
            '−5.8 mmHg',
            '−9.0 mmHg'
        ],
        correct: 2,
        feedback: 'La reducción de 1,000 mg/día de sodio se asocia con una disminución promedio de 5.8 mmHg en presión sistólica en personas hipertensas. En Puerto Rico, el consumo promedio supera los 3,500 mg/día, casi el doble de lo recomendado.'
    },
    {
        id: 3,
        text: '¿Cuál sustitución de grasa tiene el mayor impacto sobre el LDL-C?',
        options: [
            'Eliminar todas las grasas de la dieta',
            'Sustituir grasas saturadas por grasas insaturadas',
            'Aumentar el consumo de omega-3 marino',
            'Reemplazar aceite de oliva por aceite de canola'
        ],
        correct: 1,
        feedback: 'Sustituir grasas saturadas por insaturadas produce una reducción promedio de LDL de 0.25 mmol/L por cada 5% de energía sustituida. Esta es la intervención con mayor evidencia de impacto sobre el LDL-C en la consejería nutricional cardiovascular.'
    },
    {
        id: 4,
        text: 'El consumo diario de 50 gramos de carnes procesadas se asocia con:',
        options: [
            '5% de aumento en riesgo de ECV',
            '10% de aumento en riesgo de ECV',
            '18% de aumento en riesgo de ECV',
            '25% de aumento en riesgo de ECV'
        ],
        correct: 2,
        feedback: 'El consumo de 50 gramos diarios de carnes procesadas (salchichas, fiambre, tocino) se asocia con un 18% de aumento en riesgo de ECV. Es una de las asociaciones más sólidas en epidemiología nutricional cardiovascular.'
    },
    {
        id: 5,
        text: '¿Cuál es el efecto de cada 7 gramos adicionales de fibra diaria sobre el riesgo cardiovascular?',
        options: [
            'Reducción del 3%',
            'Reducción del 9%',
            'Reducción del 15%',
            'Sin efecto significativo demostrado'
        ],
        correct: 1,
        feedback: 'Cada 7 gramos adicionales de fibra diaria se asocian con una reducción del 9% en riesgo de ECV. La fibra soluble —presente en avena, legumbres y psyllium— tiene efecto directo sobre la reducción del LDL-C.'
    }
];

// ─── Módulo de evaluación ─────────────────────────────────────────────────────

const PodcastQuizApp = {

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
                <button onclick="PodcastQuizApp._retry()" style="display: inline-block; margin-top: var(--space-4); padding: var(--space-3) var(--space-8); background: transparent; color: var(--color-text-muted); border-radius: var(--radius-pill); font-weight: var(--weight-bold); font-family: inherit; cursor: pointer; font-size: var(--text-sm); border: 1px solid var(--color-border);">↩ Reintentar evaluación</button>
                ` : ''}
                <a href="podcast_nutricoracon_certificado.html" style="display: inline-block; margin-top: var(--space-4); padding: var(--space-3) var(--space-8); background: ${passed ? 'var(--color-primary)' : 'transparent'}; color: ${passed ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'}; border-radius: var(--radius-pill); font-weight: var(--weight-bold); text-decoration: none; font-size: var(--text-sm); border: 1px solid ${passed ? 'var(--color-primary)' : 'var(--color-border)'}; ${passed ? '' : 'pointer-events: none; opacity: 0.4;'}">🏆 Acceder a mi Certificado</a>
            </div>
        `;

        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ── Activar enlace al certificado ─────────────────────────────────────────

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

    // ── Reintentar ────────────────────────────────────────────────────────────

    _retry() {
        sessionStorage.removeItem(KEY_RESULT);
        sessionStorage.removeItem(KEY_PASSED);
        window.location.reload();
    },

    // ── Restaurar resultado previo ────────────────────────────────────────────

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

document.addEventListener('DOMContentLoaded', () => PodcastQuizApp.init());
