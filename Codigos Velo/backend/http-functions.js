// ───────────────────────────────────────────────────────────────────
//  ARCHIVO: http-functions.js
//  Ubicación en Velo: Backend → http-functions.js  (ya existe en Wix,
//  si no existe créalo con ese nombre exacto en la carpeta Backend)
//
//  Agrega estas funciones al archivo. Si ya tienes contenido en ese
//  archivo, pega solo las funciones nuevas (no dupliques el import).
// ───────────────────────────────────────────────────────────────────

import { ok, serverError } from 'wix-http-functions';

// ── PWA Web App Manifest ──────────────────────────────────────────
// URL pública: https://www.wecarsbajio.com/_functions/pwa-manifest
export function get_pwa_manifest(request) {
  const manifest = {
    name: 'weCars Bajío — Panel',
    short_name: 'weCars Panel',
    description: 'Panel de gestión interno weCars Bajío',
    start_url: '/panel-vendedores',
    display: 'standalone',
    background_color: '#0b1014',
    theme_color: '#0b1014',
    orientation: 'portrait-primary',
    icons: [
      { src: 'https://static.wixstatic.com/media/wecars-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'https://static.wixstatic.com/media/wecars-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    shortcuts: [
      { name: 'Mis clientes', url: '/panel-vendedores', icons: [{ src: 'https://static.wixstatic.com/media/wecars-icon-192.png', sizes: '192x192' }] },
    ],
  };
  return ok({
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
    body: JSON.stringify(manifest),
  });
}

// ── PWA Service Worker ────────────────────────────────────────────
// URL pública: https://www.wecarsbajio.com/_functions/pwa-sw
// El SW cachea los assets del panel para que cargue sin red.
export function get_pwa_sw(request) {
  const swCode = `
const CACHE = 'wecars-panel-v1';
const ASSETS = [
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
`;
  return ok({
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Service-Worker-Allowed': '/',
    },
    body: swCode,
  });
}

// ── Meta OAuth Callback ───────────────────────────────────────────
// URL pública: https://www.wecarsbajio.com/_functions/meta_oauth_callback
//
// Configurar en Facebook Developer App → Settings → Valid OAuth Redirect URIs:
//   https://www.wecarsbajio.com/_functions/meta_oauth_callback
//
// Flujo:
//   1. Admin abre el link de autorización de Meta → Meta redirige aquí con ?code=
//   2. Este endpoint intercambia el code por un access token de larga duración
//   3. Llama a conectarCuenta() del backend para guardar la metadata en CuentasSociales
//   4. Redirige al admin a la pantalla de Administración con resultado
//
// ⚠️  Requiere en Wix Secrets Manager:
//     META_APP_ID     — App ID de Facebook Developer
//     META_APP_SECRET — App Secret de Facebook Developer
//
import { conectarCuenta } from 'backend/publicaciones.jsw';
import { getSecret } from 'wix-secrets-backend';

export async function get_meta_oauth_callback(request) {
  const params = request.query || {};
  const code = params.code;
  const state = params.state ? JSON.parse(decodeURIComponent(params.state)) : {};
  const redirectBase = 'https://www.wecarsbajio.com/administracion';

  if (!code) {
    return ok({
      headers: { 'Content-Type': 'text/html' },
      body: `<script>window.location="${redirectBase}?pub_error=sin_code"</script>`,
    });
  }

  try {
    const appId     = await getSecret('META_APP_ID');
    const appSecret = await getSecret('META_APP_SECRET');
    const redirectUri = 'https://www.wecarsbajio.com/_functions/meta_oauth_callback';

    // Intercambiar code por short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    // Extender a long-lived token (60 días)
    const llRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const longToken = llData.access_token || tokenData.access_token;

    // Obtener datos de la página
    const pageId     = state.paginaId     || '';
    const paginaNombre = state.paginaNombre || pageId;
    const plataforma = state.plataforma   || 'facebook';
    const secretKey  = `fb_token_${pageId}`;

    // ⚠️  No se puede guardar el token en Secrets desde http-functions automáticamente.
    // El Admin debe copiarlo manualmente en Wix Secrets Manager con el nombre: fb_token_{pageId}
    // Por ahora, mostramos la pantalla de confirmación con instrucciones.
    const resultado = await conectarCuenta({
      propietarioEmail: state.propietarioEmail || '',
      tipo:             state.tipo             || 'corporativa',
      plataforma,
      paginaId:         pageId,
      paginaNombre,
      instagramActorId: state.instagramActorId || '',
      secretKey,
      vendedoresAutorizados: '[]',
    });

    const tokenEncoded = encodeURIComponent(longToken);
    return ok({
      headers: { 'Content-Type': 'text/html' },
      body: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Cuenta conectada</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:60px auto;padding:20px;background:#f8fafc;color:#1a2332}
.box{background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 20px rgba(0,0,0,.08)}
h2{margin:0 0 12px;font-size:1.15rem}p{font-size:.9rem;color:#5a6a7a;line-height:1.5}
.token{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px;word-break:break-all;font-family:monospace;font-size:.78rem;margin:10px 0}
.btn{display:inline-block;background:#3a8d00;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:700;margin-top:12px}
</style></head><body><div class="box">
<h2>✅ Cuenta "${paginaNombre}" conectada</h2>
<p>La cuenta fue registrada en CuentasSociales. Ahora debes guardar el token manualmente en <strong>Wix Secrets Manager</strong>:</p>
<p><strong>Nombre de la clave:</strong> <code>${secretKey}</code></p>
<p><strong>Token (cópialo):</strong></p>
<div class="token" id="tk">${longToken}</div>
<p style="font-size:.78rem;color:#e53e3e">⚠️ El token expira en ~60 días. Recuerda renovarlo antes de que venza.</p>
<a href="${redirectBase}" class="btn">Volver a Administración →</a>
</div></body></html>`,
    });
  } catch (err) {
    return ok({
      headers: { 'Content-Type': 'text/html' },
      body: `<script>window.location="${redirectBase}?pub_error=${encodeURIComponent(err.message)}"</script>`,
    });
  }
}
