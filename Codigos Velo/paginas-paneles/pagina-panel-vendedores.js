// ───────────────────────────────────────────────────────────────────
//  PÁGINA: PANEL VENDEDORES
//  ID del elemento HTML embebido: #htmlPanelVendedores
//  ID del botón de subida nativo: #uploadButtonExpediente
//
//  ⚠️  IMPORTANTE — verifica en el Wix Editor que:
//    1. El componente HTML embed de esta página tiene ID: htmlPanelVendedores
//    2. El botón de carga tiene ID: uploadButtonExpediente
//
//  Colecciones usadas:
//    ClientRecords, Cars, Opportunities, Activities, Documents,
//    Usuarios, ALeads, Creditos, Consignas, Comisiones, Citas,
//    SolicitudesCompra, Facturas
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { fetchDatosVendedor, fetchInventarioCars } from 'backend/datos.jsw';
import { obtenerPerfil } from 'backend/permisos.jsw';
import { avanzarEstado, obtenerHistorial as obtenerHistorialFlujo } from 'backend/flujo.jsw';
import { gm_guardar, gm_obtenerPropio, gm_obtenerMes } from 'backend/gamificacion-cms.jsw';
import { resolveDocumentUrl } from 'backend/media.jsw';
import { fetchLeads, reclamarLead, actualizarEstatusLead } from 'backend/leads.jsw';
import { registrarActividad, fetchActividadesVendedor } from 'backend/actividades.jsw';
import { crearCredito } from 'backend/creditos.jsw';
import { crearClienteSeguro } from 'backend/clientes.jsw';
import {
  obtenerVehiculos as pubObtenerVehiculos,
  obtenerCuentasAutorizadas as pubObtenerCuentas,
  guardarBorrador as pubGuardarBorrador,
  publicarEnMeta as pubPublicarEnMeta,
  obtenerHistorial as pubObtenerHistorial,
  generarTexto as pubGenerarTexto,
} from 'backend/publicaciones.jsw';

const HTML_ID        = '#htmlPanelVendedores';
const UPLOAD_BUTTON_ID = '#uploadButtonExpediente';

let clienteParaSubida        = null;
let tipoDocumentoParaSubida  = '';
let razonSocialParaSubida    = '';
let folioFiscalParaSubida    = '';
let montoParaSubida          = '';
let vendedorEmailActual      = '';

$w.onReady(function () {

  // Enviar datos al iframe de inmediato (evita race condition con wecars-panel-ready)
  enviarClientes();
  enviarInventarioPanel();
  enviarComisiones();
  enviarLeadsVendedor();
  enviarConsignasVendedor();

  // ── Botón nativo de subida de documentos ──────────────────────────
  try {
    $w(UPLOAD_BUTTON_ID).hide();          // oculto hasta que el iframe lo solicite
    $w(UPLOAD_BUTTON_ID).onChange(() => {
      subirArchivoSeleccionado();
    });
  } catch (err) {
    console.warn('[Panel] uploadButtonExpediente no encontrado en la página:', err);
  }

  // ── Escucha de mensajes del iframe ────────────────────────────────
  $w(HTML_ID).onMessage((event) => {
    const data = event.data;
    if (!data || !data.type) return;

    // Resize
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_ID).height = data.height;
    }

    // Navegación y logout
    if (data.type === 'wecars-navegar' && data.url) {
      wixLocation.to(data.url);
    }
    if (data.type === 'wecars-logout') {
      wixUsers.logout().then(() => wixLocation.to('https://www.wecarsbajio.com/entrar'));
    }

    // Panel listo → cargar datos
    if (data.type === 'wecars-panel-ready') {
      enviarClientes();
      enviarInventarioPanel();
      enviarComisiones();
      enviarLeadsVendedor();
    }

    // Re-enviar datos cuando el dropdown de vendedores estaba vacío al abrir el modal
    if (data.type === 'wecars-vendedor-datos-solicitar') {
      enviarClientes();
    }

    // Detalle de cliente
    if (data.type === 'wecars-cliente-detalle' && data.clienteId) {
      enviarHistorial(data.clienteId);
      enviarDocumentos(data.clienteId);
      enviarOportunidades(data.clienteId);
    }

    // CRUD clientes
    if (data.type === 'wecars-cliente-crear' && data.datos) {
      crearCliente(data.datos);
    }
    if (data.type === 'wecars-cliente-actualizar' && data.clienteId) {
      actualizarCliente(data.clienteId, data.cambios || {});
    }
    if (data.type === 'wecars-cliente-eliminar' && data.clienteId) {
      // Solo Administración / Gerencia pueden eliminar — verificar rol en backend
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email))
        .then((p) => {
          const rolOk = ['Administración', 'Gerencia', 'Admin'].includes(p.rol);
          if (!rolOk) {
            $w(HTML_ID).postMessage({ type: 'wecars-cliente-eliminar-error', error: 'No tienes permiso para eliminar clientes. Contacta a Administración.' });
            return;
          }
          eliminarCliente(data.clienteId);
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-cliente-eliminar-error', error: String(e) }));
    }

    // Próximo paso / seguimiento
    if (data.type === 'wecars-prox-paso' && data.clienteId) {
      wixData.get('ClientRecords', data.clienteId)
        .then((c) => wixData.update('ClientRecords', Object.assign({}, c, {
          proximoSeguimiento: data.proximoSeguimiento || null,
          razonCierre:        data.razonCierre        || c.razonCierre || '',
          ultimaActividad:    new Date(),
        })))
        .then(() => {
          if (data.nota) {
            registrarActividad({
              tipo: 'nota',
              clienteId: data.clienteId,
              entidadTipo: 'cliente', entidadId: data.clienteId,
              vendedorEmail: vendedorEmailActual,
              descripcion: data.nota,
            }).catch(() => {});
          }
        })
        .catch((e) => console.error('[Panel] Error guardando próximo paso:', e));
    }

    // Visibilidad del botón de upload (controlada por el tab Documentos)
    if (data.type === 'wecars-show-upload') {
      try { $w(UPLOAD_BUTTON_ID).show(); } catch (_) {}
    }
    if (data.type === 'wecars-hide-upload') {
      try { $w(UPLOAD_BUTTON_ID).hide(); } catch (_) {}
    }

    // Selección de cliente para subida
    if (data.type === 'wecars-cliente-seleccionado' && data.clienteId) {
      clienteParaSubida       = data.clienteId;
      tipoDocumentoParaSubida = data.tipoDocumento  || 'Documento general';
      razonSocialParaSubida   = data.razonSocial    || '';
      folioFiscalParaSubida   = data.folioFiscal    || '';
      montoParaSubida         = data.monto          || '';
    }

    // Validar documento
    if (data.type === 'wecars-documento-validar' && data.documentoId) {
      validarDocumento(data.documentoId, data.estatus, data.motivoRechazo);
    }

    // Oportunidades
    if (data.type === 'wecars-oportunidad-crear' && data.clienteId) {
      crearOportunidad(data.clienteId, data.datos || {});
    }
    if (data.type === 'wecars-oportunidad-actualizar' && data.oportunidadId) {
      actualizarOportunidad(data.oportunidadId, data.cambios || {});
    }

    // Actividades
    if (data.type === 'wecars-actividad-crear' && data.clienteId) {
      crearActividad(data.clienteId, data.datos || {});
    }
    // Actividad desde modal WhatsApp (estructura diferente)
    if (data.type === 'wecars-actividad' && data.clienteId && data.actividad) {
      const act = data.actividad;
      registrarActividad({
        tipo:         act.tipo       || 'whatsapp',
        clienteId:    data.clienteId,
        entidadTipo: 'cliente', entidadId: data.clienteId,
        vendedorEmail: vendedorEmailActual,
        vendedorNombre: act.autor    || vendedorEmailActual,
        descripcion:  act.detalle   || act.descripcion || '',
        resultado:    act.resultado || '',
      }).catch((e) => console.error('[Panel] Error actividad WA:', e));
    }

    // Inventario
    if (data.type === 'wecars-auto-actualizar' && data.carId) {
      actualizarAuto(data.carId, data.cambios || {});
    }
    if (data.type === 'wecars-inventario-panel') {
      enviarInventarioPanel();
    }

    // Facturas emitidas
    if (data.type === 'wecars-facturas-emitidas-solicitar') {
      enviarFacturasEmitidas();
    }

    // Comisiones
    if (data.type === 'wecars-comisiones-solicitar') {
      enviarComisiones();
    }

    // Citas / Agenda — Solicitar citas existentes del CMS
    if (data.type === 'wecars-citas-solicitar') {
      wixUsers.currentUser.getEmail()
        .then((email) => wixData.query('citas').eq('vendedorId', email).descending('_createdDate').limit(100).find({ suppressAuth: true }))
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-citas-datos', items: r.items }))
        .catch((e) => {
          console.error('[Panel] Error cargando citas:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-citas-datos', items: [] });
        });
    }

    // Citas / Agenda — Crear
    if (data.type === 'wecars-cita-crear' && data.datos) {
      const cita = Object.assign({}, data.datos, { createdAt: new Date() });
      const tempId = cita._id || null;
      delete cita._id;
      wixData.insert('citas', cita)
        .then((item) => {
          // Retroalimentar HTML con el ID real del CMS para que reemplace el temporal
          $w(HTML_ID).postMessage({ type: 'wecars-cita-creada', cita: item, tempId });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-citas-update', cita: item }); } catch (e) {}
          registrarActividad({
            tipo: 'cita_agendada',
            clienteId: item.clienteId || '',
            citaId: item._id,
            entidadTipo: 'cita', entidadId: item._id,
            vendedorEmail: vendedorEmailActual,
            metadata: { fecha: item.fecha || item.createdAt, clienteId: item.clienteId },
          }).catch(() => {});
        })
        .catch((e) => {
          console.error('[Panel] Error creando cita:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cita-creada', error: String(e), tempId });
        });
    }

    // Citas / Agenda — Actualizar
    if (data.type === 'wecars-cita-actualizar' && data.id && data.datos) {
      wixData.get('citas', data.id)
        .then((existente) => wixData.update('citas', Object.assign({}, existente, data.datos)))
        .then((item) => {
          $w(HTML_ID).postMessage({ type: 'wecars-cita-actualizada', cita: item });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-citas-update', cita: item }); } catch (e) {}
        })
        .catch((e) => {
          console.error('[Panel] Error actualizando cita:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cita-actualizada', error: String(e) });
        });
    }

    // Citas / Agenda — Eliminar
    if (data.type === 'wecars-cita-eliminar' && data.id) {
      wixData.remove('citas', data.id)
        .then(() => {
          $w(HTML_ID).postMessage({ type: 'wecars-cita-eliminada', id: data.id });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-citas-update', eliminadaId: data.id }); } catch (e) {}
        })
        .catch((e) => {
          console.error('[Panel] Error eliminando cita:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-cita-eliminada', error: String(e), id: data.id });
        });
    }

    // Solicitud de compra
    if (data.type === 'wecars-solicitud-compra' && data.solicitud) {
      const sol = Object.assign({}, data.solicitud);
      delete sol._id;
      wixData.insert('SolicitudesCompra', sol)
        .then((item) => {
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-solicitud-compra-nueva', solicitud: item }); } catch (e) {}
        })
        .catch((e) => console.error('[Panel] Error creando solicitud de compra:', e));
    }

    // ── Gamificación ──────────────────────────────────────────────────
    if (data.type === 'wecars-gm-guardar' && data.datos) {
      gm_guardar(data.datos)
        .then((result) => $w(HTML_ID).postMessage({ type: 'wecars-gm-guardado', ok: result.ok, mes: result.mes }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-gm-guardado', ok: false, error: String(e) }));
    }
    if (data.type === 'wecars-gm-historial-propio') {
      wixUsers.currentUser.getEmail()
        .then((email) => gm_obtenerPropio(email))
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-gm-historial-datos', items }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-gm-historial-datos', items: [], error: String(e) }));
    }
    if (data.type === 'wecars-gm-ranking-solicitar') {
      gm_obtenerMes()
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-gm-ranking-datos', items }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-gm-ranking-datos', items: [], error: String(e) }));
    }

    // ── Tareas asignadas al vendedor ──────────────────────────────────
    if (data.type === 'wecars-tareas-solicitar') {
      wixUsers.currentUser.getEmail()
        .then((email) => wixData.query('Tasks').eq('asignadoA', email).descending('_createdDate').limit(200).find())
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-tareas-datos', items: r.items }))
        .catch((e) => {
          console.error('[Panel Vendedores] Error cargando tareas:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-tareas-datos', items: [] });
        });
    }

    // ── Crear tarea propia del vendedor ──────────────────────────────
    if (data.type === 'wecars-tarea-crear' && data.tarea) {
      wixUsers.currentUser.getEmail()
        .then((email) => {
          const item = {
            titulo:     data.tarea.titulo || 'Sin título',
            desc:       data.tarea.desc || '',
            col:        data.tarea.col || 'por-hacer',
            prior:      data.tarea.prior || 'Normal',
            checklist:  data.tarea.checklist || '[]',
            historial:  data.tarea.historial || '[]',
            tipo:       'propia',
            asignadoA:  email,
            asignadoPor: email,
          };
          return wixData.insert('Tasks', item);
        })
        .then((saved) => $w(HTML_ID).postMessage({ type: 'wecars-tarea-creada', tarea: saved }))
        .catch((e) => console.error('[Vendedor] Error creando tarea propia:', e));
    }

    // ── Mover tarea entre columnas ────────────────────────────────────
    if (data.type === 'wecars-tarea-actualizar' && data.tareaId) {
      wixData.get('Tasks', data.tareaId)
        .then(item => wixData.update('Tasks', Object.assign({}, item, data.cambios || {}), { suppressAuth: true }))
        .then(item => $w(HTML_ID).postMessage({ type: 'wecars-tarea-actualizada', tarea: item }))
        .catch(e => console.error('[Vendedor] Error actualizando tarea:', e));
    }

    // ── Avanzar estado del expediente ────────────────────────────────
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

    // ── Historial del expediente ──────────────────────────────────────
    if (data.type === 'wecars-historial-obtener' && data.clienteId) {
      obtenerHistorialFlujo(data.clienteId)
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-historial-datos', clienteId: data.clienteId, historial: items }))
        .catch((e) => console.error('[Panel] Error cargando historial flujo:', e));
    }

    // ── Actividad Comercial ───────────────────────────────────────────
    if (data.type === 'wecars-actividades-solicitar') {
      wixUsers.currentUser.getEmail()
        .then((email) => fetchActividadesVendedor(email, data.fecha, data.fecha))
        .then((actividades) => $w(HTML_ID).postMessage({ type: 'wecars-actividades-datos', actividades }))
        .catch(() => $w(HTML_ID).postMessage({ type: 'wecars-actividades-datos', actividades: [] }));
    }
    if (data.type === 'wecars-actividad-manual' && data.datos) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ nombre: email }))
          .then((p) => registrarActividad(Object.assign({}, data.datos, {
            vendedorEmail:  email,
            vendedorNombre: p.nombre || email,
            entidadTipo:    'manual',
            entidadId:      '',
          })))
        )
        .then(() => $w(HTML_ID).postMessage({ type: 'wecars-actividad-manual-ok' }))
        .catch((e) => console.error('[Panel] Error guardando actividad manual:', e));
    }

    // ── Refrescar clientes (pedido por el HTML tras actualizaciones BC) ─
    if (data.type === 'wecars-clientes-solicitar') {
      enviarClientes();
      enviarInventarioPanel();
    }

    // ── Leads ─────────────────────────────────────────────────────────
    if (data.type === 'wecars-leads-solicitar') {
      enviarLeadsVendedor();
    }

    if (data.type === 'wecars-consignas-solicitar') {
      enviarConsignasVendedor();
    }

    if (data.type === 'wecars-lead-reclamar' && data.leadId) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ nombre: email }))
          .then((p) => reclamarLead(data.leadId, email, p.nombre || email)
            .then((r) => ({ r, email, nombre: p.nombre || email }))))
        .then(({ r }) => {
          $w(HTML_ID).postMessage({ type: 'wecars-lead-reclamar-resultado', ...r, leadId: data.leadId });
          if (r.ok) {
            enviarLeadsVendedor();
            // Si se creó un ClientRecord nuevo, refrescar la lista de clientes
            if (r.cliente) { enviarClientes(); }
          }
        })
        .catch((e) => console.error('[Vendedor] Error reclamando lead:', e));
    }

    if (data.type === 'wecars-lead-estatus' && data.leadId) {
      actualizarEstatusLead(data.leadId, data.nuevoEstatus)
        .catch((e) => console.error('[Vendedor] Error actualizando estatus lead:', e));
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
        .catch((e) => console.error('[Vendedor] Error guardando nota lead:', e));
    }

    // ── Convertir lead a cliente ──────────────────────────────────────
    if (data.type === 'wecars-lead-convertir' && data.leadId && data.lead) {
      const l = data.lead;
      const tel = String(l.telefono || '').replace(/\D/g, '');
      // Dedup: buscar si ya existe un ClientRecord de este lead (por teléfono o leadId)
      const buscarDup = tel
        ? wixData.query('ClientRecords').hasSome('telefono', [tel, '52'+tel, '521'+tel]).limit(1).find({ suppressAuth: true }).catch(() => ({ items: [] }))
        : wixData.query('ClientRecords').eq('leadId', data.leadId).limit(1).find({ suppressAuth: true }).catch(() => ({ items: [] }));
      buscarDup.then((dupR) => {
        if (dupR.items.length) {
          // Ya existe — solo cerrar el lead
          const c = dupR.items[0];
          return actualizarEstatusLead(data.leadId, 'convertido')
            .catch(() => {})
            .then(() => {
              $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: true, clienteId: c._id, leadId: data.leadId, yaExistia: true });
              enviarLeadsVendedor();
              enviarClientes();
            });
        }
        const cliente = {
          nombre:            l.nombre   || '',
          telefono:          tel        || l.telefono || '',
          correo:            l.correo   || '',
          origen:            l.pagina   || l.origen || 'Lead',
          vehiculoInteres:   l.interes  || l.resumen || '',
          notas:             l.resumen  || '',
          estatusExpediente: 'nuevo_lead',
          vendedorAsignado:  l.vendedorAsignado || vendedorEmailActual,
          vendedorNombre:    l.vendedorNombre   || '',
          ultimaActividad:   new Date(),
          leadId:            l._id,
          departamentoActual: 'Vendedor',
        };
        return wixData.insert('ClientRecords', cliente, { suppressAuth: true })
          .then((c) => {
            $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: true, clienteId: c._id, leadId: data.leadId });
            return actualizarEstatusLead(data.leadId, 'convertido');
          })
          .then(() => { enviarLeadsVendedor(); enviarClientes(); });
      }).catch((e) => {
        console.error('[Vendedor] Error convirtiendo lead:', e);
        $w(HTML_ID).postMessage({ type: 'wecars-lead-convertido', ok: false, error: String(e), leadId: data.leadId });
      });
    }

    // ── Módulo Créditos — crear solicitud desde panel vendedor ───────────
    if (data.type === 'wecars-credito-crear' && data.datos) {
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ nombre: email, rol: 'Vendedor' }))
          .then((p) => {
            return crearCredito(
              Object.assign({}, data.datos, {
                vendedorEmail: email,
                vendedorNombre: p.nombre || email,
              }),
              email,
              p.rol || 'Vendedor'
            );
          })
        )
        .then((result) => {
          $w(HTML_ID).postMessage({ type: 'wecars-credito-creado', ok: result.ok, credito: result.credito, yaExistia: result.yaExistia });
          if (result.ok) {
            try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'credito-nuevo', creditoId: result.credito._id, vendedorEmail: result.credito.vendedorEmail }); } catch (e) {}
          }
        })
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-credito-creado', ok: false, error: String(e) }));
    }

    // ── Centro de Publicaciones ───────────────────────────────────────

    if (data.type === 'wecars-pub-vehiculos-solicitar') {
      pubObtenerVehiculos()
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-pub-vehiculos', items }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-pub-vehiculos', items: [], error: String(e) }));
    }

    if (data.type === 'wecars-pub-cuentas-solicitar') {
      pubObtenerCuentas()
        .then((cuentas) => $w(HTML_ID).postMessage({ type: 'wecars-pub-cuentas', cuentas }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-pub-cuentas', cuentas: [], error: String(e) }));
    }

    if (data.type === 'wecars-pub-texto-generar' && data.carro) {
      pubGenerarTexto(data.carro, data.plataforma || 'instagram')
        .then((texto) => $w(HTML_ID).postMessage({ type: 'wecars-pub-texto-generado', texto, carroId: data.carro._id }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-pub-texto-generado', texto: '', error: String(e) }));
    }

    if (data.type === 'wecars-pub-borrador-guardar' && data.datos) {
      pubGuardarBorrador(data.datos)
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-pub-borrador-guardado', ok: r.ok, _id: r._id }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-pub-borrador-guardado', ok: false, error: String(e) }));
    }

    if (data.type === 'wecars-pub-publicar' && data.publicacionId) {
      pubPublicarEnMeta(data.publicacionId)
        .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-pub-resultado', ...r, publicacionId: data.publicacionId }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-pub-resultado', ok: false, error: String(e), publicacionId: data.publicacionId }));
    }

    if (data.type === 'wecars-pub-historial-solicitar') {
      pubObtenerHistorial(data.filtros || {})
        .then((items) => $w(HTML_ID).postMessage({ type: 'wecars-pub-historial', items }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-pub-historial', items: [], error: String(e) }));
    }

    // ── Alta rápida de lead desde el panel ──────────────────────────────
    if (data.type === 'wecars-lead' && data.data) {
      const ld = data.data;
      wixUsers.currentUser.getEmail()
        .then((email) => obtenerPerfil(email).catch(() => ({ nombre: email }))
          .then((p) => wixData.insert('ALeads', Object.assign({}, ld, {
            vendedorAsignado: ld.vendedorAsignado || email,
            vendedorNombre:   ld.vendedorNombre   || p.nombre || email,
            fechaRegistro:    ld.fechaRegistro    || new Date(),
            estatus:          ld.estatus          || 'nuevo_lead',
            origen:           ld.pagina           || ld.origen || 'Panel Vendedor',
          }), { suppressAuth: true }))
        )
        .then((lead) => {
          $w(HTML_ID).postMessage({ type: 'wecars-lead-creado', ok: true, leadId: lead._id });
          enviarLeadsVendedor();
        })
        .catch((e) => {
          console.error('[Vendedor] Error creando lead:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-lead-creado', ok: false, error: String(e) });
        });
    }

    // ── Alias FAB móvil → handlers existentes ───────────────────────────
    if (data.type === 'wecars-nuevo-cliente' && data.datos) {
      data.type = 'wecars-cliente-crear';
      // re-dispatch inline
      if (data.datos) crearCliente(data.datos);
    }
    if (data.type === 'wecars-nueva-cita' && data.datos) {
      const d = data.datos;
      wixData.insert('citas', {
        clienteNombre: d.cliente, fecha: d.fecha ? new Date(d.fecha + 'T' + (d.hora || '10:00')) : new Date(),
        tipo: d.tipo || 'Cita', vehiculo: d.vehiculo || '', notas: d.notas || '',
        origenPanel: 'vendedores',
      }, { suppressAuth: true })
        .then((cita) => $w(HTML_ID).postMessage({ type: 'wecars-cita-creada', ok: true, citaId: cita._id }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-cita-creada', ok: false, error: String(e) }));
    }
    if (data.type === 'wecars-nueva-tarea' && data.datos) {
      const t = data.datos;
      wixData.insert('Tasks', {
        descripcion: t.desc, clienteNombre: t.cliente || '', fechaVencimiento: t.fecha ? new Date(t.fecha) : null,
        prioridad: t.prioridad || 'Media', estatus: 'pendiente', origenPanel: 'vendedores',
      }, { suppressAuth: true })
        .then((task) => $w(HTML_ID).postMessage({ type: 'wecars-tarea-creada', ok: true, tareaId: task._id }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-tarea-creada', ok: false, error: String(e) }));
    }
    if (data.type === 'wecars-solicitud-vehiculo' && data.datos) {
      const v = data.datos;
      wixData.insert('VehicleRequests', {
        clienteNombre: v.cliente || '', descripcion: v.desc, precioMax: v.precio || '',
        plazo: v.plazo || '', urgencia: v.urgencia || '', notas: v.notas || '',
        origenPanel: 'vendedores', fechaSolicitud: new Date(),
      }, { suppressAuth: true })
        .then((req) => $w(HTML_ID).postMessage({ type: 'wecars-solicitud-vehiculo-guardada', ok: true, reqId: req._id }))
        .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-solicitud-vehiculo-guardada', ok: false, error: String(e) }));
    }

    // ── Actualizar etapa de expediente ──────────────────────────────────
    if (data.type === 'wecars-expediente-actualizar' && data.clienteId && data.cambios) {
      wixData.get('ClientRecords', data.clienteId, { suppressAuth: true })
        .then((rec) => {
          if (!rec) throw new Error('Cliente no encontrado: ' + data.clienteId);
          return wixData.update('ClientRecords', Object.assign({}, rec, data.cambios), { suppressAuth: true });
        })
        .then((updated) => {
          $w(HTML_ID).postMessage({ type: 'wecars-expediente-actualizado', ok: true, clienteId: updated._id });
          try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-expediente-actualizado', clienteId: updated._id, cambios: data.cambios }); } catch (e) {}
        })
        .catch((e) => {
          console.error('[Vendedor] Error actualizando expediente:', e);
          $w(HTML_ID).postMessage({ type: 'wecars-expediente-actualizado', ok: false, error: String(e), clienteId: data.clienteId });
        });
    }

  });

});

// ── Subir archivo (botón nativo Wix) ─────────────────────────────────
function subirArchivoSeleccionado() {
  const btn = $w(UPLOAD_BUTTON_ID);
  if (!clienteParaSubida) {
    console.error('[Panel] No hay cliente seleccionado para la subida.');
    return;
  }
  const metodo = typeof btn.uploadFiles === 'function' ? 'uploadFiles'
    : (typeof btn.startUpload === 'function' ? 'startUpload' : null);
  if (!metodo) {
    console.error('[Panel] El botón de subida no tiene uploadFiles/startUpload disponible.');
    return;
  }
  btn[metodo]()
    .then((resultado) => {
      const archivo = Array.isArray(resultado) ? resultado[0] : resultado;
      const url     = archivo && (archivo.url || archivo.fileUrl || archivo.downloadUrl);
      if (!url) { console.error('[Panel] Sin URL en resultado de subida:', resultado); return null; }
      const nombreArchivo = archivo.fileName || archivo.originalFileName || archivo.name || 'documento';
      return wixData.insert('Documents', {
        clienteId:     clienteParaSubida,
        nombreArchivo,
        url,
        tipoDocumento: tipoDocumentoParaSubida,
        razonSocial:   razonSocialParaSubida,
        folioFiscal:   folioFiscalParaSubida,
        monto:         montoParaSubida ? Number(montoParaSubida) || 0 : 0,
        estatus:       'subido',
        fecha:         new Date(),
        subidoPor:     vendedorEmailActual,
      });
    })
    .then((doc) => {
      if (!doc) return;
      $w(HTML_ID).postMessage({ type: 'wecars-documento-subido', clienteId: clienteParaSubida });
      btn.reset();
    })
    .catch((e) => console.error('[Panel] Error subiendo archivo:', e));
}

// ── Validar documento ─────────────────────────────────────────────────
function validarDocumento(documentoId, estatus, motivoRechazo) {
  if (!documentoId) return;
  wixData.get('Documents', documentoId)
    .then((doc) => wixData.update('Documents', Object.assign({}, doc, {
      estatus,
      motivoRechazo: motivoRechazo || '',
    })))
    .then(() => {
      $w(HTML_ID).postMessage({ type: 'wecars-documento-validado', documentoId });
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-documento-validado', documentoId }); } catch (e) {}
    })
    .catch((e) => console.error('[Panel] Error validando documento:', e));
}

// ── Carga principal: clientes + perfil + vendedores ───────────────────
function enviarClientes() {
  wixUsers.currentUser.getEmail()
    .then(function(email) {
      vendedorEmailActual = email || '';
      return fetchDatosVendedor(vendedorEmailActual);
    })
    .then(function(datos) {
      var listaVendedores = (datos.usuarios || [])
        .map(function(v) { return { email: v.email || v.correo || '', nombre: v.nombre || '', rol: v.rol || '' }; })
        .filter(function(v) { return v.email; });
      var usuarioActual = listaVendedores.find(function(v) { return v.email === vendedorEmailActual; }) || {};
      $w(HTML_ID).postMessage({
        type:               'wecars-clientes',
        items:              datos.clientes      || [],
        oportunidades:      datos.oportunidades || [],
        actividades:        (datos.actividades  || []).map(function(a) { return { clienteId: a.clienteId, fecha: a.fecha, autor: a.autor }; }),
        citas:              datos.citas         || [],
        creditos:           datos.creditos      || [],
        vendedorActual:     vendedorEmailActual,
        nombreActual:       usuarioActual.nombre || vendedorEmailActual || 'Vendedor',
        rolActual:          usuarioActual.rol    || 'Vendedor',
        puestoActual:       '',
        fechaIngresoActual: null,
        listaVendedores:    listaVendedores,
      });
    })
    .catch(function(err) {
      console.error('[Panel] Error cargando datos:', err);
      $w(HTML_ID).postMessage({
        type: 'wecars-clientes', items: [], oportunidades: [], actividades: [],
        vendedorActual: vendedorEmailActual, nombreActual: vendedorEmailActual || 'Vendedor',
        rolActual: 'Vendedor', puestoActual: '', fechaIngresoActual: null, listaVendedores: [],
      });
    });
}

// ── Inventario de autos ───────────────────────────────────────────────
function parseMoneyAuto(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function enviarInventarioPanel() {
  fetchInventarioCars()
    .then((items) => {
      $w(HTML_ID).postMessage({
        type:  'wecars-inventario-panel',
        items: items.map((item) => ({
          // ── Identificación ──
          id:               item._id,
          title:            item.title              || '',
          numeroInventario: item.numeroInventario    || null,
          estatusVenta:     item.estatusVenta        || 'Disponible',
          fechaCreacion:    item._createdDate,
          // ── Datos comerciales ──
          precioVenta:      parseMoneyAuto(item.priceNew || item.precioVenta),
          costoAdquisicion: parseMoneyAuto(item.costoAdquisicion),
          // ── Ficha del vehículo (necesarios para el drawer de publicación) ──
          // Cars tiene campos nativos Wix Stores (brand, title) y campos propios en español.
          // Se envían ambos; _pubNormalizarAuto() en el HTML fusiona con || para cubrir
          // vehículos legacy que solo tengan los campos en inglés.
          marca:            item.marca              || item.brand        || '',
          modelo:           item.modelo             || '',
          año:              item.año                || '',
          version:          item.version            || '',
          color:            item.color              || '',
          km:               item.km                 || item.mileage      || 0,
          combustible:      item.combustible        || '',
          transmision:      item.transmision        || '',
          descripcion:      item.descripcion        || '',
          // ── Fotografías ──
          // fotoPrincipal y fotos guardan URIs wix:image://v1/...
          // La conversión a URL pública (static.wixstatic.com) ocurre en el drawer
          // para no duplicar la lógica de conversión en Velo page code.
          fotoPrincipal:    item.fotoPrincipal      || '',
          fotos:            Array.isArray(item.fotos) ? item.fotos : (item.fotos ? [item.fotos] : []),
          // ── Asignación (si el campo existe en Cars) ──
          vendedorAsignado: item.vendedorAsignado   || '',
          sucursal:         item.sucursal           || '',
        })),
      });
    })
    .catch((e) => {
      console.error('[Panel] Error cargando inventario:', e);
      $w(HTML_ID).postMessage({ type: 'wecars-inventario-panel', items: [] });
    });
}

function actualizarAuto(carId, cambios) {
  if (!carId) return;
  wixData.get('Cars', carId)
    .then((auto) => wixData.update('Cars', Object.assign({}, auto, cambios)))
    .then(() => {
      enviarInventarioPanel();
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-inventario-update' }); } catch (e) {}
    })
    .catch((e) => console.error('[Panel] Error actualizando auto:', e));
}

// ── Historial de cliente (timeline) ──────────────────────────────────
function enviarHistorial(clienteId) {
  // Verificar que el cliente pertenece al vendedor logueado antes de devolver datos
  wixUsers.currentUser.getEmail().then((email) => {
    return wixData.get('ClientRecords', clienteId).then((cliente) => {
      if (cliente.vendedorAsignado && cliente.vendedorAsignado !== email) {
        console.warn('[Panel] Acceso denegado al historial de clienteId:', clienteId);
        $w(HTML_ID).postMessage({ type: 'wecars-cliente-historial', clienteId, leads: [], creditos: [], consignas: [], actividades: [] });
        return;
      }
      return _fetchHistorial(clienteId);
    });
  }).catch(() => _fetchHistorial(clienteId));
}
function _fetchHistorial(clienteId) {
  Promise.all([
    wixData.query('ALeads').eq('clienteId', clienteId).descending('fecha').limit(20).find().catch(() => ({ items: [] })),
    // Intentar con 'Creditos' primero, fallback a 'CreditApplications' (nombre legacy)
    wixData.query('Creditos').eq('clienteId', clienteId).descending('_createdDate').limit(10).find()
      .catch(() => wixData.query('CreditApplications').eq('clienteId', clienteId).find().catch(() => ({ items: [] }))),
    // Intentar con 'Consignas' primero, fallback a 'CarConsignment'
    wixData.query('Consignas').eq('clienteId', clienteId).descending('_createdDate').limit(10).find()
      .catch(() => wixData.query('CarConsignment').eq('clienteId', clienteId).find().catch(() => ({ items: [] }))),
    wixData.query('Activities').eq('clienteId', clienteId).descending('fecha').limit(50).find().catch(() => ({ items: [] })),
  ]).then(([leadsR, creditosR, consignasR, actividadesR]) => {
    $w(HTML_ID).postMessage({
      type:        'wecars-cliente-historial',
      clienteId,
      leads:       leadsR.items,
      creditos:    creditosR.items,
      consignas:   consignasR.items,
      actividades: actividadesR.items,
    });
  }).catch((e) => console.error('[Panel] Error cargando historial:', e));
}

// ── Documentos del expediente ─────────────────────────────────────────
function enviarDocumentos(clienteId) {
  wixData.query('Documents')
    .eq('clienteId', clienteId)
    .descending('fecha')
    .find()
    .then((results) => {
      return Promise.all(results.items.map((doc) =>
        resolveDocumentUrl(doc.url).then((r) => Object.assign({}, doc, { url: r.url || doc.url }))
          .catch(() => doc)
      ));
    })
    .then((documentos) => {
      $w(HTML_ID).postMessage({ type: 'wecars-cliente-documentos', clienteId, documentos });
    })
    .catch((e) => {
      console.error('[Panel] Error cargando documentos:', e);
      $w(HTML_ID).postMessage({ type: 'wecars-cliente-documentos', clienteId, documentos: [] });
    });
}

// ── Oportunidades del cliente ─────────────────────────────────────────
function enviarOportunidades(clienteId) {
  wixData.query('Opportunities').eq('clienteId', clienteId).find()
    .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-cliente-oportunidades', clienteId, oportunidades: r.items }))
    .catch((e) => {
      console.error('[Panel] Error cargando oportunidades:', e);
      $w(HTML_ID).postMessage({ type: 'wecars-cliente-oportunidades', clienteId, oportunidades: [] });
    });
}

// ── Facturas emitidas ─────────────────────────────────────────────────
function enviarFacturasEmitidas() {
  wixUsers.currentUser.getEmail()
    .then((email) => wixData.query('Documents')
      .eq('tipoDocumento', 'Factura de salida - PDF')
      .eq('vendedorEmail', email)   // solo facturas del vendedor logueado
      .limit(200).find())
    .then((r) => $w(HTML_ID).postMessage({ type: 'wecars-facturas-emitidas', items: r.items }))
    .catch((e) => {
      console.error('[Panel] Error cargando facturas:', e);
      $w(HTML_ID).postMessage({ type: 'wecars-facturas-emitidas', items: [] });
    });
}

// ── Comisiones + Ventas propias del vendedor ──────────────────────────
function enviarComisiones() {
  wixUsers.currentUser.getEmail()
    .then((email) => Promise.all([
      wixData.query('Comisiones').eq('vendedorEmail', email).descending('_createdDate').limit(100).find().catch(() => ({ items: [] })),
      wixData.query('Ventas').eq('vendedorId', email).descending('fechaVenta').limit(200).find().catch(() => ({ items: [] })),
    ]))
    .then(([comisionesR, ventasR]) => {
      $w(HTML_ID).postMessage({ type: 'wecars-comisiones', items: comisionesR.items });
      $w(HTML_ID).postMessage({ type: 'wecars-ventas-propias', items: ventasR.items });
    })
    .catch((e) => console.error('[Panel] Error cargando comisiones/ventas:', e));
}

// ── CRUD ───────────────────────────────────────────────────────────────

const CAMPOS_EDITABLES = [
  'nombre', 'telefono', 'correo', 'direccion', 'fechaNacimiento',
  'estatus', 'origen', 'notas',
  // vendedorAsignado eliminado — solo Gerencia puede reasignar (C4)
  'rfc', 'usoCFDI', 'regimenFiscal', 'correoFiscal', 'codigoPostalFiscal',
  'proximoSeguimiento', 'proximoSeguimientoNota', 'tipoInteres', 'presupuestoMax',
  'razonCierre',
  // estatusExpediente eliminado — solo puede modificarse vía avanzarEstado() / wecars-estado-avanzar
];

function actualizarCliente(clienteId, cambios) {
  wixData.get('ClientRecords', clienteId)
    .then((c) => {
      const actualizado = Object.assign({}, c);
      CAMPOS_EDITABLES.forEach((campo) => {
        if (cambios[campo] !== undefined) actualizado[campo] = cambios[campo];
      });
      actualizado.ultimaActividad = new Date();
      return wixData.update('ClientRecords', actualizado);
    })
    .then((item) => {
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-estado-update', clienteId: item._id }); } catch (e) {}
    })
    .catch((e) => console.error('[Panel] Error actualizando cliente:', e));
}

function crearCliente(datos) {
  // C1: usa backend atómico (query+insert en una sola transacción) — elimina race condition de duplicados
  const datosNuevo = {
    nombre:             datos.nombre             || '',
    telefono:           String(datos.telefono    || '').replace(/\D/g, ''),
    correo:             datos.correo             || '',
    origen:             datos.origen             || 'Otro',
    vehiculoInteres:    datos.vehiculoInteres    || '',
    formaPago:          datos.formaPago          || 'No definido',
    vendedorAsignado:   vendedorEmailActual,      // siempre el vendedor autenticado, nunca el iframe
    vendedorNombre:     datos.vendedorNombre     || '',
    notas:              datos.notas              || '',
    estatusExpediente:  'nuevo_lead',
    departamentoActual: 'Vendedor',
  };
  crearClienteSeguro(datosNuevo)
    .then((res) => {
      if (res.yaExiste) {
        $w(HTML_ID).postMessage({ type: 'wecars-cliente-creado', cliente: res.cliente, yaExistia: true, mensaje: res.mensaje });
        return;
      }
      if (!res.ok) {
        $w(HTML_ID).postMessage({ type: 'wecars-cliente-crear-error', error: res.error || 'Error al crear cliente' });
        return;
      }
      $w(HTML_ID).postMessage({ type: 'wecars-cliente-creado', cliente: res.cliente });
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-cliente-nuevo', cliente: res.cliente }); } catch (e) {}
    })
    .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-cliente-crear-error', error: String(e) }));
}

function eliminarCliente(clienteId) {
  wixData.remove('ClientRecords', clienteId)
    .then(() => {
      $w(HTML_ID).postMessage({ type: 'wecars-cliente-eliminado', clienteId });
      try { new BroadcastChannel('wecars-erp-v2').postMessage({ type: 'wecars-cliente-eliminado', clienteId }); } catch (e) {}
    })
    .catch((e) => $w(HTML_ID).postMessage({ type: 'wecars-cliente-eliminar-error', error: String(e) }));
}

function crearOportunidad(clienteId, datos) {
  wixData.insert('Opportunities', {
    clienteId,
    vehiculo:      datos.vehiculo       || '',
    valorEstimado: datos.valorEstimado  || 0,
    etapa:         datos.etapa          || 'Lead nuevo',
    fechaCreacion: new Date(),
  })
    .then((op) => {
      $w(HTML_ID).postMessage({ type: 'wecars-oportunidad-creada', clienteId });
      wixData.get('ClientRecords', clienteId)
        .then((c) => wixData.update('ClientRecords', Object.assign({}, c, { ultimaActividad: new Date() })))
        .catch(() => {});
      registrarActividad({
        tipo: 'cotizacion_creada', clienteId,
        oportunidadId: op._id,
        entidadTipo: 'oportunidad', entidadId: op._id,
        vendedorEmail: vendedorEmailActual,
        metadata: { vehiculo: datos.vehiculo || '', monto: datos.valorEstimado || 0, etapa: op.etapa },
      }).catch(() => {});
    })
    .catch((e) => console.error('[Panel] Error creando oportunidad:', e));
}

function actualizarOportunidad(oportunidadId, cambios) {
  wixData.get('Opportunities', oportunidadId)
    .then((op) => {
      const actualizado = Object.assign({}, op, cambios);
      return wixData.update('Opportunities', actualizado).then(() => ({ clienteId: op.clienteId, op: actualizado }));
    })
    .then(({ clienteId, op }) => {
      $w(HTML_ID).postMessage({ type: 'wecars-oportunidad-actualizada', clienteId });
      if (clienteId) {
        wixData.get('ClientRecords', clienteId)
          .then((c) => wixData.update('ClientRecords', Object.assign({}, c, { ultimaActividad: new Date() })))
          .catch(() => {});
      }
      registrarActividad({
        tipo: 'cotizacion_actualizada', clienteId: clienteId || '',
        oportunidadId: oportunidadId,
        entidadTipo: 'oportunidad', entidadId: oportunidadId,
        vendedorEmail: vendedorEmailActual,
        metadata: { etapa: op && op.etapa || '', vehiculo: op && op.vehiculo || '' },
      }).catch(() => {});
    })
    .catch((e) => console.error('[Panel] Error actualizando oportunidad:', e));
}

function crearActividad(clienteId, datos) {
  registrarActividad({
    tipo:         datos.tipo      || 'nota',
    clienteId,
    entidadTipo: 'cliente', entidadId: clienteId,
    vendedorEmail: vendedorEmailActual,
    vendedorNombre: datos.autor  || vendedorEmailActual,
    descripcion:  datos.detalle  || datos.descripcion || '',
    resultado:    datos.resultado || '',
    metadata: datos.titulo || datos.asignadoA || datos.prioridad || datos.due ? {
      titulo:    datos.titulo    || '',
      asignadoA: datos.asignadoA || '',
      prioridad: datos.prioridad || 'normal',
      due:       datos.due       || null,
      col:       datos.col       || '',
      categoria: datos.categoria || '',
    } : undefined,
  })
    .then((item) => {
      $w(HTML_ID).postMessage({ type: 'wecars-actividad-creada', actividad: item, clienteId });
      wixData.get('ClientRecords', clienteId)
        .then((c) => wixData.update('ClientRecords', Object.assign({}, c, { ultimaActividad: new Date() })))
        .catch(() => {});
    })
    .catch((e) => console.error('[Panel] Error creando actividad:', e));
}

// ── BroadcastChannel: recibir eventos de otros paneles ────────────────
// Wix Velo no expone BroadcastChannel directamente en el servidor,
// pero el HTML del vendedor sí lo escucha. Aquí usamos el iframe
// como puente: los eventos del BC llegan al HTML y este los reenvía
// al Velo si necesita leer CMS. Los eventos de notificación pura
// van directo al HTML vía postMessage desde el Velo de otros paneles.
//
// Para notificar AL VENDEDOR desde otros paneles:
//   - wecars-venta-cerrada   → el vendedor ve confirmación de su venta
//   - wecars-comision-pagada-bc → le avisan que le pagaron
//   - wecars-inventario-nuevo   → nuevo auto disponible para vender
//
// Estos eventos llegan al HTML del vendedor por BroadcastChannel
// directamente (mismo origen en el browser del usuario).
// No se necesita lógica adicional en este archivo Velo.


// ── Leads: enviar al panel de vendedores ─────────────────────────────
function enviarLeadsVendedor() {
  wixUsers.currentUser.getEmail()
    .then((email) => {
      vendedorEmailActual = email || '';
      return obtenerPerfil(email).catch(() => ({ rol: 'Vendedor', nombre: email }))
        .then((p) => fetchLeads(p.rol || 'Vendedor', email)
          .then((leads) => Promise.all(leads.map((l) =>
            wixData.query('Activities')
              .eq('clienteId', l._id)
              .eq('tipo', 'nota_lead')
              .ascending('fecha')
              .limit(50)
              .find({ suppressAuth: true })
              .then((r) => Object.assign({}, l, { _notas: r.items }))
              .catch(() => Object.assign({}, l, { _notas: [] }))
          )))
          .then((leadsConNotas) => {
            $w(HTML_ID).postMessage({
              type:  'wecars-leads',
              leads: leadsConNotas,
              rolActual:   p.rol   || 'Vendedor',
              emailActual: email,
            });
          })
        );
    })
    .catch((e) => {
      console.error('[Vendedor] Error enviando leads:', e);
      $w(HTML_ID).postMessage({ type: 'wecars-leads', leads: [], rolActual: 'Vendedor', emailActual: '' });
    });
}

// ── Consignas asignadas a este vendedor ──────────────────────────────
function enviarConsignasVendedor() {
  wixUsers.currentUser.getEmail()
    .then((email) => {
      if (!email) return;
      return wixData.query('Consignas')
        .eq('vendedorAsignado', email)
        .descending('_createdDate')
        .limit(50)
        .find({ suppressAuth: true })
        .then((r) => {
          $w(HTML_ID).postMessage({ type: 'wecars-consignas-vendedor', items: r.items, emailActual: email });
        });
    })
    .catch((e) => {
      console.error('[Vendedor] Error cargando consignas:', e);
      $w(HTML_ID).postMessage({ type: 'wecars-consignas-vendedor', items: [], emailActual: '' });
    });
}
