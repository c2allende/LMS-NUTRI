/**
 * taller-quiz-controller.js — Evaluación Mini-Taller: Conteo de Carbohidratos
 * 4 preguntas de selección múltiple, 70% aprobación (3 de 4 correctas), 1 intento.
 * Claves sessionStorage independientes del curso DM2.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

const PASS_THRESHOLD = 0.70;
const KEY_RESULT     = 'quiz_taller_conteo_result';
const KEY_PASSED     = 'quiz_taller_conteo_passed';
const KEY_STUDENT    = 'student_name';

// ─── Banco de preguntas ───────────────────────────────────────────────────────

const QUESTIONS = [
    {
        id: 1,
        text: 'Un paciente consume ½ taza de arroz blanco cocido (90 g) en el almuerzo. ¿Cuántos intercambios de carbohidratos representa esa porción?',
        options: [
            '0.5 intercambios',
            '1.0 intercambio',
            '1.5 intercambios',
            '2.0 intercambios'
        ],
        correct: 2,
        feedback: 'Una porción de ½ taza de arroz blanco aporta aproximadamente 22 g de CHO. Como 1 intercambio equivale a 15 g de CHO (sistema ADA/AND), la porción equivale a 22 ÷ 15 ≈ 1.47 intercambios, redondeado a 1.5. Este es el valor que se comunica al paciente en educación nutricional. (ADA/AND Exchange Lists for Diabetes; Franz et al., 2017)'
    },
    {
        id: 2,
        text: 'Una porción de plátano maduro aporta 30 g de CHO y tiene un índice glucémico de 51. ¿Cuál es la carga glucémica (CG) aproximada de esa porción?',
        options: [
            '5',
            '10',
            '15',
            '20'
        ],
        correct: 2,
        feedback: 'La carga glucémica se calcula: CG = (IG × g CHO) / 100 = (51 × 30) / 100 = 15.3 ≈ 15. Una CG de 15 se clasifica como moderada (≤10 baja, ≥20 alta), lo que indica que el plátano maduro tiene un impacto glucémico moderado, menor al que su fama sugiere. (Foster-Powell, Holt & Brand-Miller, Am J Clin Nutr, 2002)'
    },
    {
        id: 3,
        text: '¿Cuál es la principal ventaja glucémica de sustituir arroz blanco (IG ≈ 72) por habichuelas rosadas (IG ≈ 26) en el plan de alimentación del paciente con DM2?',
        options: [
            'Mayor aporte proteico por porción',
            'Mayor densidad calórica que favorece la saciedad',
            'Menor índice glucémico y mayor contenido de fibra soluble que atenúa la respuesta glucémica posprandial',
            'Mayor biodisponibilidad de zinc y hierro'
        ],
        correct: 2,
        feedback: 'Las habichuelas rosadas tienen un IG muy bajo (≈26 vs. 72 del arroz blanco) y son ricas en fibra soluble, que forma un gel viscoso en el intestino delgado y frena la absorción de glucosa. Esto se traduce en una excursión glucémica posprandial significativamente menor. Promover la sustitución o combinación con arroz es una estrategia basada en evidencia y culturalmente pertinente para Puerto Rico. (ADA 2024, Sección 5; Satija & Hu, Prog Cardiovasc Dis, 2018)'
    },
    {
        id: 4,
        text: 'Un paciente con DM2 en régimen bolo-basal tiene una dosis total diaria (DTD) de insulina de 50 unidades. Usando la Regla 500, ¿cuál es la razón insulina:carbohidrato (CIR) estimada?',
        options: [
            '1 unidad por cada 5 g de CHO',
            '1 unidad por cada 10 g de CHO',
            '1 unidad por cada 15 g de CHO',
            '1 unidad por cada 20 g de CHO'
        ],
        correct: 1,
        feedback: 'Regla 500: CIR = 500 ÷ DTD = 500 ÷ 50 = 10 g CHO por unidad de insulina rápida. Esta estimación es el punto de partida para la individualización de la CIR, que luego se ajusta monitorizando la glucemia 2h posprandial (meta <180 mg/dL, ADA 2024). Recuerde que el ajuste de dosis requiere prescripción médica; el RDN contribuye con la educación y el registro alimentario. (Walsh et al., Practical Insulin; ADA 2024, Sección 9)'
    }
];

// ─── Módulo de evaluación ─────────────────────────────────────────────────────

const TallerQuizApp = {

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
                        ? 'Ha cumplido el requisito mínimo de aprobación (70%).'
                        : 'Se requiere un mínimo de 70% para aprobar (3 de 4 correctas).'}
                </p>
                ${!passed ? `
                <div style="margin-top: var(--space-6); padding: var(--space-4); background: var(--color-warning-soft); color: var(--color-warning); border-radius: var(--radius-md); border-left: 4px solid var(--color-warning); font-size: var(--text-xs); text-align: left;">
                    ⚠️ MODO DEMO — En la versión de producción solo participantes que aprueban con ≥70% acceden al certificado. Este acceso es exclusivo del prototipo demostrativo.
                </div>` : ''}
                <a href="taller_conteo_certificado.html" style="display: inline-block; margin-top: var(--space-4); padding: var(--space-3) var(--space-8); background: ${passed ? 'var(--color-primary)' : 'transparent'}; color: ${passed ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'}; border-radius: var(--radius-pill); font-weight: var(--weight-bold); text-decoration: none; font-size: var(--text-sm); border: 1px solid ${passed ? 'var(--color-primary)' : 'var(--color-border)'};">🏆 Acceder a mi Certificado</a>
            </div>
        `;

        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ── Activar enlace al certificado en el footer ────────────────────────────

    _updateCertLink(passed) {
        const link = document.getElementById('cert-link');
        if (!link) return;
        link.style.pointerEvents = 'auto';
        link.style.opacity       = '1';
        if (passed) {
            link.className = link.className.replace('btn-ghost', 'btn-primary');
        }
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

document.addEventListener('DOMContentLoaded', () => TallerQuizApp.init());
