/**
 * lectura-microbiota-quiz-controller.js
 * Evaluación: Microbiota Intestinal y Salud Metabólica — LM-2025-001
 * 5 preguntas de selección múltiple, 80% aprobación (4 de 5 correctas), 1 intento.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 0.80;
const KEY_RESULT     = 'quiz_lectura_microbiota_result';
const KEY_PASSED     = 'quiz_lectura_microbiota_passed';

// ─── Banco de preguntas ───────────────────────────────────────────────────────

const QUESTIONS = [
    {
        id: 1,
        text: '¿Cuál de los siguientes géneros bacterianos se asocia con PROTECCIÓN contra la resistencia a la insulina?',
        options: [
            'Clostridium difficile',
            'Akkermansia muciniphila',
            'Escherichia coli',
            'Helicobacter pylori'
        ],
        correct: 1,
        feedback: 'Akkermansia muciniphila refuerza la integridad de la barrera intestinal y se asocia con mejora de la sensibilidad a la insulina en estudios fase II. Su abundancia correlaciona inversamente con obesidad y resistencia a la insulina en múltiples estudios observacionales.'
    },
    {
        id: 2,
        text: 'Los ácidos grasos de cadena corta (AGCC) se producen principalmente por:',
        options: [
            'La digestión pancreática de grasas',
            'La absorción de lípidos en el intestino delgado',
            'La fermentación bacteriana de fibra dietética',
            'La síntesis hepática de ácidos biliares'
        ],
        correct: 2,
        feedback: 'Los AGCC (acetato, propionato y butirato) son metabolitos producidos por la microbiota al fermentar fibra soluble en el colon. El butirato es especialmente importante como fuente de energía para el colonocito y regulador de la permeabilidad intestinal. Su déficit se asocia con disbiosis y mayor riesgo metabólico.'
    },
    {
        id: 3,
        text: '¿Qué mecanismo explica la relación entre disbiosis y resistencia a la insulina?',
        options: [
            'Reducción de la absorción de glucosa en el intestino delgado',
            'Aumento de la producción pancreática de glucagón',
            'Translocación de LPS a circulación sistémica generando inflamación crónica',
            'Disminución de la secreción de insulina por el páncreas'
        ],
        correct: 2,
        feedback: 'El lipopolisacárido (LPS) bacteriano, al atravesar una barrera intestinal permeable, activa receptores TLR4 en células inmunes y tejidos periféricos, desencadenando una respuesta inflamatoria crónica de bajo grado que interfiere con la señalización de insulina en músculo, hígado y tejido adiposo.'
    },
    {
        id: 4,
        text: 'Al recomendar probióticos a un paciente con diabetes tipo 2, ¿cuál es la práctica más adecuada según la evidencia?',
        options: [
            'Recomendar cualquier yogurt con cultivos activos',
            'Especificar género, especie, cepa y dosis en UFC/día',
            'Indicar suplemento genérico de Lactobacillus sin dosis específica',
            'Esperar a que el paciente tenga síntomas gastrointestinales'
        ],
        correct: 1,
        feedback: 'La evidencia en probióticos es cepa-específica: no todos los Lactobacillus tienen el mismo efecto metabólico. La recomendación clínica debe incluir cepa validada (ej. L. acidophilus NCFM), dosis mínima efectiva en UFC/día y duración del tratamiento. Las recomendaciones genéricas carecen de soporte científico para efectos metabólicos.'
    },
    {
        id: 5,
        text: '¿Cuál de los siguientes alimentos aporta almidón resistente, un sustrato clave para la producción de butirato?',
        options: [
            'Pan blanco recién horneado',
            'Arroz blanco recién cocinado',
            'Plátano verde cocinado y enfriado',
            'Jugo de naranja pasteurizado'
        ],
        correct: 2,
        feedback: 'El almidón resistente se forma cuando ciertos almidones se cocinan y luego se enfrían, proceso que reorganiza la estructura cristalina del almidón haciéndolo resistente a la digestión. El plátano verde (guineo verde) es una fuente excelente disponible en Puerto Rico, junto con las legumbres y el arroz enfriado. La microbiota fermenta este almidón produciendo butirato.'
    }
];

// ─── Módulo de evaluación ─────────────────────────────────────────────────────

const LecturaQuizApp = {

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
                <button onclick="LecturaQuizApp._retry()" style="display: inline-block; margin-top: var(--space-4); padding: var(--space-3) var(--space-8); background: transparent; color: var(--color-text-muted); border-radius: var(--radius-pill); font-weight: var(--weight-bold); font-family: inherit; cursor: pointer; font-size: var(--text-sm); border: 1px solid var(--color-border);">↩ Reintentar evaluación</button>
                ` : ''}
                <a href="lectura_microbiota_certificado.html" style="display: inline-block; margin-top: var(--space-4); padding: var(--space-3) var(--space-8); background: ${passed ? 'var(--color-primary)' : 'transparent'}; color: ${passed ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'}; border-radius: var(--radius-pill); font-weight: var(--weight-bold); text-decoration: none; font-size: var(--text-sm); border: 1px solid ${passed ? 'var(--color-primary)' : 'var(--color-border)'}; ${passed ? '' : 'pointer-events: none; opacity: 0.4;'}">🏆 Acceder a mi Certificado</a>
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

document.addEventListener('DOMContentLoaded', () => LecturaQuizApp.init());
