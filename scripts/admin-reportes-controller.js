'use strict';

const AdminReportes = (() => {

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

  function el(id) { return document.getElementById(id); }

  var MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  var TYPE_LABELS = {
    'curso':        'Curso',
    'taller':       'Taller',
    'lectura':      'Lectura dirigida',
    'presentacion': 'Presentación temática',
    'podcast':      'Podcast',
  };

  // ── Mock data ─────────────────────────────────────────────────────────

  var MOCK_OFFER_STATS = {
    'Manejo Nutricional de la Diabetes Tipo 2: Actualización Clínica': { students: 18, approvalRate: 88, certs: 15 },
    'Mini-Taller: Conteo de Carbohidratos':                           { students: 12, approvalRate: 92, certs: 10 },
    'Microbiota Intestinal y Salud Metabólica':                       { students:  9, approvalRate: 78, certs:  7 },
    'Nutrición Plant-Based: Evidencia Clínica':                       { students:  7, approvalRate: 85, certs:  6 },
    'NutriCorazón: Salud Cardiovascular y Nutrición':                 { students:  5, approvalRate: 100, certs: 5 },
  };

  var MOCK_CHART_VALUES = [8, 12, 5, 18, 22, 15];

  // ── Helpers ───────────────────────────────────────────────────────────

  function buildLastSixMonths() {
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      months.push({ key: key, label: MONTH_LABELS[d.getMonth()], value: 0 });
    }
    return months;
  }

  // ── KPIs globales ─────────────────────────────────────────────────────

  async function loadGlobalKPIs(usersSnap, certsSnap, quizSnap) {
    // Total estudiantes
    var totalStudents = usersSnap ? usersSnap.size : 0;

    // Horas EC y certificados
    var totalHours = 0;
    var totalCerts = 0;
    if (certsSnap) {
      totalCerts = certsSnap.size;
      certsSnap.docs.forEach(function(d) {
        totalHours += parseFloat(d.data().hours) || 0;
      });
    }

    // Tasa de aprobación
    var approvalRate = null;
    if (quizSnap && quizSnap.size > 0) {
      var passed = 0;
      quizSnap.docs.forEach(function(d) { if (d.data().passed) passed++; });
      approvalRate = Math.round((passed / quizSnap.size) * 100);
    }

    var hoursStr = totalHours > 0
      ? (totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)) + ' h'
      : '0 h';

    if (el('kpi-total-students')) el('kpi-total-students').textContent = totalStudents || '0';
    if (el('kpi-total-hours-ec')) el('kpi-total-hours-ec').textContent = hoursStr;
    if (el('kpi-total-certs'))    el('kpi-total-certs').textContent    = totalCerts || '0';
    if (el('kpi-approval-rate'))  el('kpi-approval-rate').textContent  = approvalRate !== null ? approvalRate + '%' : 'N/D';
  }

  // ── Gráfica de barras ─────────────────────────────────────────────────

  function loadHoursChart(certsSnap) {
    var months  = buildLastSixMonths();
    var isMock  = false;

    if (certsSnap && certsSnap.size > 0) {
      certsSnap.docs.forEach(function(d) {
        var data = d.data();
        var ts   = data.completedAt;
        var date;
        if (ts && typeof ts.toDate === 'function') date = ts.toDate();
        else date = new Date(ts);
        if (isNaN(date)) return;

        var key   = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        var match = months.find(function(m) { return m.key === key; });
        if (match) match.value += parseFloat(data.hours) || 0;
      });
    } else {
      MOCK_CHART_VALUES.forEach(function(v, i) { months[i].value = v; });
      isMock = true;
    }

    var mockNote = el('chart-mock-note');
    if (mockNote) mockNote.style.display = isMock ? '' : 'none';

    renderChart(months);
  }

  function renderChart(months) {
    var container = el('chart-svg-container');
    if (!container) return;

    var maxVal = 0;
    months.forEach(function(m) { if (m.value > maxVal) maxVal = m.value; });
    if (maxVal === 0) maxVal = 1;

    var W = 660, H = 230;
    var padL = 48, padT = 30, padR = 16, padB = 42;
    var chartW = W - padL - padR;
    var chartH = H - padT - padB;
    var n      = months.length;
    var groupW = chartW / n;
    var barW   = Math.round(groupW * 0.52);

    var parts = [];

    // Gridlines at 0 / 25 / 50 / 75 / 100 %
    [0, 0.25, 0.5, 0.75, 1].forEach(function(fraction) {
      var y   = padT + chartH - Math.round(fraction * chartH);
      var val = Math.round(fraction * maxVal);
      parts.push(
        '<line x1="' + padL + '" y1="' + y + '" x2="' + (padL + chartW) + '" y2="' + y + '" ' +
          'style="stroke:var(--color-divider);stroke-width:1;' + (fraction > 0 ? 'stroke-dasharray:4 3;' : '') + '"/>',
        '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" text-anchor="end" ' +
          'style="font-size:10px;fill:var(--color-text-faint);font-family:inherit;">' + val + '</text>'
      );
    });

    // Bars and labels
    months.forEach(function(m, i) {
      var barH = m.value > 0 ? Math.max(3, Math.round((m.value / maxVal) * chartH)) : 0;
      var x    = padL + Math.round(i * groupW + (groupW - barW) / 2);
      var y    = padT + chartH - barH;
      var cx   = padL + Math.round(i * groupW + groupW / 2);

      if (barH > 0) {
        parts.push(
          '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="3" ' +
            'style="fill:var(--color-primary);opacity:0.85;"/>'
        );
        var valStr = m.value % 1 === 0 ? String(m.value) : m.value.toFixed(1);
        parts.push(
          '<text x="' + cx + '" y="' + (y - 5) + '" text-anchor="middle" ' +
            'style="font-size:11px;font-weight:600;fill:var(--color-text);font-family:inherit;">' + valStr + '</text>'
        );
      }

      parts.push(
        '<text x="' + cx + '" y="' + (padT + chartH + 20) + '" text-anchor="middle" ' +
          'style="font-size:11px;fill:var(--color-text-muted);font-family:inherit;">' + escapeHtml(m.label) + '</text>'
      );
    });

    // Axes
    parts.push(
      '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + chartH) + '" style="stroke:var(--color-border);stroke-width:1;"/>',
      '<line x1="' + padL + '" y1="' + (padT + chartH) + '" x2="' + (padL + chartW) + '" y2="' + (padT + chartH) + '" style="stroke:var(--color-border);stroke-width:1;"/>'
    );

    // Y-axis label (rotated)
    var midY = padT + chartH / 2;
    parts.push(
      '<text x="12" y="' + midY + '" text-anchor="middle" ' +
        'transform="rotate(-90 12 ' + midY + ')" ' +
        'style="font-size:10px;fill:var(--color-text-muted);font-family:inherit;">Horas EC</text>'
    );

    container.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" ' +
        'role="img" aria-label="Gráfica de barras: horas EC emitidas en los últimos 6 meses">' +
        parts.join('') +
      '</svg>';

    // Accessible hidden table
    var srTable = el('chart-table-sr');
    if (srTable) {
      srTable.innerHTML =
        '<caption>Horas EC emitidas por mes (últimos 6 meses)</caption>' +
        '<thead><tr><th>Mes</th><th>Horas EC</th></tr></thead>' +
        '<tbody>' +
        months.map(function(m) {
          return '<tr><td>' + escapeHtml(m.label) + '</td><td>' +
            (m.value % 1 === 0 ? m.value : m.value.toFixed(1)) + '</td></tr>';
        }).join('') +
        '</tbody>';
    }
  }

  // ── Ranking de ofertas ────────────────────────────────────────────────

  function loadOfferRanking(quizSnap, certsSnap) {
    var isMock    = false;
    var quizStats = {};    // offerTitle → { uids:{}, passed, total }
    var certCount = {};    // offerTitle → count

    if (quizSnap && quizSnap.size > 0) {
      quizSnap.docs.forEach(function(d) {
        var data = d.data();
        var key  = data.offerTitle;
        if (!key) return;
        if (!quizStats[key]) quizStats[key] = { uids: {}, passed: 0, total: 0 };
        if (data.studentUid) quizStats[key].uids[String(data.studentUid)] = true;
        quizStats[key].total++;
        if (data.passed) quizStats[key].passed++;
      });

      if (certsSnap) {
        certsSnap.docs.forEach(function(d) {
          var key = d.data().offerTitle;
          if (!key) return;
          certCount[key] = (certCount[key] || 0) + 1;
        });
      }
    } else {
      isMock = true;
    }

    var mockNote = el('ranking-mock-note');
    if (mockNote) mockNote.style.display = isMock ? '' : 'none';

    renderOfferRanking(isMock ? MOCK_OFFER_STATS : null, quizStats, certCount, isMock);
  }

  function renderOfferRanking(mockStats, quizStats, certCount, isMock) {
    var tbody = el('ranking-tbody');
    if (!tbody || typeof CATALOG_OFFERINGS === 'undefined') return;

    var rows = CATALOG_OFFERINGS.map(function(o) {
      var key = o.offerTitle || o.title;
      var students, approvalRate, certs;

      if (isMock && mockStats && mockStats[key]) {
        var ms   = mockStats[key];
        students     = ms.students;
        approvalRate = ms.approvalRate;
        certs        = ms.certs;
      } else if (!isMock && quizStats[key]) {
        var qs   = quizStats[key];
        students     = Object.keys(qs.uids).length;
        approvalRate = qs.total > 0 ? Math.round((qs.passed / qs.total) * 100) : null;
        certs        = certCount[key] || 0;
      } else {
        students     = '—';
        approvalRate = null;
        certs        = '—';
      }

      return { offering: o, students: students, approvalRate: approvalRate, certs: certs };
    });

    // Sort by approval rate desc; offerings without data go last
    rows.sort(function(a, b) {
      if (a.approvalRate === null && b.approvalRate === null) return 0;
      if (a.approvalRate === null) return 1;
      if (b.approvalRate === null) return -1;
      return b.approvalRate - a.approvalRate;
    });

    tbody.innerHTML = rows.map(function(r) {
      var o         = r.offering;
      var rateDisp  = r.approvalRate !== null ? r.approvalRate + '%' : '—';
      var rateBadge = r.approvalRate !== null
        ? (r.approvalRate >= 80 ? 'badge-success' : 'badge-error')
        : '';
      var hoursStr  = o.hours % 1 === 0 ? o.hours + ' h' : o.hours.toFixed(1) + ' h';
      var typeLabel = TYPE_LABELS[o.type] || escapeHtml(o.type || '');

      return '<tr>' +
        '<td style="font-weight: var(--weight-bold);">' + escapeHtml(o.title) + '</td>' +
        '<td style="font-size: var(--text-xs);">' + escapeHtml(typeLabel) + '</td>' +
        '<td style="text-align: center;">' + escapeHtml(hoursStr) + '</td>' +
        '<td style="text-align: center;">' + escapeHtml(String(r.students)) + '</td>' +
        '<td><span class="badge ' + rateBadge + '">' + escapeHtml(rateDisp) + '</span></td>' +
        '<td style="text-align: center;">' + escapeHtml(String(r.certs)) + '</td>' +
      '</tr>';
    }).join('');
  }

  // ── Distribución por tipo ─────────────────────────────────────────────

  function loadTypeDistribution() {
    var container = el('type-distribution-container');
    if (!container || typeof CATALOG_OFFERINGS === 'undefined') return;

    var typeMap = {};
    CATALOG_OFFERINGS.forEach(function(o) {
      var t = o.type;
      if (!typeMap[t]) typeMap[t] = { count: 0, hours: 0 };
      typeMap[t].count++;
      typeMap[t].hours += o.hours || 0;
    });

    var totalHours = CATALOG_OFFERINGS.reduce(function(s, o) { return s + (o.hours || 0); }, 0);
    if (totalHours === 0) totalHours = 1;

    var types = Object.keys(typeMap);

    container.innerHTML = types.map(function(t) {
      var d        = typeMap[t];
      var pct      = Math.round((d.hours / totalHours) * 100);
      var label    = TYPE_LABELS[t] || t;
      var hoursStr = d.hours % 1 === 0 ? d.hours + ' h' : d.hours.toFixed(1) + ' h';
      var plural   = d.count > 1 ? 'ofertas' : 'oferta';

      return '<div class="type-dist-row">' +
        '<div class="type-dist-meta">' +
          '<span class="type-dist-label">' + escapeHtml(label) + '</span>' +
          '<span class="type-dist-detail">' + d.count + ' ' + plural + ' · ' + escapeHtml(hoursStr) + '</span>' +
        '</div>' +
        '<div class="type-dist-bar-bg">' +
          '<div class="type-dist-bar" style="width: ' + pct + '%;" role="img" aria-label="' + pct + '% de las horas EC"></div>' +
        '</div>' +
        '<div class="type-dist-pct">' + pct + '%</div>' +
      '</div>';
    }).join('');
  }

  // ── Modal de exportación (placeholder) ───────────────────────────────

  function bindExportButtons() {
    var modal = el('modal-export');
    if (!modal) return;

    document.addEventListener('click', function(e) {
      if (e.target.closest('[data-open-export-modal]')) {
        modal.showModal();
      }
    });

    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.close();
    });

    var closeBtn = modal.querySelector('[data-close-modal]');
    if (closeBtn) closeBtn.addEventListener('click', function() { modal.close(); });
  }

  // ── Init ─────────────────────────────────────────────────────────────

  return {
    init: function() {
      firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;

        bindExportButtons();
        loadTypeDistribution();

        var results = [null, null, null];

        Promise.all([
          firebase.firestore().collection('usuarios').get().catch(function() { return null; }),
          firebase.firestore().collectionGroup('certificados_plataforma').get().catch(function() { return null; }),
          firebase.firestore().collectionGroup('quiz_results').get().catch(function() { return null; }),
        ]).then(function(snaps) {
          results = snaps;
          loadGlobalKPIs(snaps[0], snaps[1], snaps[2]);
          loadHoursChart(snaps[1]);
          loadOfferRanking(snaps[2], snaps[1]);
        }).catch(function(err) {
          console.error('[AdminReportes] init:', err);
          loadGlobalKPIs(null, null, null);
          loadHoursChart(null);
          loadOfferRanking(null, null);
        });
      });
    }
  };

})();

document.addEventListener('DOMContentLoaded', function() { AdminReportes.init(); });
