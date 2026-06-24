'use strict';

const Analytics = (() => {

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
    if (typeof value.toDate === 'function') date = value.toDate();
    else date = new Date(value);
    return isNaN(date) ? '—' : date.toLocaleDateString('es-PR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateLong(value) {
    if (!value) return null;
    var date;
    if (typeof value.toDate === 'function') date = value.toDate();
    else date = new Date(value);
    return isNaN(date) ? null : date.toLocaleDateString('es-PR', { year: 'numeric', month: 'long' });
  }

  function scoreToPercent(score) {
    if (score == null) return null;
    var s = parseFloat(score);
    if (isNaN(s)) return null;
    if (s > 0 && s <= 1) s = s * 100;
    return Math.round(s);
  }

  function el(id) { return document.getElementById(id); }

  function tsToDate(ts) {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts.toDate();
    var d = new Date(ts);
    return isNaN(d) ? null : d;
  }

  // ── Constants ─────────────────────────────────────────────────────────

  var GOAL_HOURS   = 36;
  var GOAL_MONTHLY = 1.5;     // 36 h / 24 meses
  var MS_PER_MONTH = 30.4375 * 24 * 60 * 60 * 1000;

  var MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  var TYPE_LABELS = {
    curso: 'Curso', taller: 'Taller',
    lectura: 'Lectura dirigida', presentacion: 'Presentación', podcast: 'Podcast',
  };

  // sessionStorage keys per offering id (from CLAUDE.md)
  var SESSION_KEYS = {
    'dm2-actualizacion-clinica': { result: 'quiz_result',                          passed: 'quiz_passed' },
    'conteo-carbohidratos':      { result: 'taller_quiz_result',                   passed: 'taller_quiz_passed' },
    'microbiota-intestinal':     { result: 'quiz_lectura_microbiota_result',       passed: 'quiz_lectura_microbiota_passed' },
    'nutricion-plant-based':     { result: 'quiz_presentacion_plantbased_result',  passed: 'quiz_presentacion_plantbased_passed' },
    'podcast-nutricoracon':      { result: 'quiz_podcast_nutricoracon_result',     passed: 'quiz_podcast_nutricoracon_passed' },
  };

  // ── State ─────────────────────────────────────────────────────────────

  var _uid        = null;
  var _platCerts  = [];
  var _extCerts   = [];
  var _quizResults = [];
  var _userData   = {};

  // ── Zone 0 — Student name in sidebar ─────────────────────────────────

  function setStudentName(user) {
    var name = sessionStorage.getItem('student_name') || (user && user.displayName) || 'Estudiante';
    var nameEl = el('sidebar-student-name');
    if (nameEl) nameEl.textContent = name.split(' ').slice(0, 3).join(' ');
    var avatarEl = el('sidebar-avatar');
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  }

  // ── Zone 1 — KPIs ────────────────────────────────────────────────────

  function computeKPIs() {
    // Total hours: plat + ext
    var platHours = _platCerts.reduce(function(s, c) { return s + (parseFloat(c.hours) || 0); }, 0);
    var extHours  = _extCerts.reduce(function(s, c) {  return s + (parseFloat(c.hours) || 0); }, 0);
    var totalHours = platHours + extHours;

    // Offers completed = platform certs count
    var offersDone = _platCerts.length;

    // Avg score from quiz_results
    var avgScore = null;
    if (_quizResults.length > 0) {
      var total = 0;
      var count = 0;
      _quizResults.forEach(function(r) {
        var pct = scoreToPercent(r.score);
        if (pct !== null) { total += pct; count++; }
      });
      if (count > 0) avgScore = Math.round(total / count);
    }

    // Streak from Firestore userData
    var streakDays = parseInt(_userData.streakDays) || 0;

    return { totalHours: totalHours, offersDone: offersDone, avgScore: avgScore, streakDays: streakDays };
  }

  function renderKPIs() {
    try {
      var kpis = computeKPIs();

      // Card 1 — Horas EC
      var barPct = Math.min(100, Math.round((kpis.totalHours / GOAL_HOURS) * 100));
      var hoursColor = kpis.totalHours >= GOAL_HOURS ? 'var(--color-success)' : 'var(--color-primary)';
      var hoursStr = kpis.totalHours % 1 === 0 ? kpis.totalHours : kpis.totalHours.toFixed(1);
      var hoursEl = el('kpi-hours-value');
      if (hoursEl) { hoursEl.textContent = hoursStr; hoursEl.style.color = hoursColor; }
      var hoursBar = el('kpi-hours-bar');
      if (hoursBar) { hoursBar.style.width = barPct + '%'; hoursBar.style.background = hoursColor; }

      // Card 2 — Ofertas completadas
      if (el('kpi-offers-value')) el('kpi-offers-value').textContent = kpis.offersDone;

      // Card 3 — Puntuación promedio
      var scoreEl = el('kpi-score-value');
      if (scoreEl) {
        if (kpis.avgScore !== null) {
          scoreEl.textContent = kpis.avgScore + '%';
          scoreEl.style.color = kpis.avgScore >= 80
            ? 'var(--color-success)'
            : (kpis.avgScore >= 60 ? 'var(--color-warning)' : 'var(--color-error)');
        } else {
          scoreEl.textContent = '—';
        }
      }

      // Card 4 — Racha
      if (el('kpi-streak-value')) el('kpi-streak-value').textContent = kpis.streakDays;

      return kpis;
    } catch (err) {
      console.error('[Analytics] renderKPIs:', err);
      return { totalHours: 0, offersDone: 0, avgScore: null, streakDays: 0 };
    }
  }

  // ── Zone 2 — Gráfica de horas EC ─────────────────────────────────────

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

  function renderHoursChart() {
    try {
      var months = buildLastSixMonths();
      var isMock = false;

      var hasData = _platCerts.length > 0 || _extCerts.length > 0;

      if (hasData) {
        // Group by month
        function addToMonth(ts, hours) {
          var date = tsToDate(ts);
          if (!date) return;
          var key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
          var match = months.find(function(m) { return m.key === key; });
          if (match) match.value += parseFloat(hours) || 0;
        }
        _platCerts.forEach(function(c) { addToMonth(c.completedAt, c.hours); });
        _extCerts.forEach(function(c)  { addToMonth(c.uploadedAt,  c.hours); });
      } else {
        // Mock: 6 months of demo values
        var MOCK = [0.5, 1, 0, 1.5, 2, 1];
        months.forEach(function(m, i) { m.value = MOCK[i]; });
        isMock = true;
      }

      var mockNote = el('chart-mock-note');
      if (mockNote) mockNote.style.display = isMock ? '' : 'none';

      renderChart(months);
    } catch (err) {
      console.error('[Analytics] renderHoursChart:', err);
      var cont = el('chart-svg-container');
      if (cont) cont.innerHTML = '<p style="padding: var(--space-4); color: var(--color-text-muted); font-size: var(--text-sm);">No se pudo cargar la gráfica.</p>';
    }
  }

  function renderChart(months) {
    var container = el('chart-svg-container');
    if (!container) return;

    var dataMax = 0;
    months.forEach(function(m) { if (m.value > dataMax) dataMax = m.value; });
    // Ensure meta line (1.5 h) always visible with breathing room
    var maxVal = Math.max(dataMax, GOAL_MONTHLY + 0.8);

    var W = 600, H = 200;
    var padL = 42, padT = 24, padR = 14, padB = 36;
    var chartW = W - padL - padR;
    var chartH = H - padT - padB;
    var n = months.length;
    var groupW = chartW / n;
    var barW   = Math.round(groupW * 0.50);

    var parts = [];

    // Gridlines at 0%, 50%, 100%
    [0, 0.5, 1].forEach(function(fraction) {
      var y   = padT + chartH - Math.round(fraction * chartH);
      var val = (fraction * maxVal).toFixed(1).replace(/\.0$/, '');
      parts.push(
        '<line x1="' + padL + '" y1="' + y + '" x2="' + (padL + chartW) + '" y2="' + y + '" ' +
          'style="stroke:var(--color-divider);stroke-width:1;' + (fraction > 0 ? 'stroke-dasharray:4 3;' : '') + '"/>',
        '<text x="' + (padL - 5) + '" y="' + (y + 4) + '" text-anchor="end" ' +
          'style="font-size:9px;fill:var(--color-text-faint);font-family:inherit;">' + escapeHtml(val) + '</text>'
      );
    });

    // Meta line at GOAL_MONTHLY = 1.5 h
    var metaY = padT + chartH - Math.round((GOAL_MONTHLY / maxVal) * chartH);
    parts.push(
      '<line x1="' + padL + '" y1="' + metaY + '" x2="' + (padL + chartW) + '" y2="' + metaY + '" ' +
        'style="stroke:var(--color-secondary);stroke-width:1.5;stroke-dasharray:5 3;"/>',
      '<text x="' + (padL + chartW - 2) + '" y="' + (metaY - 4) + '" text-anchor="end" ' +
        'style="font-size:9px;fill:var(--color-secondary);font-family:inherit;">Meta 1.5 h</text>'
    );

    // Bars and labels
    months.forEach(function(m, i) {
      var barH = m.value > 0 ? Math.max(2, Math.round((m.value / maxVal) * chartH)) : 0;
      var x  = padL + Math.round(i * groupW + (groupW - barW) / 2);
      var y  = padT + chartH - barH;
      var cx = padL + Math.round(i * groupW + groupW / 2);

      if (barH > 0) {
        parts.push(
          '<rect class="chart-bar-ec" x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="3"/>'
        );
        var valStr = m.value % 1 === 0 ? String(m.value) : m.value.toFixed(1);
        parts.push(
          '<text x="' + cx + '" y="' + (y - 5) + '" text-anchor="middle" ' +
            'style="font-size:10px;font-weight:600;fill:var(--color-text);font-family:inherit;">' + escapeHtml(valStr) + '</text>'
        );
      }

      parts.push(
        '<text x="' + cx + '" y="' + (padT + chartH + 18) + '" text-anchor="middle" ' +
          'style="font-size:10px;fill:var(--color-text-muted);font-family:inherit;">' + escapeHtml(m.label) + '</text>'
      );
    });

    // Axes
    parts.push(
      '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + chartH) + '" style="stroke:var(--color-border);stroke-width:1;"/>',
      '<line x1="' + padL + '" y1="' + (padT + chartH) + '" x2="' + (padL + chartW) + '" y2="' + (padT + chartH) + '" style="stroke:var(--color-border);stroke-width:1;"/>'
    );

    // Y-axis rotated label
    var midY = padT + chartH / 2;
    parts.push(
      '<text x="10" y="' + midY + '" text-anchor="middle" ' +
        'transform="rotate(-90 10 ' + midY + ')" ' +
        'style="font-size:9px;fill:var(--color-text-muted);font-family:inherit;">h EC</text>'
    );

    container.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" ' +
        'width="100%" preserveAspectRatio="xMidYMid meet" ' +
        'role="img" aria-label="Gráfica de horas EC acumuladas por mes en los últimos 6 meses">' +
        parts.join('') +
      '</svg>';

    // Accessible hidden data table
    var srTable = el('chart-table-sr');
    if (srTable) {
      srTable.innerHTML =
        '<caption>Horas EC acumuladas por mes — últimos 6 meses</caption>' +
        '<thead><tr><th>Mes</th><th>Horas EC</th></tr></thead>' +
        '<tbody>' +
        months.map(function(m) {
          return '<tr><td>' + escapeHtml(m.label) + '</td><td>' +
            (m.value % 1 === 0 ? m.value : m.value.toFixed(1)) + '</td></tr>';
        }).join('') +
        '</tbody>';
    }
  }

  // ── Zone 3 — Progreso por oferta ─────────────────────────────────────

  function renderOfferProgress() {
    try {
      var container = el('offer-progress-list');
      if (!container) return;

      if (typeof CATALOG_OFFERINGS === 'undefined') {
        container.innerHTML = '<p style="padding: var(--space-6); color: var(--color-text-muted);">No se pudieron cargar las ofertas.</p>';
        return;
      }

      // Build completed map from platCerts
      var completedMap = {};
      _platCerts.forEach(function(c) {
        if (c.offerTitle) completedMap[c.offerTitle] = c;
      });

      var html = CATALOG_OFFERINGS.map(function(offering) {
        var key  = offering.offerTitle || offering.title;
        var cert = completedMap[key] || null;

        var status, barWidth, barColor, statusHtml, actionHtml;

        if (cert) {
          status     = 'completed';
          barWidth   = '100%';
          barColor   = 'var(--color-success)';
          statusHtml = '<span class="status-pill is-active">Completado</span>';
          var certUrl = cert.url || offering.introUrl || '#';
          actionHtml = '<a href="' + escapeHtml(certUrl) + '" class="btn btn-ghost btn-sm">Ver certificado</a>';
        } else {
          // Check sessionStorage for in-progress
          var sKeys = SESSION_KEYS[offering.id];
          var hasStarted = false;
          if (sKeys) {
            try {
              hasStarted = !!(sessionStorage.getItem(sKeys.result) !== null || sessionStorage.getItem(sKeys.passed) !== null);
            } catch (_e) {}
          }

          if (hasStarted) {
            status     = 'in_progress';
            barWidth   = '50%';
            barColor   = 'var(--color-secondary)';
            statusHtml = '<span class="status-pill is-pending">En progreso</span>';
          } else {
            status     = 'not_started';
            barWidth   = '0%';
            barColor   = 'var(--color-border)';
            statusHtml = '<span class="status-pill">No iniciado</span>';
          }
          actionHtml = '<a href="' + escapeHtml(offering.introUrl || '#') + '" class="btn btn-primary btn-sm">Continuar</a>';
        }

        var isAmber  = offering.type === 'lectura' || offering.type === 'podcast';
        var typeLabel = TYPE_LABELS[offering.type] || offering.type;
        var hoursStr  = offering.hours % 1 === 0 ? offering.hours + ' h EC' : offering.hours.toFixed(1) + ' h EC';
        var typeBadgeStyle = isAmber
          ? 'background:var(--color-secondary-soft);color:var(--color-secondary-active);'
          : 'background:var(--color-primary-soft);color:var(--color-primary);';

        return '<div class="offer-progress-row">' +
          '<div class="offer-progress-info">' +
            '<div class="offer-progress-title">' + escapeHtml(offering.title) + '</div>' +
            '<div class="offer-progress-meta">' +
              '<span class="offer-type-badge" style="' + typeBadgeStyle + '">' + escapeHtml(typeLabel) + '</span>' +
              '<span class="offer-hours-tag">' + escapeHtml(hoursStr) + '</span>' +
            '</div>' +
            '<div class="progress" style="margin-top: var(--space-3);">' +
              '<div class="progress-fill" style="width:' + barWidth + ';background:' + barColor + ';"></div>' +
            '</div>' +
          '</div>' +
          '<div class="offer-progress-right">' +
            statusHtml +
            actionHtml +
          '</div>' +
        '</div>';
      }).join('');

      container.innerHTML = html;
    } catch (err) {
      console.error('[Analytics] renderOfferProgress:', err);
      var cont = el('offer-progress-list');
      if (cont) cont.innerHTML = '<p style="padding: var(--space-6); color: var(--color-error); font-size: var(--text-sm);">Error al cargar el progreso de ofertas.</p>';
    }
  }

  // ── Zone 4 — Proyección de meta EC ───────────────────────────────────

  function computeProjection(kpis) {
    var horasAcumuladas = kpis.totalHours;
    var horasFaltantes  = Math.max(0, GOAL_HOURS - horasAcumuladas);

    // License renewal date from Firestore userData
    var licenseDate = _userData.licenseRenewalDate || null;
    var licenseRenewalDate = null;
    if (licenseDate && /^\d{4}-\d{2}-\d{2}$/.test(licenseDate)) {
      var parts = licenseDate.split('-');
      licenseRenewalDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }

    // Find earliest certification date across all certs
    var allDates = [];
    _platCerts.forEach(function(c) {
      var d = tsToDate(c.completedAt);
      if (d) allDates.push(d.getTime());
    });
    _extCerts.forEach(function(c) {
      var d = tsToDate(c.uploadedAt);
      if (d) allDates.push(d.getTime());
    });

    var now = new Date();
    var monthsElapsed = 0;
    var insufficientHistory = false;
    if (allDates.length > 0) {
      var earliest = new Date(Math.min.apply(null, allDates));
      var rawMonths = (now - earliest) / MS_PER_MONTH;
      if (rawMonths < 0.5) {
        insufficientHistory = true; // too early to compute a reliable pace
      } else {
        monthsElapsed = rawMonths;
      }
    }

    // Current pace (h/month)
    var ritmoActual = (!insufficientHistory && monthsElapsed > 0 && horasAcumuladas > 0)
      ? horasAcumuladas / monthsElapsed
      : 0;

    // Estimated completion date
    var fechaEstimada = null;
    if (ritmoActual > 0 && horasFaltantes > 0) {
      var mesesParaMeta = horasFaltantes / ritmoActual;
      fechaEstimada = new Date(now.getTime() + mesesParaMeta * MS_PER_MONTH);
    }

    // Warning: behind schedule
    var behindSchedule = false;
    var horasExtraEsteMes = 0;
    if (fechaEstimada && licenseRenewalDate && fechaEstimada > licenseRenewalDate) {
      behindSchedule = true;
      var msUntilRenewal = licenseRenewalDate - now;
      if (msUntilRenewal > 0) {
        var mesesHastaRenovacion = Math.max(1, msUntilRenewal / MS_PER_MONTH);
        var ritmoNecesario = horasFaltantes / mesesHastaRenovacion;
        horasExtraEsteMes = Math.round(Math.max(0, ritmoNecesario - ritmoActual) * 2) / 2;
      }
    }

    return {
      horasAcumuladas:     horasAcumuladas,
      horasFaltantes:      horasFaltantes,
      ritmoActual:         Math.round(ritmoActual * 10) / 10,
      fechaEstimada:       fechaEstimada,
      licenseRenewalDate:  licenseRenewalDate,
      goalCompleted:       horasAcumuladas >= GOAL_HOURS,
      insufficientHistory: insufficientHistory,
      behindSchedule:      behindSchedule,
      horasExtraEsteMes:   horasExtraEsteMes,
    };
  }

  function renderProjection(kpis) {
    try {
      var container = el('projection-container');
      if (!container) return;

      var proj = computeProjection(kpis);
      var html;

      if (proj.goalCompleted) {
        // Meta completada
        html =
          '<div class="card">' +
          '<div class="card-body" style="text-align: center; padding: var(--space-8);">' +
            '<div style="font-size: 3rem; margin-bottom: var(--space-4);" aria-hidden="true">🎉</div>' +
            '<p style="font-size: var(--text-base); font-weight: var(--weight-bold); color: var(--color-text); margin-bottom: var(--space-4);">' +
              '¡Felicidades! Has completado tu meta de 36 horas EC para este período de renovación.' +
            '</p>' +
            '<span class="badge badge-success" style="font-size: var(--text-sm); padding: var(--space-2) var(--space-4);">Meta completada ✓</span>' +
          '</div>' +
          '</div>';

      } else if (proj.insufficientHistory) {
        // Certificaciones muy recientes — historial insuficiente para proyectar
        html =
          '<div class="card">' +
          '<div class="card-body" style="text-align: center; padding: var(--space-8);">' +
            '<div style="font-size: 2.5rem; margin-bottom: var(--space-4);" aria-hidden="true">⏳</div>' +
            '<p style="font-weight: var(--weight-bold); color: var(--color-text); margin-bottom: var(--space-3);">' +
              'Aún no hay suficiente historial para calcular una proyección.' +
            '</p>' +
            '<p style="color: var(--color-text-muted); font-size: var(--text-sm);">' +
              'Vuelve en unas semanas para ver tu ritmo de acumulación de horas EC.' +
            '</p>' +
          '</div>' +
          '</div>';

      } else if (proj.ritmoActual === 0) {
        // Sin horas acumuladas
        html =
          '<div class="card">' +
          '<div class="card-body" style="text-align: center; padding: var(--space-8);">' +
            '<div style="font-size: 2.5rem; margin-bottom: var(--space-4);" aria-hidden="true">📚</div>' +
            '<p style="color: var(--color-text-muted); margin-bottom: var(--space-5);">' +
              'Aún no has acumulado horas EC. Comienza con cualquier oferta del catálogo.' +
            '</p>' +
            '<a href="catalogo.html" class="btn btn-primary">Ir al catálogo</a>' +
          '</div>' +
          '</div>';

      } else {
        // Tiene ritmo — calcular proyección
        var ritmoStr = proj.ritmoActual % 1 === 0 ? String(proj.ritmoActual) : proj.ritmoActual.toFixed(1);
        var fechaStr = proj.fechaEstimada ? formatDateLong(proj.fechaEstimada) : null;
        var baseMsg  = 'A tu ritmo actual (' + escapeHtml(ritmoStr) + ' h/mes), ' +
          (fechaStr
            ? 'completarás tu meta de 36 horas el ' + escapeHtml(fechaStr) + '.'
            : 'completarás tu meta de 36 horas en ' + Math.ceil(proj.horasFaltantes / proj.ritmoActual) + ' meses aproximadamente.');

        var warningHtml = '';
        if (proj.behindSchedule && proj.licenseRenewalDate) {
          var renewalStr = proj.licenseRenewalDate.toLocaleDateString('es-PR', { year: 'numeric', month: 'long' });
          var extra = proj.horasExtraEsteMes;
          var extraStr = extra % 1 === 0 ? String(extra) : extra.toFixed(1);
          warningHtml =
            '<div style="margin-top: var(--space-4); padding: var(--space-4); ' +
              'background: var(--color-warning-soft); border: 1px solid var(--color-secondary); ' +
              'border-radius: var(--radius-md); font-size: var(--text-sm);">' +
              '<strong style="color: var(--color-warning);">⚠️ Atención:</strong> ' +
              'A este ritmo no completarás tu meta antes del vencimiento de tu licencia (' +
              escapeHtml(renewalStr) + '). ' +
              (extra > 0
                ? 'Te recomendamos completar al menos ' + escapeHtml(extraStr) + ' h adicionales este mes.'
                : 'Te recomendamos mantener un ritmo constante.') +
            '</div>';
        }

        // Progress details
        var faltantesStr = proj.horasFaltantes % 1 === 0 ? String(proj.horasFaltantes) : proj.horasFaltantes.toFixed(1);
        var acumStr = proj.horasAcumuladas % 1 === 0 ? String(proj.horasAcumuladas) : proj.horasAcumuladas.toFixed(1);
        var pctStr = Math.min(100, Math.round((proj.horasAcumuladas / GOAL_HOURS) * 100)) + '%';

        html =
          '<div class="card">' +
          '<div class="card-header">' +
            '<div>' +
              '<h2 class="card-title">Proyección de meta EC</h2>' +
              '<p class="card-subtitle" style="margin-top: var(--space-1);">Estimación basada en tu historial de certificaciones</p>' +
            '</div>' +
          '</div>' +
          '<div class="card-body">' +
            '<p style="font-size: var(--text-sm); color: var(--color-text); margin-bottom: var(--space-3);">' + baseMsg + '</p>' +
            warningHtml +
            '<div style="margin-top: var(--space-5); display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4);">' +
              '<div style="text-align:center;">' +
                '<div style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-primary);">' + escapeHtml(acumStr) + ' h</div>' +
                '<div style="font-size: var(--text-xs); color: var(--color-text-muted);">Acumuladas</div>' +
              '</div>' +
              '<div style="text-align:center;">' +
                '<div style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-muted);">' + escapeHtml(faltantesStr) + ' h</div>' +
                '<div style="font-size: var(--text-xs); color: var(--color-text-muted);">Faltantes</div>' +
              '</div>' +
              '<div style="text-align:center;">' +
                '<div style="font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text);">' + escapeHtml(pctStr) + '</div>' +
                '<div style="font-size: var(--text-xs); color: var(--color-text-muted);">de la meta</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '</div>';
      }

      container.innerHTML = html;
    } catch (err) {
      console.error('[Analytics] renderProjection:', err);
      var cont = el('projection-container');
      if (cont) cont.innerHTML = '<p style="color: var(--color-error); font-size: var(--text-sm);">Error al calcular la proyección.</p>';
    }
  }

  // ── Zone 5 — Historial de evaluaciones ───────────────────────────────

  function renderQuizHistory() {
    try {
      var tbody = el('quiz-history-tbody');
      if (!tbody) return;

      if (_quizResults.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="5" style="padding: var(--space-2);">' +
            '<div class="empty-state">' +
              '<div class="empty-state-icon" aria-hidden="true" style="font-size: 1.75rem;">📋</div>' +
              '<p>Aún no has completado evaluaciones en la plataforma.</p>' +
              '<p style="font-size: var(--text-xs); color: var(--color-text-faint); margin-top: var(--space-1);">' +
                'Las evaluaciones aparecerán aquí una vez que las completes.' +
              '</p>' +
            '</div>' +
          '</td></tr>';
        return;
      }

      tbody.innerHTML = _quizResults.map(function(r) {
        var pct         = scoreToPercent(r.score);
        var pctStr      = pct !== null ? pct + '%' : '—';
        var badgeClass  = r.passed ? 'badge-success' : 'badge-error';
        var pillClass   = r.passed ? 'status-pill is-active' : 'status-pill is-error';
        var pillText    = r.passed ? 'Aprobado' : 'Reprobado';
        var dateStr     = formatDate(r.completedAt);
        var attempts    = parseInt(r.attempts) || 1;

        return '<tr>' +
          '<td>' + escapeHtml(r.offerTitle || '—') + '</td>' +
          '<td style="white-space: nowrap; font-size: var(--text-xs);">' + escapeHtml(dateStr) + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + escapeHtml(pctStr) + '</span></td>' +
          '<td style="text-align: center;">' + attempts + '</td>' +
          '<td><span class="' + pillClass + '">' + pillText + '</span></td>' +
        '</tr>';
      }).join('');
    } catch (err) {
      console.error('[Analytics] renderQuizHistory:', err);
      var tbody2 = el('quiz-history-tbody');
      if (tbody2) tbody2.innerHTML = '<tr><td colspan="5" style="padding: var(--space-4); color: var(--color-error); font-size: var(--text-sm);">Error al cargar el historial.</td></tr>';
    }
  }

  // ── Load ─────────────────────────────────────────────────────────────

  async function loadAllData(user) {
    var uid = user.uid;
    _uid = uid;

    setStudentName(user);

    var ref = firebase.firestore().collection('usuarios').doc(uid);

    // Show loading states
    ['kpi-hours-value','kpi-offers-value','kpi-score-value','kpi-streak-value'].forEach(function(id) {
      if (el(id)) el(id).textContent = '…';
    });

    // Parallel queries — each catches independently
    var platSnap, extSnap, quizSnap, userSnap;

    var results = await Promise.all([
      ref.collection('certificados_plataforma').get().catch(function(e) { console.error('[Analytics] platCerts:', e); return null; }),
      ref.collection('certificados_externos').get().catch(function(e) { console.error('[Analytics] extCerts:', e); return null; }),
      ref.collection('quiz_results').orderBy('completedAt', 'desc').get().catch(function(e) {
        // Fallback: try without orderBy in case field is missing
        return ref.collection('quiz_results').get().catch(function(e2) { console.error('[Analytics] quizResults:', e2); return null; });
      }),
      ref.get().catch(function(e) { console.error('[Analytics] userData:', e); return null; }),
    ]);

    platSnap = results[0];
    extSnap  = results[1];
    quizSnap = results[2];
    userSnap = results[3];

    _platCerts   = platSnap ? platSnap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }) : [];
    _extCerts    = extSnap  ? extSnap.docs.map(function(d)  { return Object.assign({ id: d.id }, d.data()); }) : [];
    _quizResults = quizSnap ? quizSnap.docs.map(function(d) { return Object.assign({ id: d.id }, d.data()); }) : [];
    _userData    = (userSnap && userSnap.exists) ? userSnap.data() : {};

    // Render each zone independently
    var kpis = renderKPIs();
    renderHoursChart();
    renderOfferProgress();
    renderProjection(kpis);
    renderQuizHistory();
  }

  // ── Init ─────────────────────────────────────────────────────────────

  return {
    init: function() {
      firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        loadAllData(user);
      });
    }
  };

})();

document.addEventListener('DOMContentLoaded', function() { Analytics.init(); });
