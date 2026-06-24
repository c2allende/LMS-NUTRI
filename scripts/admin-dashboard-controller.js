'use strict';

const AdminDashboard = (() => {

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
    if (value && typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      var p = value.split('-');
      date = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    } else {
      date = new Date(value);
    }
    return isNaN(date) ? '—' : date.toLocaleDateString('es-PR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatTimestamp(value) {
    if (!value) return '—';
    var date = (value && typeof value.toDate === 'function') ? value.toDate() : new Date(value);
    if (isNaN(date)) return '—';
    return date.toLocaleDateString('es-PR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function fmtHours(h) {
    return (h % 1 === 0) ? String(h) : h.toFixed(1);
  }

  function el(id) { return document.getElementById(id); }

  // ── KPIs ─────────────────────────────────────────────────────────────

  async function loadKPIs() {
    try {
      var db = firebase.firestore();
      var usersSnap = await db.collection('usuarios').get();
      var users = usersSnap.docs;

      var totalStudents  = users.length;
      var totalHours     = 0;
      var totalCerts     = 0;
      var totalQuizzes   = 0;
      var totalPassed    = 0;

      var promises = users.map(async function(userDoc) {
        var uid = userDoc.id;
        try {
          var platSnap = await db.collection('usuarios').doc(uid).collection('certificados_plataforma').get();
          platSnap.docs.forEach(function(d) {
            totalCerts++;
            totalHours += parseFloat(d.data().hours) || 0;
          });
          var extSnap = await db.collection('usuarios').doc(uid).collection('certificados_externos').get();
          extSnap.docs.forEach(function(d) {
            totalHours += parseFloat(d.data().hours) || 0;
          });
          try {
            var qSnap = await db.collection('usuarios').doc(uid).collection('quiz_results').get();
            qSnap.docs.forEach(function(d) {
              totalQuizzes++;
              if (d.data().passed) totalPassed++;
            });
          } catch (e) { /* quiz_results opcional */ }
        } catch (e) { /* ignorar errores por usuario */ }
      });

      await Promise.all(promises);

      var approvalRate = totalQuizzes > 0 ? Math.round((totalPassed / totalQuizzes) * 100) : null;

      if (el('kpi-total-students')) el('kpi-total-students').textContent = totalStudents;
      if (el('kpi-total-hours'))    el('kpi-total-hours').textContent    = fmtHours(totalHours) + ' h';
      if (el('kpi-approval-rate'))  el('kpi-approval-rate').textContent  = approvalRate !== null ? approvalRate + '%' : 'N/D';
      if (el('kpi-total-certs'))    el('kpi-total-certs').textContent    = totalCerts;

    } catch (err) {
      console.error('[AdminDashboard] Error KPIs:', err);
    }
  }

  // ── Alerts ───────────────────────────────────────────────────────────

  async function loadAlerts() {
    var container = el('alerts-list');
    if (!container) return;

    try {
      var db = firebase.firestore();
      var usersSnap = await db.collection('usuarios').get();
      var alerts = [];
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

      usersSnap.docs.forEach(function(doc) {
        var data = doc.data();
        var uid  = doc.id;
        var name = data.displayName || data.email || uid;

        if (data.licenseRenewalDate) {
          var p       = data.licenseRenewalDate.split('-');
          var licDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
          var diff    = Math.ceil((licDate.getTime() - today.getTime()) / 86400000);
          if (diff < 0) {
            alerts.push({ uid: uid, name: name, type: 'Licencia vencida', severity: 'error',
              detail: 'Venció el ' + formatDate(data.licenseRenewalDate) });
          } else if (diff <= 90) {
            alerts.push({ uid: uid, name: name, type: 'Licencia por vencer', severity: 'warning',
              detail: 'Vence en ' + diff + ' día' + (diff === 1 ? '' : 's') + ' (' + formatDate(data.licenseRenewalDate) + ')' });
          }
        }

        if (data.lastActiveDate) {
          var lastActive = (typeof data.lastActiveDate.toDate === 'function')
            ? data.lastActiveDate.toDate() : new Date(data.lastActiveDate);
          if (!isNaN(lastActive) && lastActive < thirtyDaysAgo) {
            var daysSince = Math.floor((today.getTime() - lastActive.getTime()) / 86400000);
            alerts.push({ uid: uid, name: name, type: 'Sin actividad', severity: 'warning',
              detail: 'Sin acceso hace ' + daysSince + ' día' + (daysSince === 1 ? '' : 's') });
          }
        }
      });

      renderAlerts(alerts);

    } catch (err) {
      console.error('[AdminDashboard] Error alertas:', err);
      if (container) container.innerHTML = '<p style="padding: var(--space-4); color: var(--color-text-muted);">No se pudieron cargar las alertas.</p>';
    }
  }

  function renderAlerts(alerts) {
    var container = el('alerts-list');
    var countEl   = el('alerts-count');
    if (!container) return;

    if (countEl) countEl.textContent = alerts.length + (alerts.length === 1 ? ' alerta' : ' alertas');

    if (alerts.length === 0) {
      container.innerHTML = '';
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<div class="empty-state-icon" aria-hidden="true" style="font-size:1.75rem;">✅</div><p>No hay alertas activas. Todo en orden.</p>';
      container.appendChild(empty);
      return;
    }

    container.innerHTML = '';
    alerts.forEach(function(alert) {
      var item = document.createElement('div');
      item.className = 'admin-alert-item';
      var badgeClass = alert.severity === 'error' ? 'badge-error' : 'badge-warning';
      item.innerHTML =
        '<div class="admin-alert-info">' +
          '<div class="admin-alert-name">' + escapeHtml(alert.name) + '</div>' +
          '<div class="text-xs text-muted">' + escapeHtml(alert.detail) + '</div>' +
        '</div>' +
        '<div class="admin-alert-actions">' +
          '<span class="badge ' + badgeClass + '">' + escapeHtml(alert.type) + '</span>' +
          '<a href="admin_estudiante_detalle.html?uid=' + encodeURIComponent(alert.uid) + '" class="btn btn-ghost btn-sm">Ver perfil</a>' +
        '</div>';
      container.appendChild(item);
    });
  }

  // ── Activity Log ─────────────────────────────────────────────────────

  var MOCK_EVENTS = [
    { type: 'cert_issued',  studentName: 'Dra. Ana M. Rodríguez',  offerTitle: 'Conteo CHO Avanzado',         timestamp: new Date(Date.now() - 2  * 3600000) },
    { type: 'quiz_passed',  studentName: 'Lcda. Carmen Torres',     offerTitle: 'Microbiota Intestinal',       timestamp: new Date(Date.now() - 5  * 3600000) },
    { type: 'enrollment',   studentName: 'Lcda. María Soto',        offerTitle: 'Manejo Nutricional DM2',      timestamp: new Date(Date.now() - 1  * 86400000) },
    { type: 'quiz_passed',  studentName: 'Dra. Laura Ramos',        offerTitle: 'Alimentación Plant-Based',    timestamp: new Date(Date.now() - 2  * 86400000) },
    { type: 'cert_issued',  studentName: 'Lcda. Sofía Pérez',       offerTitle: 'La Nutrición y el Corazón',  timestamp: new Date(Date.now() - 3  * 86400000) },
  ];

  var ACTIVITY_ICONS  = { enrollment: '📋', quiz_passed: '✅', cert_issued: '🏆' };
  var ACTIVITY_LABELS = { enrollment: 'Matrícula', quiz_passed: 'Evaluación aprobada', cert_issued: 'Certificado emitido' };

  async function loadActivityLog() {
    var container = el('activity-list');
    if (!container) return;

    try {
      var snap = await firebase.firestore()
        .collection('activity_log')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get();

      if (!snap.empty) {
        renderActivity(snap.docs.map(function(d) { return d.data(); }), false);
      } else {
        renderActivity(MOCK_EVENTS, true);
      }
    } catch (err) {
      renderActivity(MOCK_EVENTS, true);
    }
  }

  function renderActivity(events, isMock) {
    var container = el('activity-list');
    var note      = el('activity-mock-note');
    if (!container) return;
    if (note) note.style.display = isMock ? '' : 'none';

    container.innerHTML = '';
    events.forEach(function(ev) {
      var icon  = ACTIVITY_ICONS[ev.type]  || '📌';
      var label = ACTIVITY_LABELS[ev.type] || escapeHtml(String(ev.type));
      var ts    = (ev.timestamp instanceof Date) ? ev.timestamp
                : (ev.timestamp && typeof ev.timestamp.toDate === 'function') ? ev.timestamp.toDate()
                : new Date();

      var item = document.createElement('div');
      item.className = 'admin-activity-item';
      item.innerHTML =
        '<div class="admin-activity-icon" aria-hidden="true">' + icon + '</div>' +
        '<div class="admin-activity-body">' +
          '<div class="admin-activity-desc">' +
            '<span style="font-weight: var(--weight-bold);">' + escapeHtml(ev.studentName || '—') + '</span>' +
            ' &middot; ' + label +
            (ev.offerTitle ? ' &mdash; <em>' + escapeHtml(ev.offerTitle) + '</em>' : '') +
          '</div>' +
          '<div class="text-xs text-muted" style="margin-top: var(--space-1);">' + escapeHtml(formatTimestamp(ts)) + '</div>' +
        '</div>';
      container.appendChild(item);
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────

  return {
    init: function() {
      firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        loadKPIs();
        loadAlerts();
        loadActivityLog();
      });
    }
  };

})();

document.addEventListener('DOMContentLoaded', function() { AdminDashboard.init(); });
