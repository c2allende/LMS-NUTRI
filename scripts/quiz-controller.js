/**
 * Quiz Controller — Evaluación Módulo 1
 * Evaluación de selección múltiple, cliente-side.
 * - Aprobación: ≥70% (4 de 5 correctas)
 * - Intentos: 1 por sesión (controlado via sessionStorage)
 * - Sin dependencias externas ni Firebase
 */

// ─── Constantes ──────────────────────────────────────────────────────────────

const PASS_THRESHOLD  = 0.70;
const KEY_RESULT      = 'quiz_modulo1_result';   // objeto JSON con nota y respuestas
const KEY_PASSED      = 'quiz_passed';            // 'true' | 'false'
const KEY_STUDENT     = 'student_name';           // nombre del participante para el certificado

// ─── Banco de preguntas ───────────────────────────────────────────────────────
// Estructura por pregunta:
//   id       : número de orden (1-5)
//   text     : enunciado de la pregunta
//   options  : array de 4 opciones (índices 0-3)
//   correct  : índice (0-3) de la opción correcta
//   feedback : justificación académica mostrada al revelar

const QUESTIONS = [
    {
        id: 1,
        text: 'Un paciente de 48 años con DM2 de 6 años de evolución presenta HbA1c de 10.2% a pesar de tratamiento con metformina en dosis máxima. Su médico considera añadir un agente secretagogo de insulina. ¿Cuál de los siguientes mecanismos fisiopatológicos justifica mejor esta decisión terapéutica?',
        options: [
            'Aumento de la reabsorción renal de glucosa secundario a la hiperglucemia crónica.',
            'Progresión del deterioro de la función secretora de las células β pancreáticas.',
            'Disminución de la sensibilidad de los receptores musculares a la insulina.',
            'Activación compensatoria del sistema nervioso simpático que incrementa la producción hepática de glucosa.'
        ],
        correct: 1,
        feedback: 'La metformina actúa principalmente reduciendo la gluconeogénesis hepática y mejorando la sensibilidad periférica, pero no estimula la secreción de insulina. Cuando la HbA1c no se controla con dosis óptimas de metformina, el mecanismo dominante es el deterioro progresivo de la masa y función de las células β, que requiere un agente secretagogo. (DeFronzo 2009; ADA 2024, Sección 9)'
    },
    {
        id: 2,
        text: 'Durante una evaluación nutricional, usted obtiene los siguientes resultados de laboratorio de una paciente de 43 años: HbA1c 6.3%, glucemia en ayuno 112 mg/dL, glucemia 2h post-COTG 148 mg/dL. ¿Cuál es el diagnóstico más preciso según los criterios ADA 2024?',
        options: [
            'Diabetes mellitus tipo 2.',
            'Sin alteración del metabolismo de la glucosa.',
            'Prediabetes.',
            'Síndrome metabólico, sin alteración glucémica.'
        ],
        correct: 2,
        feedback: 'Los tres valores caen en los rangos de prediabetes según ADA 2024: HbA1c 5.7–6.4% (6.3% ✓), glucemia en ayuno 100–125 mg/dL (112 ✓), glucemia 2h post-COTG 140–199 mg/dL (148 ✓). Ningún valor alcanza el umbral diagnóstico de DM2. La prediabetes es indicación prioritaria de intervención de estilo de vida intensiva — el DPP demostró reducción del 58% en la progresión con dieta y ejercicio. (ADA 2024, Tabla 2.2; Knowler et al., NEJM 2002)'
    },
    {
        id: 3,
        text: 'Paciente masculino de 58 años, de origen latinoamericano, con DM2 de 5 años. IMC: 26.8 kg/m², circunferencia de cintura: 96 cm. A pesar de un IMC en rango de "peso normal", usted incluye adiposidad central en su diagnóstico nutricional. ¿Qué fundamento respalda mejor esta decisión clínica?',
        options: [
            'El IMC no es válido como herramienta diagnóstica en pacientes con diabetes tipo 2.',
            'La circunferencia de cintura supera el umbral de riesgo para población latinoamericana masculina según criterios IDF 2006 (≥90 cm).',
            'El peso del paciente está subestimado por retención de líquidos asociada a nefropatía diabética.',
            'Los pacientes con DM2 de más de 3 años siempre presentan adiposidad central clínicamente significativa.'
        ],
        correct: 1,
        feedback: 'Los criterios IDF 2006 para población latinoamericana establecen riesgo aumentado con CC ≥90 cm en hombres y ≥80 cm en mujeres — umbrales más sensibles que los del NCEP-ATP III (≥102 cm / ≥88 cm) para detectar el riesgo cardiometabólico real. Con 96 cm, este paciente supera el umbral IDF, confirmando adiposidad central clínicamente significativa independientemente de su IMC. (IDF 2006; ADA 2024, Sección 8)'
    },
    {
        id: 4,
        text: 'Una paciente con DM2 tiene HbA1c de 7.9%, glucemia en ayuno consistentemente entre 82–105 mg/dL, y glucemia posprandial a las 2h promediando 215 mg/dL. ¿Cuál sería la orientación nutricional más directa y efectiva?',
        options: [
            'Reducir el total de calorías de la dieta para bajar de peso y disminuir la HbA1c global.',
            'Ajustar la distribución y la calidad de los carbohidratos en las comidas principales para reducir la carga glucémica posprandial.',
            'Aumentar la dosis de insulina basal para corregir la glucemia en ayuno, que está elevada.',
            'Suspender el monitoreo de glucemia en ayuno porque los valores están dentro del rango normal.'
        ],
        correct: 1,
        feedback: 'La glucemia en ayuno normal indica que la producción hepática de glucosa y la insulina basal están bien controladas. La HbA1c elevada con glucemia posprandial de 215 mg/dL señala que las excursiones posprandiales son el principal contribuyente. La intervención más directa es reducir la carga glucémica posprandial ajustando tipo, cantidad y distribución temporal de carbohidratos — sin necesidad de modificar la farmacoterapia basal. (ADA 2024, Sección 5; Monnier et al., Diabetes Care 2003)'
    },
    {
        id: 5,
        text: 'Paciente con DM2: ingesta estimada de 340 g CHO/día (68% VCT), HbA1c 9.4%, conocimiento limitado sobre carga glucémica, sin educación nutricional formal previa. ¿Cuál de los siguientes enunciados PES refleja con mayor precisión el diagnóstico nutricional prioritario?',
        options: [
            'Exceso de ingesta calórica (NI-1.3) relacionado con sedentarismo, evidenciado por IMC de 31.2 kg/m².',
            'Ingesta excesiva de carbohidratos (NI-5.8.2) relacionada con conocimiento inadecuado sobre selección de CHO de bajo índice glucémico, evidenciada por ingesta de 340 g CHO/día (68% VCT) y HbA1c de 9.4%.',
            'Diabetes mellitus tipo 2 no controlada relacionada con deficiente adherencia al tratamiento farmacológico, evidenciada por HbA1c de 9.4%.',
            'Patrón alimentario desordenado (NB-1.5) relacionado con restricción cognitiva, evidenciado por HbA1c elevada y pérdida de peso reciente.'
        ],
        correct: 1,
        feedback: 'El formato PES correcto requiere: (1) problema de la terminología AND — NI-5.8.2 es el código exacto y medible; (2) etiología nutricional modificable — el conocimiento inadecuado es intervenible desde la educación nutricional; (3) signos/síntomas objetivos — ingesta cuantificada y HbA1c. La opción C usa un diagnóstico médico como nutricional (error conceptual frecuente); la D introduce datos no evidenciados en la viñeta. (AND eNCPT 2023)'
    }
];

// ─── Módulo principal ─────────────────────────────────────────────────────────

const QuizApp = {

    // Punto de entrada — llamado desde DOMContentLoaded
    init() {
        const saved = sessionStorage.getItem(KEY_RESULT);
        if (saved) {
            // Ya existe resultado en esta sesión: reconstruir en modo solo lectura
            this._restoreResult(JSON.parse(saved));
        } else {
            this._renderQuestions();
            this._bindSubmit();
        }
    },

    // ── Renderizado ──────────────────────────────────────────────────────────

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

    // ── Vinculación del botón Enviar ─────────────────────────────────────────

    _bindSubmit() {
        const btn = document.getElementById('quiz-submit');
        if (!btn) return;
        btn.addEventListener('click', () => this._evaluate());
    },

    // ── Evaluación ───────────────────────────────────────────────────────────

    _evaluate() {
        // Verificar que todas las preguntas estén respondidas
        for (let i = 0; i < QUESTIONS.length; i++) {
            if (!document.querySelector(`input[name="q${i}"]:checked`)) {
                alert('Por favor responde todas las preguntas antes de enviar la evaluación.');
                return;
            }
        }

        let correct = 0;
        const answers = [];

        QUESTIONS.forEach((q, i) => {
            const selected = parseInt(document.querySelector(`input[name="q${i}"]:checked`).value);
            const isCorrect = selected === q.correct;
            if (isCorrect) correct++;
            answers.push({ questionIndex: i, selected, isCorrect });
            this._showFeedback(i, isCorrect, q.feedback, q.correct);
        });

        const score  = correct / QUESTIONS.length;
        const passed = score >= PASS_THRESHOLD;

        // Persistir resultado en sessionStorage (controla el único intento)
        const result = { correct, total: QUESTIONS.length, score, passed, answers };
        sessionStorage.setItem(KEY_RESULT, JSON.stringify(result));
        sessionStorage.setItem(KEY_PASSED, passed ? 'true' : 'false');
        sessionStorage.setItem(KEY_STUDENT, 'Dra. Ana M. Rodríguez Vega');

        // Bloquear todos los inputs y el botón de envío
        document.querySelectorAll('#quiz-questions input[type="radio"]').forEach(el => {
            el.disabled = true;
        });
        const submitBtn = document.getElementById('quiz-submit');
        if (submitBtn) submitBtn.disabled = true;

        // Mostrar panel de resultado y activar enlace al certificado si aplica
        this._showResult(result);
        this._updateCertLink(passed);
    },

    // ── Feedback por pregunta ────────────────────────────────────────────────

    _showFeedback(index, isCorrect, feedbackText, correctIndex) {
        // Resaltar la opción correcta en verde siempre
        const correctLabel = document.getElementById(`label-${index}-${correctIndex}`);
        if (correctLabel) {
            correctLabel.style.borderColor = 'var(--color-success)';
            correctLabel.style.background  = 'var(--color-success-soft)';
        }

        // Si la respuesta fue incorrecta, resaltar la seleccionada en rojo
        if (!isCorrect) {
            const selected = document.querySelector(`input[name="q${index}"]:checked`);
            if (selected) {
                const wrongLabel = selected.parentElement;
                wrongLabel.style.borderColor = 'var(--color-error)';
                wrongLabel.style.background  = 'var(--color-error-soft)';
            }
        }

        // Mostrar texto de retroalimentación
        const fb = document.getElementById(`feedback-${index}`);
        if (!fb) return;
        fb.style.display     = 'block';
        fb.style.background  = isCorrect ? 'var(--color-success-soft)' : 'var(--color-error-soft)';
        fb.style.color       = isCorrect ? 'var(--color-success)'      : 'var(--color-error)';
        fb.style.borderColor = isCorrect ? 'var(--color-success)'      : 'var(--color-error)';
        fb.innerHTML         = `<strong>${isCorrect ? '✓ Correcto.' : '✗ Incorrecto.'}</strong> ${feedbackText}`;
    },

    // ── Panel de resultado ───────────────────────────────────────────────────

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
                        : 'Se requiere un mínimo de 70% para aprobar (4 de 5 correctas).'}
                </p>
                ${!passed ? `
                <div style="margin-top: var(--space-6); padding: var(--space-4); background: var(--color-warning-soft); color: var(--color-warning); border-radius: var(--radius-md); border-left: 4px solid var(--color-warning); font-size: var(--text-xs); text-align: left;">
                    ⚠️ MODO DEMO — En la versión de producción solo participantes que aprueban con ≥70% acceden al certificado. Este acceso es exclusivo del prototipo demostrativo.
                </div>` : ''}
                <a href="certificado_modulo1.html" style="display: inline-block; margin-top: var(--space-4); padding: var(--space-3) var(--space-8); background: ${passed ? 'var(--color-primary)' : 'transparent'}; color: ${passed ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'}; border-radius: var(--radius-pill); font-weight: var(--weight-bold); text-decoration: none; font-size: var(--text-sm); border: 1px solid ${passed ? 'var(--color-primary)' : 'var(--color-border)'};">🏆 Acceder a mi Certificado</a>
            </div>
        `;

        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // ── Activar enlace al certificado en el footer de navegación ────────────

    _updateCertLink(passed) {
        const link = document.getElementById('cert-link');
        if (!link) return;
        link.style.pointerEvents = 'auto';
        link.style.opacity       = '1';
        if (passed) {
            link.className = link.className.replace('btn-ghost', 'btn-primary');
        }
        // If not passed: cert-link becomes active but keeps btn-ghost style
    },

    // ── Restaurar estado si ya existe resultado en la sesión ─────────────────

    _restoreResult(result) {
        // Reconstruir preguntas en modo solo lectura
        this._renderQuestions();

        // Re-marcar las respuestas previas y mostrar feedback
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

        // Deshabilitar todos los controles
        document.querySelectorAll('#quiz-questions input[type="radio"]').forEach(el => {
            el.disabled = true;
        });
        const submitBtn = document.getElementById('quiz-submit');
        if (submitBtn) submitBtn.disabled = true;

        // Mostrar resultado guardado
        this._showResult(result);
        this._updateCertLink(result.passed);
    }
};

// ─── Inicialización ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => QuizApp.init());
