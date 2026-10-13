// ───────────────────────────────────────────────────────────────────
//  PÁGINA: ADMINISTRACIÓN
//  Elemento HTML ID: #htmlAdministracion
//  Pega SOLO este bloque en Wix Editor → página "panel-administracion" → pestaña "Código de página"
//
//  Componente adicional necesario en la página:
//    - Botón de carga nativo de Wix con ID: #uploadFotoBtn
//      (sube fotos de vehículos al Media Manager)
//
//  Colecciones usadas:
//    ClientRecords    → expedientes de clientes
//    Usuarios         → empleados
//    Cars             → inventario de vehículos
//    Consignas        → vehículos en consignación
//    SolicitudesCompra → solicitudes de compra de auto
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { consultarUsuarios, insertarUsuario, actualizarUsuario, actualizarPerfilUsuario, fetchInventarioCars, fetchDatosAdmin } from 'backend/datos.jsw';
import { obtenerPerfil } from 'backend/permisos.jsw';
import { avanzarEstado, obtenerHistorial as obtenerHistorialFlujo } from 'backend/flujo.jsw';
import { fetchCreditosPorRol, avanzarEstadoCredito } from 'backend/creditos.jsw';
import { fetchLeads, asignarLead, actualizarEstatusLead } from 'backend/leads.jsw';
import { registrarActividad } from 'backend/actividades.jsw';
import { subirFotoCarroBackend } from 'backend/media.jsw';
import { crearApartado, cerrarApartado } from 'backend/apartados';
import { gm_obtenerMes, gm_listasMeses } from 'backend/gamificacion-cms.jsw';
import { conectarCuenta, desconectarCuenta, actualizarAutorizados, obtenerTodasLasCuentas } from 'backend/publicaciones.jsw';
import { getPermisosERP, setPermisosERP } from 'backend/siteConfig.jsw';

const HTML_ID   = '#htmlAdministracion';
const UPLOAD_ID = '#uploadFotoBtn'; // botón nativo de Wix para fotos de vehículos

let _fotoContext = null; // { carroId }

$w.onReady(function () {

  // ── Botón nativo de Wix para subir fotos de vehículos ─────────────
  // El botón es opcional — si no existe en la página el catch lo silencia.
  try {
    const _ub = $w(UPLOAD_ID);
    if (typeof _ub.hide === 'function') _ub.hide();
    $w(UPLOAD_ID).onChange(async () => {
      if (!_fotoContext) return;
      try {
        const result = await $w(UPLOAD_ID).startUpload();
        const carro = await wixData.get('Cars', _fotoContext.carroId);
        const fotos = Array.isArray(carro.fotos) ? carro.fotos : [];
        fotos.push(result.url);
        const actualizado = await wixData.update('Cars', Object.assign({}, carro, {
          fotos,
          fotoPrincipal: carro.fotoPrincipal || result.url,
        }));
        $w(HTML_ID).postMessage({ type: 'wecars-foto-resultado', ok: true, carro: actualizado });
        _fotoContext = null;
        $w(UPLOAD_ID).hide();
        $w(UPLOAD_ID).reset();
      } catch (e) {
        $w(HTML_ID).postMessage({ type: 'wecars-foto-resultado', ok: false, error: String(e) });
      }
    });
  } catch (e) {
    // uploadFotoBtn es opcional — la página funciona sin él
  }

  // ── BroadcastChannel — sync en tiempo real entre paneles ─────────
  let _wcBC = null;
  try {
    _wcBC = new BroadcastChannel('wecars-erp-v2');
    _wcBC.onmessage = function(ev) {
      const msg = ev.data || {};
      if (!msg.type || msg._from === 'administracion') return;
      // Refrescar UI cuando otro panel hace cambios relevantes
      if (msg.type === 'wecars-expediente-actualizado' || msg.type === 'wecars-cliente-nuevo') {
        enviarDatosAdmin();
      }
      if (msg.type === 'wecars-cierre-creado' || msg.type === 'wecars-cierre-actualizado') {
        $w(HTML_ID).postMessage({ type: 'wecars-bc-cierre-update', cierre: msg.cierre });
      }
      if (msg.type === 'wecars-inventario-update' || msg.type === 'wecars-inventario-nuevo') {
        // Notificar al HTML para refrescar la lista de autos
        $w(HTML_ID).postMessage({ type: 'wecars-bc-inventario-update' });
      }
      if (msg.type === 'credito-nuevo' || msg.type === 'credito-estado-actualizado') {
        $w(HTML_ID).postMessage({ type: 'wecars-bc-credito-update', ...msg });
      }
    };
  } catch (e) {
    _wcBC = null;
    console.warn('[Admin] BroadcastChannel no disponible:', e);
  }

  // ── Escucha de mensajes del iframe ────────────────────────────────
  $w(HTML_ID).onMessage((event) => {
    ;(async () => {
    const data = event.data;
    if (!data || !data.type) return;

    // ── Resize / navegación / logout ─────────────────────────────────
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_ID).height = data.height;
    }

    if (data.type === 'wecars-navegar' && data.url) {
      wixLocation.to(data.url);
    }

    if (data.type === 'wecars-logout') {
      wixUsers.logout().then(() => wixLocation.to('https://www.wecarsbajio.com/entrar'));
    }

    // ── Expedientes pendientes ────────────────────────────────────────
    // El HTML espera wecars-expedientes-datos con { enRevision:[], pagoConfirmado:[] }
    if (data.type === 'wecars-expedientes-solicitar') {
      wixData.query('ClientRecords')
        .hasSome('estatusExpediente', ['en_revision_admin', 'pago_confirmado'])
        .ascending('nombre').limit(200).find()
        .then((r) => {
          const enRevision      = r.items.filter((c) => c.estatusExpediente === 'en_revision_admin');
          const pagoConfirmado  = r.items.filter((c) => c.estatusExpediente === 'pago_confirmado');
          $w(HTML_ID).postMessage({ type: 'wecars-expedientes-datos', enRevision, pagoConfirmado });
        })
        .catch((e) => console.error('[Admin] Error cargando expedientes:', e));
    }

    if (data.type === 'wecars-historial-obtener' && data.clienteId) {
      obtenerHistorialFlujo(data.clienteId)
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-historial-datos', clienteId: data.clienteId, historial: items }))
        .catch((e) => console.error('[Admin] Error cargando historial:', e));
    }

    if (data.type === 'wecars-estado-avanzar' && data.clienteId && data.nuevoEstado) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).then((p) => ({ email, p })))
        .then(({ email, p }) =>
          avanzarEstado(data.clienteId, data.nuevoEstado, data.comentario || '', email, p.nombre || email, p.rol)
        )
        .then((resultado) => {
          $w(HTML_ID).postMessage({ type: 'wecars-estado-resultado', ...resultado, clienteId: data.clienteId });
          if (resultado.ok) {
            try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-estado-update', clienteId: data.clienteId, nuevoEstado: data.nuevoEstado, movimiento: resultado.movimiento }); } catch (e) {}
          }
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-estado-resultado', ok: false, error: String(e), clienteId: data.clienteId }));
    }

    // ── Empleados ─────────────────────────────────────────────────────
    // El HTML espera wecars-empleados con items[] + campos de perfil
    if (data.type === 'wecars-empleados-solicitar') {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => null).then((perfil) => ({ email, perfil: perfil || {} })))
        .then(({ email, perfil }) =>
          consultarUsuarios()
            .then((r) => $w(HTML_ID).postMessage({
              type:               'wecars-empleados',
              items:              r.items,
              rolActual:          perfil.rol          || 'Administración',
              emailActual:        email,
              nombreActual:       perfil.nombre        || email,
              puestoActual:       perfil.puesto        || '',
              fechaIngresoActual: perfil.fechaIngreso  || null,
            }))
        )
        .catch((e) => console.error('[Admin] Error cargando empleados:', e));
    }

    if (data.type === 'wecars-empleado-crear' && data.datos) {
      const emp = Object.assign({ activo: true, fechaIngreso: new Date() }, data.datos);
      delete emp._id;
      insertarUsuario(emp)
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-empleado-creado', empleado: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-empleado-crear', datos: item }); } catch (e) {}
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-empleado-error', mensaje: String(e) }));
    }

    if (data.type === 'wecars-empleado-actualizar' && data.empleadoId) {
      // Acepta tanto data.datos (enviado desde el HTML) como data.cambios (retrocompat.)
      const cambios = data.datos || data.cambios || {};
      actualizarUsuario(data.empleadoId, cambios)
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-empleado-actualizado', empleado: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-empleado-actualizado', empleado: item }); } catch (e) {}
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-empleado-error', mensaje: String(e) }));
    }

    // ── Inventario de vehículos ───────────────────────────────────────
    // ── Redes Sociales / Publicaciones ─────────────────────────
    if (data.type === 'wecars-pub-cuentas-solicitar') {
      obtenerTodasLasCuentas()
        .then((cuentas) => $w(HTML_ID).postMessage({ type: 'wecars-pub-cuentas-datos', cuentas }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-pub-cuentas-datos', cuentas: [], error: String(e) }));
    }
    if (data.type === 'wecars-pub-conectar' && data.datos) {
      conectarCuenta(data.datos)
        .then((r) => {
          $w(HTML_ID).postMessage({ type: 'wecars-pub-conectar-resultado', ok: r.ok, paginaNombre: r.paginaNombre });
          return obtenerTodasLasCuentas();
        })
        .then((cuentas) => $w(HTML_ID).postMessage({ type: 'wecars-pub-cuentas-datos', cuentas }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-pub-conectar-resultado', ok: false, error: String(e) }));
    }
    if (data.type === 'wecars-pub-desconectar' && data.cuentaId) {
      desconectarCuenta(data.cuentaId)
        .then(() => obtenerTodasLasCuentas())
        .then((cuentas) => $w(HTML_ID).postMessage({ type: 'wecars-pub-cuentas-datos', cuentas }))
        .catch((e) => console.error('[Admin] Error desconectando cuenta:', e));
    }
    if (data.type === 'wecars-pub-autorizar' && data.cuentaId && data.emails) {
      actualizarAutorizados(data.cuentaId, data.emails)
        .catch((e) => console.error('[Admin] Error actualizando autorizados:', e));
    }

    // El HTML espera wecars-inventario-datos con items[]
    if (data.type === 'wecars-inventario-solicitar') {
      fetchInventarioCars()
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-inventario-datos', items }))
        .catch((e) => console.error('[Admin] Error cargando inventario:', e));
    }

    if (data.type === 'wecars-carro-crear' && data.datos) {
      const carro = Object.assign({ estatusVenta: 'Disponible' }, data.datos);
      delete carro._id;
      wixData.insert('Cars', carro, { suppressAuth: true })
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-carro-resultado', ok: true, creado: true, carro: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-inventario-update', carro: item }); } catch (e) {}
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-carro-resultado', ok: false, error: String(e) }));
    }

    if (data.type === 'wecars-carro-actualizar' && data.carroId) {
      wixData.get('Cars', data.carroId)
        .then((item) => wixData.update('Cars', Object.assign({}, item, data.cambios || {}), { suppressAuth: true }))
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-carro-resultado', ok: true, creado: false, carro: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-inventario-update', carro: item }); } catch (e) {}
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-carro-resultado', ok: false, error: String(e) }));
    }

    // ── Listar apartados activos ──────────────────────────────────────
    if (data.type === 'wecars-apartados-solicitar') {
      wixData.query('Apartados').eq('estatusApartado', 'activo').descending('fechaApartado').find({ suppressAuth: true })
        .then(r => $w(HTML_ID).postMessage({ type: 'wecars-apartados-datos', items: r.items }))
        .catch(e => console.error('[Admin] Error cargando apartados:', e));
    }

    // ── Cargar todos los clientes (para vista Apartados) ─────────────
    if (data.type === 'wecars-clientes-todos') {
      wixData.query('ClientRecords').limit(500).find({ suppressAuth: true })
        .then(r => {
          const items = (r.items || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
          $w(HTML_ID).postMessage({ type: 'wecars-clientes-todos-datos', items });
        })
        .catch(e => {
          console.error('[Admin] Error cargando clientes:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-clientes-todos-datos', items: [], error: String(e) });
        });
    }

    // ── Buscar clientes por nombre, teléfono o correo ─────────────────
    if (data.type === 'wecars-clientes-buscar' && data.query) {
      const q = data.query.trim();
      Promise.all([
        wixData.query('ClientRecords').contains('nombre', q).limit(20).find({ suppressAuth: true }),
        wixData.query('ClientRecords').contains('telefono', q).limit(20).find({ suppressAuth: true }),
        wixData.query('ClientRecords').contains('correo', q).limit(20).find({ suppressAuth: true }),
      ]).then(([r1, r2, r3]) => {
        const seen = new Set();
        const items = [...r1.items, ...r2.items, ...r3.items].filter(c => { if (seen.has(c._id)) return false; seen.add(c._id); return true; });
        $w(HTML_ID).postMessage({ type: 'wecars-clientes-resultado', items });
      }).catch(e => console.error('[Admin] Error buscando clientes:', e));
    }

    // ── Crear apartado de vehículo ────────────────────────────────────
    if (data.type === 'wecars-apartado-crear' && data.datos) {
      crearApartado(data.datos)
        .then((resultado) => {
          $w(HTML_ID).postMessage({
            type:       'wecars-apartado-ok',
            folio:      resultado.folio,
            adminNombre:resultado.adminNombre,
            carro:      resultado.carro,
            datos:      resultado.datos,
          });
          if (resultado.carro) { try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-inventario-update', carro: resultado.carro }); } catch (e) {} }
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-apartado-error', error: String(e.message || e) }));
    }

    // ── Cerrar apartado (vendido o cancelado) ─────────────────────────
    if (data.type === 'wecars-apartado-cerrar' && data.apartadoId) {
      cerrarApartado(data.apartadoId, data.tipoCierre, data.motivo || '')
        .then((resultado) => {
          $w(HTML_ID).postMessage({ type: 'wecars-apartado-cerrado-ok', ...resultado });
          // Si se vendió o liberó, notificar inventario
          if (resultado.vehiculoId) {
            try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-inventario-update' }); } catch (e) {}
          }
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-apartado-cerrado-error', error: String(e.message || e) }));
    }

    // ── Eliminar vehículo del inventario ──────────────────────────────
    if (data.type === 'wecars-carro-eliminar' && data.carroId) {
      wixData.remove('Cars', data.carroId, { suppressAuth: true })
        .then(() => {
          $w(HTML_ID).postMessage({ type: 'wecars-carro-eliminado', ok: true, carroId: data.carroId });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-inventario-update' }); } catch (e) {}
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-carro-eliminado', ok: false, error: String(e), carroId: data.carroId }));
    }

    // ── Subir foto del vehículo (base64 desde el iframe) ─────────────
    if (data.type === 'wecars-foto-subir' && data.carroId && data.base64) {
      subirFotoCarroBackend(data.base64, data.fileName || 'foto.jpg', data.mimeType || 'image/jpeg')
        .then((result) => {
          const url = typeof result === 'string' ? result : (result && result.url);
          if (!url) return Promise.reject(new Error(result && result.error || 'Subida de fotos no disponible'));
          return wixData.get('Cars', data.carroId).then((carro) => {
            const fotos = Array.isArray(carro.fotos) ? carro.fotos : [];
            fotos.push(url);
            return wixData.update('Cars', Object.assign({}, carro, {
              fotos,
              fotoPrincipal: carro.fotoPrincipal || url,
            }));
          });
        })
        .then((carro) => $w(HTML_ID).postMessage({ type: 'wecars-foto-resultado', ok: true, carro }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-foto-resultado', ok: false, error: String(e) }));
    }

    // ── Consignas ─────────────────────────────────────────────────────
    if (data.type === 'wecars-consignas-solicitar') {
      wixData.query('Consignas').descending('_createdDate').limit(100).find()
        .catch(() => ({ items: [] }))
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-consignas-datos', items: r.items }))
        .catch((e) => console.error('[Admin] Error cargando consignas:', e));
    }

    if (data.type === 'wecars-consigna-asignar' && data.consignaId) {
      wixData.get('Consignas', data.consignaId)
        .then((item) => wixData.update('Consignas', Object.assign({}, item, {
          vendedorAsignado: data.vendedorEmail  || '',
          vendedorNombre:   data.vendedorNombre || '',
          estatusConsigna:  data.vendedorEmail ? 'asignada' : 'nueva',
        }), { suppressAuth: true }))
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-consigna-asignada', consigna: item });
          // Notificar al panel del vendedor asignado via BroadcastChannel
          if (item.vendedorAsignado) {
            try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-consigna-asignada', consigna: item }); } catch(e) {}
          }
        })
        .catch((e) => console.error('[Admin] Error asignando consigna:', e));
    }

    // ── Consigna cerrada → entra al inventario (Cars) ─────────────────
    if (data.type === 'wecars-consigna-cerrar' && data.consignaId) {
      wixData.get('Consignas', data.consignaId)
        .then((consigna) => {
          const updates = [
            wixData.update('Consignas', Object.assign({}, consigna, {
              estatusConsigna: 'cerrada',
              fechaCierre:     new Date(),
              notasCierre:     data.notas || '',
            }), { suppressAuth: true }),
          ];
          // Si la consigna aún no tiene auto en Cars, insertarlo
          if (!consigna.carId) {
            const vehiculo = [consigna.marca, consigna.modelo, consigna.anio, consigna.version].filter(Boolean).join(' ');
            const carro = {
              title:          vehiculo || 'Vehículo en consigna',
              marca:          consigna.marca        || '',
              modelo:         consigna.modelo       || '',
              anio:           consigna.anio         || '',
              version:        consigna.version      || '',
              km:             consigna.km           || 0,
              color:          consigna.color        || '',
              transmision:    consigna.transmision  || '',
              precio:         consigna.precio       || 0,
              precioMinimo:   consigna.precioMinimo || 0,
              condicion:      consigna.condicion    || '',
              carroceria:     consigna.carroceria   || '',
              origen:         'Consigna',
              consignaId:     data.consignaId,
              propietario:    consigna.nombre       || '',
              telefonoProp:   consigna.telefono     || '',
              estatusVenta:   'Disponible',
              fechaIngreso:   new Date(),
            };
            updates.push(
              wixData.insert('Cars', carro, { suppressAuth: true })
                .then((carroInsertado) => {
                  // Avisar a todos los paneles que hay auto nuevo en inventario
                  try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-inventario-nuevo', carro: carroInsertado }); } catch (e) {}
                  $w(HTML_ID).postMessage({ type: 'wecars-carro-resultado', ok: true, creado: true, carro: carroInsertado, desdeConsigna: true });
                  return carroInsertado;
                })
            );
          }
          return Promise.all(updates);
        })
        .then(() => $w(HTML_ID).postMessage({ type: 'wecars-consigna-cerrada', consignaId: data.consignaId }))
        .catch((e) => {
          console.error('[Admin] Error cerrando consigna:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-consigna-error', error: String(e) });
        });
    }

    // ── Solicitudes de compra ─────────────────────────────────────────
    // El HTML recibe cada solicitud como { type:'wecars-solicitud-compra', solicitud:{...} }
    if (data.type === 'wecars-solicitud-compra-actualizar' && data.solicitudId) {
      wixData.get('SolicitudesCompra', data.solicitudId)
        .then((item) => wixData.update('SolicitudesCompra', Object.assign({}, item, data.cambios || {})))
        .catch((e) => console.error('[Admin] Error actualizando solicitud de compra:', e));
    }

    // ── Tareas / Pendientes (colección Tasks en CMS) ──────────────────
    if (data.type === 'wecars-tareas-solicitar') {
      wixData.query('Tasks').descending('_createdDate').limit(200).find()
        .catch(() => ({ items: [] }))
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-tareas-datos', items: r.items }))
        .catch((e) => console.error('[Admin] Error cargando tareas:', e));
    }

    if (data.type === 'wecars-tarea-crear' && data.datos) {
      const tarea = Object.assign({ col: 'por-hacer', prior: 'media' }, data.datos);
      delete tarea._id;
      wixData.insert('Tasks', tarea, { suppressAuth: true })
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-tarea-creada', tarea: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-tarea-nueva', tarea: item }); } catch (e) {}
        })
        .catch((e) => console.error('[Admin] Error creando tarea:', e));
    }

    if (data.type === 'wecars-tarea-actualizar' && data.tareaId) {
      const cambios = data.cambios || {};
      wixData.get('Tasks', data.tareaId)
        .then((item) => wixData.update('Tasks', Object.assign({}, item, cambios), { suppressAuth: true }))
        .then((item) => $w(HTML_ID).postMessage({ type: 'wecars-tarea-actualizada', tarea: item }))
        .catch((e) => console.error('[Admin] Error actualizando tarea:', e));
    }

    if (data.type === 'wecars-tarea-eliminar' && data.tareaId) {
      wixData.remove('Tasks', data.tareaId, { suppressAuth: true })
        .then(() => $w(HTML_ID).postMessage({ type: 'wecars-tarea-eliminada', tareaId: data.tareaId }))
        .catch((e) => console.error('[Admin] Error eliminando tarea:', e));
    }

    // ── Tarea interna legacy (broadcast entre paneles) ─────────────────
    if (data.type === 'wecars-tarea' && data.datos) {
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-tarea', ...data.datos }); } catch (e) {}
    }

    // ── Permisos ERP — validados en backend (CONFIG-RISK-01 corregido) ──
    if (data.type === 'wecars-permisos-solicitar') {
      getPermisosERP()
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-permisos-datos', permisos: r.ok ? r.permisos : null }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-permisos-datos', permisos: null }));
    }

    if (data.type === 'wecars-permisos-guardar' && data.permisos) {
      // Identidad y rol validados en backend — frontend solo envía el payload
      setPermisosERP(data.permisos)
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-permisos-guardados', ok: r.ok, error: r.error }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-permisos-guardados', ok: false, error: String(e) }));
    }

    // ── Mi perfil — guardar cambios del usuario actual ─────────────────
    if (data.type === 'wecars-perfil-guardar' && data.emailActual) {
      actualizarPerfilUsuario(data.emailActual, data.nombre, data.puesto)
        .then((item) => $w(HTML_ID).postMessage({ type: 'wecars-perfil-guardado', ok: true, usuario: item }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-perfil-guardado', ok: false, error: String(e) }));
    }

    // ── Gamificación — Admin: solo lectura del ranking mensual ───────────
    if (data.type === 'wecars-gm-obtener-mes') {
      gm_obtenerMes(data.mes)
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-gm-mes-datos', mes: data.mes, items }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-gm-mes-datos', mes: data.mes, items: [] }));
    }
    if (data.type === 'wecars-gm-lista-meses') {
      gm_listasMeses()
        .then((meses) => $w(HTML_ID).postMessage({ type: 'wecars-gm-meses-respuesta', meses }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-gm-meses-respuesta', meses: [] }));
    }

    // ── Nuevo lead desde Administración (con anti-duplicado por teléfono) ──
    if (data.type === 'wecars-cliente-nuevo' && data.datos) {
      const datosNuevo = Object.assign({}, data.datos);
      delete datosNuevo._id;
      const tel = String(datosNuevo.telefono || '').replace(/\D/g, '');
      const vars = [tel];
      if (tel.length === 10) { vars.push('52' + tel); vars.push('521' + tel); }
      wixData.query('ClientRecords').hasSome('telefono', vars).limit(1).find({ suppressAuth: true })
        .then(async result => {
          if (result.items.length) {
            const ex = result.items[0];
            const msg = 'Este teléfono ya está registrado' + (ex.vendedorAsignado ? ' — cliente de ' + (ex.vendedorNombre || ex.vendedorAsignado) : '');
            $w(HTML_ID).postMessage({ type: 'wecars-cliente-nuevo-ok', cliente: ex, yaExistia: true, mensaje: msg });
            return;
          }
          const item = await wixData.insert('ClientRecords', datosNuevo, { suppressAuth: true });
          $w(HTML_ID).postMessage({ type: 'wecars-cliente-nuevo-ok', cliente: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-cliente-nuevo', cliente: item }); } catch(e) {}
          if (data.tareaExtra && data.tareaExtra.asignadoA) {
            const tarea = Object.assign({ col: 'por-hacer', prior: 'media' }, data.tareaExtra);
            delete tarea._id;
            try {
              const tareaItem = await wixData.insert('Tasks', tarea, { suppressAuth: true });
              try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-tarea-asignada', tarea: tareaItem }); } catch(e) {}
            } catch(e) { console.error('[Admin] Error creando tarea de seguimiento:', e); }
          }
        })
        .catch(e => {
          console.error('[Admin] Error creando lead:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cliente-nuevo-error', error: String(e) });
        });
    }

    // ── Verifica tu Auto ─────────────────────────────────────────────
    if (data.type === 'wecars-vta-solicitar') {
      wixData.query('VerificaAuto').descending('_createdDate').limit(200).find({ suppressAuth: true })
        .then(r  => $w(HTML_ID).postMessage({ type: 'wecars-vta-datos', items: r.items }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-vta-datos', items: [] }));
    }

    if (data.type === 'wecars-vta-guardar' && data.id) {
      wixData.get('VerificaAuto', data.id, { suppressAuth: true })
        .then(async (actual) => {
          const actualizado = Object.assign({}, actual, {
            status:            data.status            ?? actual.status,
            // Documentales
            resFactura:        data.resFactura        ?? actual.resFactura,
            resConsecutivos:   data.resConsecutivos   ?? actual.resConsecutivos,
            resBaja:           data.resBaja           ?? actual.resBaja,
            resINE:            data.resINE            ?? actual.resINE,
            resPropietario:    data.resPropietario    ?? actual.resPropietario,
            resTenencia:       data.resTenencia       ?? actual.resTenencia,
            // REPUVE
            resRobo:           data.resRobo           ?? actual.resRobo,
            resForaneo:        data.resForaneo        ?? actual.resForaneo,
            resRepuveDetalle:  data.resRepuveDetalle  ?? actual.resRepuveDetalle,
            // Propietarios
            numPropietarios:   data.numPropietarios   ?? actual.numPropietarios,
            resVerificacion:   data.resVerificacion   ?? actual.resVerificacion,
            // Mecánica
            mecFrenos:         data.mecFrenos         ?? actual.mecFrenos,
            mecMotor:          data.mecMotor          ?? actual.mecMotor,
            mecTransmision:    data.mecTransmision    ?? actual.mecTransmision,
            mecSuspension:     data.mecSuspension     ?? actual.mecSuspension,
            mecElectrico:      data.mecElectrico      ?? actual.mecElectrico,
            mecNeumaticos:     data.mecNeumaticos     ?? actual.mecNeumaticos,
            mecCarroceria:     data.mecCarroceria     ?? actual.mecCarroceria,
            mecAC:             data.mecAC             ?? actual.mecAC,
            mecNota:           data.mecNota           ?? actual.mecNota,
            // Veredicto y notas
            veredicto:         data.veredicto         ?? actual.veredicto,
            resComentario:     data.resComentario     ?? actual.resComentario,
            adminNotas:        data.adminNotas        ?? actual.adminNotas,
            // Links de documentos recibidos
            facturaDoc:        data.facturaDoc        !== undefined ? (data.facturaDoc || null) : actual.facturaDoc,
            ineDoc:            data.ineDoc            !== undefined ? (data.ineDoc || null)     : actual.ineDoc,
            tenenciaDoc:       data.tenenciaDoc       !== undefined ? (data.tenenciaDoc || null): actual.tenenciaDoc,
            tarjetaCirculacionDoc: data.tarjetaCirculacionDoc !== undefined ? (data.tarjetaCirculacionDoc || null) : actual.tarjetaCirculacionDoc,
            otrosDoc:          data.otrosDoc          !== undefined ? (data.otrosDoc || null)   : actual.otrosDoc,
            fechaEntrega:      data.status === 'Listo' && !actual.fechaEntrega ? new Date() : actual.fechaEntrega,
          });
          const guardado = await wixData.update('VerificaAuto', actualizado, { suppressAuth: true });
          $w(HTML_ID).postMessage({ type: 'wecars-vta-guardado', ok: true, id: data.id, item: guardado });
        })
        .catch(e => $w(HTML_ID).postMessage({ type: 'wecars-vta-guardado', ok: false, id: data.id, error: String(e) }));
    }

    // ── Cierres de Operación ──────────────────────────────────────────
    if (data.type === 'wecars-cierres-solicitar') {
      wixData.query('CierreOperacion').descending('_createdDate').limit(500).find({ suppressAuth: true })
        .then(r => $w(HTML_ID).postMessage({ type: 'wecars-cierres-datos', items: r.items }))
        .catch(e => {
          console.error('[Admin] Error cargando cierres:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cierres-datos', items: [] });
        });
    }

    if (data.type === 'wecars-cierre-crear' && data.datos) {
      const { apartados, ...resto } = data.datos;
      const item = Object.assign({}, resto, {
        apartados: Array.isArray(apartados) ? JSON.stringify(apartados) : '[]',
      });
      delete item._id;
      wixData.insert('CierreOperacion', item, { suppressAuth: true })
        .then(creado => {
          const resultado = Object.assign({}, creado, {
            apartados: JSON.parse(creado.apartados || '[]'),
          });
          $w(HTML_ID).postMessage({ type: 'wecars-cierre-creado', cierre: resultado });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-cierre-creado', cierre: resultado }); } catch(e) {}
        })
        .catch(e => {
          console.error('[Admin] Error creando cierre:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cierre-error', error: String(e) });
        });
    }

    if (data.type === 'wecars-cierre-actualizar' && data.datos && data.datos._id) {
      wixData.get('CierreOperacion', data.datos._id, { suppressAuth: true })
        .then(existente => {
          const { apartados, ...resto } = data.datos;
          const item = Object.assign({}, existente, resto, {
            apartados: Array.isArray(apartados) ? JSON.stringify(apartados) : existente.apartados || '[]',
          });
          return wixData.update('CierreOperacion', item, { suppressAuth: true });
        })
        .then(actualizado => {
          const resultado = Object.assign({}, actualizado, {
            apartados: JSON.parse(actualizado.apartados || '[]'),
          });
          $w(HTML_ID).postMessage({ type: 'wecars-cierre-actualizado', cierre: resultado });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-cierre-actualizado', cierre: resultado }); } catch(e) {}
        })
        .catch(e => {
          console.error('[Admin] Error actualizando cierre:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cierre-error', error: String(e) });
        });
    }

    // ── Alta rápida de lead desde Admin ─────────────────────────────
    if (data.type === 'wecars-lead' && data.data) {
      const ld = data.data;
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ nombre: email }))
          .then((p) => wixData.insert('ALeads', Object.assign({}, ld, {
            vendedorAsignado: ld.vendedorAsignado || email,
            vendedorNombre:   ld.vendedorNombre   || p.nombre || email,
            fechaRegistro:    ld.fechaRegistro    || new Date(),
            estatus:          ld.estatus          || 'nuevo_lead',
            origen:           ld.pagina           || ld.origen || 'Panel Admin',
          }), { suppressAuth: true }))
        )
        .then((lead) => {
          $w(HTML_ID).postMessage({ type: 'wecars-lead-creado', ok: true, leadId: lead._id });
          enviarLeadsAdmin();
        })
        .catch((e) => {
          console.error('[Admin] Error creando lead:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-lead-creado', ok: false, error: String(e) });
        });
    }

    // ── Leads ────────────────────────────────────────────────────────
    if (data.type === 'wecars-leads-solicitar') { enviarLeadsAdmin(); }
    if (data.type === 'wecars-admin-solicitar') { enviarDatosAdmin(); enviarLeadsAdmin(); }
    if (data.type === 'wecars-lead-asignar' && data.leadId) {
      // registrarActividad se hace dentro de asignarLead (backend) — solo refrescar UI
      asignarLead(data.leadId, data.vendedorEmail || '', data.vendedorNombre || '')
        .then(() => enviarLeadsAdmin())
        .catch((e) => console.error('[Admin] Error asignando lead:', e));
    }
    if (data.type === 'wecars-lead-estatus' && data.leadId) {
      actualizarEstatusLead(data.leadId, data.nuevoEstatus)
        .catch((e) => console.error('[Admin] Error estatus lead:', e));
    }
    if (data.type === 'wecars-lead-nota' && data.leadId) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ nombre: email }))
          .then((p) => registrarActividad({
            tipo: 'nota_lead',
            leadId: data.leadId,
            entidadTipo: 'lead', entidadId: data.leadId,
            vendedorEmail: email,
            vendedorNombre: p.nombre || email,
            descripcion: data.nota || '',
          })))
        .catch((e) => console.error('[Admin] Error nota lead:', e));
    }
    if (data.type === 'wecars-lead-convertir' && data.leadId && data.lead) {
      const l = data.lead;
      const telL = String(l.telefono || '').replace(/\D/g, '');
      const varsL = [telL];
      if (telL.length === 10) { varsL.push('52' + telL); varsL.push('521' + telL); }
      wixData.query('ClientRecords').hasSome('telefono', varsL).limit(1).find({ suppressAuth: true })
        .then((r) => {
          if (r.items.length) {
            return { clienteId: r.items[0]._id, yaExiste: true };
          }
          return wixData.insert('ClientRecords', { nombre: l.nombre||'', telefono: telL, correo: l.correo||'', origen: l.origen||'Sitio web', estatusExpediente: 'nuevo_lead', vendedorAsignado: l.vendedorAsignado||'', vendedorNombre: l.vendedorNombre||'', ultimaActividad: new Date(), leadId: l._id }, { suppressAuth: true })
            .then((c) => ({ clienteId: c._id, yaExiste: false }));
        })
        .then((res) => {
          $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: true, clienteId: res.clienteId, leadId: data.leadId, yaExistia: res.yaExiste });
          return actualizarEstatusLead(data.leadId, 'cerrado');
        })
        .then(() => enviarLeadsAdmin())
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: false, error: String(e), leadId: data.leadId }));
    }

    // ── Créditos — Admin ──────────────────────────────────────────────
    if (data.type === 'wecars-creditos-solicitar') {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ rol: 'Administración' }))
          .then((p) => fetchCreditosPorRol(email, p.rol || 'Administración'))
        )
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-creditos-datos', items }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-creditos-datos', items: [] }));
    }

    if (data.type === 'wecars-credito-avanzar' && data.creditoId && data.nuevoEstado) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ rol: 'Administración', nombre: email }))
          .then((p) => avanzarEstadoCredito(data.creditoId, data.nuevoEstado, data.datos || {}, email, p.rol || 'Administración')
            .then((result) => {
              $w(HTML_ID).postMessage({ type: 'wecars-credito-avanzado', ...result });
              if (result.ok) {
                try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'credito-estado-actualizado', creditoId: data.creditoId, estatus: data.nuevoEstado, vendedorEmail: result.credito && result.credito.vendedorEmail }); } catch (e) {}
              }
            })
          )
        )
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-credito-avanzado', ok: false, error: String(e) }));
    }
    })(); // fin IIFE async
  });

  enviarDatosAdmin();
  enviarLeadsAdmin();
});

// ── Carga inicial ─────────────────────────────────────────────────────
// El HTML se inicializa con wecars-empleados (contiene perfil + items).
// El inventario, consignas y solicitudes se envían también en paralelo.
function enviarDatosAdmin() {
  const _email$ = wixUsers.currentUser.loggedIn
    ? wixUsers.currentUser.getEmail().catch(() => '')
    : Promise.resolve('');
  _email$
    .then((email) => {
      console.log('[Admin] email obtenido:', email || '(vacío)');
      return Promise.all([
        email ? obtenerPerfil(email).catch(() => null) : Promise.resolve(null),
        fetchDatosAdmin().catch((e) => { console.error('[Admin] fetchDatosAdmin error:', e); return {}; }),
      ]).then(([perfil, datos]) => ({ email, perfil: perfil || {}, datos }));
    })
    .then(({ email, perfil, datos }) => {
      console.log('[Admin] perfil.rol:', perfil.rol, '| email:', email);
      // ── Guardia de rol: solo Administración y Gerencia acceden a datos ──
      const _rolN = String(perfil.rol || '').toLowerCase()
        .replace(/[áéíóú]/g, c => ({ á:'a', é:'e', í:'i', ó:'o', ú:'u' }[c]));
      const _rolesAdmin = ['administracion', 'gerencia'];
      if (email && !_rolesAdmin.includes(_rolN)) {
        console.log('[Admin] Rol no permitido:', perfil.rol);
        $w(HTML_ID).postMessage({
          type: 'wecars-admin-sin-acceso',
          rolActual: perfil.rol || '', emailActual: email,
          nombreActual: perfil.nombre || email,
        });
        return;
      }
      const perfilBase = {
        rolActual:          perfil.rol         || 'Administración',
        emailActual:        email,
        nombreActual:       perfil.nombre       || email,
        puestoActual:       perfil.puesto       || '',
        fechaIngresoActual: perfil.fechaIngreso || null,
      };
      const empleados   = datos.empleados   || [];
      const cars        = datos.inventario  || [];
      const consignas   = datos.consignas   || [];
      const solicitudes = datos.solicitudes || [];
      const clientes    = datos.clientes    || [];
      const ventas      = datos.ventas      || [];
      const comisiones  = datos.comisiones  || [];
      const facturas    = datos.facturas    || [];
      const tareas      = datos.tareas      || [];
      const creditos    = datos.creditos    || [];

      $w(HTML_ID).postMessage(Object.assign({ type: 'wecars-empleados', items: empleados }, perfilBase));
      $w(HTML_ID).postMessage({ type: 'wecars-inventario-datos', items: cars });
      $w(HTML_ID).postMessage({ type: 'wecars-consignas-datos',  items: consignas });
      $w(HTML_ID).postMessage({ type: 'wecars-clientes-datos',   items: clientes });
      $w(HTML_ID).postMessage({ type: 'wecars-ventas-datos',     items: ventas });
      $w(HTML_ID).postMessage({ type: 'wecars-comisiones-datos', items: comisiones });
      $w(HTML_ID).postMessage({ type: 'wecars-facturas-datos',   items: facturas });
      $w(HTML_ID).postMessage({ type: 'wecars-tareas-datos',     items: tareas });
      $w(HTML_ID).postMessage({ type: 'wecars-creditos-datos',   items: creditos || [] });
      solicitudes.forEach((solicitud) => {
        $w(HTML_ID).postMessage({ type: 'wecars-solicitud-compra', solicitud });
      });
    })
    .catch((err) => {
      console.error('[Admin] Error cargando datos iniciales:', String(err));
      $w(HTML_ID).postMessage({ type: 'wecars-admin-error-inicio', error: String(err) });
    });
}

// ── Leads: enviar al panel de administración ─────────────────────────
function enviarLeadsAdmin() {
  Promise.all([
    wixData.query('ALeads').descending('fecha').limit(500).find({ suppressAuth: true }).catch(() => ({ items: [] })),
    wixData.query('Consignas').descending('_createdDate').limit(200).find({ suppressAuth: true }).catch(() => ({ items: [] })),
    wixData.query('VerificaAuto').descending('fechaSolicitud').limit(200).find({ suppressAuth: true }).catch(() => ({ items: [] })),
    wixData.query('Usuarios').limit(100).find({ suppressAuth: true }).catch(() => ({ items: [] })),
  ])
  .then(([aleadsR, consignasR, vtaR, usuariosR]) => {
    const aleads = aleadsR.items.filter(l => l.tipo !== 'consigna');

    const consLeads = consignasR.items.map(c => {
      const vehiculo = [c.marca, c.modelo, c.anio, c.version].filter(Boolean).join(' ');
      const est = c.estatusConsigna === 'asignada' ? 'asignado' : c.estatusConsigna === 'cerrada' ? 'cerrado' : 'nuevo';
      return {
        _id: 'cons-' + c._id, _srcId: c._id, _srcCol: 'Consignas',
        nombre: c.nombre || '', telefono: c.telefono || '', correo: c.correo || '',
        tipo: 'consigna', interes: vehiculo,
        resumen: vehiculo + (c.precio ? ' · $' + Number(c.precio).toLocaleString('es-MX') : '') + (c.urgencia ? ' · ' + c.urgencia : ''),
        estatusLead: est, vendedorAsignado: c.vendedorAsignado || '', vendedorNombre: c.vendedorNombre || '',
        origen: c.origen || 'Sitio web', pagina: 'Consigna',
        fecha: c.fecha || c._createdDate, _createdDate: c._createdDate, _notas: [],
      };
    });

    const vtaLeads = vtaR.items.map(v => {
      const st = v.status || 'Pendiente';
      const est = st === 'Listo' || st === 'Cancelado' ? 'cerrado' : st === 'En proceso' ? 'contactado' : 'nuevo';
      return {
        _id: 'vta-' + v._id, _srcId: v._id, _srcCol: 'VerificaAuto',
        nombre: v.clienteNombre || 'Sin nombre', telefono: v.clienteTelefono || '', correo: '',
        tipo: 'verificacion',
        resumen: 'Verificación: ' + (v.autoDescripcion || '') + (v.vin ? ' · VIN: ' + v.vin : ''),
        interes: v.autoDescripcion || '',
        estatusLead: est, vendedorAsignado: '', vendedorNombre: '',
        origen: 'Sitio web', pagina: 'Verifica tu Auto',
        fecha: v.fechaSolicitud || v._createdDate, _createdDate: v._createdDate, _notas: [],
      };
    });

    const todos = [...aleads, ...consLeads, ...vtaLeads]
      .sort((a, b) => new Date(b.fecha || b._createdDate || 0) - new Date(a.fecha || a._createdDate || 0));

    $w(HTML_ID).postMessage({
      type:       'wecars-leads-datos',
      leads:      todos,
      vendedores: usuariosR.items.map(u => ({ email: u.email || u.correo || '', nombre: u.nombre || u.name || '' })),
      rolActual:  'Administracion',
      emailActual: '',
    });
  })
  .catch((e) => {
    console.error('[Admin] Error enviando leads:', e);
    $w(HTML_ID).postMessage({ type: 'wecars-leads-datos', leads: [], vendedores: [], rolActual: 'Administracion', emailActual: '' });
  });
}
