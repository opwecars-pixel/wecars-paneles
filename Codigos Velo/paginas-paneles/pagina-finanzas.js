// ───────────────────────────────────────────────────────────────────
//  PÁGINA: FINANZAS
//  Elemento HTML ID: #htmlFinanzas
//  Pega SOLO este bloque en { } de la página PANEL DE FINANZAS
//  URL de la página: /panel-finanzas
//
//  Colecciones usadas:
//    ClientRecords   → clientes (A Clientes en CMS)
//    Creditos        → créditos (ya existe con 8 items)
//    Pagos           → NUEVA — créala en CMS
//    Comisiones      → NUEVA — créala en CMS
//    Facturas        → facturas (ya existe en CMS)
//    Ventas          → ventas históricas
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { obtenerPerfil } from 'backend/permisos.jsw';
import { avanzarEstado, obtenerHistorial as obtenerHistorialFlujo, registrarAccion } from 'backend/flujo.jsw';
import { avanzarEstadoCredito } from 'backend/creditos.jsw';
import { fetchDatosFinanzas } from 'backend/datos.jsw';
import { fetchLeads } from 'backend/leads.jsw';
import { registrarPago, actualizarCredito, actualizarClienteFinanzas, liberarComision, pagarComision, insertarComision, editarComision, emitirFactura, marcarClienteFacturado, crearFacturaDesdeCliente } from 'backend/finanzas.jsw';
import { cerrarApartado } from 'backend/apartados.jsw';

const HTML_ID = '#htmlFinanzas';

$w.onReady(function () {
  $w(HTML_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_ID).height = data.height;
    }

    if (data.type === 'wecars-finanzas-solicitar') {
      enviarDatosFinanzas();
    }

    // ── Guardar pago ─────────────────────────────────────────────
    if (data.type === 'wecars-pago-registrado' && data.pago) {
      const pago = Object.assign({}, data.pago);
      delete pago._id;
      registrarPago(pago)
        .catch((e) => console.error('[Finanzas] Error guardando pago:', e));
    }

    // ── Avanzar estado crédito (flujo nuevo) ─────────────────────
    if (data.type === 'wecars-credito-avanzar' && data.creditoId && data.nuevoEstado) {
      // E-06: usar rol real del perfil, no hardcodear 'Finanzas'
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).then((p) => ({ email, rolReal: p.rol || 'Finanzas' })))
        .then(({ email, rolReal }) => avanzarEstadoCredito(data.creditoId, data.nuevoEstado, data.datos || {}, email, rolReal))
        .then((result) => {
          $w(HTML_ID).postMessage({ type: 'wecars-credito-avanzar-resultado', ...result, creditoId: data.creditoId });
          // F-03: usar nombre canónico 'credito-estado-actualizado' — escuchado por
          // Vendedores, Gerencia y Administración (todos los paneles).
          if (result.ok) {
            try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'credito-estado-actualizado', creditoId: data.creditoId, estatus: data.nuevoEstado }); } catch (e) {}
          }
        })
        .catch((e) => console.error('[Finanzas] Error avanzando crédito:', e));
    }

    // ── Actualizar crédito (campos simples sin cambio de estado) ─
    if (data.type === 'wecars-credito-actualizar' && data.creditoId) {
      actualizarCredito(data.creditoId, data.cambios || {})
        .catch((e) => console.error('[Finanzas] Error actualizando crédito:', e));
    }

    // ── Actualizar cliente (estatus financiero, notas) ────────────
    if (data.type === 'wecars-cliente-actualizar' && data.clienteId) {
      actualizarClienteFinanzas(data.clienteId, data.cambios || {})
        .catch((e) => console.error('[Finanzas] Error actualizando cliente:', e));
    }

    // ── Liberar comisión ──────────────────────────────────────────
    if (data.type === 'wecars-comision-liberada' && data.comisionId) {
      // F-05: el HTML de Finanzas ya emite 'comision-liberada' vía _wcBC antes de
      // este postMessage (señal optimista). El Velo NO re-emite BC para evitar
      // el doble-toast en Vendedores y Gerencia.
      liberarComision(data.comisionId)
        .catch((e) => console.error('[Finanzas] Error liberando comisión:', e));
    }

    // ── Marcar comisión pagada ────────────────────────────────────
    if (data.type === 'wecars-comision-pagada' && data.comisionId) {
      pagarComision(data.comisionId)
        .then((result) => {
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-comision-pagada-bc', comisionId: data.comisionId, estatus: 'Pagada', vendedorEmail: result.vendedorEmail, vendedorNombre: result.vendedorNombre, monto: result.monto, concepto: result.concepto }); } catch (e) {}
        })
        .catch((e) => console.error('[Finanzas] Error marcando comisión pagada:', e));
    }

    // ── Registrar nueva comisión ──────────────────────────────────
    if (data.type === 'wecars-comision-nueva' && data.comision) {
      const co = Object.assign({}, data.comision);
      delete co._id;
      insertarComision(co)
        .catch((e) => console.error('[Finanzas] Error registrando comisión:', e));
    }

    // ── Editar comisión (monto, concepto, etc.) ───────────────────
    if (data.type === 'wecars-comision-editar' && data.comisionId) {
      editarComision(data.comisionId, data.cambios || {})
        .catch((e) => console.error('[Finanzas] Error editando comisión:', e));
    }

    // ── Emitir factura ────────────────────────────────────────────
    if (data.type === 'wecars-factura-emitida' && data.facturaId) {
      emitirFactura(data.facturaId)
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-factura-resultado', ok: true, facturaId: data.facturaId, factura: item });
        })
        .catch((e) => {
          console.error('[Finanzas] Error emitiendo factura:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-factura-resultado', ok: false, facturaId: data.facturaId, error: String(e) });
        });
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
            try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-estado-update', clienteId: data.clienteId, nuevoEstado: data.nuevoEstado, movimiento: resultado.movimiento }); } catch (e) {}
          }
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-estado-resultado', ok: false, error: String(e), clienteId: data.clienteId }));
    }

    // ── Cerrar apartado (dar de baja) ────────────────────────────────
    if (data.type === 'wecars-apartado-cerrar' && data.apartadoId) {
      cerrarApartado(data.apartadoId, data.tipoCierre, data.motivo || '')
        .then((resultado) => {
          $w(HTML_ID).postMessage({ type: 'wecars-apartado-cerrado-ok', ...resultado });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'apartado-cerrado', apartadoId: data.apartadoId, tipoCierre: data.tipoCierre, vehiculoId: resultado.vehiculoId }); } catch (e) {}
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-apartado-cerrado-error', error: String(e.message || e) }));
    }

    if (data.type === 'wecars-historial-obtener' && data.clienteId) {
      obtenerHistorialFlujo(data.clienteId)
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-historial-datos', clienteId: data.clienteId, historial: items }));
    }

    if (data.type === 'wecars-accion-registrar' && data.clienteId) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).then((p) => registrarAccion(data.clienteId, data.accion || 'Acción registrada', email, p.nombre || email, data.comentario || '')));
    }

    // ── Crear factura desde cliente (B-03) ───────────────────────
    if (data.type === 'wecars-cliente-facturar' && data.clienteId) {
      crearFacturaDesdeCliente(data.clienteId)
        .then((result) => {
          $w(HTML_ID).postMessage({ type: 'wecars-cliente-facturado-resultado', ok: true, clienteId: data.clienteId, factura: result.factura, folio: result.folio, yaExistia: result.yaExistia, estadoAvanzado: result.estadoAvanzado });
          // F-01: solo emitir BC si el motor de estados realmente escribió
          // estatusExpediente='facturado' en CMS. Si avanzarEstado falló
          // (estado terminal, transición inválida, etc.), no engañar a otros paneles.
          if (result.estadoAvanzado) {
            try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-estado-update', clienteId: data.clienteId, nuevoEstado: 'facturado' }); } catch (e) {}
          }
        })
        .catch((e) => {
          console.error('[Finanzas] Error creando factura:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cliente-facturado-resultado', ok: false, clienteId: data.clienteId, error: String(e) });
        });
    }

    // ── Registrar egreso en CMS ───────────────────────────────────
    if (data.type === 'wecars-egreso-registrado' && data.egreso) {
      const eg = data.egreso;
      wixUsers.currentUser.getEmail()
        .then((email) => wixData.insert('Pagos', {
          tipo:        'Egreso',
          categoria:   eg.categoria || 'General',
          descripcion: eg.descripcion || '',
          monto:       Number(eg.monto) || 0,
          referencia:  eg.ref || '—',
          fecha:       eg.fecha ? new Date(eg.fecha) : new Date(),
          registradoPor: email,
          area:        'Finanzas',
        }, { suppressAuth: true }))
        .then((pago) => {
          $w(HTML_ID).postMessage({ type: 'wecars-egreso-guardado', ok: true, pagoId: pago._id });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'egreso-registrado', pagoId: pago._id, monto: pago.monto, categoria: pago.categoria }); } catch (e) {}
        })
        .catch((e) => console.error('[Finanzas] Error guardando egreso:', e));
    }

    // ── Registrar ingreso/egreso rápido desde mobile ──────────────
    if (data.type === 'wecars-finanza' && data.data) {
      const fn = data.data;
      wixUsers.currentUser.getEmail()
        .then((email) => wixData.insert('Pagos', {
          tipo:        fn.tipo === 'egreso' ? 'Egreso' : 'Ingreso',
          descripcion: fn.concepto || '',
          monto:       Number(fn.monto) || 0,
          fecha:       fn.fecha ? new Date(fn.fecha) : new Date(),
          registradoPor: email,
          area:        'Finanzas',
        }, { suppressAuth: true }))
        .then((pago) => {
          $w(HTML_ID).postMessage({ type: 'wecars-finanza-guardada', ok: true, pagoId: pago._id });
        })
        .catch((e) => console.error('[Finanzas] Error guardando finanza mobile:', e));
    }

    // ── Evento global (broadcast entre paneles, sin CMS) ─────────
    if (data.type === 'wecars-evento-global' && data.evento) {
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-evento-global', evento: data.evento }); } catch (e) {}
    }

    if (data.type === 'wecars-logout') {
      wixUsers.logout().then(() => wixLocation.to('https://www.wecarsbajio.com/entrar'));
    }

    if (data.type === 'wecars-navegar' && data.url) {
      wixLocation.to(data.url);
    }

    if (data.type === 'wecars-leads-solicitar') {
      enviarLeadsFinanzas();
    }
  });

  enviarDatosFinanzas();
  enviarLeadsFinanzas();
});

function enviarLeadsFinanzas() {
  fetchLeads('Finanzas', '')
    .then((leads) => $w(HTML_ID).postMessage({ type: 'wecars-leads', leads, vendedores: [], rolActual: 'Finanzas', emailActual: '' }))
    .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-leads', leads: [], vendedores: [], rolActual: 'Finanzas', emailActual: '' }));
}

function enviarDatosFinanzas() {
  wixUsers.currentUser.getEmail()
    .then((email) => obtenerPerfil(email).catch(() => null).then((perfil) => ({ email, perfil: perfil || {} })))
    .then(({ email, perfil }) => {
      const rol = perfil.rol || 'Gerencia';
      const base = {
        emailActual: email,
        rolActual:   rol,
        nombreActual: perfil.nombre       || email,
        puestoActual: perfil.puesto       || '',
        fechaIngresoActual: perfil.fechaIngreso || null,
      };
      const rolN = String(rol||'').toLowerCase().replace(/[áéíóú]/g,c=>({á:'a',é:'e',í:'i',ó:'o',ú:'u'}[c]));
      const tieneAcceso = ['finanzas','gerencia','administracion'].includes(rolN);
      if (!tieneAcceso) {
        $w(HTML_ID).postMessage(Object.assign({ type: 'wecars-finanzas', clientes: [], creditos: [], pagos: [], comisiones: [], facturas: [] }, base));
        return;
      }
      return fetchDatosFinanzas().then((datos) => {
        const clientes = datos.clientes;
        const creditos = datos.creditos;
        const pagos = datos.pagos;
        const comisiones = datos.comisiones;
        const facturas = datos.facturas;
        const clienteMap = {};
        clientes.forEach((c) => { clienteMap[c._id] = c.nombre || ''; });
        const creditosNorm = creditos.map((c) => Object.assign({}, c, {
          monto:         c.monto         || c.montoAprobado || 0,
          plazo:         c.plazo         || c.plazoMeses    || 0,
          tasa:          c.tasa          || 0,
          enganche:      c.enganche      || 0,
          clienteNombre: c.clienteNombre || clienteMap[c.clienteId] || 'Cliente',
          vehiculo:      c.vehiculo      || c.autoVendido   || '—',
        }));
        const pagosNorm = pagos.map((p) => Object.assign({}, p, {
          clienteNombre: p.clienteNombre || clienteMap[p.clienteId] || '',
        }));
        const comisionesNorm = comisiones.map((co) => Object.assign({}, co, {
          clienteNombre: co.clienteNombre || clienteMap[co.clienteId] || '',
          vehiculo:      co.vehiculo      || co.autoVendido  || '—',
        }));
        $w(HTML_ID).postMessage(Object.assign({
          type: 'wecars-finanzas',
          clientes,
          creditos: creditosNorm,
          pagos: pagosNorm,
          comisiones: comisionesNorm,
          facturas,
        }, base));
      });
    })
    .catch((err) => {
      console.error('[Finanzas] Error cargando datos:', err);
      $w(HTML_ID).postMessage({ type: 'wecars-finanzas', rolActual: '', emailActual: '', nombreActual: '', puestoActual: '', fechaIngresoActual: null, clientes: [], creditos: [], pagos: [], comisiones: [], facturas: [] });
    });
}
