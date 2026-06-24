/**
 * cho-calculator.js — Calculadora educativa de conteo de carbohidratos
 * Mini-Taller: Conteo de Carbohidratos Avanzado | LMS CNDPR
 * Script global (no módulo ES). Requiere elementos DOM del taller_conteo_practica.html.
 */

// ── Datos de alimentos ────────────────────────────────────────────────────────
const CHO_FOODS = [
    { name: 'Arroz blanco cocido',       portion_label: '½ taza (90 g)',       portion_g: 90,  cho_g: 22, gi: 72 },
    { name: 'Arroz integral cocido',      portion_label: '½ taza (90 g)',       portion_g: 90,  cho_g: 22, gi: 50 },
    { name: 'Habichuelas rosadas',        portion_label: '½ taza (90 g)',       portion_g: 90,  cho_g: 20, gi: 26 },
    { name: 'Gandules verdes',            portion_label: '½ taza (80 g)',       portion_g: 80,  cho_g: 18, gi: 22 },
    { name: 'Plátano maduro',             portion_label: '1 mediano (120 g)',   portion_g: 120, cho_g: 30, gi: 51 },
    { name: 'Plátano verde (hervido)',    portion_label: '½ taza (80 g)',       portion_g: 80,  cho_g: 20, gi: 40 },
    { name: 'Yuca hervida',               portion_label: '½ taza (75 g)',       portion_g: 75,  cho_g: 18, gi: 46 },
    { name: 'Batata amarilla hervida',    portion_label: '½ taza (75 g)',       portion_g: 75,  cho_g: 21, gi: 54 },
    { name: 'Ñame hervido',               portion_label: '½ taza (75 g)',       portion_g: 75,  cho_g: 19, gi: 37 },
    { name: 'Pan sobao',                  portion_label: '1 rebanada (30 g)',   portion_g: 30,  cho_g: 15, gi: 73 },
    { name: 'Funche / harina de maíz',   portion_label: '½ taza cocido',       portion_g: 120, cho_g: 25, gi: 68 },
    { name: 'Papa blanca hervida',        portion_label: '1 mediana (150 g)',   portion_g: 150, cho_g: 30, gi: 78 },
    { name: 'Guineo / banana maduro',     portion_label: '1 mediano (120 g)',   portion_g: 120, cho_g: 27, gi: 51 },
    { name: 'Malanga / taro hervida',     portion_label: '½ taza (75 g)',       portion_g: 75,  cho_g: 16, gi: 53 },
    { name: 'Pasteles (masa de plátano)', portion_label: '1 pastel (150 g)',    portion_g: 150, cho_g: 28, gi: 45 },
    { name: 'Tostones (plátano frito)',   portion_label: '3 tostones (60 g)',   portion_g: 60,  cho_g: 18, gi: 55 },
    { name: 'Mofongo (1 bola)',           portion_label: '1 bola (120 g)',      portion_g: 120, cho_g: 26, gi: 50 },
    { name: 'Jugo de china / naranja',    portion_label: '½ taza (120 mL)',     portion_g: 120, cho_g: 13, gi: 50 },
];

const STORAGE_KEY = 'cho_calc_state';
let mealItems = [];

// ── Helpers ───────────────────────────────────────────────────────────────────

function _round1(n) { return Math.round(n * 10) / 10; }

function _scaledValues(food, grams) {
    const cho = (food.cho_g / food.portion_g) * grams;
    return {
        cho:       _round1(cho),
        exchanges: _round1(cho / 15),
        gl:        _round1((food.gi * cho) / 100),
    };
}

function _giLabel(gi) {
    if (gi <= 55) return '🟢 Bajo';
    if (gi <= 69) return '🟡 Medio';
    return '🔴 Alto';
}

function _glLabel(gl) {
    if (gl <= 10) return 'Baja';
    if (gl <= 20) return 'Media';
    return 'Alta';
}

// ── sessionStorage ────────────────────────────────────────────────────────────

function _saveState() {
    try {
        const dtdEl = document.getElementById('cho-dtd');
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            mealItems: mealItems,
            dtd: dtdEl ? dtdEl.value : '',
        }));
    } catch (_) {}
}

function _restoreState() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const state = JSON.parse(raw);
        if (Array.isArray(state.mealItems)) mealItems = state.mealItems;
        const dtdEl = document.getElementById('cho-dtd');
        if (dtdEl && state.dtd) dtdEl.value = state.dtd;
        _renderMealTable();
    } catch (_) {}
}

// ── Zona 1 — Preview de alimento ──────────────────────────────────────────────

function updatePreview() {
    var select   = document.getElementById('cho-food-select');
    var qtyInput = document.getElementById('cho-quantity');
    var preview  = document.getElementById('cho-preview');
    var errEl    = document.getElementById('cho-qty-error');
    var addBtn   = document.getElementById('cho-add-btn');

    var food  = CHO_FOODS[parseInt(select.value, 10)];
    var raw   = parseFloat(qtyInput.value);

    if (!raw || isNaN(raw) || raw < 1 || raw > 500) {
        errEl.style.display   = 'block';
        addBtn.disabled        = true;
        preview.style.display  = 'none';
        return;
    }

    errEl.style.display   = 'none';
    addBtn.disabled        = false;

    var v = _scaledValues(food, raw);

    preview.innerHTML =
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-3);' +
        'padding:var(--space-4);background:var(--color-primary-subtle);' +
        'border-radius:var(--radius-md);margin-top:var(--space-4);">' +
            '<div style="text-align:center;">' +
                '<div style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-primary);">' + v.cho + '</div>' +
                '<div style="font-size:var(--text-xs);color:var(--color-text-muted);">g CHO</div>' +
            '</div>' +
            '<div style="text-align:center;">' +
                '<div style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-primary);">' + v.exchanges + '</div>' +
                '<div style="font-size:var(--text-xs);color:var(--color-text-muted);">Intercambios</div>' +
            '</div>' +
            '<div style="text-align:center;">' +
                '<div style="font-size:var(--text-sm);font-weight:var(--weight-bold);color:var(--color-text);">' + _giLabel(food.gi) + '</div>' +
                '<div style="font-size:var(--text-xs);color:var(--color-text-muted);">Índice Glucémico</div>' +
            '</div>' +
            '<div style="text-align:center;">' +
                '<div style="font-size:var(--text-xl);font-weight:var(--weight-bold);color:var(--color-text);">' + v.gl + '</div>' +
                '<div style="font-size:var(--text-xs);color:var(--color-text-muted);">CG (' + _glLabel(v.gl) + ')</div>' +
            '</div>' +
        '</div>';
    preview.style.display = 'block';
}

// ── Zona 2 — Comida acumulada ─────────────────────────────────────────────────

function _renderMealTable() {
    var tbody   = document.getElementById('cho-meal-tbody');
    var tfoot   = document.getElementById('cho-meal-tfoot');
    var emptyEl = document.getElementById('cho-meal-empty');
    var tableEl = document.getElementById('cho-meal-table');

    if (mealItems.length === 0) {
        emptyEl.style.display = 'block';
        tableEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    tableEl.style.display = 'block';

    tbody.innerHTML = mealItems.map(function(item, i) {
        return '<tr>' +
            '<td>' + item.name + '</td>' +
            '<td>' + item.grams + ' g</td>' +
            '<td>' + item.cho + '</td>' +
            '<td>' + item.exchanges + '</td>' +
            '<td>' + item.gl + '</td>' +
            '<td style="text-align:center;">' +
                '<button onclick="removeFood(' + i + ')" class="btn btn-ghost btn-sm" ' +
                'style="color:var(--color-error);padding:var(--space-1) var(--space-2);min-width:0;" ' +
                'aria-label="Eliminar ' + item.name + '">✕</button>' +
            '</td>' +
        '</tr>';
    }).join('');

    var totalCho = _round1(mealItems.reduce(function(s, it) { return s + it.cho; }, 0));
    var totalExc = _round1(mealItems.reduce(function(s, it) { return s + it.exchanges; }, 0));
    var totalGl  = _round1(mealItems.reduce(function(s, it) { return s + it.gl; }, 0));
    var count    = mealItems.length;

    tfoot.innerHTML =
        '<tr style="font-weight:var(--weight-bold);background:var(--color-primary-subtle);">' +
            '<td colspan="2" style="font-size:var(--text-sm);">TOTAL (' + count + ' alimento' + (count !== 1 ? 's' : '') + ')</td>' +
            '<td style="font-size:var(--text-sm);">' + totalCho + ' g</td>' +
            '<td style="font-size:var(--text-sm);">' + totalExc + '</td>' +
            '<td style="font-size:var(--text-sm);">' + totalGl + '</td>' +
            '<td></td>' +
        '</tr>';
}

function addFood() {
    var select   = document.getElementById('cho-food-select');
    var qtyInput = document.getElementById('cho-quantity');
    var food     = CHO_FOODS[parseInt(select.value, 10)];
    var grams    = parseFloat(qtyInput.value);

    if (!grams || isNaN(grams) || grams < 1 || grams > 500) return;

    var v = _scaledValues(food, grams);
    mealItems.push({ name: food.name, grams: Math.round(grams), cho: v.cho, exchanges: v.exchanges, gl: v.gl });
    _renderMealTable();
    _saveState();
}

// Global: called from onclick in innerHTML
function removeFood(index) {
    mealItems.splice(index, 1);
    _renderMealTable();
    _saveState();
}

// ── Zona 3 — CIR ─────────────────────────────────────────────────────────────

function calculateCIR() {
    var dtd    = parseFloat(document.getElementById('cho-dtd').value);
    var result = document.getElementById('cho-cir-result');

    if (!dtd || isNaN(dtd) || dtd < 1 || dtd > 300) {
        result.innerHTML = '<p style="font-size:var(--text-sm);color:var(--color-error);margin-top:var(--space-3);">Ingresa una DTD válida entre 1 y 300 unidades.</p>';
        result.style.display = 'block';
        return;
    }

    var cir = _round1(500 / dtd);
    result.innerHTML =
        '<div style="background:var(--color-primary-soft);border:1px solid var(--color-primary);' +
        'border-radius:var(--radius-md);padding:var(--space-4);margin-top:var(--space-4);">' +
            '<p style="font-size:var(--text-md);font-weight:var(--weight-bold);color:var(--color-primary);margin:0 0 var(--space-2);">' +
                'CIR estimada (Regla 500): 1 U insulina rápida por cada <strong>' + cir + ' g de CHO</strong>' +
            '</p>' +
            '<p style="font-size:var(--text-xs);color:var(--color-text-muted);margin:0;">' +
                'La dosis específica de insulina prandial se calcula y ajusta por el equipo médico tratante usando esta CIR como punto de partida.' +
            '</p>' +
        '</div>';
    result.style.display = 'block';
    _saveState();
}

function resetAll() {
    mealItems = [];
    document.getElementById('cho-dtd').value = '';
    document.getElementById('cho-cir-result').style.display = 'none';
    _renderMealTable();
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    var select = document.getElementById('cho-food-select');
    CHO_FOODS.forEach(function (food, i) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.textContent = food.name + ' (' + food.portion_label + ')';
        select.appendChild(opt);
    });

    select.addEventListener('change', updatePreview);
    document.getElementById('cho-quantity').addEventListener('input', updatePreview);
    document.getElementById('cho-add-btn').addEventListener('click', addFood);
    document.getElementById('cho-cir-btn').addEventListener('click', calculateCIR);
    document.getElementById('cho-reset-btn').addEventListener('click', resetAll);

    updatePreview();
    _restoreState();
});
