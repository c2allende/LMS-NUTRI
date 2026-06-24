'use strict';

const AdminOfertas = (() => {

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

  // URL intro leída directamente desde offering.introUrl (campo en CATALOG_OFFERINGS).
  // Todas las ofertas construidas tienen introUrl definido — no se necesita mapa hardcodeado.

  var TYPE_LABELS = {
    'curso':        'Curso',
    'taller':       'Taller',
    'lectura':      'Lectura dirigida',
    'presentacion': 'Presentación',
    'podcast':      'Podcast',
  };

  // ── State ─────────────────────────────────────────────────────────────
  // offerTitle → { students: number, rate: number|null }

  var _firestoreStats = {};

  // ── KPIs desde catálogo ───────────────────────────────────────────────

  function computeCatalogKPIs() {
    if (typeof CATALOG_OFFERINGS === 'undefined') return;

    var total      = CATALOG_OFFERINGS.length;
    var totalHours = CATALOG_OFFERINGS.reduce(function(sum, o) { return sum + (o.hours || 0); }, 0);
    var types      = {};
    CATALOG_OFFERINGS.forEach(function(o) { if (o.type) types[o.type] = true; });
    var uniqueTypes = Object.keys(types).length;

    var hoursStr = totalHours % 1 === 0 ? String(totalHours) : totalHours.toFixed(1);

    if (el('kpi-total-offerings')) el('kpi-total-offerings').textContent = total;
    if (el('kpi-total-hours'))     el('kpi-total-hours').textContent     = hoursStr + ' h';
    if (el('kpi-unique-types'))    el('kpi-unique-types').textContent    = uniqueTypes;
  }

  // ── Enriquecimiento desde Firestore ───────────────────────────────────

  async function loadOfferStats() {
    try {
      var snap = await firebase.firestore()
        .collectionGroup('quiz_results')
        .get();

      // Aggregate by offerTitle using plain object as Set substitute
      var offerMap = {};
      snap.docs.forEach(function(d) {
        var data = d.data();
        var key  = data.offerTitle;
        if (!key) return;
        if (!offerMap[key]) offerMap[key] = { uids: {}, passed: 0, total: 0 };
        if (data.studentUid) offerMap[key].uids[String(data.studentUid)] = true;
        offerMap[key].total++;
        if (data.passed) offerMap[key].passed++;
      });

      Object.keys(offerMap).forEach(function(title) {
        var d = offerMap[title];
        _firestoreStats[title] = {
          students: Object.keys(d.uids).length,
          rate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : null,
        };
      });
    } catch (err) {
      console.error('[AdminOfertas] loadOfferStats:', err);
      // _firestoreStats stays empty — cards will display "—"
    }
  }

  // ── Grid de ofertas ───────────────────────────────────────────────────

  function renderOfferingsGrid() {
    var grid = el('offerings-grid');
    if (!grid || typeof CATALOG_OFFERINGS === 'undefined') return;
    grid.innerHTML = '';
    CATALOG_OFFERINGS.forEach(function(offering) {
      grid.appendChild(buildOfferCard(offering));
    });
  }

  function buildOfferCard(offering) {
    var stats     = _firestoreStats[offering.offerTitle || offering.title] || null;
    var introUrl  = offering.introUrl               || null;
    var typeLabel = TYPE_LABELS[offering.type]       || escapeHtml(offering.type || '');
    var isAmber   = offering.type === 'lectura' || offering.type === 'podcast';
    var hoursStr  = offering.hours % 1 === 0
      ? offering.hours + ' h'
      : offering.hours.toFixed(1) + ' h';

    var typeBgColor  = isAmber ? 'var(--color-secondary-soft)' : 'var(--color-primary-soft)';
    var typeColor    = isAmber ? 'var(--color-secondary)'      : 'var(--color-primary)';

    var div = document.createElement('article');
    div.className = 'offer-admin-card';

    div.innerHTML =
      '<div class="offer-admin-top">' +
        '<span class="offer-admin-type" style="background: ' + typeBgColor + '; color: ' + typeColor + ';">' +
          escapeHtml(typeLabel) +
        '</span>' +
        (offering.premium
          ? '<span class="badge badge-warning" style="font-size: var(--text-xs);">Premium</span>'
          : '') +
        '<span class="badge badge-success offer-admin-status">Activo</span>' +
      '</div>' +
      '<h3 class="offer-admin-title">' + escapeHtml(offering.title) + '</h3>' +
      '<div class="offer-admin-meta">' +
        '<span>⏱️ ' + escapeHtml(hoursStr) + '</span>' +
        '<span class="offer-admin-sep" aria-hidden="true">·</span>' +
        '<span class="offer-admin-code">' + escapeHtml(offering.code || '') + '</span>' +
      '</div>' +
      '<div class="offer-admin-stats">' +
        '<div class="offer-admin-stat-item">' +
          '<span class="offer-admin-stat-val">' + (stats ? stats.students : '—') + '</span>' +
          '<span class="offer-admin-stat-lbl">Inscritos</span>' +
        '</div>' +
        '<div class="offer-admin-stat-item">' +
          '<span class="offer-admin-stat-val">' +
            (stats && stats.rate !== null ? stats.rate + '%' : '—') +
          '</span>' +
          '<span class="offer-admin-stat-lbl">Aprobación</span>' +
        '</div>' +
      '</div>' +
      '<div class="offer-admin-actions">' +
        (introUrl
          ? '<a href="' + escapeHtml(introUrl) + '" class="btn btn-ghost btn-sm" target="_blank" rel="noopener">Ver oferta</a>'
          : '<button type="button" class="btn btn-ghost btn-sm offer-admin-btn-disabled" disabled aria-disabled="true">Ver oferta</button>') +
        '<button type="button" class="btn btn-outline btn-sm" data-open-edit-modal>' +
          'Editar' +
        '</button>' +
      '</div>';

    return div;
  }

  // ── Modal placeholder ─────────────────────────────────────────────────

  function bindModalButtons() {
    var modal = el('modal-ofertas');
    if (!modal) return;

    document.addEventListener('click', function(e) {
      if (e.target.closest('[data-open-edit-modal]') || e.target.closest('[data-open-new-modal]')) {
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
        computeCatalogKPIs();
        loadOfferStats().then(function() {
          renderOfferingsGrid();
        });
        bindModalButtons();
      });
    }
  };

})();

document.addEventListener('DOMContentLoaded', function() { AdminOfertas.init(); });
