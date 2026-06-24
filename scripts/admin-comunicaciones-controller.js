'use strict';

const AdminComunicaciones = (() => {

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
    } else {
      date = new Date(value);
    }
    if (isNaN(date)) return '—';
    return date.toLocaleDateString('es-PR', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function el(id) { return document.getElementById(id); }

  // ── Mock data (visible cuando comunicaciones/ está vacío) ────────────

  var MOCK_COMMUNICATIONS = [
    {
      id: 'mock-001',
      subject: 'Próximo vencimiento de licencias — enero 2026',
      body: 'Estimados colegas: Les recordamos que las licencias con vencimiento antes del 31 de enero de 2026 deben renovarse a la brevedad. Recuerden completar sus horas de educación continua requeridas antes de la fecha límite. Pueden acceder a su progreso EC desde el perfil en la plataforma.',
      type: 'Recordatorio EC',
      recipientType: 'all',
      recipients: 'Todos los estudiantes',
      status: 'sent',
      sentAt: new Date(Date.now() - 2 * 86400000),
    },
    {
      id: 'mock-002',
      subject: 'Nueva oferta disponible: NutriCorazón — Podcast',
      body: 'Nos complace anunciar la disponibilidad de un nuevo episodio de podcast: "NutriCorazón: Salud Cardiovascular y Nutrición". Esta oferta gratuita otorga 0.5 horas EC y está disponible en su catálogo de inmediato. Incluye transcripción completa y evaluación de 5 preguntas.',
      type: 'Anuncio general',
      recipientType: 'all',
      recipients: 'Todos los estudiantes',
      status: 'sent',
      sentAt: new Date(Date.now() - 7 * 86400000),
    },
    {
      id: 'mock-003',
      subject: 'Tu licencia vence pronto — acción requerida',
      body: 'Hemos identificado que tu licencia profesional vence en menos de 90 días. Te recomendamos completar tus horas EC pendientes y gestionar la renovación ante la Junta de Licenciamiento correspondiente. Recuerda que puedes registrar certificados externos directamente en tu perfil.',
      type: 'Alerta de vencimiento de licencia',
      recipientType: 'expiring',
      recipients: 'Estudiantes con licencia por vencer (< 90 días)',
      status: 'sent',
      sentAt: new Date(Date.now() - 14 * 86400000),
    },
    {
      id: 'mock-004',
      subject: 'Completa tus horas EC antes de marzo',
      body: 'Si estás matriculado en el curso de Manejo Nutricional de la Diabetes Tipo 2, te recordamos que el período de educación continua cierra en marzo. Aprovecha los módulos disponibles para acumular tus horas requeridas. El Módulo 2 ya está disponible en la plataforma.',
      type: 'Recordatorio EC',
      recipientType: 'offer',
      recipients: 'Oferta: Manejo Nutricional de la Diabetes Tipo 2: Actualización Clínica',
      status: 'sent',
      sentAt: new Date(Date.now() - 21 * 86400000),
    },
  ];

  // ── State ─────────────────────────────────────────────────────────────

  var _allCommunications = [];
  var _isMock = false;
  var _currentUser = null;

  // ── Load historial ────────────────────────────────────────────────────

  async function loadCommunications() {
    try {
      var snap = await firebase.firestore()
        .collection('comunicaciones')
        .orderBy('sentAt', 'desc')
        .limit(50)
        .get();

      _allCommunications = snap.docs.map(function(d) {
        return Object.assign({ id: d.id }, d.data());
      });

      if (_allCommunications.length === 0) {
        _allCommunications = MOCK_COMMUNICATIONS;
        _isMock = true;
      }

    } catch (err) {
      console.error('[AdminComunicaciones] loadCommunications:', err);
      _allCommunications = MOCK_COMMUNICATIONS;
      _isMock = true;
    }

    var mockNote = el('historial-mock-note');
    if (mockNote) mockNote.style.display = _isMock ? '' : 'none';

    renderHistorial(_allCommunications);
  }

  // ── Render historial ──────────────────────────────────────────────────

  var TYPE_BADGE_CLASS = {
    'Anuncio general':                    'badge-info',
    'Recordatorio EC':                    'badge-success',
    'Alerta de vencimiento de licencia':  'badge-warning',
    'Resumen de progreso':                'badge',
  };

  function renderHistorial(communications) {
    var tbody = el('historial-tbody');
    if (!tbody) return;

    if (communications.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="padding: var(--space-2);">' +
          '<div class="empty-state">' +
            '<div class="empty-state-icon" aria-hidden="true" style="font-size: 1.75rem;">📭</div>' +
            '<p>No hay comunicaciones enviadas aún.</p>' +
          '</div>' +
        '</td></tr>';
      return;
    }

    tbody.innerHTML = '';

    communications.forEach(function(c, idx) {
      var badgeClass = TYPE_BADGE_CLASS[c.type] || 'badge';
      var dateStr    = formatDate(c.sentAt);
      var expandId   = 'comm-expand-' + idx;

      var mainRow = document.createElement('tr');
      mainRow.style.cursor = 'pointer';
      mainRow.setAttribute('role', 'button');
      mainRow.setAttribute('aria-expanded', 'false');
      mainRow.setAttribute('aria-controls', expandId);
      mainRow.setAttribute('tabindex', '0');
      mainRow.innerHTML =
        '<td style="white-space: nowrap; font-size: var(--text-xs);">' + escapeHtml(dateStr) + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + escapeHtml(c.type || '—') + '</span></td>' +
        '<td style="font-weight: var(--weight-bold);">' + escapeHtml(c.subject || '—') + '</td>' +
        '<td style="font-size: var(--text-xs); color: var(--color-text-muted);">' + escapeHtml(c.recipients || '—') + '</td>' +
        '<td><span class="status-pill status-active">Enviado</span></td>';

      var expandRow = document.createElement('tr');
      expandRow.id = expandId;
      expandRow.hidden = true;
      expandRow.innerHTML =
        '<td colspan="5" style="padding: 0;">' +
          '<div style="padding: var(--space-4) var(--space-6); background: var(--color-bg-subtle); border-top: 1px solid var(--color-divider); font-size: var(--text-sm); color: var(--color-text); white-space: pre-wrap; line-height: var(--leading-relaxed);">' +
            escapeHtml(c.body || '') +
          '</div>' +
        '</td>';

      function toggleExpand() {
        var expanded = mainRow.getAttribute('aria-expanded') === 'true';
        mainRow.setAttribute('aria-expanded', String(!expanded));
        expandRow.hidden = expanded;
      }

      mainRow.addEventListener('click', toggleExpand);
      mainRow.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(); }
      });

      tbody.appendChild(mainRow);
      tbody.appendChild(expandRow);
    });
  }

  // ── Send ──────────────────────────────────────────────────────────────

  async function sendCommunication(e) {
    e.preventDefault();

    var subject       = (el('field-subject')        ? el('field-subject').value.trim()        : '');
    var body          = (el('field-body')            ? el('field-body').value.trim()           : '');
    var type          = (el('field-type')            ? el('field-type').value                  : '');
    var recipientType = (el('field-recipient-type')  ? el('field-recipient-type').value        : 'all');
    var recipients    = buildRecipientsLabel(recipientType);

    if (!subject) { showFormError('El asunto es obligatorio.'); return; }
    if (!body)    { showFormError('El mensaje es obligatorio.'); return; }

    clearFormError();

    var submitBtn = el('btn-send');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando…'; }

    try {
      await firebase.firestore().collection('comunicaciones').add({
        subject:       subject,
        body:          body,
        type:          type,
        recipients:    recipients,
        recipientType: recipientType,
        sentAt:        firebase.firestore.FieldValue.serverTimestamp(),
        sentBy:        _currentUser ? _currentUser.uid : null,
        status:        'sent',
      });

      showToast('Comunicación guardada correctamente.');
      clearForm();
      _isMock = false;
      await loadCommunications();

    } catch (err) {
      console.error('[AdminComunicaciones] sendCommunication:', err);
      showFormError('Error al guardar. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Enviar comunicación'; }
    }
  }

  function buildRecipientsLabel(recipientType) {
    if (recipientType === 'all')      return 'Todos los estudiantes';
    if (recipientType === 'expiring') return 'Estudiantes con licencia por vencer (< 90 días)';
    if (recipientType === 'individual') {
      var inp = el('field-individual-name');
      var name = inp ? inp.value.trim() : '';
      return name ? 'Estudiante: ' + name : 'Estudiante individual';
    }
    if (recipientType === 'offer') {
      var sel = el('field-offer-select');
      return sel ? 'Oferta: ' + sel.value : 'Por oferta EC';
    }
    return 'Todos los estudiantes';
  }

  function clearForm() {
    var form = el('form-comunicacion');
    if (form) form.reset();
    updateRecipientVisibility('all');
  }

  function showFormError(msg) {
    var err = el('form-error');
    if (err) { err.textContent = msg; err.hidden = false; }
  }

  function clearFormError() {
    var err = el('form-error');
    if (err) { err.textContent = ''; err.hidden = true; }
  }

  // ── Toast ─────────────────────────────────────────────────────────────

  function showToast(message) {
    var existing = document.getElementById('admin-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.cssText =
      'position:fixed;bottom:var(--space-6);right:var(--space-6);z-index:9999;' +
      'background:var(--color-success);color:white;' +
      'padding:var(--space-3) var(--space-5);border-radius:var(--radius-md);' +
      'font-size:var(--text-sm);font-weight:var(--weight-medium);' +
      'box-shadow:0 4px 12px rgba(0,0,0,0.15);' +
      'opacity:0;transition:opacity 0.2s ease;pointer-events:none;';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 220);
      }, 3200);
    });
  }

  // ── Recipient visibility ──────────────────────────────────────────────

  function updateRecipientVisibility(value) {
    var offerRow      = el('row-offer-select');
    var individualRow = el('row-individual-name');
    if (offerRow)      offerRow.hidden      = (value !== 'offer');
    if (individualRow) individualRow.hidden = (value !== 'individual');
  }

  function populateOfferSelect() {
    var select = el('field-offer-select');
    if (!select || typeof CATALOG_OFFERINGS === 'undefined') return;
    CATALOG_OFFERINGS.forEach(function(o) {
      var opt = document.createElement('option');
      opt.value       = o.offerTitle || o.title;
      opt.textContent = o.title.length > 60 ? o.title.substring(0, 57) + '…' : o.title;
      select.appendChild(opt);
    });
  }

  // ── Bind ──────────────────────────────────────────────────────────────

  function bindForm() {
    populateOfferSelect();

    var form = el('form-comunicacion');
    if (form) form.addEventListener('submit', sendCommunication);

    var recipientType = el('field-recipient-type');
    if (recipientType) {
      recipientType.addEventListener('change', function() {
        updateRecipientVisibility(this.value);
      });
    }

    updateRecipientVisibility('all');
  }

  // ── Init ─────────────────────────────────────────────────────────────

  return {
    init: function() {
      firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        _currentUser = user;
        bindForm();
        loadCommunications();
      });
    }
  };

})();

document.addEventListener('DOMContentLoaded', function() { AdminComunicaciones.init(); });
