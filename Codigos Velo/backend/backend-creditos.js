// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/creditos.jsw
//  En Wix Editor → columna izquierda → carpeta "Backend"
//  Clic derecho → "New File" → nombre exacto: creditos.jsw
//
//  Este archivo es la FUENTE ÚNICA DE VERDAD para el módulo de créditos.
//  Todos los paneles (Vendedor, Admin, Finanzas, Gerencia) y la página
//  pública de créditos pasan por aquí.
//
//  CAMPOS A AGREGAR en la colección "Creditos" del CMS:
//    clienteId          (Texto)
//    leadId             (Texto)
//    autoId             (Texto)
//    vehiculoInteres    (Texto)
//    monto              (Número)
//    enganche           (Número)
//    plazoMeses         (Número)
//    banco              (Texto)
//    financiera         (Texto)
//    estatus            (Texto) — state machine de creditos.jsw
//    subEstatus         (Texto)
//    vendedorEmail      (Texto)
//    vendedorNombre     (Texto)
//    adminAprobador     (Texto)
//    finanzasAprobador  (Texto)
//    fechaAprobacion    (Fecha y hora)
//    condicionesAprobacion (Texto largo)
//    motivoRechazo      (Texto largo)
//    folioInterno       (Texto)
//    origen             (Texto) — 'web' | 'vendedor' | 'admin'
//    notasAdmin         (Texto largo)
//    notasFinanzas      (Texto largo)
//    documentosRequeridos (Texto largo) — lista separada por |
//
//  CAMPO A AGREGAR en "ClientRecords":
//    creditoActivoId    (Texto) — referencia al crédito activo del cliente
//
//  CAMPO A AGREGAR en "Documents":
//    creditoId          (Texto) — referencia al crédito al que pertenece
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { registrarActividad } from 'backend/actividades.jsw';
import { crearLead } from 'backend/leads.jsw';
import { findOrCreateCliente } from 'backend/clientes.jsw';

const SA = { suppressAuth: true };

// ── State machine ────────────────────────────────────────────────────
export const ESTADOS_CREDITO = {
  solicitud_enviada: {
    label: 'Solicitud enviada',
    color: '#2a78d6', bg: '#dbeafe',
    dept: 'Vendedor',
    siguientes: ['documentos_pendientes', 'cancelado'],
    rolesPermitidos: ['Vendedor', 'Administración', 'Gerencia'],
  },
  documentos_pendientes: {
    label: 'Documentos pendientes',
    color: '#d97706', bg: '#fef3c7',
    dept: 'Vendedor',
    siguientes: ['documentos_en_revision', 'cancelado'],
    rolesPermitidos: ['Vendedor', 'Administración', 'Gerencia'],
    nota: 'El cliente debe subir los documentos requeridos',
  },
  documentos_en_revision: {
    label: 'Documentos en revisión',
    color: '#7c3aed', bg: '#f3e8ff',
    dept: 'Administración',
    siguientes: ['documentos_pendientes', 'expediente_completo', 'cancelado'],
    rolesPermitidos: ['Administración', 'Gerencia'],
    nota: 'Administración revisa el paquete documental',
  },
  expediente_completo: {
    label: 'Expediente completo',
    color: '#0284c7', bg: '#e0f2fe',
    dept: 'Administración',
    siguientes: ['en_analisis_financiero', 'documentos_pendientes', 'cancelado'],
    rolesPermitidos: ['Administración', 'Gerencia'],
    nota: 'Documentación validada — listo para Finanzas',
  },
  en_analisis_financiero: {
    label: 'En análisis financiero',
    color: '#9333ea', bg: '#faf5ff',
    dept: 'Finanzas',
    siguientes: ['aprobado', 'rechazado', 'documentos_pendientes', 'cancelado'],
    rolesPermitidos: ['Finanzas', 'Gerencia'],
    nota: 'Finanzas analiza la solicitud',
  },
  aprobado: {
    label: 'Aprobado',
    color: '#16a34a', bg: '#dcfce7',
    dept: 'Finanzas',
    siguientes: ['asignado_a_vendedor', 'cancelado'],
    rolesPermitidos: ['Finanzas', 'Gerencia'],
    esAprobacion: true,
  },
  rechazado: {
    label: 'Rechazado',
    color: '#dc2626', bg: '#fee2e2',
    dept: 'Finanzas',
    siguientes: [],
    rolesPermitidos: ['Finanzas', 'Gerencia'],
    esTerminal: true,
  },
  asignado_a_vendedor: {
    label: 'Asignado a vendedor',
    color: '#0891b2', bg: '#cffafe',
    dept: 'Vendedor',
    siguientes: ['cerrado', 'cancelado'],
    rolesPermitidos: ['Administración', 'Gerencia'],
  },
  cerrado: {
    label: 'Cerrado — Venta realizada',
    color: '#15803d', bg: '#bbf7d0',
    dept: 'Gerencia',
    siguientes: [],
    rolesPermitidos: ['Gerencia'],
    esTerminal: true,
  },
  cancelado: {
    label: 'Cancelado',
    color: '#6b7280', bg: '#f3f4f6',
    dept: 'Gerencia',
    siguientes: [],
    rolesPermitidos: ['Administración', 'Finanzas', 'Gerencia'],
    esTerminal: true,
  },
};

export function obtenerEstadosCredito() {
  return Promise.resolve(ESTADOS_CREDITO);
}

// ── Generar folio interno ─────────────────────────────────────────────
function generarFolio(id) {
  const anio = new Date().getFullYear();
  const suffix = String(id || '').slice(-6).toUpperCase();
  return `WC-${anio}-${suffix}`;
}

// ── Crear crédito (única entrada al módulo) ───────────────────────────
export function crearCredito(datos, userEmail, rol) {
  const {
    clienteId, leadId, autoId, vehiculoInteres,
    monto, enganche, plazoMeses, banco, financiera,
    vendedorEmail, vendedorNombre, origen,
    nombre, celular, correo, clienteNombre,
    rfc, curp, ingreso, empresa, tipoEmpleo,
    tasa, montoAprobado, producto, vehiculoData,
    documentosRequeridos,
  } = datos || {};

  if (!clienteId) return Promise.reject(new Error('clienteId requerido'));

  // Verificar si ya existe un crédito activo para este cliente (anti-duplicado)
  return wixData.query('Creditos')
    .eq('clienteId', clienteId)
    .ne('estatus', 'cancelado')
    .ne('estatus', 'rechazado')
    .ne('estatus', 'cerrado')
    .find(SA)
    .then((existing) => {
      if (existing.items.length > 0) {
        // Ya existe — devolver el existente en lugar de duplicar
        return { ok: true, credito: existing.items[0], yaExistia: true };
      }

      const nuevo = {
        clienteId:    clienteId || '',
        leadId:       leadId    || '',
        autoId:       autoId    || '',
        vehiculoInteres: vehiculoInteres || '',
        monto:        Number(monto)    || 0,
        enganche:     Number(enganche) || 0,
        plazoMeses:   Number(plazoMeses) || 0,
        banco:        banco    || '',
        financiera:   financiera || '',
        estatus:      'solicitud_enviada',
        subEstatus:   '',
        vendedorEmail: vendedorEmail || userEmail || '',
        vendedorNombre: vendedorNombre || '',
        adminAprobador: '',
        finanzasAprobador: '',
        fechaAprobacion: null,
        condicionesAprobacion: '',
        motivoRechazo: '',
        folioInterno: '',
        clienteNombre: clienteNombre || nombre || '',
        tasa: Number(tasa) || 0,
        montoAprobado: Number(montoAprobado) || 0,
        producto: producto || '',
        vehiculoData: vehiculoData || '',
        origen: origen || 'vendedor',
        notasAdmin: '',
        notasFinanzas: '',
        documentosRequeridos: documentosRequeridos ||
          'INE frente|INE reverso|Comprobante de domicilio|Comprobante de ingresos|CURP|RFC',
        // Datos del solicitante (de la solicitud web)
        solicitanteNombre: nombre || '',
        solicitanteCelular: celular || '',
        solicitanteCorreo: correo || '',
        rfc: rfc || '',
        curp: curp || '',
        ingreso: Number(ingreso) || 0,
        empresa: empresa || tipoEmpleo || '',
        fecha: new Date(),
      };

      return wixData.insert('Creditos', nuevo, SA)
        .then((insertado) => {
          const folio = generarFolio(insertado._id);
          // Actualizar el folio y el clienteRecord
          const ops = [
            wixData.update('Creditos', Object.assign({}, insertado, { folioInterno: folio }), SA),
            wixData.get('ClientRecords', clienteId, SA)
              .then((c) => wixData.update('ClientRecords', Object.assign({}, c, { creditoActivoId: insertado._id }), SA))
              .catch(() => {}),
          ];
          return Promise.all(ops).then(([actualizado]) => {
            const creditoFinal = Object.assign({}, actualizado || insertado, { folioInterno: folio });
            registrarActividadCredito('credito_iniciado', creditoFinal, userEmail, rol,
              `Crédito iniciado desde ${origen || 'panel'}`).catch(() => {});
            return { ok: true, credito: creditoFinal, yaExistia: false };
          });
        });
    })
    .catch((err) => ({ ok: false, error: String(err) }));
}

// ── Avanzar estado del crédito ────────────────────────────────────────
export function avanzarEstadoCredito(creditoId, nuevoEstado, datos, userEmail, rol) {
  const info = ESTADOS_CREDITO[nuevoEstado];
  if (!info) return Promise.resolve({ ok: false, error: 'Estado inválido: ' + nuevoEstado });

  return wixData.get('Creditos', creditoId, SA)
    .then((credito) => {
      const estadoAnterior = credito.estatus || 'solicitud_enviada';
      const infoAnterior = ESTADOS_CREDITO[estadoAnterior] || {};
      const rolN = _normRol(rol);

      // Validar permisos
      const rolesOk = (info.rolesPermitidos || []).map(_normRol);
      if (rolN !== 'gerencia' && !rolesOk.includes(rolN)) {
        return { ok: false, error: 'Sin permisos para este estado' };
      }

      // Validar transición
      const transValidas = infoAnterior.siguientes || [];
      if (rolN !== 'gerencia' && !transValidas.includes(nuevoEstado)) {
        return { ok: false, error: 'Transición no válida: ' + estadoAnterior + ' → ' + nuevoEstado };
      }

      const cambios = {
        estatus: nuevoEstado,
        subEstatus: datos.subEstatus || '',
        ultimaActualizacion: new Date(),
      };

      if (nuevoEstado === 'documentos_pendientes' && datos.documentosRequeridos) {
        cambios.documentosRequeridos = datos.documentosRequeridos;
        cambios.notasAdmin = datos.notas || credito.notasAdmin || '';
      }
      if (nuevoEstado === 'documentos_en_revision') {
        cambios.adminAprobador = userEmail;
      }
      if (nuevoEstado === 'expediente_completo') {
        cambios.adminAprobador = userEmail;
        cambios.notasAdmin = datos.notas || credito.notasAdmin || '';
      }
      if (nuevoEstado === 'aprobado') {
        cambios.finanzasAprobador = userEmail;
        cambios.fechaAprobacion = new Date();
        cambios.condicionesAprobacion = datos.condiciones || datos.notas || '';
        cambios.banco = datos.banco || credito.banco || '';
        cambios.monto = Number(datos.monto || credito.monto) || 0;
        cambios.enganche = Number(datos.enganche || credito.enganche) || 0;
        cambios.plazoMeses = Number(datos.plazoMeses || credito.plazoMeses) || 0;
      }
      if (nuevoEstado === 'rechazado') {
        cambios.finanzasAprobador = userEmail;
        cambios.motivoRechazo = datos.motivoRechazo || datos.notas || '';
      }
      if (nuevoEstado === 'asignado_a_vendedor') {
        cambios.vendedorEmail = datos.vendedorEmail || credito.vendedorEmail || '';
        cambios.vendedorNombre = datos.vendedorNombre || credito.vendedorNombre || '';
      }
      if (nuevoEstado === 'cancelado') {
        cambios.motivoRechazo = datos.motivo || datos.notas || '';
      }

      return wixData.update('Creditos', Object.assign({}, credito, cambios), SA)
        .then((actualizado) => {
          const nota = datos.notas || datos.motivo || datos.condiciones || datos.motivoRechazo || '';
          registrarActividadCredito('estado_credito', actualizado, userEmail, rol,
            `${infoAnterior.label || estadoAnterior} → ${info.label}` + (nota ? ': ' + nota : '')).catch(() => {});

          return { ok: true, credito: actualizado, estadoAnterior, estadoNuevo: nuevoEstado };
        });
    })
    .catch((err) => ({ ok: false, error: String(err) }));
}

// ── Fetch créditos según rol ──────────────────────────────────────────
export function fetchCreditosPorRol(userEmail, rol) {
  const rolN = _normRol(rol);
  let query = wixData.query('Creditos').descending('_createdDate').limit(300);

  // Vendedor solo ve sus propios créditos
  if (rolN === 'vendedor') {
    query = query.eq('vendedorEmail', userEmail);
  }
  // Admin ve los que están en su área
  else if (rolN === 'administración' || rolN === 'administracion') {
    // Admin ve todos excepto los muy tempranos que aún no llegaron a su etapa
    // En la práctica ve todos para poder recibir expedientes
  }
  // Finanzas, Gerencia → ven todos

  return query.find(SA)
    .then((r) => r.items)
    .catch(() => []);
}

export function fetchCreditoById(creditoId) {
  return wixData.get('Creditos', creditoId, SA).catch(() => null);
}

// ── Crear solicitud de crédito desde página pública (ruta segura) ─────
/**
 * Orquesta el flujo completo de una solicitud de crédito desde el sitio público:
 *   1. Insert CreditApplications (suppressAuth)
 *   2. Insert ALeads lead (crearLead — suppressAuth)
 *   3. findOrCreateCliente
 *   4. Vincular ALeads → clienteId (suppressAuth)
 *   5. crearCredito en la state machine
 *   6. Update CreditApplications con clienteId, creditoId, estatus, errorDetalle
 *
 * Úsalo desde páginas públicas para eliminar la necesidad de abrir
 * CreditApplications.Create/Update y ALeads.Update a visitantes.
 */
export async function crearSolicitudCredito(datos) {
  const d = datos || {};
  const nombre   = d.nombre   || '';
  const celular  = d.celular  || '';
  const correo   = d.correo   || '';
  const origen   = d.origen   || 'Sitio web';
  const vehiculo = d.vehiculo || '';

  // 1. Insert CreditApplications
  const creditoInserted = await wixData.insert('CreditApplications', {
    vehiculo,
    precioVehiculo: d.precioVehiculo  || 0,
    nombre, celular, correo,
    rfc:            d.rfc             || '',
    curp:           d.curp            || '',
    fechaNac:       d.fechaNac        || '',
    edad:           d.edad            || 0,
    sexo:           d.sexo            || '',
    estadoCivil:    d.estadoCivil     || '',
    dependientes:   d.dependientes    || '',
    calle:          d.calle           || '',
    numExt:         d.numExt          || '',
    cp:             d.cp              || '',
    colonia:        d.colonia         || '',
    ciudad:         d.ciudad          || '',
    estado:         d.estado          || '',
    tipoVivienda:   d.tipoVivienda    || '',
    tipoEmpleo:     d.tipoEmpleo      || '',
    empresa:        d.empresa         || '',
    puesto:         d.puesto          || '',
    antiguedad:     d.antiguedad      || 0,
    ingreso:        d.ingreso         || 0,
    otrosIngresos:  d.otrosIngresos   || 0,
    ref1Nombre:     d.ref1Nombre      || '',
    ref1Celular:    d.ref1Celular     || '',
    ref1Relacion:   d.ref1Relacion    || '',
    ref2Nombre:     d.ref2Nombre      || '',
    ref2Celular:    d.ref2Celular     || '',
    ref2Relacion:   d.ref2Relacion    || '',
    enganchePct:    d.enganchePct     || 0,
    engancheMonto:  d.engancheMonto   || 0,
    plazoMeses:     d.plazoMeses      || 0,
    financiera:     d.financiera      || '',
    proposito:      d.proposito       || '',
    fecha:          new Date(),
  }, SA);

  // 2. Crear lead en ALeads para visibilidad en panel de vendedores
  const leadInserted = await crearLead({
    tipo:     'credito',
    nombre,   telefono: celular, correo,
    interes:  'Solicitud de crédito — ' + vehiculo + (d.precioVehiculo ? ' $' + d.precioVehiculo.toLocaleString() : ''),
    resumen:  'Crédito completo — ' + vehiculo,
    origen,
    pagina:   'Detalle',
  }).catch((e) => {
    console.error('[backend-creditos] crearSolicitudCredito — crearLead falló:', e);
    return { _id: '' };
  });

  // 3. Find/create cliente
  const r = await findOrCreateCliente(nombre, celular, correo, origen).catch(() => null);
  if (!r || !r.clienteId) {
    return { ok: true, creditoApplicationId: creditoInserted._id, leadId: leadInserted._id, clienteId: null, creditoId: '' };
  }

  // 4. Vincular lead → clienteId (suppressAuth, conserva estatusLead existente)
  if (leadInserted._id) {
    wixData.get('ALeads', leadInserted._id, SA)
      .then((lead) => wixData.update('ALeads', Object.assign({}, lead, { clienteId: r.clienteId }), SA))
      .catch((e) => console.error('[backend-creditos] Error vinculando lead a cliente:', e));
  }

  // 5. Crear entrada en Creditos (state machine)
  let creditoId    = '';
  let estatus      = 'vinculada';
  let errorDetalle = '';

  try {
    const resultado = await crearCredito({
      clienteId:       r.clienteId,
      leadId:          leadInserted._id || '',
      vehiculoInteres: vehiculo,
      monto:    d.engancheMonto ? (d.precioVehiculo || 0) - (d.engancheMonto || 0) : (d.precioVehiculo || 0),
      enganche:  d.engancheMonto  || 0,
      plazoMeses: d.plazoMeses    || 0,
      financiera: d.financiera    || '',
      origen:    'web',
      nombre, celular, correo,
      rfc:       d.rfc            || '',
      curp:      d.curp           || '',
      ingreso:   d.ingreso        || 0,
      empresa:   d.empresa        || d.tipoEmpleo || '',
    }, 'sistema', 'Sistema');

    creditoId = (resultado && resultado.ok && resultado.credito && resultado.credito._id)
      ? resultado.credito._id : '';
    if (!creditoId) {
      estatus      = 'error_interno';
      errorDetalle = 'crearCredito sin ID: ' + JSON.stringify(resultado);
      console.warn('[backend-creditos] crearCredito no devolvió ID:', resultado);
    }
  } catch (err) {
    console.error('[backend-creditos] Error en crearCredito dentro de crearSolicitudCredito:', err);
    estatus      = 'error_interno';
    errorDetalle = String(err);
  }

  // 6. Actualizar CreditApplications con clienteId, creditoId, estatus y errorDetalle
  await wixData.update('CreditApplications', Object.assign({}, creditoInserted, {
    clienteId:    r.clienteId,
    creditoId,
    estatus,
    errorDetalle: estatus === 'vinculada' ? '' : errorDetalle,
  }), SA).catch((e) => console.error('[backend-creditos] Error actualizando CreditApplications:', e));

  return { ok: true, creditoApplicationId: creditoInserted._id, leadId: leadInserted._id, clienteId: r.clienteId, creditoId };
}

// ── Helpers internos ─────────────────────────────────────────────────
function _normRol(rol) {
  return String(rol || '').toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i')
    .replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n');
}

function registrarActividadCredito(tipo, credito, userEmail, rol, descripcion) {
  return registrarActividad({
    tipo,
    clienteId: credito.clienteId || '',
    entidadTipo: 'credito',
    entidadId: credito._id || '',
    vendedorEmail: credito.vendedorEmail || userEmail || '',
    vendedorNombre: credito.vendedorNombre || '',
    eventKey: tipo + ':' + (credito._id || '') + ':' + (credito.estatus || ''),
    metadata: {
      creditoId: credito._id || '',
      folioInterno: credito.folioInterno || '',
      estatus: credito.estatus || '',
      descripcion,
      ejecutorEmail: userEmail || '',
      ejecutorRol: rol || '',
    },
  });
}
