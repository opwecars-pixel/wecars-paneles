// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/flujo.jsw
//  En Wix Editor → columna izquierda → carpeta "Backend"
//  Clic derecho → "New File" → nombre exacto: flujo.jsw
//  Este archivo es el MOTOR CENTRAL de estados del expediente.
// ───────────────────────────────────────────────────────────────────
//
//  COLECCIONES NUEVAS que debes crear en el CMS de Wix ANTES de publicar:
//
//  1. "Historial"
//     Campos:
//       clienteId       (Texto)
//       clienteNombre   (Texto)
//       accion          (Texto)
//       estadoAnterior  (Texto)
//       estadoNuevo     (Texto)
//       usuario         (Texto)   ← email del usuario
//       usuarioNombre   (Texto)
//       comentario      (Texto largo)
//       timestamp       (Fecha y hora)
//     Permisos: Lectura=Solo miembro, Escritura=Solo admin (backend usa suppressAuth)
//
//  2. Agrega estos campos a "ClientRecords":
//       estatusExpediente   (Texto)
//       departamentoActual  (Texto)
//
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { registrarActividad } from 'backend/actividades.jsw';
import { desactivarPublicacionesDeAuto } from 'backend/publicaciones.jsw';

// Definición completa del flujo. Cada estado tiene:
//   label        → texto que ve el usuario
//   dept         → departamento dueño del expediente
//   color        → color del badge en la UI
//   siguientes   → transiciones válidas desde este estado
const FLUJO = {
  nuevo_lead: {
    label: 'Nuevo lead',
    dept: 'Vendedor',
    color: '#70cf05',
    siguientes: ['contactado'],
    rolesPermitidos: ['Vendedor', 'Gerencia'],
  },
  contactado: {
    label: 'Contactado',
    dept: 'Vendedor',
    color: '#2a78d6',
    siguientes: ['en_negociacion', 'nuevo_lead'],
    rolesPermitidos: ['Vendedor', 'Gerencia'],
  },
  en_negociacion: {
    label: 'En negociación',
    dept: 'Vendedor',
    color: '#9333ea',
    siguientes: ['apartado', 'contactado'],
    rolesPermitidos: ['Vendedor', 'Gerencia'],
  },
  apartado: {
    label: 'Apartado',
    dept: 'Vendedor',
    color: '#d97706',
    siguientes: ['en_revision_admin', 'en_negociacion'],
    rolesPermitidos: ['Vendedor', 'Gerencia'],
  },
  en_revision_admin: {
    label: 'En revisión — Admin',
    dept: 'Administración',
    color: '#1d4ed8',
    siguientes: ['faltan_documentos', 'en_finanzas'],
    rolesPermitidos: ['Administración', 'Gerencia'],
  },
  faltan_documentos: {
    label: 'Faltan documentos',
    dept: 'Vendedor',
    color: '#e24b4a',
    siguientes: ['en_revision_admin', 'cancelado'],
    rolesPermitidos: ['Vendedor', 'Administración', 'Gerencia'],
  },
  en_finanzas: {
    label: 'En Finanzas',
    dept: 'Finanzas',
    color: '#7c3aed',
    siguientes: ['en_tramite_credito', 'facturado', 'faltan_documentos'],
    rolesPermitidos: ['Finanzas', 'Gerencia'],
  },
  en_tramite_credito: {
    label: 'En trámite de crédito',
    dept: 'Finanzas',
    color: '#2563eb',
    siguientes: ['facturado', 'faltan_documentos', 'cancelado'],
    rolesPermitidos: ['Finanzas', 'Gerencia'],
    meta: { requiereBanco: true, requiereFechaLimite: true },
  },
  cancelado: {
    label: 'Cancelado',
    dept: 'Gerencia',
    color: '#6b7280',
    siguientes: [],
    rolesPermitidos: ['Gerencia'],
    esTerminal: true,
    esIrreversible: true,
  },
  facturado: {
    label: 'Facturado',
    dept: 'Finanzas',
    color: '#16a34a',
    siguientes: ['pago_confirmado'],
    rolesPermitidos: ['Finanzas', 'Gerencia'],
  },
  pago_confirmado: {
    label: 'Pago confirmado',
    dept: 'Administración',
    color: '#15803d',
    siguientes: ['entrega_programada'],
    rolesPermitidos: ['Administración', 'Finanzas', 'Gerencia'],
  },
  entrega_programada: {
    label: 'Entrega programada',
    dept: 'Vendedor',
    color: '#d97706',
    siguientes: ['entregado'],
    rolesPermitidos: ['Vendedor', 'Administración', 'Gerencia'],
  },
  entregado: {
    label: 'Entregado',
    dept: 'Vendedor',
    color: '#70cf05',
    siguientes: ['venta_cerrada'],
    rolesPermitidos: ['Vendedor', 'Administración', 'Gerencia'],
  },
  venta_cerrada: {
    label: 'Venta cerrada ✓',
    dept: 'Gerencia',
    color: '#0b1014',
    siguientes: [],
    rolesPermitidos: ['Gerencia'],
    esTerminal: true,
    esIrreversible: true,
  },
};

// Estados que aparecen en el timeline de actividad comercial del vendedor.
// El resto va solo al Historial (audit trail interno — no contamina el timeline).
const ESTADOS_COMERCIALES = new Set([
  'contactado',
  'en_negociacion',
  'apartado',
  'entrega_programada',
  'entregado',
  // 'venta_cerrada' ya tiene su propio tipo de actividad — no se incluye aquí
]);

// Retorna la definición completa del flujo (la usa el HTML para saber qué botones mostrar)
export function obtenerFlujo() {
  return Promise.resolve(FLUJO);
}

// Normaliza rol para comparación insensible a casing y diacríticos (E-01).
function _normRolFlujo(r) {
  return String(r || '').toLowerCase().replace(/[áéíóú]/g, function(c) {
    return { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' }[c];
  });
}

// Mueve el expediente al siguiente estado.
// Valida permisos, actualiza ClientRecords e inserta en Historial.
export function avanzarEstado(clienteId, nuevoEstado, comentario, userEmail, userName, rol) {
  const info = FLUJO[nuevoEstado];
  if (!info) return Promise.resolve({ ok: false, error: 'Estado inválido: ' + nuevoEstado });

  return wixData.get('ClientRecords', clienteId, { suppressAuth: true })
    .then((cliente) => {
      const estadoAnterior = cliente.estatusExpediente || 'nuevo_lead';
      const infoAnterior = FLUJO[estadoAnterior] || {};

      // E-02: estados irreversibles no pueden avanzarse bajo ningún rol
      if (infoAnterior.esIrreversible) {
        return { ok: false, error: 'El expediente está en un estado terminal irreversible (' + estadoAnterior + ')' };
      }

      // E-01: comparación normalizada (insensible a casing y diacríticos)
      const rolNorm = _normRolFlujo(rol);
      const rolesOk = (info.rolesPermitidos || []).map(_normRolFlujo);
      if (!rol || (!rolesOk.includes(rolNorm))) {
        return { ok: false, error: 'Sin permisos para este estado' };
      }

      // Validar que es una transición válida (Gerencia puede saltarse pasos)
      const transicionesValidas = infoAnterior.siguientes || [];
      if (rolNorm !== 'gerencia' && estadoAnterior !== nuevoEstado && !transicionesValidas.includes(nuevoEstado)) {
        return { ok: false, error: 'Transición no válida: ' + estadoAnterior + ' → ' + nuevoEstado };
      }

      const clienteActualizado = Object.assign({}, cliente, {
        estatusExpediente: nuevoEstado,
        departamentoActual: info.dept,
        ultimaActividad: new Date(),
        fechaEntradaEstado: new Date(), // E-08: registro de cuándo entró al estado actual
      });

      const responsableEmail  = cliente.vendedorAsignado || userEmail || '';
      const responsableNombre = cliente.vendedorNombre   || responsableEmail;

      const movimiento = {
        clienteId,
        clienteNombre: cliente.nombre || '',
        accion: `${infoAnterior.label || estadoAnterior} → ${info.label}`,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        departamentoActual: info.dept || '',
        responsableComercial: responsableEmail,
        responsableNombre,
        usuario: userEmail || '',
        usuarioNombre: userName || userEmail || 'Sistema',
        comentario: comentario || '',
        timestamp: new Date(),
      };

      const ops = [
        wixData.update('ClientRecords', clienteActualizado, { suppressAuth: true }),
        wixData.insert('Historial', movimiento, { suppressAuth: true }),
      ];

      // ── P0-3: APARTADO → marcar auto como Apartado en Cars ───────────
      if (nuevoEstado === 'apartado' && cliente.autoId) {
        ops.push(
          wixData.get('Cars', cliente.autoId, { suppressAuth: true })
            .then((auto) => wixData.update('Cars', Object.assign({}, auto, { estatusVenta: 'Apartado' }), { suppressAuth: true }))
            .catch(() => {})
        );
      }

      // E-09: liberar auto SOLO en retrocesos o cancelación, no en avances normales.
      // Retrocesos desde 'apartado': en_negociacion, contactado, nuevo_lead, cancelado.
      // Avances desde 'apartado': en_revision_admin → el auto sigue reservado.
      const SALIDAS_QUE_LIBERAN = new Set(['en_negociacion', 'contactado', 'nuevo_lead', 'cancelado']);
      if (estadoAnterior === 'apartado' && SALIDAS_QUE_LIBERAN.has(nuevoEstado) && cliente.autoId) {
        ops.push(
          wixData.get('Cars', cliente.autoId, { suppressAuth: true })
            .then((auto) => wixData.update('Cars', Object.assign({}, auto, { estatusVenta: 'Disponible' }), { suppressAuth: true }))
            .catch(() => {})
        );
      }

      // ── Evento: VENTA CERRADA → registrar en colección Ventas ────────
      if (nuevoEstado === 'venta_cerrada') {
        const precioVenta   = Number(cliente.precioVenta)     || 0;
        // E-07: bloquear venta_cerrada con precio 0
        if (precioVenta <= 0) {
          return { ok: false, error: 'precioVenta debe ser mayor a $0 antes de cerrar la venta. Actualiza el campo en el expediente.' };
        }
        const costoAuto     = Number(cliente.costoAdquisicion) || 0;
        const comisionPct   = Number(cliente.comisionPorcentaje) || 0;
        const utilidadBruta = precioVenta - costoAuto;
        const comisionMonto = precioVenta * (comisionPct / 100);
        const ventaRec = {
          title:            `${cliente.nombre || ''} — ${cliente.vehiculoInteres || cliente.vehiculo || ''}`,
          clienteId:        clienteId,
          clienteNombre:    cliente.nombre              || '',
          vendedorId:       cliente.vendedorAsignado    || userEmail || '',
          vendedorNombre:   userName                    || userEmail || '',
          vendedor:         userEmail                   || '',
          vehiculo:         cliente.vehiculoInteres     || cliente.vehiculo || '',
          autoId:           cliente.autoId              || '',
          auto:             cliente.vehiculoInteres     || cliente.vehiculo || '',
          precioVenta,
          costoAdquisicion: costoAuto,
          utilidadBruta,
          pctUtilidad:      precioVenta > 0 ? Math.round((utilidadBruta / precioVenta) * 100) : 0,
          comisionPorcentaje: comisionPct,
          comisionMonto,
          enganche:         Number(cliente.enganche)        || 0,
          saldoFinanciado:  Number(cliente.saldoFinanciado) || 0,
          tipoVenta:        cliente.formaPago               || 'Contado',
          plazoMeses:       Number(cliente.plazoMeses)      || 0,
          fechaVenta:       new Date(),
          fecha:            new Date(),
          estatus:          'completada',
          notasVenta:       comentario                      || '',
        };
        ops.push(wixData.insert('Ventas', ventaRec, { suppressAuth: true }));

        // P0-3: marcar auto como Vendido en Cars
        if (cliente.autoId) {
          ops.push(
            wixData.get('Cars', cliente.autoId, { suppressAuth: true })
              .then((auto) => wixData.update('Cars', Object.assign({}, auto, { estatusVenta: 'Vendido' }), { suppressAuth: true }))
              .catch(() => {})
          );

          // Archivar publicaciones activas del auto vendido.
          // No-bloqueante: un fallo aquí no debe interrumpir el cierre de venta.
          // El error queda registrado en consola del servidor (visible en Wix Logs)
          // y en Activities como incidencia para que Administración lo detecte.
          // Solo archiva estado='publicada'; el historial completo se conserva intacto.
          ops.push(
            desactivarPublicacionesDeAuto(cliente.autoId).catch((err) => {
              const msg = err && err.message ? err.message : String(err);
              console.error('[Flujo] Error archivando publicaciones de auto ' + cliente.autoId + ':', msg);
              registrarActividad({
                tipo: 'incidencia',
                clienteId,
                entidadTipo: 'auto',
                entidadId: cliente.autoId,
                vendedorEmail: userEmail || '',
                vendedorNombre: userName || userEmail || '',
                metadata: {
                  descripcion: 'Error al archivar publicaciones tras venta_cerrada',
                  autoId: cliente.autoId,
                  error: msg,
                },
              }).catch(() => {});
            })
          );
        }

        // P0-6: cerrar todas las Opportunities abiertas del cliente
        ops.push(
          wixData.query('Opportunities')
            .eq('clienteId', clienteId)
            .ne('estatus', 'Cerrada')
            .find({ suppressAuth: true })
            .then((r) => Promise.all(
              r.items.map((opp) => wixData.update('Opportunities', Object.assign({}, opp, {
                estatus: 'Cerrada',
                fechaCierre: new Date(),
                motivoCierre: 'Venta cerrada',
              }), { suppressAuth: true }))
            ))
            .catch(() => {})
        );
      }

      // ── Evento: AUTO LLEGA A INVENTARIO desde consigna ───────────────
      // (manejado por pagina-administracion.js al cerrar consigna)

      return Promise.all(ops).then(([clienteGuardado]) => {
        // venta_cerrada tiene su propio tipo de actividad — siempre se registra.
        // Los demás estados solo se registran si son comercialmente relevantes para el timeline.
        // Estados internos (en_revision_admin, en_finanzas, facturado, etc.) van solo a Historial.
        // responsableEmail/responsableNombre definidos en el scope exterior (antes del movimiento)
        if (nuevoEstado === 'venta_cerrada') {
          registrarActividad({
            tipo: 'venta_cerrada',
            clienteId,
            entidadTipo: 'cliente', entidadId: clienteId,
            vendedorEmail:  responsableEmail,
            vendedorNombre: responsableNombre,
            eventKey: 'venta_cerrada:' + clienteId,
            metadata: {
              nuevoEstado,
              estadoLabel: 'Venta cerrada',
              vehiculo: cliente.vehiculoInteres || cliente.vehiculo || '',
              monto: Number(cliente.precioVenta) || 0,
              ejecutorEmail:  userEmail,
              ejecutorNombre: userName || userEmail || '',
            },
          }).catch(() => {});
        } else if (ESTADOS_COMERCIALES.has(nuevoEstado)) {
          const estadoInfo = FLUJO[nuevoEstado] || {};
          registrarActividad({
            tipo: 'estado_avanzado',
            clienteId,
            entidadTipo: 'cliente', entidadId: clienteId,
            vendedorEmail:  responsableEmail,
            vendedorNombre: responsableNombre,
            metadata: {
              nuevoEstado,
              estadoLabel: estadoInfo.label || nuevoEstado,
              vehiculo: cliente.vehiculoInteres || cliente.vehiculo || '',
              monto: 0,
              ejecutorEmail:  userEmail,
              ejecutorNombre: userName || userEmail || '',
            },
          }).catch(() => {});
        }
        // Estados no comerciales (en_revision_admin, en_finanzas, facturado, etc.)
        // quedan registrados solo en Historial — no se agrega Activity.
        return {
          ok: true,
          cliente: clienteGuardado,
          movimiento,
          ventaCerrada: nuevoEstado === 'venta_cerrada',
        };
      });
    })
    .catch((err) => {
      console.error('[Flujo] avanzarEstado error:', err);
      return { ok: false, error: String(err) };
    });
}

// Registra una acción libre (comentario, documento subido, etc.) sin cambiar estado
export function registrarAccion(clienteId, accion, userEmail, userName, comentario) {
  return wixData.get('ClientRecords', clienteId, { suppressAuth: true })
    .then((c) => wixData.insert('Historial', {
      clienteId,
      clienteNombre: c.nombre || '',
      accion,
      estadoAnterior:      c.estatusExpediente   || '',
      estadoNuevo:         c.estatusExpediente   || '',
      departamentoActual:  c.departamentoActual  || '',
      responsableComercial: c.vendedorAsignado   || userEmail || '',
      responsableNombre:   c.vendedorNombre      || userName  || userEmail || '',
      usuario:      userEmail || '',
      usuarioNombre: userName || userEmail || '',
      comentario: comentario || '',
      timestamp: new Date(),
    }, { suppressAuth: true }))
    .catch((err) => console.error('[Flujo] registrarAccion error:', err));
}

// Devuelve el historial completo de un expediente, más reciente primero
export function obtenerHistorial(clienteId) {
  return wixData.query('Historial')
    .eq('clienteId', clienteId)
    .descending('timestamp')
    .limit(100)
    .find({ suppressAuth: true })
    .then((r) => r.items)
    .catch((err) => {
      console.error('[Flujo] obtenerHistorial error:', err);
      return [];
    });
}

// Notificación interna en tiempo real vía BroadcastChannel (complementa el email)
// Esta función es solo un helper que el HTML llama directamente — no hace nada aquí en backend
// pero la exportamos para documentación del contrato.
export function construirNotificacion(tipo, cliente, usuario, comentario) {
  return Promise.resolve({
    type: 'wecars-notificacion',
    subtipo: tipo,
    clienteId: cliente._id || '',
    clienteNombre: cliente.nombre || '',
    vehiculo: cliente.vehiculoInteres || cliente.vehiculo || '—',
    usuario,
    comentario: comentario || '',
    timestamp: new Date().toISOString(),
  });
}
