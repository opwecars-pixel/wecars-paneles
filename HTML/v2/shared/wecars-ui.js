/**
 * weCars ERP v2 — Componentes UI compartidos
 * Toast, Drawer, Modal confirm, Avatar, Badge, Spinner, Empty state.
 * Requiere: wecars-tokens.css
 */

'use strict';

/* ══════════════════════════════════════════════════
   TOAST
   WCToast.show('Guardado', 'ok')
   WCToast.show('Error al guardar', 'error')
   WCToast.show('Procesando…', 'loading', 0)  // sin auto-cerrar
   ══════════════════════════════════════════════════ */
const WCToast = (() => {
  let container;

  function _getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'wc-toast-container';
      container.style.cssText = `
        position:fixed;bottom:calc(var(--wc-bottom-nav-h,60px) + 12px);
        right:16px;z-index:var(--wc-z-toast,500);
        display:flex;flex-direction:column;gap:8px;
        pointer-events:none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  const ICONS = {
    ok:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warn:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    loading: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:wc-spin .8s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  const COLORS = {
    ok:      { bg:'#f0fdf4', border:'#86efac', text:'#15803d' },
    error:   { bg:'#fef2f2', border:'#fca5a5', text:'#dc2626' },
    warn:    { bg:'#fffbeb', border:'#fcd34d', text:'#d97706' },
    loading: { bg:'#f0f9ff', border:'#7dd3fc', text:'#0369a1' },
    info:    { bg:'#eff6ff', border:'#93c5fd', text:'#1d4ed8' },
  };

  function show(msg, tipo = 'info', duracion = 3000) {
    const c = _getContainer();
    const col = COLORS[tipo] || COLORS.info;
    const el = document.createElement('div');
    el.style.cssText = `
      display:flex;align-items:center;gap:10px;
      background:${col.bg};border:1px solid ${col.border};color:${col.text};
      padding:10px 14px;border-radius:10px;
      font-family:var(--wc-font-body,'Inter',sans-serif);font-size:13px;font-weight:500;
      box-shadow:0 4px 12px rgba(0,0,0,.10);pointer-events:auto;
      animation:wc-toast-in .2s ease;max-width:300px;
    `;
    el.innerHTML = `${ICONS[tipo] || ICONS.info}<span>${msg}</span>`;
    c.appendChild(el);

    if (duracion > 0) {
      setTimeout(() => {
        el.style.animation = 'wc-toast-out .2s ease forwards';
        setTimeout(() => el.remove(), 200);
      }, duracion);
    }
    return el;
  }

  // Inyectar keyframes una sola vez
  if (!document.getElementById('wc-toast-styles')) {
    const s = document.createElement('style');
    s.id = 'wc-toast-styles';
    s.textContent = `
      @keyframes wc-toast-in  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      @keyframes wc-toast-out { to{opacity:0;transform:translateY(8px)} }
      @keyframes wc-spin       { to{transform:rotate(360deg)} }
    `;
    document.head.appendChild(s);
  }

  return { show };
})();


/* ══════════════════════════════════════════════════
   CONFIRM MODAL
   WCConfirm.show({
     titulo: '¿Eliminar cliente?',
     mensaje: 'Esta acción no se puede deshacer.',
     tipo: 'danger',           // ok | warn | danger
     labelOk: 'Eliminar',
     labelCancel: 'Cancelar',
     onOk: () => { ... }
   })
   ══════════════════════════════════════════════════ */
const WCConfirm = (() => {
  function show({ titulo, mensaje, tipo = 'warn', labelOk = 'Confirmar', labelCancel = 'Cancelar', onOk }) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.45);
      z-index:var(--wc-z-modal,400);display:flex;align-items:center;justify-content:center;padding:16px;
      animation:wc-fade-in .15s ease;
    `;
    const colorBtn = tipo === 'danger' ? '#dc2626' : tipo === 'ok' ? '#16a34a' : '#d97706';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:24px;max-width:380px;width:100%;
                  box-shadow:0 20px 40px rgba(0,0,0,.18);">
        <h3 style="font-size:16px;font-weight:700;color:#0d1a0d;margin:0 0 8px">${titulo}</h3>
        <p style="font-size:13.5px;color:#4a5e4a;margin:0 0 20px;line-height:1.5">${mensaje}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="wc-confirm-cancel" style="padding:9px 18px;border-radius:8px;border:1.5px solid #dde3de;
            background:#fff;font-size:13px;font-weight:600;cursor:pointer;color:#4a5e4a">${labelCancel}</button>
          <button id="wc-confirm-ok" style="padding:9px 18px;border-radius:8px;border:none;
            background:${colorBtn};color:#fff;font-size:13px;font-weight:700;cursor:pointer">${labelOk}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => { overlay.style.animation = 'wc-fade-out .15s ease forwards'; setTimeout(() => overlay.remove(), 150); };
    overlay.querySelector('#wc-confirm-cancel').onclick = close;
    overlay.querySelector('#wc-confirm-ok').onclick = () => { close(); if (onOk) onOk(); };
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    if (!document.getElementById('wc-modal-styles')) {
      const s = document.createElement('style');
      s.id = 'wc-modal-styles';
      s.textContent = `
        @keyframes wc-fade-in  { from{opacity:0} to{opacity:1} }
        @keyframes wc-fade-out { to{opacity:0} }
      `;
      document.head.appendChild(s);
    }
  }
  return { show };
})();


/* ══════════════════════════════════════════════════
   EMPTY STATE
   WCEmpty.render(contenedor, {
     icono: '👥',   // emoji o SVG string
     titulo: 'Sin clientes',
     mensaje: 'Agrega tu primer cliente para comenzar.',
     cta: { label: 'Agregar cliente', onclick: fn }
   })
   ══════════════════════════════════════════════════ */
const WCEmpty = {
  render(contenedor, { icono = '📭', titulo = 'Sin resultados', mensaje = '', cta } = {}) {
    const ctaHtml = cta ? `<button id="wc-empty-cta" style="margin-top:12px;padding:10px 20px;
      border-radius:8px;background:var(--wc-green,#56a900);color:#fff;border:none;
      font-size:13px;font-weight:700;cursor:pointer">${cta.label}</button>` : '';

    contenedor.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                  padding:48px 24px;text-align:center;color:var(--wc-ink3,#7a8e7a)">
        <div style="font-size:40px;margin-bottom:12px;opacity:.5">${icono}</div>
        <div style="font-size:15px;font-weight:700;color:var(--wc-ink2,#4a5e4a);margin-bottom:6px">${titulo}</div>
        ${mensaje ? `<div style="font-size:13px;max-width:280px;line-height:1.5">${mensaje}</div>` : ''}
        ${ctaHtml}
      </div>
    `;
    if (cta) contenedor.querySelector('#wc-empty-cta').onclick = cta.onclick;
  }
};


/* ══════════════════════════════════════════════════
   SPINNER (dentro de botón o contenedor)
   const stop = WCSpinner.btn(boton)   // spinner en botón
   stop()                              // restaurar botón
   ══════════════════════════════════════════════════ */
const WCSpinner = {
  btn(btn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" style="animation:wc-spin .8s linear infinite;vertical-align:middle">
      <path d="M21 12a9 9 0 11-6.219-8.56"/></svg>`;
    return () => { btn.disabled = false; btn.innerHTML = original; };
  },

  inline(contenedor, msg = 'Cargando…') {
    contenedor.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:20px;color:var(--wc-ink3,#7a8e7a);font-size:13px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" style="animation:wc-spin .8s linear infinite;flex-shrink:0">
          <path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
        <span>${msg}</span>
      </div>
    `;
  }
};


/* ══════════════════════════════════════════════════
   AVATAR — genera iniciales con color consistente
   WCAvatar.html('Carlos Mendoza', 34)
   Devuelve string HTML del avatar
   ══════════════════════════════════════════════════ */
const WCAvatar = {
  _colors: ['#56a900','#0ea5e9','#8b5cf6','#f59e0b','#10b981','#ef4444','#6366f1','#ec4899'],

  _color(nombre) {
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    return this._colors[Math.abs(hash) % this._colors.length];
  },

  _initials(nombre) {
    const parts = (nombre || '?').trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  },

  html(nombre, size = 32, foto = null) {
    if (foto) {
      return `<img src="${foto}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0" alt="${nombre}">`;
    }
    const bg = this._color(nombre || '?');
    const fs = Math.round(size * 0.38);
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};
      color:#fff;font-family:var(--wc-font-body);font-size:${fs}px;font-weight:700;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;letter-spacing:.02em">
      ${this._initials(nombre)}</div>`;
  }
};


/* ══════════════════════════════════════════════════
   BADGE de etapa
   WCBadge.etapa('nuevo')  → string HTML
   WCBadge.estatus('Disponible') → string HTML
   ══════════════════════════════════════════════════ */
const WCBadge = {
  _etapaColor: {
    nuevo:       ['#ede9fe','#6366f1'],
    contactado:  ['#e0f2fe','#0369a1'],
    seguimiento: ['#fef9c3','#a16207'],
    calificado:  ['#dcfce7','#166534'],
    propuesta:   ['#faf5ff','#7e22ce'],
    ganado:      ['#dcfce7','#15803d'],
    perdido:     ['#fef2f2','#b91c1c'],
  },

  etapa(etapa) {
    const [bg, fg] = this._etapaColor[etapa] || ['#f0f2f1','#4a5e4a'];
    const label = etapa.charAt(0).toUpperCase() + etapa.slice(1);
    return `<span style="display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;
      font-size:11px;font-weight:700;letter-spacing:.03em;background:${bg};color:${fg}">${label}</span>`;
  },

  estatus(est) {
    const map = {
      'Disponible': ['#dcfce7','#166534'],
      'Apartado':   ['#fef9c3','#a16207'],
      'Vendido':    ['#f0f2f1','#4a5e4a'],
      'En traslado':['#e0f2fe','#0369a1'],
      'Pausado':    ['#fef2f2','#b91c1c'],
    };
    const [bg, fg] = map[est] || ['#f0f2f1','#4a5e4a'];
    return `<span style="display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;
      font-size:11px;font-weight:700;background:${bg};color:${fg}">${est}</span>`;
  }
};


/* ══════════════════════════════════════════════════
   FORMATTERS de datos
   ══════════════════════════════════════════════════ */
const WCFormat = {
  precio(n) {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN', maximumFractionDigits:0 }).format(n);
  },
  fecha(d) {
    if (!d) return '—';
    const dt = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat('es-MX', { day:'numeric', month:'short', year:'numeric' }).format(dt);
  },
  fechaCorta(d) {
    if (!d) return '—';
    const dt = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat('es-MX', { day:'numeric', month:'short' }).format(dt);
  },
  relativa(d) {
    if (!d) return '—';
    const dt = d instanceof Date ? d : new Date(d);
    const diff = Math.floor((Date.now() - dt) / 1000);
    if (diff < 60)  return 'hace un momento';
    if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
    if (diff < 604800) return `hace ${Math.floor(diff/86400)} días`;
    return this.fechaCorta(dt);
  },
  tel(t) {
    if (!t) return '—';
    const d = t.replace(/\D/g,'');
    return d.length === 10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : t;
  },
  km(n) {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('es-MX').format(n) + ' km';
  }
};

/* Exponer globalmente */
Object.assign(window, { WCToast, WCConfirm, WCEmpty, WCSpinner, WCAvatar, WCBadge, WCFormat });
