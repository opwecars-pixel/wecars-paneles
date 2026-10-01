// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND: backend/datos.jsw
//  En Wix Studio → panel izquierdo → carpeta "Backend"
//  Clic derecho → "New .jsw file" → nombre: datos.jsw
//  Pega SOLO este bloque. Sirve para los 3 paneles (Gerencia, Vendedores, Finanzas).
//
//  Por qué existe este archivo:
//  Los queries de wixData en código de PÁGINA corren con los permisos del
//  usuario actual. Si alguna colección tiene permisos restrictivos (solo Admin),
//  el query falla silenciosamente y devuelve vacío. Los archivos .jsw de Backend
//  sí pueden usar { suppressAuth: true } para leer cualquier colección
//  independientemente de sus permisos, lo que hace que los dashboards siempre
//  muestren datos reales.
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsersBackend from 'wix-users-backend';
import { requireRolBackend } from 'backend/permisos.jsw';

const SA = { suppressAuth: true };

const _ROLES_FINANZAS = ['Finanzas', 'Gerencia', 'Administración'];

function safeQuery(collection, buildFn) {
  return buildFn(wixData.query(collection)).find(SA).catch((err) => {
    console.error('[safeQuery] Error en colección "' + collection + '":', err && err.message ? err.message : String(err));
    return { items: [] };
  });
}

export function fetchDatosGerencia() {
  return Promise.all([
    safeQuery('ClientRecords',   q => q.descending('_createdDate').limit(500)),
    safeQuery('Activities',      q => q.descending('fecha').limit(900)),
    safeQuery('Cars',            q => q.descending('_createdDate').limit(200)),
    safeQuery('Facturas',        q => q.descending('_createdDate').limit(300)),
    safeQuery('Ventas',          q => q.descending('_createdDate').limit(500)),
    safeQuery('Usuarios',        q => q.limit(100)),
    safeQuery('citas',           q => q.descending('_createdDate').limit(300)),
    safeQuery('Creditos',        q => q.descending('_createdDate').limit(500)),
    safeQuery('Publicaciones',   q => q.eq('estado', 'publicada').limit(500)),
  ]).then(([clientesR, actR, carsR, facturasR, ventasR, empleadosR, citasR, creditosR, pubsR]) => ({
    clientes:                    clientesR.items,
    oportunidades:               [], // Opportunities vacía — pipeline calculado desde ClientRecords
    actividades:                 actR.items,
    mensajesEquipo:              actR.items.filter(a => a.tipo === 'mensaje-gerencia'),
    inventario:                  carsR.items,
    facturas:                    facturasR.items,
    ventas:                      ventasR.items,
    empleados:                   empleadosR.items,
    citas:                       citasR.items,
    creditos:                    creditosR.items,
    publicacionesActivasCarroIds: pubsR.items.map(p => p.carroId).filter(Boolean),
  }));
}

export function fetchDatosVendedor(emailIgnorado) {
  // NOTA: wixUsersBackend.currentUser.getEmail() se cuelga en editor Wix si se usa con async/await.
  // Usar promise chain para que el fallo sea rápido (404) en lugar de timeout de 59s.
  return wixUsersBackend.currentUser.getEmail()
    .then(function(emailAutenticado) {
      if (!emailAutenticado) return Promise.reject(new Error('sin-sesion'));
      return Promise.all([
        wixData.query('ClientRecords').eq('vendedorAsignado', emailAutenticado).descending('ultimaActividad').limit(200).find(SA).catch(function(){ return { items: [] }; }),
        wixData.query('Opportunities').eq('vendedorEmail', emailAutenticado).descending('fechaCreacion').limit(200).find(SA).catch(function(){ return { items: [] }; }),
        wixData.query('Activities').descending('fecha').limit(300).find(SA).catch(function(){ return { items: [] }; }),
        wixData.query('Usuarios').limit(100).find(SA).catch(function(){ return { items: [] }; }),
        wixData.query('Creditos').eq('vendedorEmail', emailAutenticado).descending('_createdDate').limit(100).find(SA).catch(function(){ return { items: [] }; }),
      ]).then(function(results) {
        return {
          clientes:      results[0].items,
          oportunidades: results[1].items,
          actividades:   results[2].items,
          usuarios:      results[3].items,
          citas:         [],
          creditos:      results[4].items,
        };
      });
    })
    .catch(function(err) {
      var msg = err && err.message ? err.message : String(err);
      if (msg !== 'sin-sesion' && msg.indexOf('404') === -1) {
        console.error('[fetchDatosVendedor] Error:', msg);
      }
      return { clientes: [], oportunidades: [], actividades: [], usuarios: [], citas: [], creditos: [] };
    });
}

export function fetchInventarioCars() {
  return safeQuery('Cars', q => q.limit(500)).then(r => r.items);
}

export function fetchDatosAdmin() {
  return Promise.all([
    safeQuery('Usuarios',         q => q.limit(100)),
    safeQuery('Cars',             q => q.limit(300)),
    safeQuery('Consignas',        q => q.descending('_createdDate').limit(100)),
    safeQuery('SolicitudesCompra',q => q.descending('_createdDate').limit(100)),
    safeQuery('ClientRecords',    q => q.descending('_createdDate').limit(500)),
    safeQuery('Ventas',           q => q.descending('_createdDate').limit(500)),
    safeQuery('Comisiones',       q => q.descending('_createdDate').limit(200)),
    safeQuery('Facturas',         q => q.descending('_createdDate').limit(300)),
    safeQuery('Tasks',            q => q.descending('_createdDate').limit(200)),
    safeQuery('Creditos',         q => q.descending('_createdDate').limit(300)),
  ]).then(([empleadosR, carsR, consignasR, solicitudesR, clientesR, ventasR, comisionesR, facturasR, tareasR, creditosR]) => ({
    empleados:   empleadosR.items,
    inventario:  carsR.items,
    consignas:   consignasR.items,
    solicitudes: solicitudesR.items,
    clientes:    clientesR.items,
    ventas:      ventasR.items,
    comisiones:  comisionesR.items,
    facturas:    facturasR.items,
    tareas:      tareasR.items,
    creditos:    creditosR.items,
  }));
}

// ── Funciones públicas: Cars y Consignas (SA obligatorio para visitantes anónimos) ─

export function getCarById(carId) {
  return wixData.get('Cars', carId, SA);
}

export function insertarConsigna(datos) {
  return wixData.insert('Consignas', Object.assign({ estatusConsigna: 'nueva' }, datos), SA);
}

// ── Funciones de escritura para Usuarios (SA obligatorio en backend) ─────────

export function consultarUsuarios() {
  return wixData.query('Usuarios').limit(100).find(SA).catch(() => ({ items: [] }));
}

export function insertarUsuario(emp) {
  return wixData.insert('Usuarios', emp, SA);
}

export function actualizarUsuario(empleadoId, cambios) {
  return wixData.get('Usuarios', empleadoId, SA)
    .then((item) => wixData.update('Usuarios', Object.assign({}, item, cambios), SA));
}

export function actualizarPerfilUsuario(emailActual, nombre, puesto) {
  return wixData.query('Usuarios').eq('email', emailActual).limit(1).find(SA)
    .then((r) => {
      if (!r.items.length) throw new Error('Usuario no encontrado');
      const item = r.items[0];
      return wixData.update('Usuarios', Object.assign({}, item, { nombre, puesto }), SA);
    });
}

export async function fetchDatosFinanzas() {
  await requireRolBackend(_ROLES_FINANZAS);
  return Promise.all([
    safeQuery('ClientRecords', q => q.ascending('nombre').limit(500)),
    safeQuery('Creditos',      q => q.descending('_createdDate').limit(200)),
    safeQuery('Pagos',         q => q.descending('_createdDate').limit(500)),
    safeQuery('Comisiones',    q => q.descending('_createdDate').limit(200)),
    safeQuery('Facturas',      q => q.limit(500)),
    safeQuery('Apartados',     q => q.descending('fechaApartado').limit(200)),
  ]).then(([clientesR, creditosR, pagosR, comisionesR, facturasR, apartadosR]) => ({
    clientes:   clientesR.items,
    creditos:   creditosR.items,
    pagos:      pagosR.items,
    comisiones: comisionesR.items,
    facturas:   facturasR.items,
    apartados:  apartadosR.items,
  }));
}
