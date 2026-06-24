/**
 * perfil-certificados-controller.js
 * Repositorio de Certificados — LMS CNDPR
 *
 * Requiere (orden de carga):
 *   firebase-app · firebase-auth · firebase-firestore · firebase-storage
 *   → firebase-config → ui-controller → este script
 *
 * Firestore:
 *   usuarios/{uid}                          → campo licenseRenewalDate (string ISO)
 *   usuarios/{uid}/certificados_plataforma  → offerTitle, offerType, completedAt, hours, validationCode, url
 *   usuarios/{uid}/certificados_externos    → name, institution, date, hours, fileName, fileSize, storagePath, fileUrl, uploadedAt
 *
 * Storage:
 *   usuarios/{uid}/certificados-externos/{timestamp}_{filename}
 */

'use strict';

const CertRepo = (() => {

  // ── Estado privado ──────────────────────────────────────────────────
  let _uid                 = null;
  let _selectedFile        = null;
  let _deleteTarget        = null;  // { docId, storagePath }
  let _licenseDate         = null;  // ISO string YYYY-MM-DD
  let _platformHoursTotal  = 0;
  let _externalHoursTotal  = 0;

  var HOURS_GOAL = 36;

  // ── Utilidades ──────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#039;');
  }

  function formatFileSize(bytes) {
    if (bytes < 1024)    return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  function formatDate(value) {
    if (!value) return '—';
    var date;
    if (value && typeof value.toDate === 'function') {
      date = value.toDate();
    } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // ISO date string — parse without timezone shift
      var p = value.split('-');
      date  = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    } else {
      date = new Date(value);
    }
    return isNaN(date)
      ? '—'
      : date.toLocaleDateString('es-PR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fmtHours(h) {
    return (h % 1 === 0) ? String(h) : h.toFixed(1);
  }

  // ── Toast ────────────────────────────────────────────────────────────

  function showToast(msg, type) {
    type = type || 'info';
    var container = document.getElementById('cert-toast-container');
    if (!container) return;

    var paths = {
      success: '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>',
      error:   '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>',
      info:    '<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    };

    var toast = document.createElement('div');
    toast.className = 'cert-toast cert-toast--' + type;
    toast.setAttribute('role', 'status');

    var icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = '<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">'
      + (paths[type] || paths.info) + '</svg>';

    var text = document.createElement('span');
    text.textContent = msg;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    setTimeout(function () {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3500);
  }

  // ── SVG helpers (sin datos de usuario) ──────────────────────────────

  var SVG = {
    cert:     function () { return '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>'; },
    pdf:      function () { return '<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'; },
    calendar: function () { return '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>'; },
    clock:    function () { return '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'; },
    building: function () { return '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>'; },
    doc:      function () { return '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'; },
    shield:   function () { return '<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>'; },
    eye:      function () { return '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>'; },
    trash:    function () { return '<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>'; },
    empty:    function () { return '<svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'; },
  };

  // ── Contador de horas EC ─────────────────────────────────────────────

  function updateHoursCounter() {
    var total     = _platformHoursTotal + _externalHoursTotal;
    var pct       = Math.min(Math.round((total / HOURS_GOAL) * 100), 100);
    var remaining = Math.max(HOURS_GOAL - total, 0);
    var done      = total >= HOURS_GOAL;

    var meter    = document.getElementById('hours-meter');
    var bar      = document.getElementById('hours-bar');
    var totalEl  = document.getElementById('hours-total');
    var pctEl    = document.getElementById('hours-pct');
    var remainEl = document.getElementById('hours-remaining');

    if (totalEl) totalEl.textContent = fmtHours(total);
    if (pctEl)   pctEl.textContent   = pct + '%';

    if (meter) {
      meter.setAttribute('aria-valuenow',  String(total));
      meter.setAttribute('aria-valuetext', fmtHours(total) + ' de ' + HOURS_GOAL + ' horas EC');
    }
    if (bar) {
      bar.style.width      = pct + '%';
      bar.style.background = done ? 'var(--color-success)' : '';
    }
    if (remainEl) {
      if (done) {
        remainEl.textContent      = '¡Meta completada!';
        remainEl.style.color      = 'var(--color-success)';
        remainEl.style.fontWeight = '700';
      } else {
        remainEl.textContent      = fmtHours(remaining) + ' h restantes para completar la meta';
        remainEl.style.color      = '';
        remainEl.style.fontWeight = '';
      }
    }
  }

  // ── Certificados de plataforma ───────────────────────────────────────

  async function loadPlatformCerts() {
    var grid  = document.getElementById('platform-certs-grid');
    var count = document.getElementById('cert-platform-count');
    if (!grid) return;

    try {
      var snap = await firebase.firestore()
        .collection('usuarios').doc(_uid)
        .collection('certificados_plataforma')
        .orderBy('completedAt', 'desc')
        .get();

      var certs = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      grid.innerHTML = '';

      _platformHoursTotal = certs.reduce(function (acc, c) { return acc + (parseFloat(c.hours) || 0); }, 0);
      updateHoursCounter();

      if (certs.length === 0) {
        grid.appendChild(buildEmptyState('Aún no tienes certificados de plataforma. Completa una oferta para obtener el primero.'));
        if (count) count.textContent = '0 certificados';
        return;
      }

      if (count) count.textContent = certs.length + (certs.length === 1 ? ' certificado' : ' certificados');
      certs.forEach(function (cert) { grid.appendChild(buildPlatformCard(cert)); });

    } catch (err) {
      console.error('[CertRepo] Error cargando certificados de plataforma:', err);
      grid.innerHTML = '';
      grid.appendChild(buildEmptyState('No se pudieron cargar los certificados. Intenta recargar la página.'));
    }
  }

  function buildPlatformCard(cert) {
    var article = document.createElement('article');
    article.className = 'cert-card';

    var validationHtml = cert.validationCode
      ? '<div class="cert-validation">' + SVG.shield() + '<span class="cert-validation-code">' + escapeHtml(cert.validationCode) + '</span></div>'
      : '';

    var certUrl    = cert.url ? escapeHtml(cert.url) : '#';
    var targetAttr = cert.url ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"';

    article.innerHTML =
      '<div class="cert-card-header">' +
        '<div class="cert-type-icon">' + SVG.cert() + '</div>' +
        '<div class="cert-card-header-text">' +
          '<span class="cert-type-badge">' + escapeHtml(cert.offerType || 'Certificado') + '</span>' +
          '<div class="cert-card-title">' + escapeHtml(cert.offerTitle || '—') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cert-card-body">' +
        '<div class="cert-meta">' +
          '<div class="cert-meta-row">' + SVG.calendar() + '<span>Completado el&nbsp;</span><span class="cert-meta-value">' + escapeHtml(formatDate(cert.completedAt)) + '</span></div>' +
          '<div class="cert-meta-row">' + SVG.clock()    + '<span>Créditos EC:&nbsp;</span><span class="cert-meta-value">' + escapeHtml(String(cert.hours || '—')) + ' h</span></div>' +
          '<div class="cert-meta-row">' + SVG.building() + '<span>Proveedor:&nbsp;</span><span class="cert-meta-value">CNDPR #00062</span></div>' +
        '</div>' +
        validationHtml +
      '</div>' +
      '<div class="cert-card-actions">' +
        '<a href="' + certUrl + '" class="btn btn-primary btn-sm" ' + targetAttr + '>' + SVG.eye() + ' Ver certificado</a>' +
      '</div>';

    return article;
  }

  // ── Certificados externos ────────────────────────────────────────────

  async function loadExternalCerts() {
    try {
      var snap = await firebase.firestore()
        .collection('usuarios').doc(_uid)
        .collection('certificados_externos')
        .orderBy('uploadedAt', 'desc')
        .get();

      var certs = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      renderExternalCerts(certs);

    } catch (err) {
      console.error('[CertRepo] Error cargando certificados externos:', err);
    }
  }

  function renderExternalCerts(certs) {
    var grid  = document.getElementById('external-certs-grid');
    var empty = document.getElementById('cert-external-empty');
    var count = document.getElementById('cert-external-count');
    if (!grid) return;

    grid.querySelectorAll('.cert-card').forEach(function (c) { c.remove(); });

    _externalHoursTotal = certs.reduce(function (acc, c) { return acc + (parseFloat(c.hours) || 0); }, 0);
    updateHoursCounter();

    if (certs.length === 0) {
      if (empty) empty.style.display = '';
      if (count) count.textContent = '0 cargados';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (count) count.textContent = certs.length + (certs.length === 1 ? ' cargado' : ' cargados');
    certs.forEach(function (cert) { grid.appendChild(buildExternalCard(cert)); });
  }

  function buildExternalCard(cert) {
    var article = document.createElement('article');
    article.className = 'cert-card cert-card--external';

    var instHtml = cert.institution
      ? '<div class="cert-meta-row">' + SVG.building() + '<span class="cert-meta-value">' + escapeHtml(cert.institution) + '</span></div>'
      : '';

    var dateHtml = cert.date
      ? '<div class="cert-meta-row">' + SVG.calendar() + '<span class="cert-meta-value">' + escapeHtml(formatDate(cert.date)) + '</span></div>'
      : '';

    var hoursHtml = cert.hours
      ? '<div class="cert-meta-row">' + SVG.clock() + '<span class="cert-meta-value">' + escapeHtml(fmtHours(parseFloat(cert.hours))) + ' h contacto</span></div>'
      : '';

    var sizeHtml = cert.fileSize
      ? '&nbsp;<span class="cert-meta-size">(' + escapeHtml(formatFileSize(cert.fileSize)) + ')</span>'
      : '';

    article.innerHTML =
      '<div class="cert-card-header cert-card-header--external">' +
        '<div class="cert-type-icon cert-type-icon--external">' + SVG.pdf() + '</div>' +
        '<div class="cert-card-header-text">' +
          '<span class="cert-type-badge cert-type-badge--external">Externo</span>' +
          '<div class="cert-card-title cert-card-title--external">' + escapeHtml(cert.name) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cert-card-body">' +
        '<div class="cert-meta">' +
          instHtml + dateHtml + hoursHtml +
          '<div class="cert-meta-row">' + SVG.doc() + '<span>' + escapeHtml(cert.fileName || '') + '</span>' + sizeHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cert-card-actions">' +
        '<a href="' + escapeHtml(cert.fileUrl || '#') + '" class="btn btn-primary btn-sm" target="_blank" rel="noopener">' + SVG.eye() + ' Ver PDF</a>' +
        '<button class="btn btn-ghost btn-sm cert-delete-btn">' + SVG.trash() + ' Eliminar</button>' +
      '</div>';

    article.querySelector('.cert-delete-btn').addEventListener('click', function () {
      openDeleteModal(cert.id, cert.storagePath || '', cert.name);
    });
    article.setAttribute('aria-label', 'Certificado externo: ' + cert.name);
    article.querySelector('.cert-delete-btn').setAttribute('aria-label', 'Eliminar ' + cert.name);
    article.querySelector('a').setAttribute('aria-label', 'Ver PDF de ' + cert.name);

    return article;
  }

  function buildEmptyState(msg) {
    var div = document.createElement('div');
    div.className = 'cert-empty-state';
    div.setAttribute('role', 'status');
    div.innerHTML = SVG.empty();
    var p = document.createElement('p');
    p.textContent = msg;
    div.appendChild(p);
    return div;
  }

  // ── Flujo de carga de externos ───────────────────────────────────────

  function bindUploadZone() {
    var zone   = document.getElementById('cert-upload-zone');
    var input  = document.getElementById('cert-file-input');
    if (!zone || !input) return;

    input.addEventListener('change', function (e) {
      if (e.target.files[0]) processFile(e.target.files[0]);
    });
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', function () { zone.classList.remove('is-dragover'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
    });

    var cancel = document.getElementById('cert-cancel-btn');
    var remove = document.getElementById('cert-remove-file-btn');
    var submit = document.getElementById('cert-submit-btn');
    if (cancel) cancel.addEventListener('click', resetUploadForm);
    if (remove) remove.addEventListener('click', resetUploadForm);
    if (submit) submit.addEventListener('click', submitExternalCert);
  }

  function bindModalButtons() {
    var closeBtn   = document.getElementById('cert-close-modal-btn');
    var confirmBtn = document.getElementById('cert-confirm-delete-btn');
    if (closeBtn)   closeBtn.addEventListener('click', closeDeleteModal);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmDelete);
  }

  function processFile(file) {
    var error = validateFile(file);
    if (error) { showToast(error, 'error'); return; }

    _selectedFile = file;

    var nameEl = document.getElementById('cert-file-name');
    var sizeEl = document.getElementById('cert-file-size');
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = formatFileSize(file.size);

    var nameInput = document.getElementById('cert-name-input');
    if (nameInput && !nameInput.value) {
      nameInput.value = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
    }

    var zone = document.getElementById('cert-upload-zone');
    var form = document.getElementById('cert-upload-form');
    if (zone) zone.style.display = 'none';
    if (form) form.hidden = false;
    if (nameInput) nameInput.focus();
  }

  function validateFile(file) {
    if (file.type !== 'application/pdf') return 'Solo se aceptan archivos en formato PDF.';
    if (file.size > 5 * 1024 * 1024)    return 'El archivo supera el límite de 5 MB.';
    return null;
  }

  function resetUploadForm() {
    _selectedFile = null;
    var input = document.getElementById('cert-file-input');
    if (input) input.value = '';

    ['cert-name-input', 'cert-institution-input', 'cert-date-input', 'cert-hours-input'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });

    var form     = document.getElementById('cert-upload-form');
    var zone     = document.getElementById('cert-upload-zone');
    var progress = document.getElementById('cert-upload-progress');
    if (form)     form.hidden = true;
    if (zone)     zone.style.display = '';
    if (progress) progress.hidden = true;

    var fill  = document.getElementById('cert-progress-fill');
    var bar   = document.getElementById('cert-progress-bar');
    var label = document.getElementById('cert-progress-pct');
    if (fill)  fill.style.width = '0%';
    if (bar)   bar.setAttribute('aria-valuenow', '0');
    if (label) label.textContent = '0%';
  }

  async function submitExternalCert() {
    // ─ Validar nombre
    var nameInput = document.getElementById('cert-name-input');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showToast('Por favor escribe el nombre del certificado.', 'error');
      if (nameInput) nameInput.focus();
      return;
    }

    // ─ Validar fecha (requerida)
    var dateInput = document.getElementById('cert-date-input');
    var dateVal   = dateInput ? dateInput.value : '';
    if (!dateVal) {
      showToast('La fecha de obtención es requerida.', 'error');
      if (dateInput) dateInput.focus();
      return;
    }

    // ─ Validar horas (requeridas, mín 0.5)
    var hoursInput = document.getElementById('cert-hours-input');
    var hoursRaw   = hoursInput ? hoursInput.value.trim() : '';
    var hoursVal   = parseFloat(hoursRaw);
    if (!hoursRaw || isNaN(hoursVal) || hoursVal < 0.5) {
      showToast('Indica el total de horas contacto (mínimo 0.5).', 'error');
      if (hoursInput) hoursInput.focus();
      return;
    }
    // Redondear al múltiplo de 0.5 más cercano
    hoursVal = Math.round(hoursVal * 2) / 2;

    if (!_selectedFile) { showToast('No hay archivo seleccionado.', 'error'); return; }

    var submitBtn = document.getElementById('cert-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando…'; }

    var progressWrap  = document.getElementById('cert-upload-progress');
    var progressFill  = document.getElementById('cert-progress-fill');
    var progressLabel = document.getElementById('cert-progress-pct');
    var progressBar   = document.getElementById('cert-progress-bar');
    if (progressWrap) progressWrap.hidden = false;

    try {
      var timestamp    = Date.now();
      var safeFilename = _selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      var storagePath  = 'usuarios/' + _uid + '/certificados-externos/' + timestamp + '_' + safeFilename;
      var storageRef   = firebase.storage().ref(storagePath);
      var uploadTask   = storageRef.put(_selectedFile);

      await new Promise(function (resolve, reject) {
        uploadTask.on(
          firebase.storage.TaskEvent.STATE_CHANGED,
          function (snapshot) {
            var pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (progressFill)  progressFill.style.width = pct + '%';
            if (progressLabel) progressLabel.textContent = pct + '%';
            if (progressBar)   progressBar.setAttribute('aria-valuenow', String(pct));
          },
          reject,
          resolve
        );
      });

      var fileUrl     = await storageRef.getDownloadURL();
      var institution = document.getElementById('cert-institution-input');

      await firebase.firestore()
        .collection('usuarios').doc(_uid)
        .collection('certificados_externos')
        .add({
          name:        name,
          institution: (institution && institution.value.trim()) ? institution.value.trim() : null,
          date:        dateVal,
          hours:       hoursVal,
          fileName:    _selectedFile.name,
          fileSize:    _selectedFile.size,
          storagePath: storagePath,
          fileUrl:     fileUrl,
          uploadedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        });

      showToast('Certificado cargado exitosamente.', 'success');
      resetUploadForm();
      loadExternalCerts();

    } catch (err) {
      console.error('[CertRepo] Error en carga:', err);
      showToast('Error al guardar el certificado. Intenta de nuevo.', 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Guardar certificado'; }
      if (progressWrap) {
        progressWrap.hidden = true;
        if (progressFill)  progressFill.style.width = '0%';
        if (progressLabel) progressLabel.textContent = '0%';
      }
    }
  }

  // ── Flujo de eliminación ─────────────────────────────────────────────

  function openDeleteModal(docId, storagePath, certName) {
    _deleteTarget = { docId: docId, storagePath: storagePath };
    var modal  = document.getElementById('cert-delete-modal');
    var nameEl = document.getElementById('cert-modal-cert-name');
    if (nameEl) nameEl.textContent = certName;
    if (modal)  modal.classList.add('is-open');
    var btn = document.getElementById('cert-confirm-delete-btn');
    if (btn) btn.focus();
  }

  function closeDeleteModal() {
    _deleteTarget = null;
    var modal = document.getElementById('cert-delete-modal');
    if (modal) modal.classList.remove('is-open');
  }

  async function confirmDelete() {
    if (!_deleteTarget) return;
    var docId       = _deleteTarget.docId;
    var storagePath = _deleteTarget.storagePath;
    var btn = document.getElementById('cert-confirm-delete-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Eliminando…'; }

    try {
      if (storagePath) {
        await firebase.storage().ref(storagePath).delete();
      }
      await firebase.firestore()
        .collection('usuarios').doc(_uid)
        .collection('certificados_externos')
        .doc(docId)
        .delete();

      closeDeleteModal();
      showToast('Certificado eliminado correctamente.', 'success');
      loadExternalCerts();

    } catch (err) {
      console.error('[CertRepo] Error al eliminar:', err);
      showToast('Error al eliminar el certificado. Intenta de nuevo.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Eliminar'; }
    }
  }

  // ── Fecha de renovación de licencia ──────────────────────────────────

  async function loadLicenseRenewalDate() {
    try {
      var snap = await firebase.firestore().collection('usuarios').doc(_uid).get();
      var data = snap.exists ? snap.data() : {};
      _licenseDate = data.licenseRenewalDate || null;
      renderLicenseDate(_licenseDate);
    } catch (err) {
      console.error('[CertRepo] Error cargando fecha de renovación:', err);
      var textEl = document.getElementById('license-date-text');
      if (textEl) textEl.textContent = 'No disponible';
    }
  }

  function renderLicenseDate(isoDate) {
    var displayEl = document.getElementById('license-date-display');
    var editEl    = document.getElementById('license-date-edit');
    if (!displayEl) return;

    // Switch to display mode
    displayEl.style.display = 'flex';
    if (editEl) editEl.style.display = 'none';

    var textEl  = document.getElementById('license-date-text');
    var badgeEl = document.getElementById('license-date-badge');
    var addBtn  = document.getElementById('license-add-btn');
    var editBtn = document.getElementById('license-edit-btn');

    if (!isoDate) {
      if (textEl)  textEl.textContent    = 'No registrada';
      if (badgeEl) badgeEl.style.display = 'none';
      if (addBtn)  addBtn.style.display  = '';
      if (editBtn) editBtn.style.display = 'none';
      return;
    }

    // Parse ISO date avoiding timezone offset
    var p    = isoDate.split('-');
    var date = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    if (textEl) textEl.textContent = date.toLocaleDateString('es-PR', { year: 'numeric', month: 'long', day: 'numeric' });

    if (addBtn)  addBtn.style.display  = 'none';
    if (editBtn) editBtn.style.display = '';

    if (badgeEl) {
      var today    = new Date();
      today.setHours(0, 0, 0, 0);
      var diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);

      if (diffDays < 0) {
        badgeEl.textContent    = 'Vencida';
        badgeEl.className      = 'license-badge license-badge--error';
        badgeEl.style.display  = '';
      } else if (diffDays <= 90) {
        badgeEl.textContent    = 'Vence pronto';
        badgeEl.className      = 'license-badge license-badge--warning';
        badgeEl.style.display  = '';
      } else {
        badgeEl.style.display  = 'none';
      }
    }
  }

  function startLicenseEdit() {
    var displayEl = document.getElementById('license-date-display');
    var editEl    = document.getElementById('license-date-edit');
    var input     = document.getElementById('license-date-input-edit');

    if (displayEl) displayEl.style.display = 'none';
    if (editEl)    editEl.style.display    = 'flex';
    if (input) {
      if (_licenseDate) input.value = _licenseDate;
      input.focus();
    }
  }

  async function saveLicenseDate() {
    var input   = document.getElementById('license-date-input-edit');
    var dateVal = input ? input.value : '';
    if (!dateVal) {
      showToast('Selecciona una fecha válida.', 'error');
      if (input) input.focus();
      return;
    }

    var saveBtn = document.getElementById('license-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando…'; }

    try {
      await firebase.firestore()
        .collection('usuarios').doc(_uid)
        .set({ licenseRenewalDate: dateVal }, { merge: true });

      _licenseDate = dateVal;
      renderLicenseDate(dateVal);
      showToast('Fecha de renovación actualizada.', 'success');
    } catch (err) {
      console.error('[CertRepo] Error guardando fecha de renovación:', err);
      showToast('Error al guardar la fecha. Intenta de nuevo.', 'error');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Guardar'; }
    }
  }

  function cancelLicenseEdit() {
    var displayEl = document.getElementById('license-date-display');
    var editEl    = document.getElementById('license-date-edit');
    if (displayEl) displayEl.style.display = 'flex';
    if (editEl)    editEl.style.display    = 'none';
  }

  function bindLicenseDateButtons() {
    var addBtn    = document.getElementById('license-add-btn');
    var editBtn   = document.getElementById('license-edit-btn');
    var saveBtn   = document.getElementById('license-save-btn');
    var cancelBtn = document.getElementById('license-cancel-btn');
    if (addBtn)    addBtn.addEventListener('click', startLicenseEdit);
    if (editBtn)   editBtn.addEventListener('click', startLicenseEdit);
    if (saveBtn)   saveBtn.addEventListener('click', saveLicenseDate);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelLicenseEdit);
  }

  // ── Setup ────────────────────────────────────────────────────────────

  function setupDateMax() {
    var today = new Date().toISOString().split('T')[0];
    var dateInput = document.getElementById('cert-date-input');
    if (dateInput) dateInput.max = today;
  }

  // ── API pública ──────────────────────────────────────────────────────

  return {
    init: function () {
      firebase.auth().onAuthStateChanged(function (user) {
        if (!user) return;
        _uid = user.uid;
        setupDateMax();
        bindUploadZone();
        bindModalButtons();
        bindLicenseDateButtons();
        loadPlatformCerts();
        loadExternalCerts();
        loadLicenseRenewalDate();
      });
    },
  };

})();

document.addEventListener('DOMContentLoaded', function () { CertRepo.init(); });
