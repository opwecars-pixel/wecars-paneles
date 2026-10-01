// ───────────────────────────────────────────────────────────────────
//  PÁGINA: ENTRAR
//  Elemento HTML ID: #htmlEntrar
//  Pega SOLO este bloque en { } de la página ENTRAR
//  URL de la página: /entrar — este es el único link que tu gente
//  necesita memorizar; Velo decide solo a qué panel mandarlos según
//  su rol en la colección Usuarios.
// ───────────────────────────────────────────────────────────────────

import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { obtenerPerfil } from 'backend/permisos.jsw';

const HTML_ENTRAR_ID = '#htmlEntrar';

// Mapa rol → URL (case-insensitive gracias a normalizarRol)
const RUTAS_POR_ROL = {
  'vendedor':       'https://www.wecarsbajio.com/panel-vendedores',
  'gerencia':       'https://www.wecarsbajio.com/panel-gerencia',
  'administracion': 'https://www.wecarsbajio.com/panel-administracion',
  'finanzas':       'https://www.wecarsbajio.com/panel-finanzas',
};

const LABELS_POR_ROL = {
  'vendedor':       'Vendedor',
  'gerencia':       'Gerencia',
  'administracion': 'Administración',
  'finanzas':       'Finanzas',
};

// Normaliza cualquier variante del rol a minúsculas sin acento
function normalizarRol(rol) {
  return String(rol || '').toLowerCase().trim()
    .replace('ó', 'o').replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ú', 'u');
}

function redirigirSegunRol(email) {
  return obtenerPerfil(email).then((perfil) => {
    const rolBase = normalizarRol(perfil.rol);
    const urlBase = RUTAS_POR_ROL[rolBase];

    // Construir lista de todos los paneles a los que tiene acceso
    const extras = (perfil.panelesExtra || '')
      .split(',')
      .map(s => normalizarRol(s))
      .filter(r => r && RUTAS_POR_ROL[r]);

    const todosPaneles = [];
    if (urlBase) todosPaneles.push({ rol: rolBase, url: urlBase, label: LABELS_POR_ROL[rolBase] || perfil.rol });
    extras.forEach(r => {
      if (!todosPaneles.find(p => p.rol === r)) {
        todosPaneles.push({ rol: r, url: RUTAS_POR_ROL[r], label: LABELS_POR_ROL[r] || r });
      }
    });

    if (todosPaneles.length === 0) {
      // Sin panel asignado
      $w(HTML_ENTRAR_ID).postMessage({ type: 'wecars-sin-panel', rol: perfil.rol || '' });
    } else if (todosPaneles.length === 1) {
      // Un solo panel → redirigir directo
      wixLocation.to(todosPaneles[0].url);
    } else {
      // Múltiples paneles → mostrar selector
      $w(HTML_ENTRAR_ID).postMessage({
        type: 'wecars-selector-paneles',
        nombre: perfil.nombre || email.split('@')[0],
        paneles: todosPaneles,
      });
    }
  });
}

$w.onReady(function () {
  $w(HTML_ENTRAR_ID).onMessage((event) => {
    const data = event.data;
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_ENTRAR_ID).height = data.height;
    }
    if (data.type === 'wecars-ir-panel' && data.url) {
      wixLocation.to(data.url);
    }
  });

  // Si no hay sesión activa, mostramos el diálogo de login de Wix.
  // Cuando el usuario se autentica exitosamente, wixUsers dispara
  // onLogin y ahí hacemos la redirección al panel correcto.
  if (!wixUsers.currentUser.loggedIn) {
    wixUsers.promptLogin({ mode: 'login' })
      .then((user) => user.getEmail())
      .then((email) => redirigirSegunRol(email))
      .catch(() => {
        // El usuario cerró el modal sin loguearse — no hacer nada
      });
    return;
  }

  // Ya tiene sesión: redirigir de inmediato
  wixUsers.currentUser.getEmail()
    .then((email) => redirigirSegunRol(email))
    .catch((err) => {
      console.error('[Entrar] Error verificando rol:', err);
      $w(HTML_ENTRAR_ID).postMessage({ type: 'wecars-sin-panel', rol: '' });
    });
});
