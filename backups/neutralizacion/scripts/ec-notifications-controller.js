'use strict';

const EcNotifications = (() => {

  // ── Utilities ────────────────────────────────────────────────────────

  // Parse ISO date without timezone shift (same pattern as perfil-certificados-controller)
  function formatDate(isoString) {
    if (!isoString) return '';
    var p = isoString.split('-');
    var d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    return d.toLocaleDateString('es-PR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function el(id) { return document.getElementById(id); }

  // ── Render ────────────────────────────────────────────────────────────

  function renderBanner(type, messageText, actions) {
    var banner = el('ec-notification-banner');
    if (!banner) return;

    var alertClass = type === 'expired' ? 'banner--error' : 'banner--warning';
    var icon       = type === 'expired' ? '🚨' : '⚠️';

    // Build action buttons (hardcoded hrefs — no user data)
    var actionsHtml = actions.map(function(a, i) {
      var cls = i === 0 ? 'btn btn-sm' : 'btn btn-ghost btn-sm';
      return '<a href="' + a.href + '" class="' + cls + '" style="white-space:nowrap;">' + a.label + '</a>';
    }).join('');

    // Set banner structure via innerHTML (no user data in this block)
    banner.className = alertClass;
    banner.style.display = 'flex';
    banner.innerHTML =
      '<div class="banner-content">' +
        '<span class="banner-icon" aria-hidden="true">' + icon + '</span>' +
        '<div class="banner-text">' +
          '<p id="banner-msg-text" style="margin: 0 0 var(--space-2) 0;"></p>' +
          '<div class="banner-actions">' + actionsHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="banner-close" aria-label="Cerrar notificación">✕</button>';

    // Set message text using textContent — user data never touches innerHTML
    var msgEl = el('banner-msg-text');
    if (msgEl) msgEl.textContent = messageText;

    // Close button: dismiss for the session
    var closeBtn = banner.querySelector('.banner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        try { sessionStorage.setItem('ec_notification_dismissed', 'true'); } catch (_e) {}
        banner.style.transition = 'opacity var(--duration-base, 180ms) var(--ease-standard, ease)';
        banner.style.opacity = '0';
        setTimeout(function() { banner.style.display = 'none'; }, 200);
      });
    }
  }

  // ── Logic ─────────────────────────────────────────────────────────────

  async function checkAndRender(uid) {

    // PASO 1 — Already dismissed this session?
    try {
      if (sessionStorage.getItem('ec_notification_dismissed') === 'true') return;
    } catch (_e) {}

    // PASO 2 — Load data in parallel
    var ref = firebase.firestore().collection('usuarios').doc(uid);
    var results;
    try {
      results = await Promise.all([
        ref.get()
          .catch(function(e) { console.error('[EcNotif] user doc:', e); return null; }),
        ref.collection('certificados_plataforma').get()
          .catch(function(e) { console.error('[EcNotif] plat:', e); return null; }),
        ref.collection('certificados_externos').get()
          .catch(function(e) { console.error('[EcNotif] ext:', e); return null; }),
      ]);
    } catch (err) {
      console.error('[EcNotifications] parallel load failed:', err);
      return;
    }

    var userSnap = results[0];
    var platSnap = results[1];
    var extSnap  = results[2];

    // PASO 3 — Compute state

    var userData             = (userSnap && userSnap.exists) ? userSnap.data() : {};
    var licenseRenewalDateStr = userData.licenseRenewalDate || null;

    var totalHours = 0;
    if (platSnap) {
      platSnap.docs.forEach(function(d) { totalHours += parseFloat(d.data().hours) || 0; });
    }
    if (extSnap) {
      extSnap.docs.forEach(function(d)  { totalHours += parseFloat(d.data().hours) || 0; });
    }

    var renewalDate = null;
    if (licenseRenewalDateStr && /^\d{4}-\d{2}-\d{2}$/.test(licenseRenewalDateStr)) {
      var p = licenseRenewalDateStr.split('-');
      renewalDate = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var daysUntilRenewal = renewalDate !== null
      ? Math.ceil((renewalDate.getTime() - today.getTime()) / 86400000)
      : null;

    // PASO 4 — Determine alert type (first applicable wins)
    var type, messageText, actions;

    if (daysUntilRenewal !== null && daysUntilRenewal < 0) {
      // TIPO 1 — expired
      type        = 'expired';
      messageText = 'Tu licencia profesional venció el ' +
        formatDate(licenseRenewalDateStr) +
        '. Contacta al CNDPR para gestionar tu renovación.';
      actions = [
        { href: 'perfil.html', label: 'Ir a mi perfil' },
      ];

    } else if (daysUntilRenewal !== null && daysUntilRenewal <= 90 && totalHours < 36) {
      // TIPO 2 — urgent
      var horasFaltantes    = Math.round((36 - totalHours) * 10) / 10;
      var horasFaltantesStr = horasFaltantes % 1 === 0
        ? String(Math.round(horasFaltantes))
        : horasFaltantes.toFixed(1);
      type        = 'urgent';
      messageText = 'Tu licencia vence el ' + formatDate(licenseRenewalDateStr) +
        '. Te faltan ' + horasFaltantesStr + ' horas EC para completar tu meta de renovación.';
      actions = [
        { href: 'dashboard_analytics.html', label: 'Ver mi progreso' },
        { href: 'catalogo.html',            label: 'Ir al catálogo'  },
      ];

    } else if (daysUntilRenewal !== null && daysUntilRenewal <= 180 && totalHours < 18) {
      // TIPO 3 — behind
      var recomendado    = Math.ceil((36 - totalHours) / 6);
      var totalHoursStr  = totalHours % 1 === 0
        ? String(Math.round(totalHours))
        : totalHours.toFixed(1);
      type        = 'behind';
      messageText = 'Llevas ' + totalHoursStr + ' h EC acumuladas y tu licencia vence en menos de 6 meses. ' +
        'Te recomendamos completar al menos ' + String(recomendado) + ' h por mes.';
      actions = [
        { href: 'catalogo.html', label: 'Ver ofertas disponibles' },
      ];

    } else {
      // Sin alerta: goal completed, no license date, or no condition met
      return;
    }

    // PASO 5 — Render
    renderBanner(type, messageText, actions);
  }

  // ── Init ─────────────────────────────────────────────────────────────

  return {
    init: function() {
      firebase.auth().onAuthStateChanged(function(user) {
        if (!user) return;
        checkAndRender(user.uid);
      });
    }
  };

})();

document.addEventListener('DOMContentLoaded', function() { EcNotifications.init(); });
