// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/siteConfig.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  siteConfig.jsw
//  Fuente única del número de WhatsApp y los links del menú — cámbialos
//  aquí una sola vez y las 7 páginas públicas se actualizan solas, sin
//  tener que editar cada archivo HTML por separado.
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsersBackend from 'wix-users-backend';
import { obtenerPerfil } from 'backend/backend-permisos';

const WHATSAPP_NUMBER = '524778350020';

const NAV_LINKS = [
  { key: 'inicio',      label: 'Inicio',      url: 'https://www.wecarsbajio.com/' },
  { key: 'inventario',  label: 'Inventario',  url: 'https://www.wecarsbajio.com/inventario' },
  { key: 'credito',     label: 'Crédito',     url: 'https://www.wecarsbajio.com/credito' },
  { key: 'consigna',    label: 'Consigna',    url: 'https://www.wecarsbajio.com/consigna' },
  { key: 'nosotros',    label: 'Nosotros',    url: 'https://www.wecarsbajio.com/nosotros' },
];

const NAV_MAS = [
  { key: 'contacto',     label: 'Contacto',     url: 'https://www.wecarsbajio.com/contacto' },
  { key: 'testimonios',  label: 'Testimonios',  url: 'https://www.wecarsbajio.com/testimonios' },
  { key: 'garantias',    label: 'Garantías',    url: 'https://www.wecarsbajio.com/garantias' },
];

export function getSiteConfig() {
  return { whatsappNumber: WHATSAPP_NUMBER, navLinks: NAV_LINKS, navMas: NAV_MAS };
}

// ── ConfigERP: configuración del ERP guardada en CMS ─────────────────
// Colección requerida en Wix CMS → ID: "ConfigERP"
// Campos: clave (Text, primario), valor (Text), descripcion (Text)
// Permisos: Leer=Conectado, Escribir=Admin del sitio (suppressAuth en backend)
export async function getErpConfig(clave) {
  try {
    const r = await wixData.query('ConfigERP').eq('clave', clave).limit(1).find({ suppressAuth: true });
    return r.items.length ? r.items[0].valor : null;
  } catch (e) {
    console.error('[SiteConfig] getErpConfig error:', e);
    return null;
  }
}

export async function setErpConfig(clave, valor, descripcion) {
  try {
    const r = await wixData.query('ConfigERP').eq('clave', clave).limit(1).find({ suppressAuth: true });
    if (r.items.length) {
      await wixData.update('ConfigERP', Object.assign({}, r.items[0], { valor: String(valor) }), { suppressAuth: true });
    } else {
      await wixData.insert('ConfigERP', { clave, valor: String(valor), descripcion: descripcion || '' }, { suppressAuth: true });
    }
    return { ok: true };
  } catch (e) {
    console.error('[SiteConfig] setErpConfig error:', e);
    return { ok: false, error: String(e) };
  }
}

// ── Permisos ERP — escritura y lectura validadas en backend ───────────
// Colección: Configuracion — documento único con _id: 'permisos-erp'
// Solo rol 'Administración' puede escribir; cualquier rol autenticado puede leer.
export async function getPermisosERP() {
  try {
    const email = await wixUsersBackend.currentUser.getEmail();
    if (!email) return { ok: false, error: 'No autenticado' };
    const perfil = await obtenerPerfil(email);
    if (!perfil) return { ok: false, error: 'Perfil no encontrado' };
    const item = await wixData.get('Configuracion', 'permisos-erp', { suppressAuth: true }).catch(() => null);
    return { ok: true, permisos: item };
  } catch (e) {
    console.error('[SiteConfig] getPermisosERP error:', e);
    return { ok: false, error: String(e) };
  }
}

export async function setPermisosERP(permisos) {
  try {
    const email = await wixUsersBackend.currentUser.getEmail();
    if (!email) return { ok: false, error: 'No autenticado' };
    const perfil = await obtenerPerfil(email);
    if (!perfil || perfil.rol !== 'Administración') {
      console.warn('[SiteConfig] setPermisosERP: rol no autorizado —', perfil ? perfil.rol : 'sin perfil');
      return { ok: false, error: 'No autorizado — rol requerido: Administración' };
    }
    const doc = Object.assign({ _id: 'permisos-erp' }, permisos, {
      _modificadoPor: email,
      _modificadoEn: new Date().toISOString(),
    });
    const existente = await wixData.get('Configuracion', 'permisos-erp', { suppressAuth: true }).catch(() => null);
    if (existente) {
      await wixData.update('Configuracion', doc, { suppressAuth: true });
    } else {
      await wixData.insert('Configuracion', doc, { suppressAuth: true });
    }
    console.log('[SiteConfig] Permisos ERP guardados por:', email);
    return { ok: true };
  } catch (e) {
    console.error('[SiteConfig] setPermisosERP error:', e);
    return { ok: false, error: String(e) };
  }
}
