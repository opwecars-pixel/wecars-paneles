// ───────────────────────────────────────────────────────────────────
//  PÁGINA: GERENCIA
//  Elemento HTML ID: #htmlGerencia
//  Pega SOLO este bloque en Wix Editor → página "panel-gerencia" → pestaña "Código de página"
//
//  Colecciones usadas:
//    ClientRecords → todos los clientes
//    Usuarios      → empleados/vendedores
//    Opportunities → oportunidades de venta
//    Activities    → actividades
//    Cars          → inventario
//    Facturas      → facturas emitidas
//    Ventas        → ventas históricas
//    Citas         → agenda de citas
//    Comisiones    → para registrar bonos
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { obtenerPerfil } from 'backend/permisos.jsw';
import { avanzarEstado, obtenerHistorial as obtenerHistorialFlujo } from 'backend/flujo.jsw';
import { gm_guardar, gm_obtenerMes, gm_listasMeses, gm_cerrarMesAnterior } from 'backend/gamificacion-cms.jsw';
import { getErpConfig, setErpConfig } from 'backend/siteConfig.jsw';
import { fetchDatosGerencia } from 'backend/datos.jsw';
import { fetchLeads, asignarLead, actualizarEstatusLead, vincularClienteALead } from 'backend/leads.jsw';
import { registrarActividad, fetchResumenEquipo, fetchTimelineVendedor, fetchEvidencia } from 'backend/actividades.jsw';
import { fetchCreditosPorRol as fetchCreditosGerencia } from 'backend/creditos.jsw';
import { insertarComision, obtenerBonosHistorial } from 'backend/finanzas.jsw';
import { crearClienteSeguro, eliminarCliente } from 'backend/clientes.jsw';
import { obtenerHistorial as geObtenerHistorialPub, obtenerTodasLasCuentas as geObtenerCuentasSociales } from 'backend/publicaciones.jsw';

const HTML_ID = '#htmlGerencia';
let gerenciaEmail = ''; // A1: se asigna en enviarDatosGerencia() para uso en logs de reasignación

$w.onReady(function () {
  $w(HTML_ID).onMessage((event) => {
    // IIFE async para poder usar await sin que el handler devuelva una Promise al canal de mensajes
    // (si el handler fuera async directamente, Wix lanzaría "message channel closed" en consola)
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

    // ── Recargar datos completos de gerencia ──────────────────────────
    if (data.type === 'wecars-gerencia-solicitar') {
      enviarDatosGerencia();
    }

    // ── Solicitar lista de empleados directamente del CMS ─────────────
    if (data.type === 'wecars-empleados-solicitar') {
      try {
        const r = await wixData.query('Usuarios').limit(100).find({ suppressAuth: true });
        $w(HTML_ID).postMessage({
          type: 'wecars-empleados-lista',
          empleados: r.items.map(u => ({
            _id:    u._id,
            nombre: u.nombre  || u.name || '',
            email:  u.email   || u.correo || '',
            rol:    u.rol     || '',
            puesto: u.puesto  || '',
          })),
        });
      } catch (e) {
        console.error('[Gerencia] Error cargando empleados:', e);
        $w(HTML_ID).postMessage({ type: 'wecars-empleados-lista', empleados: [] });
      }
    }

    // ── Actualizar cliente (reasignar vendedor, estatus, etc.) ────────
    if (data.type === 'wecars-cliente-actualizar' && data.clienteId) {
      const _cambiosSolicitados = data.cambios || {};
      // Fail-closed: estatusExpediente SOLO puede modificarse vía avanzarEstado() / wecars-estado-avanzar.
      // Si el request lo incluye, se rechaza toda la operación — no se actualiza ningún campo.
      if (_cambiosSolicitados.estatusExpediente !== undefined) {
        console.warn('[Gerencia] Intento de modificar estatusExpediente via wecars-cliente-actualizar — rechazado. Usa wecars-estado-avanzar.');
        return;
      }
      // Whitelist de campos permitidos para actualización directa de ClientRecords.
      const _CAMPOS_PERMITIDOS_GE = ['vendedorAsignado', 'vendedorNombre', 'estatus', 'origen', 'notas', 'listoParaFacturar'];
      const _cambiosFiltrados = {};
      _CAMPOS_PERMITIDOS_GE.forEach((k) => { if (_cambiosSolicitados[k] !== undefined) _cambiosFiltrados[k] = _cambiosSolicitados[k]; });
      wixData.get('ClientRecords', data.clienteId)
        .then((item) => {
          // A1: capturar vendedor anterior antes de sobrescribir
          const vendedorAnterior = item.vendedorAsignado || '';
          const vendedorNuevo = _cambiosFiltrados.vendedorAsignado;
          return wixData.update('ClientRecords', Object.assign({}, item, _cambiosFiltrados, { ultimaActividad: new Date() }), { suppressAuth: true })
            .then(() => ({ vendedorAnterior, vendedorNuevo, item }));
        })
        .then(({ vendedorAnterior, vendedorNuevo, item }) => {
          const promesas = [];

          // A1: log de reasignación en Activities e Historial
          if (vendedorNuevo && vendedorNuevo !== vendedorAnterior) {
            promesas.push(
              registrarActividad({
                tipo: 'vendedor_reasignado',
                clienteId: data.clienteId,
                entidadTipo: 'cliente', entidadId: data.clienteId,
                vendedorEmail: gerenciaEmail || '',
                metadata: { vendedorAnterior, vendedorNuevo, clienteNombre: item.nombre || '' },
              }).catch(() => {})
            );
            promesas.push(
              wixData.insert('Historial', {
                clienteId: data.clienteId,
                tipo: 'reasignacion',
                descripcion: `Reasignado de ${vendedorAnterior || 'sin asignar'} → ${vendedorNuevo}`,
                estadoAnterior: vendedorAnterior,
                estadoNuevo: vendedorNuevo,
                realizadoPor: gerenciaEmail || '',
                fecha: new Date(),
              }, { suppressAuth: true }).catch(() => {})
            );
          }

          // Sincronizar ALeads para que las vistas sin asignar no muestren stale data
          if (data.cambios && data.cambios.vendedorAsignado) {
            promesas.push(
              wixData.query('ALeads')
                .eq('clienteId', data.clienteId)
                .find({ suppressAuth: true })
                .then((r) => Promise.all(r.items.map((l) =>
                  wixData.update('ALeads', Object.assign({}, l, {
                    vendedorAsignado: data.cambios.vendedorAsignado,
                    vendedorNombre: data.cambios.vendedorNombre || data.cambios.vendedorAsignado,
                    estatusLead: l.estatusLead === 'sin_asignar' || !l.estatusLead ? 'asignado' : l.estatusLead
                  }), { suppressAuth: true })
                ))).catch((e) => console.warn('[Gerencia] No se pudo sincronizar ALeads:', e))
            );
          }

          return Promise.all(promesas);
        })
        .then(() => {
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-estado-update', clienteId: data.clienteId }); } catch (e) {}
        })
        .catch((e) => console.error('[Gerencia] Error actualizando cliente:', e));
    }

    // ── Crear prospecto nuevo (con anti-duplicado por teléfono) ──────
    if (data.type === 'wecars-cliente-nuevo' && data.datos) {
      // R-01: los defaults van al final para que NO puedan ser pisados por el HTML.
      const datosNuevo = Object.assign({}, data.datos, { origen: 'Gerencia', estatusExpediente: 'nuevo_lead' });
      delete datosNuevo._id;
      const tel = String(datosNuevo.telefono || '').replace(/\D/g, '');
      const vars = [tel];
      if (tel.length === 10) { vars.push('52' + tel); vars.push('521' + tel); }
      wixData.query('ClientRecords').hasSome('telefono', vars).limit(1).find({ suppressAuth: true })
        .then(async (r) => {
          if (r.items.length) {
            const ex = r.items[0];
            const msg = 'Este teléfono ya está registrado' + (ex.vendedorAsignado ? ' — cliente de ' + (ex.vendedorNombre || ex.vendedorAsignado) : '');
            $w(HTML_ID).postMessage({ type: 'wecars-cliente-nuevo-ok', cliente: ex, nombre: ex.nombre, yaExistia: true, mensaje: msg });
            return;
          }
          const item = await wixData.insert('ClientRecords', datosNuevo, { suppressAuth: true });
          $w(HTML_ID).postMessage({ type: 'wecars-cliente-nuevo-ok', cliente: item, nombre: item.nombre });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-cliente-nuevo', cliente: item }); } catch (e) {}
          if (data.tareaExtra && data.tareaExtra.asignadoA) {
            const tarea = Object.assign({ col: 'por-hacer', prior: 'media' }, data.tareaExtra);
            delete tarea._id;
            try {
              const tareaItem = await wixData.insert('Tasks', tarea, { suppressAuth: true });
              try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-tarea-asignada', tarea: tareaItem }); } catch(e) {}
            } catch(e) { console.error('[Gerencia] Error creando tarea de seguimiento:', e); }
          }
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-cliente-nuevo-error', error: String(e) }));
    }

    // ── Eliminar contacto (solo Gerencia / Admin) ─────────────────────
    if (data.type === 'wecars-cliente-eliminar-ge' && data.clienteId) {
      eliminarCliente(data.clienteId)
        .then(() => {
          $w(HTML_ID).postMessage({ type: 'wecars-cliente-eliminado-ge', clienteId: data.clienteId });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-cliente-eliminado', clienteId: data.clienteId }); } catch (e) {}
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-cliente-eliminado-ge', error: String(e), clienteId: data.clienteId }));
    }

    // ── Motor de estados del expediente ──────────────────────────────
    if (data.type === 'wecars-estado-avanzar' && data.clienteId && data.nuevoEstado) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).then((p) => ({ email, p })))
        .then(({ email, p }) =>
          avanzarEstado(data.clienteId, data.nuevoEstado, data.comentario || '', email, p.nombre || email, p.rol)
        )
        .then((resultado) => {
          $w(HTML_ID).postMessage({ type: 'wecars-estado-resultado', ...resultado, clienteId: data.clienteId });
          if (resultado.ok) {
            const bc = { type: 'wecars-estado-update', clienteId: data.clienteId, nuevoEstado: data.nuevoEstado, movimiento: resultado.movimiento };
            try { new BroadcastChannel('wecars-erp-v2').postMessage(bc); } catch (e) {}
            // Si se cerró la venta, notificar a todos los paneles con la venta completa
            if (data.nuevoEstado === 'venta_cerrada' && resultado.ventaCerrada) {
              try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-venta-cerrada', clienteId: data.clienteId, movimiento: resultado.movimiento }); } catch (e) {}
            }
          }
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-estado-resultado', ok: false, error: String(e), clienteId: data.clienteId }));
    }

    // ── Historial del expediente → wecars-historial-datos ────────────
    if (data.type === 'wecars-historial-obtener' && data.clienteId) {
      obtenerHistorialFlujo(data.clienteId)
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-historial-datos', clienteId: data.clienteId, historial: items }))
        .catch((e) => console.error('[Gerencia] Error cargando historial:', e));
    }

    // ── Publicaciones: historial global (Gerencia) ───────────────────
    if (data.type === 'wecars-ge-pub-historial-solicitar') {
      geObtenerHistorialPub(data.filtros || {})
        .then(items => $w(HTML_ID).postMessage({ type: 'wecars-ge-pub-historial-datos', items }))
        .catch(e => $w(HTML_ID).postMessage({ type: 'wecars-ge-pub-historial-datos', items: [], error: String(e) }));
    }

    // ── Publicaciones: lista de cuentas sociales (Gerencia) ──────────
    if (data.type === 'wecars-ge-pub-cuentas-solicitar') {
      geObtenerCuentasSociales()
        .then(cuentas => $w(HTML_ID).postMessage({ type: 'wecars-ge-pub-cuentas-datos', cuentas }))
        .catch(e => $w(HTML_ID).postMessage({ type: 'wecars-ge-pub-cuentas-datos', cuentas: [], error: String(e) }));
    }

    // ── Alertas y notas a vendedores (broadcast) ─────────────────────
    if (data.type === 'wecars-alerta-vendedor') {
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-alerta-vendedor', ...data }); } catch (e) {}
    }

    if (data.type === 'wecars-nota-vendedor') {
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'ge-nota-vendedor', ...data }); } catch (e) {}
    }

    // ── Registrar bono ────────────────────────────────────────────────
    if (data.type === 'wecars-bono-registrar' && data.vendedor) {
      const bono = {
        vendedorEmail:  data.vendedor,
        vendedorNombre: data.nombre   || '',
        monto:          data.monto    || 0,
        tipo:           'Bono',
        concepto:       data.mensaje  || '',
        estatus:        'Pendiente',
        fecha:          new Date(),
      };
      insertarComision(bono)
        .then(() => {
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'bono-puntos', vendedor: data.vendedor, monto: data.monto }); } catch (e) {}
          return obtenerBonosHistorial();
        })
        .then((items) => {
          $w(HTML_ID).postMessage({ type: 'wecars-bonos-historial', items });
        })
        .catch((e) => console.error('[Gerencia] Error registrando bono:', e));
    }

    // ── Solicitar historial de bonos desde CMS ─────────────────────────
    if (data.type === 'wecars-bonos-solicitar') {
      obtenerBonosHistorial()
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-bonos-historial', items }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-bonos-historial', items: [] }));
    }

    // ── Crear empleado desde gerencia ─────────────────────────────────
    if (data.type === 'wecars-empleado-crear' && data.datos) {
      const emp = Object.assign({ activo: true, fechaIngreso: new Date() }, data.datos);
      delete emp._id;
      wixData.insert('Usuarios', emp)
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-empleado-creado', empleado: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-empleado-crear', datos: item }); } catch (e) {}
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-empleado-error', error: String(e) }));
    }

    // ── ConfigERP: leer/guardar configuración del ERP ─────────────────
    if (data.type === 'wecars-config-obtener' && data.clave) {
      try {
        const valor = await getErpConfig(data.clave);
        $w(HTML_ID).postMessage({ type: 'wecars-config-valor', clave: data.clave, valor });
      } catch (e) {
        $w(HTML_ID).postMessage({ type: 'wecars-config-valor', clave: data.clave, valor: null });
      }
    }

    if (data.type === 'wecars-config-guardar' && data.clave) {
      setErpConfig(data.clave, data.valor, data.descripcion || '')
        .then(() => $w(HTML_ID).postMessage({ type: 'wecars-config-guardada', clave: data.clave, ok: true }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-config-guardada', clave: data.clave, ok: false, error: String(e) }));
    }

    // ── Verifica tu Auto — Gerencia (solo lectura) ───────────────────
    if (data.type === 'wecars-vta-solicitar') {
      wixData.query('VerificaAuto').descending('_createdDate').limit(200).find({ suppressAuth: true })
        .then(r  => $w(HTML_ID).postMessage({ type: 'wecars-vta-datos', items: r.items }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-vta-datos', items: [] }));
    }

    // ── Verifica tu Auto — guardar links de documentos (Gerencia) ───
    if (data.type === 'wecars-vta-guardar' && data.id) {
      wixData.get('VerificaAuto', data.id, { suppressAuth: true })
        .then(async (actual) => {
          const actualizado = Object.assign({}, actual, {
            facturaDoc:            data.facturaDoc            !== undefined ? (data.facturaDoc || null)            : actual.facturaDoc,
            ineDoc:                data.ineDoc                !== undefined ? (data.ineDoc || null)                : actual.ineDoc,
            tenenciaDoc:           data.tenenciaDoc           !== undefined ? (data.tenenciaDoc || null)           : actual.tenenciaDoc,
            tarjetaCirculacionDoc: data.tarjetaCirculacionDoc !== undefined ? (data.tarjetaCirculacionDoc || null) : actual.tarjetaCirculacionDoc,
            otrosDoc:              data.otrosDoc              !== undefined ? (data.otrosDoc || null)              : actual.otrosDoc,
          });
          const guardado = await wixData.update('VerificaAuto', actualizado, { suppressAuth: true });
          $w(HTML_ID).postMessage({ type: 'wecars-vta-guardado', ok: true, id: data.id, item: guardado });
        })
        .catch(e => $w(HTML_ID).postMessage({ type: 'wecars-vta-guardado', ok: false, id: data.id, error: String(e) }));
    }

    // ── Guardar mensaje enviado al equipo en Activities ────────────────
    if (data.type === 'wecars-mensaje-guardar' && data.mensaje) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ nombre: email, rol: 'Gerencia' })).then((p) =>
          registrarActividad({
            tipo: 'mensaje-gerencia',
            clienteId: data.destinatarioEmail || 'equipo',
            entidadTipo: 'sistema', entidadId: data.destinatarioEmail || 'equipo',
            vendedorEmail: email,
            vendedorNombre: p.nombre || email,
            descripcion: data.mensaje,
            resultado: data.tipoMensaje || 'General',
            metadata: {
              destinatario: data.destinatarioEmail || 'equipo',
              destinatarioNombre: data.destinatarioNombre || 'Todo el equipo',
            },
          })
        ))
        .then(() => {
          // Devolver historial actualizado de mensajes
          return wixData.query('Activities').eq('tipo', 'mensaje-gerencia').descending('fecha').limit(30).find({ suppressAuth: true });
        })
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-mensajes-historial', items: r.items }))
        .catch((e) => console.error('[Gerencia] Error guardando mensaje:', e));
    }

    // ── Registrar acción en Historial (notas privadas, etc.) ──────────
    if (data.type === 'wecars-accion-registrar' && data.clienteId) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ nombre: email })).then((p) =>
          wixData.insert('Historial', {
            clienteId:    data.clienteId,
            accion:       data.accion || 'Nota',
            estadoAnterior: '',
            estadoNuevo:  '',
            usuario:      email,
            usuarioNombre: p.nombre || email,
            comentario:   data.comentario || '',
            timestamp:    new Date(),
          }, { suppressAuth: true })
        ))
        .catch((e) => console.error('[Gerencia] Error registrando acción:', e));
    }

    // ── Solicitar historial de mensajes ────────────────────────────────
    if (data.type === 'wecars-mensajes-solicitar') {
      wixData.query('Activities').eq('tipo', 'mensaje-gerencia').descending('fecha').limit(30).find({ suppressAuth: true })
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-mensajes-historial', items: r.items }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-mensajes-historial', items: [] }));
    }

    // ── Solicitar citas de todos los vendedores (agenda gerencia) ──────
    if (data.type === 'wecars-citas-gerencia-solicitar') {
      wixData.query('citas').descending('_createdDate').limit(300).find({ suppressAuth: true })
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-citas-gerencia', items: r.items }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-citas-gerencia', items: [] }));
    }

    // ── Tareas del equipo ─────────────────────────────────────────────
    if (data.type === 'wecars-tareas-solicitar') {
      wixData.query('Tasks').descending('_createdDate').limit(200).find({ suppressAuth: true })
        .catch(() => ({ items: [] }))
        .then(r => $w(HTML_ID).postMessage({ type: 'wecars-tareas-datos', items: r.items }))
        .catch(e => console.error('[Gerencia] Error cargando tareas:', e));
    }

    if (data.type === 'wecars-tarea-crear' && data.datos) {
      const tarea = Object.assign({ col: 'por-hacer', prior: 'media' }, data.datos);
      delete tarea._id;
      wixData.insert('Tasks', tarea, { suppressAuth: true })
        .then(item => {
          $w(HTML_ID).postMessage({ type: 'wecars-tarea-creada', tarea: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-tarea-asignada', tarea: item }); } catch(e) {}
        })
        .catch(e => {
          console.error('[Gerencia] Error creando tarea:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-tarea-error', error: String(e) });
        });
    }

    if (data.type === 'wecars-tarea-actualizar' && data.tareaId) {
      const cambios = data.cambios || {};
      wixData.get('Tasks', data.tareaId)
        .then(item => wixData.update('Tasks', Object.assign({}, item, cambios), { suppressAuth: true }))
        .then(item => {
          $w(HTML_ID).postMessage({ type: 'wecars-tarea-actualizada', tarea: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-tarea-asignada', tarea: item }); } catch(e) {}
        })
        .catch(e => console.error('[Gerencia] Error actualizando tarea:', e));
    }

    if (data.type === 'wecars-tarea-eliminar' && data.tareaId) {
      wixData.remove('Tasks', data.tareaId, { suppressAuth: true })
        .then(() => {
          $w(HTML_ID).postMessage({ type: 'wecars-tarea-eliminada', tareaId: data.tareaId });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-tarea-eliminada', tareaId: data.tareaId }); } catch(e) {}
        })
        .catch(e => console.error('[Gerencia] Error eliminando tarea:', e));
    }

    // ── Cierres de Operación (Rentabilidad) ──────────────────────────
    if (data.type === 'wecars-cierres-solicitar') {
      wixData.query('CierreOperacion').descending('_createdDate').limit(500).find({ suppressAuth: true })
        .then(r => $w(HTML_ID).postMessage({ type: 'wecars-cierres-datos', items: r.items }))
        .catch(e => {
          console.error('[Gerencia] Error cargando cierres:', e);
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
          const resultado = Object.assign({}, creado, { apartados: JSON.parse(creado.apartados || '[]') });
          $w(HTML_ID).postMessage({ type: 'wecars-cierre-creado', cierre: resultado });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-cierre-creado', cierre: resultado }); } catch(e) {}
        })
        .catch(e => {
          console.error('[Gerencia] Error creando cierre:', e);
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
          console.error('[Gerencia] Error actualizando cierre:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cierre-error', error: String(e) });
        });
    }

    // ── Gamificación ──────────────────────────────────────────────────
    if (data.type === 'wecars-gm-guardar') {
      try {
        const result = await gm_guardar(data.datos);
        $w(HTML_ID).postMessage({ type: 'wecars-gm-guardado', ok: result.ok, mes: result.mes });
      } catch (e) {
        $w(HTML_ID).postMessage({ type: 'wecars-gm-guardado', ok: false, error: String(e) });
      }
    }
    if (data.type === 'wecars-gm-obtener-mes') {
      try {
        const items = await gm_obtenerMes(data.mes);
        $w(HTML_ID).postMessage({ type: 'wecars-gm-mes-datos', mes: data.mes, items });
      } catch (e) {
        $w(HTML_ID).postMessage({ type: 'wecars-gm-mes-datos', mes: data.mes, items: [], error: String(e) });
      }
    }
    if (data.type === 'wecars-gm-lista-meses') {
      try {
        const meses = await gm_listasMeses();
        $w(HTML_ID).postMessage({ type: 'wecars-gm-meses-respuesta', meses });
      } catch (e) {
        $w(HTML_ID).postMessage({ type: 'wecars-gm-meses-respuesta', meses: [] });
      }
    }
    if (data.type === 'wecars-gm-cerrar-mes') {
      try {
        const result = await gm_cerrarMesAnterior();
        $w(HTML_ID).postMessage({ type: 'wecars-gm-mes-cerrado', ...result });
      } catch (e) {
        $w(HTML_ID).postMessage({ type: 'wecars-gm-mes-cerrado', ok: false, error: String(e) });
      }
    }

    // ── Leads ───────────────────────────────────────────────────────────
    if (data.type === 'wecars-leads-solicitar') { enviarLeadsGerencia(); }

    if (data.type === 'wecars-lead-asignar' && data.leadId) {
      // registrarActividad se hace dentro de asignarLead (backend) — solo refrescar UI
      asignarLead(data.leadId, data.vendedorEmail || '', data.vendedorNombre || '')
        .then(() => enviarLeadsGerencia())
        .catch((e) => console.error('[Gerencia] Error asignando lead:', e));
    }

    if (data.type === 'wecars-lead-estatus' && data.leadId) {
      actualizarEstatusLead(data.leadId, data.nuevoEstatus)
        .catch((e) => console.error('[Gerencia] Error actualizando estatus lead:', e));
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
            descripcion: data.texto || data.nota || '',
          })))
        .catch((e) => console.error('[Gerencia] Error guardando nota lead:', e));
    }

    if (data.type === 'wecars-lead-convertir' && data.leadId && data.lead) {
      const l = data.lead;
      // Usar crearClienteSeguro para dedup por teléfono/correo antes de insertar
      crearClienteSeguro({
        nombre:            l.nombre   || '',
        telefono:          l.telefono || '',
        correo:            l.correo   || '',
        origen:            l.origen   || 'Sitio web',
        estatusExpediente: 'nuevo_lead',
        vendedorAsignado:  l.vendedorAsignado  || '',
        vendedorNombre:    l.vendedorNombre    || '',
        ultimaActividad:   new Date(),
        leadId:            l._id,
        vehiculoInteres:   l.interes || l.vehiculoInteres || '',
        resumen:           l.resumen || '',
      })
        .then((res) => {
          if (res.yaExiste) {
            // Ya existe — enlazar el lead al ClientRecord existente sin duplicar
            $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: true, yaExistia: true, clienteId: res.clienteId, mensaje: res.mensaje, leadId: data.leadId });
          } else if (res.ok) {
            $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: true, yaExistia: false, clienteId: res.clienteId, leadId: data.leadId });
          } else {
            $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: false, error: res.error || 'Error desconocido', leadId: data.leadId });
            return;
          }
          // Vincular clienteId en el ALeads para que la deduplicación en contactos funcione
          return vincularClienteALead(data.leadId, res.clienteId);
        })
        .then(() => enviarLeadsGerencia())
        .catch((e) => {
          console.error('[Gerencia] Error convirtiendo lead:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: false, error: String(e), leadId: data.leadId });
        });
    }

    // ── Centro de Supervisión Comercial (Fase 4) ──────────────────────

    // Nivel 1: resumen del equipo para una fecha
    if (data.type === 'wecars-supervision-solicitar') {
      fetchResumenEquipo(data.fecha || null)
        .then((resumen) => $w(HTML_ID).postMessage({ type: 'wecars-supervision-datos', ...resumen }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-supervision-datos', error: String(e) }));
    }

    // Nivel 2: timeline de un vendedor (paginado)
    if (data.type === 'wecars-timeline-solicitar' && data.vendedorEmail) {
      fetchTimelineVendedor(data.vendedorEmail, data.fecha || null, data.limit || 50, data.skip || 0)
        .then((resultado) => $w(HTML_ID).postMessage({ type: 'wecars-timeline-datos', vendedorEmail: data.vendedorEmail, ...resultado }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-timeline-datos', ok: false, error: String(e), vendedorEmail: data.vendedorEmail }));
    }

    // Nivel 3: evidencia del CSM — solo al hacer click (on-demand)
    if (data.type === 'wecars-evidencia-solicitar' && data.entidadTipo && data.entidadId) {
      fetchEvidencia(data.entidadTipo, data.entidadId)
        .then((resultado) => $w(HTML_ID).postMessage({ type: 'wecars-evidencia-datos', actividadId: data.actividadId || '', ...resultado }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-evidencia-datos', ok: false, motivo: 'error_interno', error: String(e) }));
    }

    // ── Créditos — Gerencia ───────────────────────────────────────────
    if (data.type === 'wecars-creditos-solicitar') {
      fetchCreditosGerencia('', 'Gerencia')
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-creditos-datos', items }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-creditos-datos', items: [] }));
    }
    })(); // fin IIFE async
  });

  enviarDatosGerencia();
  enviarLeadsGerencia();
});

// ── Leads — consulta todas las fuentes ────────────────────────────────
function enviarLeadsGerencia() {
  Promise.all([
    // ALeads: leads de inventario, prueba, crédito (excluimos consigna para usar Consignas directamente)
    wixData.query('ALeads').descending('fecha').limit(500).find({ suppressAuth: true }).catch(() => ({ items: [] })),
    // Consignas directamente (fuente canónica)
    wixData.query('Consignas').descending('_createdDate').limit(200).find({ suppressAuth: true }).catch(() => ({ items: [] })),
    // VerificaAuto directamente
    wixData.query('VerificaAuto').descending('fechaSolicitud').limit(200).find({ suppressAuth: true }).catch(() => ({ items: [] })),
    // Vendedores
    wixData.query('Usuarios').limit(100).find({ suppressAuth: true }).catch(() => ({ items: [] })),
  ])
  .then(([aleadsR, consignasR, vtaR, usuariosR]) => {
    // — ALeads: excluir tipo='consigna' (los manejamos desde Consignas)
    const aleads = aleadsR.items.filter(l => l.tipo !== 'consigna');

    // — Consignas → formato lead
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

    // — VerificaAuto → formato lead
    const vtaLeads = vtaR.items.map(v => {
      const st = (v.status || 'Pendiente');
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

    // — Merge y ordenar por fecha desc
    const todos = [...aleads, ...consLeads, ...vtaLeads]
      .sort((a, b) => new Date(b.fecha || b._createdDate || 0) - new Date(a.fecha || a._createdDate || 0));

    $w(HTML_ID).postMessage({
      type:       'wecars-leads',
      leads:      todos,
      vendedores: usuariosR.items.map(u => ({ email: u.email || u.correo || '', nombre: u.nombre || u.name || '' })),
      rolActual:  'Gerencia',
      emailActual: '',
    });
  })
  .catch((e) => {
    console.error('[Gerencia] Error enviando leads:', e);
    $w(HTML_ID).postMessage({ type: 'wecars-leads', leads: [], vendedores: [], rolActual: 'Gerencia', emailActual: '' });
  });
}

$w.onReady.__leadsHandlersGerencia = true; // marca para no duplicar

// Los handlers de leads se agregan DENTRO del $w.onReady existente via este bloque:
// (los mensajes llegan al mismo onMessage definido arriba)
// Agregamos handlers en el onMessage principal buscando los tipos:
//   wecars-leads-solicitar → enviarLeadsGerencia()
//   wecars-lead-asignar    → asignarLead(...)
//   wecars-lead-estatus    → actualizarEstatusLead(...)
//   wecars-lead-nota       → insert en Activities
//   wecars-lead-convertir  → insert en ClientRecords

// ── Carga inicial completa ────────────────────────────────────────────
function enviarDatosGerencia() {
  wixUsers.currentUser.getEmail()
    .then((email) => obtenerPerfil(email).catch(() => null).then((perfil) => ({ email, perfil: perfil || {} })))
    .then(({ email, perfil }) => {
      gerenciaEmail = email; // A1: guardar para logs de reasignación
      const rol = perfil.rol || 'Gerencia';
      const base = {
        emailActual:        email,
        rolActual:          rol,
        nombreActual:       perfil.nombre        || email,
        puestoActual:       perfil.puesto        || '',
        fechaIngresoActual: perfil.fechaIngreso  || null,
      };
      const rolN = String(rol||'').toLowerCase().replace(/[áéíóú]/g,c=>({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]));
      const tieneAcceso = ['gerencia','administracion'].includes(rolN);
      if (!tieneAcceso) {
        $w(HTML_ID).postMessage(Object.assign({
          type: 'wecars-gerencia-datos',
          clientes: [], oportunidades: [], actividades: [], inventario: [],
          facturas: [], ventas: [], empleados: [], citas: [],
        }, base));
        return;
      }
      return Promise.all([
        fetchDatosGerencia(),
        getErpConfig('meta_ventas_mensual').catch(() => null),
        getErpConfig('meta_equipo_mensual').catch(() => null),
      ]).then(([datos, metaVentas, metaEquipo]) => {
        $w(HTML_ID).postMessage(Object.assign({
          type:              'wecars-gerencia-datos',
          clientes:          datos.clientes,
          oportunidades:     datos.oportunidades,
          actividades:       datos.actividades,
          inventario:        datos.inventario,
          facturas:          datos.facturas,
          ventas:            datos.ventas,
          empleados:         datos.empleados.map(u => ({
            _id:    u._id,
            nombre: u.nombre  || u.name  || '',
            email:  u.email   || u.correo || '',
            rol:    u.rol     || '',
            puesto: u.puesto  || '',
          })),
          citas:                        datos.citas,
          metaVentasMensual:            metaVentas ? Number(metaVentas) : 10,
          metaEquipoMensual:            metaEquipo ? Number(metaEquipo) : 12,
          mensajesEquipo:               datos.mensajesEquipo,
          creditos:                     datos.creditos || [],
          publicacionesActivasCarroIds: datos.publicacionesActivasCarroIds || [],
        }, base));
      });
    })
    .catch((err) => {
      console.error('[Gerencia] Error cargando datos:', err);
      $w(HTML_ID).postMessage({
        type: 'wecars-gerencia-datos',
        emailActual: '', rolActual: '', nombreActual: '', puestoActual: '', fechaIngresoActual: null,
        clientes: [], oportunidades: [], actividades: [], inventario: [],
        facturas: [], ventas: [], empleados: [], citas: [],
      });
    });
}
