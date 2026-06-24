'use strict';

const AdminEstudiantes = (() => {

  var _allStudents = [];

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
      date  = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    } else {
      date = new Date(value);
    }
    return isNaN(date) ? '—' : date.toLocaleDateString('es-PR', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtHours(h) {
    return (h % 1 === 0) ? String(h) : h.toFixed(1);
  }

  function el(id) { return document.getElementById(id); }

  // ── Students List ─────────────────────────────────────────────────────

  async function loadStudents() {
    var tbody   = el('students-table-body');
    var countEl = el('students-count');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: var(--space-8); color: var(--color-text-muted);">Cargando estudiantes…</td></tr>';

    try {
      var db   = firebase.firestore();
      var snap = await db.collection('usuarios').get();
      var users = snap.docs.map(function(d) { return Object.assign({ uid: d.id }, d.data()); });

      var hourPromises = users.map(async function(user) {
        var platH = 0, extH = 0;
        try {
          var ps = await db.collection('usuarios').doc(user.uid).collection('certificados_plataforma').get();
          ps.docs.forEach(function(d) { platH += parseFloat(d.data().hours) || 0; });
          var es = await db.collection('usuarios').doc(user.uid).collection('certificados_externos').get();
          es.docs.forEach(function(d) { extH  += parseFloat(d.data().hours) || 0; });
        } catch(e) {}
        user.ecHours = platH + extH;
        return user;
      });

      _allStudents = await Promise.all(hourPromises);
      if (countEl) countEl.textContent = _allStudents.length + ' estudiante' + (_allStudents.length !== 1 ? 's' : '');
      renderStudents(_allStudents);

    } catch (err) {
      console.error('[AdminEstudiantes] loadStudents:', err);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: var(--space-8); color: var(--color-error);">Error al cargar. Recargue la página.</td></tr>';
    }
  }

  function renderStudents(students) {
    var tbody   = el('students-table-body');
    var countEl = el('students-count');
    if (!tbody) return;

    if (countEl) countEl.textContent = students.length + ' estudiante' + (students.length !== 1 ? 's' : '');

    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state" style="border:0; border-radius:0;"><div class="empty-state-icon" aria-hidden="true" style="font-size:1.5rem;">👥</div><p>No hay estudiantes que coincidan.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = '';
    students.forEach(function(s) {
      var isActive    = s.status !== 'inactive';
      var pillClass   = isActive ? 'is-active' : 'is-error';
      var pillLabel   = isActive ? 'Activo' : 'Inactivo';
      var initial     = (s.displayName || s.email || 'E')[0].toUpperCase();
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' +
          '<div class="user-summary">' +
            '<div class="avatar avatar-sm">' + escapeHtml(initial) + '</div>' +
            '<div>' +
              '<div style="font-weight: var(--weight-bold); font-size: var(--text-sm);">' + escapeHtml(s.displayName || '—') + '</div>' +
              '<div class="text-xs text-muted">' + escapeHtml(s.email || '—') + '</div>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td class="text-sm">' + escapeHtml(s.licenseNumber || '—') + '</td>' +
        '<td class="text-sm">' + escapeHtml(formatDate(s.enrolledAt)) + '</td>' +
        '<td class="text-sm"><strong>' + escapeHtml(fmtHours(s.ecHours)) + ' h</strong></td>' +
        '<td><span class="status-pill ' + pillClass + '">' + pillLabel + '</span></td>' +
        '<td>' +
          '<div class="row-actions">' +
            '<a href="admin_estudiante_detalle.html?uid=' + encodeURIComponent(s.uid) + '" class="btn btn-outline btn-sm">Ver detalle</a>' +
          '</div>' +
        '</td>';
      tbody.appendChild(tr);
    });
  }

  // ── Filters ──────────────────────────────────────────────────────────

  function applyFilters() {
    var query    = (el('search-input')      ? el('search-input').value.trim().toLowerCase()  : '');
    var statusV  = (el('filter-status')     ? el('filter-status').value                       : 'all');
    var progressV= (el('filter-progress')   ? el('filter-progress').value                     : 'all');

    var filtered = _allStudents.filter(function(s) {
      var matchQ = !query ||
        (s.displayName && s.displayName.toLowerCase().includes(query)) ||
        (s.email && s.email.toLowerCase().includes(query));
      var matchS = statusV   === 'all' ||
        (statusV === 'active'   && s.status !== 'inactive') ||
        (statusV === 'inactive' && s.status === 'inactive');
      var matchP = progressV === 'all' ||
        (progressV === 'none'        && s.ecHours === 0) ||
        (progressV === 'in_progress' && s.ecHours > 0 && s.ecHours < 36) ||
        (progressV === 'completed'   && s.ecHours >= 36);
      return matchQ && matchS && matchP;
    });

    renderStudents(filtered);
  }

  function bindFilters() {
    ['search-input', 'filter-status', 'filter-progress'].forEach(function(id) {
      var elem = el(id);
      if (elem) elem.addEventListener('input', applyFilters);
      if (elem) elem.addEventListener('change', applyFilters);
    });
  }

  // ── Create Student Modal ─────────────────────────────────────────────

  function bindModal() {
    var openBtn = el('btn-matricular');
    var modal   = el('modal-matricula');
    var form    = el('form-matricula');

    if (openBtn && modal) {
      openBtn.addEventListener('click', function() {
        clearModalState();
        if (modal.showModal) modal.showModal(); else modal.classList.add('is-open');
      });
    }

    ['modal-cancel-btn', 'modal-close-x'].forEach(function(id) {
      var btn = el(id);
      if (btn && modal) {
        btn.addEventListener('click', function() {
          if (modal.close) modal.close(); else modal.classList.remove('is-open');
          if (form) form.reset();
          clearModalState();
        });
      }
    });

    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          if (modal.close) modal.close(); else modal.classList.remove('is-open');
          if (form) form.reset();
          clearModalState();
        }
      });
    }

    if (form) form.addEventListener('submit', function(e) { e.preventDefault(); createStudent(); });
  }

  function clearModalState() {
    var fb = el('modal-feedback');
    var res = el('modal-result');
    if (fb)  { fb.textContent = ''; fb.className = ''; }
    if (res) res.hidden = true;
  }

  function showModalFeedback(msg, type) {
    var fb = el('modal-feedback');
    if (!fb) return;
    fb.textContent = msg;
    fb.className = 'alert alert-' + (type === 'error' ? 'error' : type === 'success' ? 'success' : 'info');
    fb.style.marginTop = 'var(--space-4)';
  }

  async function createStudent() {
    var nameVal    = el('new-name')         ? el('new-name').value.trim()         : '';
    var emailVal   = el('new-email')        ? el('new-email').value.trim()        : '';
    var licenseVal = el('new-license')      ? el('new-license').value.trim()      : '';
    var licDateVal = el('new-license-date') ? el('new-license-date').value        : '';
    var submitBtn  = el('modal-submit-btn');

    if (!nameVal)    { showModalFeedback('El nombre completo es requerido.',        'error'); return; }
    if (!emailVal)   { showModalFeedback('El correo electrónico es requerido.',     'error'); return; }
    if (!licenseVal) { showModalFeedback('El número de licencia es requerido.',     'error'); return; }

    var tempPassword = 'CNDPR2025!';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creando…'; }

    try {
      // Usa una instancia secundaria de Auth para no cerrar la sesión del admin.
      var secondaryApp;
      try {
        secondaryApp = firebase.app('secondary-create');
      } catch(e) {
        secondaryApp = firebase.initializeApp(firebase.app().options, 'secondary-create');
      }

      var secondaryAuth = secondaryApp.auth();
      var cred = await secondaryAuth.createUserWithEmailAndPassword(emailVal, tempPassword);
      var newUid = cred.user.uid;

      await firebase.firestore().collection('usuarios').doc(newUid).set({
        displayName:         nameVal,
        email:               emailVal,
        licenseNumber:       licenseVal,
        licenseRenewalDate:  licDateVal || null,
        status:              'active',
        enrolledAt:          firebase.firestore.FieldValue.serverTimestamp(),
        uid:                 newUid,
      });

      await secondaryAuth.signOut();

      var pwDisplay = el('temp-password-display');
      if (pwDisplay) pwDisplay.textContent = tempPassword;
      var res = el('modal-result');
      if (res) res.hidden = false;
      showModalFeedback('Estudiante creado exitosamente.', 'success');

      var form = el('form-matricula');
      if (form) form.reset();
      loadStudents();

    } catch (err) {
      console.error('[AdminEstudiantes] createStudent:', err);
      var msg =
        err.code === 'auth/email-already-in-use' ? 'Este correo ya está registrado.' :
        err.code === 'auth/invalid-email'         ? 'El correo no tiene formato válido.' :
        err.code === 'auth/weak-password'         ? 'Contraseña demasiado débil.' :
        'Error al crear el estudiante. Intente de nuevo.';
      showModalFeedback(msg, 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Crear estudiante'; }
    }
  }

  // ── Student Detail ────────────────────────────────────────────────────

  async function loadStudentDetail(uid) {
    if (!uid) {
      var main = el('detail-content');
      if (main) main.innerHTML = '<div class="empty-state"><div class="empty-state-icon" aria-hidden="true" style="font-size:1.5rem;">❌</div><p>UID no especificado en la URL.</p></div>';
      return;
    }

    try {
      var db      = firebase.firestore();
      var userDoc = await db.collection('usuarios').doc(uid).get();

      if (!userDoc.exists) {
        var main = el('detail-content');
        if (main) main.innerHTML = '<div class="empty-state"><div class="empty-state-icon" aria-hidden="true" style="font-size:1.5rem;">👤</div><p>Estudiante no encontrado.</p></div>';
        return;
      }

      var data = userDoc.data();

      // Breadcrumb + title
      var breadEl = el('breadcrumb-student-name');
      if (breadEl) breadEl.textContent = data.displayName || data.email || uid;
      var titleEl = el('page-title-student');
      if (titleEl) titleEl.textContent = data.displayName || 'Estudiante';

      renderStudentInfo(uid, data);
      renderProgressCard(uid);
      loadQuizHistory(uid);
      loadCertificates(uid);
      loadCommunications(uid);

    } catch (err) {
      console.error('[AdminEstudiantes] loadStudentDetail:', err);
      var main = el('detail-content');
      if (main) main.innerHTML =
        '<div class="empty-state">' +
          '<div class="empty-state-icon" aria-hidden="true" style="font-size:1.5rem;">⚠️</div>' +
          '<p>No se pudo cargar el perfil del estudiante.</p>' +
          '<p style="font-size: var(--text-xs); color: var(--color-text-faint); margin-top: var(--space-2);">' +
            escapeHtml(err.message || String(err)) +
          '</p>' +
          '<a href="admin_estudiantes.html" class="btn btn-outline btn-sm" style="margin-top: var(--space-4);">Volver a Estudiantes</a>' +
        '</div>';
    }
  }

  function renderStudentInfo(uid, data) {
    if (el('detail-name'))    el('detail-name').textContent    = data.displayName || '—';
    if (el('detail-email'))   el('detail-email').textContent   = data.email       || '—';
    if (el('detail-license')) el('detail-license').textContent = data.licenseNumber || '—';
    if (el('detail-enroll'))  el('detail-enroll').textContent  = formatDate(data.enrolledAt);

    var statusEl = el('detail-status');
    if (statusEl) {
      var active = data.status !== 'inactive';
      statusEl.className  = 'status-pill ' + (active ? 'is-active' : 'is-error');
      statusEl.textContent = active ? 'Activo' : 'Inactivo';
    }

    var licDateEl  = el('detail-license-date');
    var licBadgeEl = el('detail-license-badge');
    if (licDateEl) {
      if (data.licenseRenewalDate) {
        licDateEl.textContent = formatDate(data.licenseRenewalDate);
        if (licBadgeEl) {
          var p       = data.licenseRenewalDate.split('-');
          var licDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
          var today   = new Date(); today.setHours(0, 0, 0, 0);
          var diff    = Math.ceil((licDate.getTime() - today.getTime()) / 86400000);
          if (diff < 0) {
            licBadgeEl.textContent = 'Vencida';
            licBadgeEl.className   = 'badge badge-error';
            licBadgeEl.style.display = '';
          } else if (diff <= 90) {
            licBadgeEl.textContent = 'Vence pronto';
            licBadgeEl.className   = 'badge badge-warning';
            licBadgeEl.style.display = '';
          } else {
            licBadgeEl.style.display = 'none';
          }
        }
      } else {
        licDateEl.textContent = 'No registrada';
        if (licBadgeEl) licBadgeEl.style.display = 'none';
      }
    }

    var toggleBtn = el('btn-toggle-status');
    if (toggleBtn) {
      var isActive = data.status !== 'inactive';
      toggleBtn.textContent = isActive ? 'Desactivar cuenta' : 'Activar cuenta';
      toggleBtn.className   = isActive ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm';
      toggleBtn.onclick = async function() {
        try {
          toggleBtn.disabled = true;
          await firebase.firestore().collection('usuarios').doc(uid).update({ status: isActive ? 'inactive' : 'active' });
          loadStudentDetail(uid);
        } catch(e) {
          console.error('toggle status:', e);
          toggleBtn.disabled = false;
        }
      };
    }
  }

  async function renderProgressCard(uid) {
    var db = firebase.firestore();
    var platH = 0, extH = 0;
    try {
      var ps = await db.collection('usuarios').doc(uid).collection('certificados_plataforma').get();
      ps.docs.forEach(function(d) { platH += parseFloat(d.data().hours) || 0; });
      var es = await db.collection('usuarios').doc(uid).collection('certificados_externos').get();
      es.docs.forEach(function(d) { extH  += parseFloat(d.data().hours) || 0; });
    } catch(e) {}

    var total = platH + extH;
    var pct   = Math.min(Math.round((total / 36) * 100), 100);
    var done  = total >= 36;

    if (el('prog-total'))    el('prog-total').textContent    = fmtHours(total) + ' / 36 h';
    if (el('prog-pct'))      el('prog-pct').textContent      = pct + '%';
    if (el('prog-platform')) el('prog-platform').textContent = fmtHours(platH) + ' h de plataforma';
    if (el('prog-external')) el('prog-external').textContent = fmtHours(extH)  + ' h externas';
    if (el('prog-bar')) {
      el('prog-bar').style.width      = pct + '%';
      el('prog-bar').style.background = done ? 'var(--color-success)' : '';
    }
    var badge = el('prog-badge');
    if (badge) badge.style.display = done ? '' : 'none';
  }

  async function loadQuizHistory(uid) {
    var tbody = el('quiz-history-body');
    if (!tbody) return;

    try {
      var snap = await firebase.firestore()
        .collection('usuarios').doc(uid)
        .collection('quiz_results')
        .orderBy('completedAt', 'desc')
        .get();

      if (!snap.empty) {
        tbody.innerHTML = '';
        snap.docs.forEach(function(d) {
          var data = d.data();
          var tr   = document.createElement('tr');
          var cls  = data.passed ? 'badge-success' : 'badge-error';
          var lbl  = data.passed ? 'Aprobado' : 'Reprobado';
          tr.innerHTML =
            '<td>' + escapeHtml(data.offerTitle  || '—') + '</td>' +
            '<td>' + escapeHtml(formatDate(data.completedAt)) + '</td>' +
            '<td>' + escapeHtml(data.score !== undefined ? data.score + '%' : '—') + '</td>' +
            '<td>' + escapeHtml(String(data.attempts || '—')) + '</td>' +
            '<td><span class="badge ' + cls + '">' + lbl + '</span></td>';
          tbody.appendChild(tr);
        });
        return;
      }
    } catch(e) {}

    // Fallback: derivar de certificados_plataforma
    try {
      var certSnap = await firebase.firestore()
        .collection('usuarios').doc(uid)
        .collection('certificados_plataforma').get();

      if (!certSnap.empty) {
        tbody.innerHTML = '';
        certSnap.docs.forEach(function(d) {
          var data = d.data();
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + escapeHtml(data.offerTitle || '—') + '</td>' +
            '<td>' + escapeHtml(formatDate(data.completedAt)) + '</td>' +
            '<td>≥ 80%</td><td>—</td>' +
            '<td><span class="badge badge-success">Aprobado</span></td>';
          tbody.appendChild(tr);
        });
        return;
      }
    } catch(e) {}

    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state" style="border:0;padding:var(--space-6);"><p>Sin historial de evaluaciones registrado.</p></div></td></tr>';
  }

  async function loadCertificates(uid) {
    var platGrid = el('certs-platform-grid');
    var extGrid  = el('certs-external-grid');
    var db       = firebase.firestore();

    if (platGrid) {
      try {
        var ps = await db.collection('usuarios').doc(uid).collection('certificados_plataforma').orderBy('completedAt', 'desc').get();
        platGrid.innerHTML = '';
        if (ps.empty) {
          platGrid.appendChild(buildCertEmpty('No hay certificados de plataforma.'));
        } else {
          ps.docs.forEach(function(d) { platGrid.appendChild(buildCertCard(d.data(), 'platform')); });
        }
      } catch(e) { platGrid.innerHTML = ''; platGrid.appendChild(buildCertEmpty('Error cargando certificados.')); }
    }

    if (extGrid) {
      try {
        var es = await db.collection('usuarios').doc(uid).collection('certificados_externos').orderBy('uploadedAt', 'desc').get();
        extGrid.innerHTML = '';
        if (es.empty) {
          extGrid.appendChild(buildCertEmpty('No hay certificados externos.'));
        } else {
          es.docs.forEach(function(d) { extGrid.appendChild(buildCertCard(d.data(), 'external')); });
        }
      } catch(e) { extGrid.innerHTML = ''; extGrid.appendChild(buildCertEmpty('Error cargando certificados.')); }
    }
  }

  function buildCertCard(cert, type) {
    var div   = document.createElement('div');
    div.className = 'admin-cert-card';
    var title = type === 'platform' ? (cert.offerTitle || '—') : (cert.name || '—');
    var date  = type === 'platform' ? formatDate(cert.completedAt) : formatDate(cert.date);
    var hours = cert.hours ? fmtHours(parseFloat(cert.hours)) + ' h' : '—';
    var link  = type === 'platform' && cert.url ? '<a href="' + escapeHtml(cert.url) + '" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">Ver certificado</a>'
              : type === 'external' && cert.fileUrl ? '<a href="' + escapeHtml(cert.fileUrl) + '" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">Ver PDF</a>'
              : '';
    div.innerHTML =
      '<div class="admin-cert-title">' + escapeHtml(title) + '</div>' +
      '<div class="text-xs text-muted">' + escapeHtml(date) + ' &middot; ' + escapeHtml(hours) + '</div>' +
      (link ? '<div style="margin-top:var(--space-2);">' + link + '</div>' : '');
    return div;
  }

  function buildCertEmpty(msg) {
    var div = document.createElement('div');
    div.className = 'empty-state';
    div.style.cssText = 'grid-column:1/-1; padding:var(--space-6);';
    var p = document.createElement('p'); p.textContent = msg;
    div.appendChild(p);
    return div;
  }

  async function loadCommunications(uid) {
    var container = el('comms-list');
    if (!container) return;

    try {
      var snap = await firebase.firestore()
        .collection('comunicaciones')
        .where('recipients', 'array-contains-any', [uid, 'all'])
        .orderBy('sentAt', 'desc')
        .limit(20)
        .get();

      if (snap.empty) {
        container.innerHTML = '<div class="empty-state" style="border:1px dashed var(--color-border);padding:var(--space-6);"><p>No hay comunicaciones registradas para este estudiante.</p></div>';
        return;
      }

      container.innerHTML = '';
      snap.docs.forEach(function(d) {
        var data = d.data();
        var item = document.createElement('div');
        item.className = 'admin-comms-item';
        item.innerHTML =
          '<div class="admin-comms-subject">' + escapeHtml(data.subject || '(Sin asunto)') + '</div>' +
          '<div class="text-xs text-muted">' +
            escapeHtml(formatDate(data.sentAt)) + ' &middot; ' +
            (data.recipients && data.recipients.includes('all') ? 'General' : 'Directo') +
          '</div>';
        container.appendChild(item);
      });

    } catch (err) {
      container.innerHTML = '<div class="empty-state" style="border:1px dashed var(--color-border);padding:var(--space-6);"><p>No hay comunicaciones registradas.</p></div>';
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────

  return {
    init: function() {
      firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        var pageId = document.body.getAttribute('data-page-id');
        if (pageId === 'admin-estudiante-detalle') {
          var uid = new URLSearchParams(window.location.search).get('uid');
          loadStudentDetail(uid);
        } else {
          bindFilters();
          bindModal();
          loadStudents();
        }
      });
    }
  };

})();

document.addEventListener('DOMContentLoaded', function() { AdminEstudiantes.init(); });
