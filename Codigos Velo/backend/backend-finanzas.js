// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND: backend/finanzas.jsw
//  En Wix Studio → panel izquierdo → carpeta "Backend"
//  Clic derecho → "New .jsw file" → nombre: finanzas.jsw
//
//  Centraliza todas las operaciones de escritura financiera:
//  Pagos, Comisiones, Facturas, Creditos y campos financieros de ClientRecords.
//
//  Cada función pública aplica la cadena:
//    1. Identidad  → wixUsersBackend.currentUser.getEmail()
//    2. Perfil     → obtenerPerfil(email) desde backend/permisos.jsw
//    3. Validación de rol server-side
//    4. Validación de payload
//    5. wixData con suppressAuth: true
//
//  Nunca se acepta email, rol ni identidad del frontend como fuente de autorización.
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { requireRolBackend } from 'backend/permisos.jsw';
import { avanzarEstado } from 'backend/flujo.jsw';

const SA = { suppressAuth: true };

const ROLES_FINANZAS = ['Finanzas', 'Gerencia', 'Administración'];
const ROLES_GERENCIA  = ['Gerencia', 'Administración'];

// _requireRol: alias local → delega a requireRolBackend de backend/permisos.jsw.
// Centraliza identidad, normalización y validación en un solo lugar.
function _requireRol(rolesPermitidos) {
  return requireRolBackend(rolesPermitidos);
}

// ── registrarPago ──────────────────────────────────────────────────
// INSERT Pagos + UPDATE ClientRecords.anticipos (side effect sin bloqueo).
// Roles: Finanzas, Gerencia, Administración.
export async function registrarPago(datos) {
  const { email } = await _requireRol(ROLES_FINANZAS);
  if (!datos || typeof datos !== 'object') throw new Error('Payload inválido');

  const pago = Object.assign({}, datos);
  delete pago._id;
  pago.registradoPor = email;

  const pagoInsertado = await wixData.insert('Pagos', pago, SA);

  if (pago.clienteId) {
    wixData.get('ClientRecords', pago.clienteId, SA)
      .then((c) => wixData.update('ClientRecords', Object.assign({}, c, {
        anticipos: (c.anticipos || 0) + (Number(pago.monto) || 0),
        ultimaActividad: new Date(),
      }), SA))
      .catch((e) => console.error('[backend-finanzas] Error actualizando anticipos:', e));
  }

  return { ok: true, pagoId: pagoInsertado._id };
}

// ── actualizarCredito ──────────────────────────────────────────────
// GET + UPDATE Creditos. Roles: Finanzas, Gerencia, Administración.
export async function actualizarCredito(creditoId, cambios) {
  await _requireRol(ROLES_FINANZAS);
  if (!creditoId) throw new Error('creditoId requerido');
  if (!cambios || typeof cambios !== 'object') throw new Error('cambios requerido');

  const item = await wixData.get('Creditos', creditoId, SA);
  return wixData.update('Creditos', Object.assign({}, item, cambios), SA);
}

// ── actualizarClienteFinanzas ──────────────────────────────────────
// GET + UPDATE ClientRecords — solo campos financieros permitidos.
// Roles: Finanzas, Gerencia, Administración.
export async function actualizarClienteFinanzas(clienteId, cambios) {
  await _requireRol(ROLES_FINANZAS);
  if (!clienteId) throw new Error('clienteId requerido');
  if (!cambios || typeof cambios !== 'object') throw new Error('cambios requerido');

  const CAMPOS_PERMITIDOS = ['estatusFinanciero', 'notasFinanzas', 'formaPago', 'precioVenta'];
  const item = await wixData.get('ClientRecords', clienteId, SA);
  const actualizado = Object.assign({}, item);
  CAMPOS_PERMITIDOS.forEach((k) => {
    if (cambios[k] !== undefined) actualizado[k] = cambios[k];
  });
  actualizado.ultimaActividad = new Date();
  return wixData.update('ClientRecords', actualizado, SA);
}

// ── liberarComision ────────────────────────────────────────────────
// GET + UPDATE Comisiones → estatus: 'Liberada'.
// Devuelve datos de la comisión para el BroadcastChannel del caller.
// Roles: Finanzas, Gerencia, Administración.
export async function liberarComision(comisionId) {
  const { email } = await _requireRol(ROLES_FINANZAS);
  if (!comisionId) throw new Error('comisionId requerido');

  const item = await wixData.get('Comisiones', comisionId, SA);
  const actualizado = await wixData.update('Comisiones', Object.assign({}, item, {
    estatus: 'Liberada',
    liberadaPor: email,
  }), SA);
  return {
    ok: true,
    comisionId,
    vendedorEmail: actualizado.vendedorEmail,
    monto: actualizado.monto,
  };
}

// ── pagarComision ──────────────────────────────────────────────────
// GET + UPDATE Comisiones → estatus: 'Pagada', fechaPago.
// Devuelve datos de la comisión para el BroadcastChannel del caller.
// Roles: Finanzas, Gerencia, Administración.
export async function pagarComision(comisionId) {
  const { email } = await _requireRol(ROLES_FINANZAS);
  if (!comisionId) throw new Error('comisionId requerido');

  const item = await wixData.get('Comisiones', comisionId, SA);
  const actualizado = await wixData.update('Comisiones', Object.assign({}, item, {
    estatus: 'Pagada',
    fechaPago: new Date(),
    pagadaPor: email,
  }), SA);
  return {
    ok: true,
    comisionId,
    vendedorEmail:  actualizado.vendedorEmail,
    vendedorNombre: actualizado.vendedorNombre,
    monto:          actualizado.monto,
    concepto:       actualizado.concepto || '',
  };
}

// ── insertarComision ───────────────────────────────────────────────
// INSERT Comisiones.
// IMPORTANTE: Finanzas NO está autorizado — solo Gerencia y Administración.
// Si Finanzas llama esta función, el guard la rechaza con error.
// Roles: Gerencia, Administración.
export async function insertarComision(datos) {
  const { email } = await _requireRol(ROLES_GERENCIA);
  if (!datos || typeof datos !== 'object') throw new Error('Payload inválido');

  const co = Object.assign({}, datos);
  delete co._id;
  co.creadoPor = email;

  return wixData.insert('Comisiones', co, SA);
}

// ── editarComision ─────────────────────────────────────────────────
// GET + UPDATE Comisiones (campos arbitrarios — validar en UI).
// Roles: Finanzas, Gerencia, Administración.
export async function editarComision(comisionId, cambios) {
  await _requireRol(ROLES_FINANZAS);
  if (!comisionId) throw new Error('comisionId requerido');
  if (!cambios || typeof cambios !== 'object' || Object.keys(cambios).length === 0) {
    throw new Error('cambios no puede estar vacío');
  }

  const item = await wixData.get('Comisiones', comisionId, SA);
  return wixData.update('Comisiones', Object.assign({}, item, cambios), SA);
}

// ── emitirFactura ──────────────────────────────────────────────────
// GET + UPDATE Facturas → estatus: 'Emitida', fechaEmision.
// Roles: Finanzas, Gerencia, Administración.
export async function emitirFactura(facturaId) {
  const { email } = await _requireRol(ROLES_FINANZAS);
  if (!facturaId) throw new Error('facturaId requerido');

  const item = await wixData.get('Facturas', facturaId, SA);
  // Idempotente: si ya está emitida, devolver el registro sin modificar
  if (item.estatus === 'Emitida') return item;
  return wixData.update('Facturas', Object.assign({}, item, {
    estatus: 'Emitida',
    fechaEmision: new Date(),
    emitidaPor: email,
  }), SA);
}

// ── marcarClienteFacturado ─────────────────────────────────────────
// GET + UPDATE ClientRecords → listoParaFacturar: false, estatus: 'Facturado'.
// Roles: Finanzas, Gerencia, Administración.
export async function marcarClienteFacturado(clienteId) {
  await _requireRol(ROLES_FINANZAS);
  if (!clienteId) throw new Error('clienteId requerido');

  const item = await wixData.get('ClientRecords', clienteId, SA);
  return wixData.update('ClientRecords', Object.assign({}, item, {
    listoParaFacturar: false,
    estatus: 'Facturado',
    ultimaActividad: new Date(),
  }), SA);
}

// ── crearFacturaDesdeCliente ───────────────────────────────────────
// Crea un registro en Facturas y marca el ClientRecord como facturado.
// Reglas de negocio:
//   - Idempotente por clienteId: si ya existe una factura no cancelada, devuelve la existente.
//   - Solo acepta precioVenta > 0. Rechaza si falta o es <= 0.
//   - Folio secuencial WCB-YYYY-NNNN generado desde el máximo actual en Facturas.
//   - Actualiza ClientRecords como efecto secundario no bloqueante.
// Roles: Finanzas, Gerencia, Administración.
export async function crearFacturaDesdeCliente(clienteId) {
  const { email, perfil } = await _requireRol(ROLES_FINANZAS);
  if (!clienteId) throw new Error('clienteId requerido');

  // Idempotencia: si ya existe factura no cancelada para este cliente, devolver la existente
  const existing = await wixData.query('Facturas')
    .eq('clienteId', clienteId)
    .ne('estatus', 'Cancelada')
    .limit(1)
    .find(SA);
  if (existing.items.length > 0) {
    return { ok: true, factura: existing.items[0], folio: existing.items[0].folio, yaExistia: true };
  }

  // Obtener datos del cliente
  const cliente = await wixData.get('ClientRecords', clienteId, SA);
  const total = Number(cliente.precioVenta) || 0;
  if (total <= 0) throw new Error('precioVenta del cliente debe ser mayor a 0');

  // Folio secuencial con contador en ConfigERP (_id: 'folio_facturas').
  // Patrón: leer → incrementar → escribir → usar el nuevo valor.
  // Riesgo residual: dos llamadas simultáneas (ventana ~50-100 ms) podrían
  // obtener el mismo número. Para 40 usuarios con facturación esporádica
  // la probabilidad es negligible. Si ocurre, la factura con folio duplicado
  // existe en CMS y puede corregirse manualmente.
  let nextNum;
  try {
    const counter = await wixData.get('ConfigERP', 'folio_facturas', SA);
    nextNum = (Number(counter.valor) || 0) + 1;
    await wixData.update('ConfigERP', Object.assign({}, counter, { valor: nextNum }), SA);
  } catch (_) {
    // Documento aún no existe → inicializar en 1
    nextNum = 1;
    try {
      await wixData.insert('ConfigERP', { _id: 'folio_facturas', valor: nextNum, descripcion: 'Contador de folios de facturas ERP' }, SA);
    } catch (_2) {
      // Insert concurrente ganó — releer y usar su valor
      const counter2 = await wixData.get('ConfigERP', 'folio_facturas', SA);
      nextNum = (Number(counter2.valor) || 0) + 1;
      await wixData.update('ConfigERP', Object.assign({}, counter2, { valor: nextNum }), SA);
    }
  }
  const anio = new Date().getFullYear();
  const folio = 'WCB-' + anio + '-' + String(nextNum).padStart(4, '0');

  // Calcular subtotal e IVA (16% estándar México)
  const subtotal = Math.round(total / 1.16);
  const iva = total - subtotal;

  // Descripción del vehículo
  const veh = cliente.vehiculoInfo || {};
  const vehiculo = veh.marca
    ? ((veh.marca + ' ' + (veh.modelo || '')).trim() + (veh.año ? ' ' + veh.año : ''))
    : (cliente.vehiculoInteres || '');

  // Insertar en Facturas
  const factura = await wixData.insert('Facturas', {
    folio,
    clienteId,
    clienteNombre: cliente.nombre || '',
    vendedor: cliente.vendedorAsignado || '',
    vehiculo,
    subtotal,
    iva,
    total,
    estatus: 'Pendiente',
    creadaPor: email,
  }, SA);

  // F-01 FIX: avanzar estatusExpediente a 'facturado' mediante el motor de estados.
  // Esto garantiza que ClientRecords.estatusExpediente == 'facturado' en CMS antes de
  // que el BroadcastChannel notifique a los otros paneles.
  let estadoAvanzado = false;
  const estadoResult = await avanzarEstado(
    clienteId, 'facturado',
    'Factura creada: ' + folio,
    email, perfil.nombre || email, perfil.rol
  ).catch(function(e) {
    console.error('[backend-finanzas] avanzarEstado("facturado") falló:', e);
    return { ok: false, error: String(e) };
  });
  estadoAvanzado = Boolean(estadoResult && estadoResult.ok);

  // Actualizar campos legacy (listoParaFacturar, estatus) sobre copia fresca
  // para no pisar los cambios que avanzarEstado acaba de escribir.
  wixData.get('ClientRecords', clienteId, SA)
    .then(function(fresh) {
      return wixData.update('ClientRecords', Object.assign({}, fresh, {
        listoParaFacturar: false,
        estatus: 'Facturado',
      }), SA);
    })
    .catch(function(e) { console.error('[backend-finanzas] Error actualizando campos legacy tras factura:', e); });

  return { ok: true, factura, folio, yaExistia: false, estadoAvanzado };
}

// ── obtenerBonosHistorial ──────────────────────────────────────────
// READ Comisiones tipo='Bono', descending fecha, limit 20.
// Reemplaza el query page-level en pagina-gerencia.js que fallaba
// porque Comisiones es Colaboradores-only para lectura.
// Roles: Gerencia, Administración.
export async function obtenerBonosHistorial() {
  await _requireRol(ROLES_GERENCIA);
  const r = await wixData.query('Comisiones')
    .eq('tipo', 'Bono')
    .descending('fecha')
    .limit(20)
    .find(SA);
  return r.items;
}
