// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/permisos.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  permisos.jsw
//  Única fuente de verdad de roles. Se usa SIEMPRE del lado del servidor
//  (aquí) antes de decidir qué datos mandar o qué acciones permitir —
//  nunca confiar en una verificación hecha solo en el HTML, porque el
//  HTML es inspeccionable por cualquier usuario.
//  El rol de cada quien ya NO vive en un arreglo escrito a mano en el
//  código — vive en la colección "Usuarios", y se edita ahí (a través
//  del Panel de Administración) sin tener que tocar código nunca.
//  IMPORTANTE antes de publicar este archivo: agrega primero, en el CMS,
//  un registro en "Usuarios" para cada correo de gerente (rol "Gerencia")
//  — si no, al publicar perderían el acceso a Gerencia/Comisiones/
//  eliminar clientes, porque ya no habría de dónde leer su rol.
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsersBackend from 'wix-users-backend';

// ── Normalización de roles ────────────────────────────────────────
// Convierte cualquier variante del rol a minúsculas sin diacríticos.
// 'Administración' → 'administracion'  |  'Gerencia' → 'gerencia'
// 'Finanzas' → 'finanzas'              |  'Vendedor' → 'vendedor'
// Fuente única para toda la aplicación — nunca normalizar en los módulos.
export function normalizarRol(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// ── Guardia central de autenticación + rol ────────────────────────
// Obtiene la identidad real desde el servidor (nunca del frontend),
// verifica que el usuario tenga alguno de los roles permitidos y
// devuelve { email, perfil } para que la función llamadora pueda
// registrar quién ejecutó la operación.
//
// rolesPermitidos: array de strings con los nombres canónicos del rol
// tal como están en la colección Usuarios (con mayúsculas y acentos):
//   ['Finanzas', 'Gerencia', 'Administración']
// La comparación se hace con normalización — no importa si el CMS tiene
// 'Administracion' o 'Administración', ambas formas pasan.
export async function requireRolBackend(rolesPermitidos) {
  const email = await wixUsersBackend.currentUser.getEmail();
  if (!email) throw new Error('No autenticado');
  const perfil = await obtenerPerfil(email);
  if (!perfil || !perfil.rol) throw new Error('Perfil no encontrado');
  const rolNorm = normalizarRol(perfil.rol);
  const permitidos = rolesPermitidos.map(normalizarRol);
  if (!permitidos.includes(rolNorm)) {
    throw new Error('No autorizado: rol "' + perfil.rol + '" no tiene acceso a esta operación');
  }
  return { email, perfil };
}

export function obtenerRol(email) {
  const correo = String(email || '').toLowerCase().trim();
  if (!correo) return Promise.resolve('');
  return wixData.query('Usuarios')
    .eq('email', correo)
    .limit(1)
    .find({ suppressAuth: true })
    .then((results) => (results.items.length ? (results.items[0].rol || '') : ''))
    .catch(() => '');
}

const PERFIL_VACIO = { rol: '', nombre: '', puesto: '', fechaIngreso: null };

export function obtenerPerfil(email) {
  const correo = String(email || '').toLowerCase().trim();
  if (!correo) return Promise.resolve(PERFIL_VACIO);
  return wixData.query('Usuarios')
    .eq('email', correo)
    .limit(1)
    .find({ suppressAuth: true })
    .then((results) => {
      if (!results.items.length) return PERFIL_VACIO;
      const u = results.items[0];
      return { rol: u.rol || '', nombre: u.nombre || '', puesto: u.puesto || '', fechaIngreso: u.fechaIngreso || null, panelesExtra: u.panelesExtra || '' };
    })
    .catch(() => PERFIL_VACIO);
}

export function esGerente(email) {
  return obtenerRol(email).then((rol) => rol === 'Gerencia');
}

export function esGerenteOAdministracion(email) {
  return obtenerRol(email).then((rol) => {
    const r = normalizarRol(rol);
    return r === 'gerencia' || r === 'administracion';
  });
}
