'use strict';

const AdminEvaluaciones = (() => {

  // ── Utilities ────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#039;');
  }

  function formatDate(value) {
    if (!value) return '—';
    var date;
    if (typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      var p = value.split('-');
      date = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    } else {
      date = new Date(value);
    }
    return isNaN(date) ? '—' : date.toLocaleDateString('es-PR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function scoreToPercent(score) {
    if (score == null) return null;
    var s = parseFloat(score);
    if (isNaN(s)) return null;
    // Handle fraction (0–1) vs percentage (0–100)
    if (s > 0 && s <= 1) s = s * 100;
    return Math.round(s);
  }

  function formatScore(score) {
    var pct = scoreToPercent(score);
    return pct !== null ? pct + '%' : '—';
  }

  function tsToMs(ts) {
    if (!ts) return 0;
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    var d = new Date(ts);
    return isNaN(d) ? 0 : d.getTime();
  }

  function el(id) { return document.getElementById(id); }

  // ── Mock data (visible cuando quiz_results está vacío) ────────────────

  var MOCK_RESULTS = [
    { studentName: 'Dra. Ana M. Rodríguez Vega',  studentUid: 'demo-001', offerTitle: 'Manejo Nutricional de la Diabetes Tipo 2: Actualización Clínica', score: 0.80, passed: true,  attempts: 1, completedAt: new Date(Date.now() -  2 * 86400000) },
    { studentName: 'Lcda. Carmen M. Torres Ortiz', studentUid: 'demo-002', offerTitle: 'Mini-Taller: Conteo de Carbohidratos',                             score: 1.00, passed: true,  attempts: 1, completedAt: new Date(Date.now() -  3 * 86400000) },
    { studentName: 'Lcda. María L. Santos Rivera',  studentUid: 'demo-003', offerTitle: 'Microbiota Intestinal y Salud Metabólica',                          score: 0.60, passed: false, attempts: 2, completedAt: new Date(Date.now() -  4 * 86400000) },
    { studentName: 'Dra. Laura E. Ramos Colón',     studentUid: 'demo-004', offerTitle: 'Nutrición Plant-Based: Evidencia Clínica',                           score: 1.00, passed: true,  attempts: 1, completedAt: new Date(Date.now() -  5 * 86400000) },
    { studentName: 'Lcda. Sofía P. Cruz Vega',      studentUid: 'demo-005', offerTitle: 'NutriCorazón: Salud Cardiovascular y Nutrición',                    score: 0.80, passed: true,  attempts: 1, completedAt: new Date(Date.now() -  7 * 86400000) },
    { studentName: 'Lcda. Carmen M. Torres Ortiz',  studentUid: 'demo-002', offerTitle: 'Microbiota Intestinal y Salud Metabólica',                          score: 1.00, passed: true,  attempts: 2, completedAt: new Date(Date.now() - 10 * 86400000) },
    { studentName: 'Dra. Ana M. Rodríguez Vega',   studentUid: 'demo-001', offerTitle: 'Mini-Taller: Conteo de Carbohidratos',                             score: 0.75, passed: false, attempts: 1, completedAt: new Date(Date.now() - 12 * 86400000) },
    { studentName: 'Lcda. María L. Santos Rivera',  studentUid: 'demo-003', offerTitle: 'NutriCorazón: Salud Cardiovascular y Nutrición',                    score: 0.80, passed: true,  attempts: 1, completedAt: new Date(Date.now() - 15 * 86400000) },
  ];

  // ── State ────────────────────────────────────────────────────────────

  var _allResults = [];
  var _isMock = false;

  // ── Load ─────────────────────────────────────────────────────────────

  async function loadAllResults() {
    try {
      var snap = await firebase.firestore()
        .collectionGroup('quiz_results')
        .get();

      _allResults = snap.docs.map(function(d) {
        return Object.assign({}, d.data());
      });

      // Sort by completedAt desc client-side (no Firestore index required)
      _allResults.sort(function(a, b) {
        return tsToMs(b.completedAt) - tsToMs(a.completedAt);
      });

      if (_allResults.length === 0) {
        _allResults = MOCK_RESULTS;
        _isMock = true;
      }

    } catch (err) {
      console.error('[AdminEvaluaciones] loadAllResults:', err);
      _allResults = MOCK_RESULTS;
      _isMock = true;
    }

    var mockNote = document.getElementById('results-mock-note');
    if (mockNote) mockNote.style.display = _isMock ? '' : 'none';

    computeGlobalStats(_allResults);
    computeStatsByOffer(_allResults);
    populateOfferFilter();
    renderResultsTable(_allResults);
    bindFilters();
  }

  // ── KPIs ─────────────────────────────────────────────────────────────

  function computeGlobalStats(results) {
    var total = results.length;
    var passed = 0;
    var totalScore = 0;
    var totalAttempts = 0;

    results.forEach(function(r) {
      if (r.passed) passed++;
      var pct = scoreToPercent(r.score);
      if (pct !== null) totalScore += pct;
      totalAttempts += parseInt(r.attempts) || 1;
    });

    var rate = total > 0 ? Math.round((passed / total) * 100) : null;
    var avg  = total > 0 ? Math.round(totalScore / total) : null;

    if (el('kpi-total-evals'))    el('kpi-total-evals').textContent    = total;
    if (el('kpi-approval-rate'))  el('kpi-approval-rate').textContent  = rate !== null ? rate + '%' : 'N/D';
    if (el('kpi-avg-score'))      el('kpi-avg-score').textContent      = avg  !== null ? avg  + '%' : 'N/D';
    if (el('kpi-total-attempts')) el('kpi-total-attempts').textContent = totalAttempts;
  }

  // ── Stats por oferta ─────────────────────────────────────────────────

  function computeStatsByOffer(results) {
    var container = el('stats-by-offer');
    if (!container) return;

    var offerMap = {};
    results.forEach(function(r) {
      var key = r.offerTitle || '(sin título)';
      if (!offerMap[key]) offerMap[key] = { count: 0, passed: 0, totalScore: 0, failedQ: {} };
      offerMap[key].count++;
      if (r.passed) offerMap[key].passed++;
      var pct = scoreToPercent(r.score);
      if (pct !== null) offerMap[key].totalScore += pct;
      if (Array.isArray(r.failedQuestions)) {
        r.failedQuestions.forEach(function(q) {
          var k = String(q);
          offerMap[key].failedQ[k] = (offerMap[key].failedQ[k] || 0) + 1;
        });
      }
    });

    container.innerHTML = '';

    var keys = Object.keys(offerMap);
    if (keys.length === 0) {
      if (typeof CATALOG_OFFERINGS !== 'undefined') {
        CATALOG_OFFERINGS.forEach(function(o) {
          container.appendChild(buildOfferStatCard(o.title, 0, null, null, null));
        });
      } else {
        container.innerHTML =
          '<p style="color: var(--color-text-muted); font-size: var(--text-sm);">No hay datos de evaluaciones aún.</p>';
      }
      return;
    }

    keys.forEach(function(title) {
      var d = offerMap[title];
      var rate = d.count > 0 ? Math.round((d.passed / d.count) * 100) : null;
      var avg  = d.count > 0 ? Math.round(d.totalScore / d.count) : null;

      var topFailed = null;
      var fKeys = Object.keys(d.failedQ);
      if (fKeys.length > 0) {
        topFailed = fKeys.reduce(function(a, b) {
          return d.failedQ[a] >= d.failedQ[b] ? a : b;
        });
      }

      container.appendChild(buildOfferStatCard(title, d.count, rate, avg, topFailed));
    });
  }

  function buildOfferStatCard(title, count, rate, avg, topFailed) {
    var div = document.createElement('article');
    div.className = 'eval-offer-card';
    div.innerHTML =
      '<div class="eval-offer-title">' + escapeHtml(title) + '</div>' +
      '<div class="eval-offer-stats">' +
        '<div class="eval-offer-stat">' +
          '<div class="eval-stat-value">' + count + '</div>' +
          '<div class="eval-stat-label">Estudiantes</div>' +
        '</div>' +
        '<div class="eval-offer-stat">' +
          '<div class="eval-stat-value">' + (rate !== null ? rate + '%' : '—') + '</div>' +
          '<div class="eval-stat-label">Aprobación</div>' +
        '</div>' +
        '<div class="eval-offer-stat">' +
          '<div class="eval-stat-value">' + (avg !== null ? avg + '%' : '—') + '</div>' +
          '<div class="eval-stat-label">Promedio</div>' +
        '</div>' +
      '</div>' +
      (topFailed
        ? '<div class="eval-offer-failed">' +
            '<span class="eval-failed-label">Más fallada:</span> ' + escapeHtml(topFailed) +
          '</div>'
        : '');
    return div;
  }

  // ── Tabla de resultados ──────────────────────────────────────────────

  function renderResultsTable(results) {
    var tbody = el('results-table-body');
    if (!tbody) return;

    if (results.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="padding: var(--space-2);">' +
          '<div class="empty-state">' +
            '<div class="empty-state-icon" aria-hidden="true" style="font-size: 1.75rem;">📋</div>' +
            '<p>No hay resultados de evaluaciones registrados.</p>' +
            '<p style="font-size: var(--text-xs); color: var(--color-text-faint); margin-top: var(--space-1);">' +
              'Los resultados aparecerán aquí una vez que los estudiantes completen evaluaciones.' +
            '</p>' +
          '</div>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = results.map(function(r) {
      var scoreDisp  = formatScore(r.score);
      var badgeClass = r.passed ? 'badge-success' : 'badge-error';
      var pillClass  = r.passed ? 'status-pill status-active' : 'status-pill status-inactive';
      var pillText   = r.passed ? 'Aprobado' : 'Reprobado';
      var actionCell = r.studentUid
        ? '<a href="admin_estudiante_detalle.html?uid=' + encodeURIComponent(String(r.studentUid)) + '" class="btn btn-ghost btn-sm">Ver estudiante</a>'
        : '<span style="color: var(--color-text-faint); font-size: var(--text-xs);">—</span>';

      return '<tr>' +
        '<td>' + escapeHtml(r.studentName || '—') + '</td>' +
        '<td>' + escapeHtml(r.offerTitle  || '—') + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + escapeHtml(scoreDisp) + '</span></td>' +
        '<td style="text-align: center;">' + (parseInt(r.attempts) || 1) + '</td>' +
        '<td>' + escapeHtml(formatDate(r.completedAt)) + '</td>' +
        '<td><span class="' + pillClass + '">' + pillText + '</span></td>' +
        '<td>' + actionCell + '</td>' +
      '</tr>';
    }).join('');
  }

  // ── Filtros ───────────────────────────────────────────────────────────

  function filterResults() {
    var query    = (el('search-input')  ? el('search-input').value  : '').toLowerCase().trim();
    var offerVal = (el('filter-offer')  ? el('filter-offer').value  : 'all');
    var resVal   = (el('filter-result') ? el('filter-result').value : 'all');
    var dateVal  = (el('filter-date')   ? el('filter-date').value   : 'all');

    var now = Date.now();
    var thresholds = {
      'week':    now - 7  * 86400000,
      'month':   now - 30 * 86400000,
      'quarter': now - 90 * 86400000,
    };

    var filtered = _allResults.filter(function(r) {
      if (query    && !(r.studentName || '').toLowerCase().includes(query)) return false;
      if (offerVal !== 'all' && r.offerTitle !== offerVal)                  return false;
      if (resVal === 'passed' && !r.passed)  return false;
      if (resVal === 'failed' &&  r.passed)  return false;
      if (dateVal !== 'all' && thresholds[dateVal]) {
        if (tsToMs(r.completedAt) < thresholds[dateVal]) return false;
      }
      return true;
    });

    renderResultsTable(filtered);
    var countEl = el('results-count');
    if (countEl) {
      countEl.textContent = filtered.length + (filtered.length === 1 ? ' resultado' : ' resultados');
    }
  }

  function populateOfferFilter() {
    var select = el('filter-offer');
    if (!select || typeof CATALOG_OFFERINGS === 'undefined') return;
    CATALOG_OFFERINGS.forEach(function(o) {
      var key   = o.offerTitle || o.title;        // valor que Firestore almacenará en offerTitle
      var label = o.title.length > 52 ? o.title.substring(0, 49) + '…' : o.title;
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = label;
      select.appendChild(opt);
    });
  }

  function bindFilters() {
    ['search-input', 'filter-offer', 'filter-result', 'filter-date'].forEach(function(id) {
      var input = el(id);
      if (!input) return;
      input.addEventListener('input',  filterResults);
      input.addEventListener('change', filterResults);
    });
    var countEl = el('results-count');
    if (countEl) {
      countEl.textContent = _allResults.length + (_allResults.length === 1 ? ' resultado' : ' resultados');
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────

  return {
    init: function() {
      firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        loadAllResults();
      });
    }
  };

})();

document.addEventListener('DOMContentLoaded', function() { AdminEvaluaciones.init(); });
