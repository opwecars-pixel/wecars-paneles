// ───────────────────────────────────────────────────────────────────
//  PÁGINA: REGISTRO RÁPIDO DE CLIENTE
//  Wix Studio → crea una nueva página llamada "registro-rapido"
//  En el editor, agrega un componente HTML Embed con ID: #htmlRegistroRapido
//  Pega este código en el panel de código de ESA página (no en site.js).
//
//  Colecciones usadas:
//    Usuarios      — para obtener la lista de vendedores activos
//    ClientRecords — para crear/actualizar el cliente (vía backend-clientes.jsw)
//    ALeads        — para crear el lead con interés y vendedor asignado
// ───────────────────────────────────────────────────────────────────

import { findOrCreateCliente } from 'backend/clientes.jsw';
import { crearLead }           from 'backend/leads.jsw';
import { registrarActividad }  from 'backend/actividades.jsw';
import { queryColeccion }      from 'backend/operaciones.jsw';

const HTML_ID = '#htmlRegistroRapido';

$w.onReady(function () {

  // Altura inicial grande para que en móvil el embed no quede cortado
  try { $w(HTML_ID).height = 900; } catch (_) {}

  $w(HTML_ID).onMessage(function (event) {
    const data = event.data;
    if (!data || !data.type) return;

    // ── El iframe está listo: enviarle la lista de vendedores ──────
    if (data.type === 'wecars-rr-ready') {
      _enviarVendedores();
    }

    // ── Resize dinámico del iframe ─────────────────────────────────
    if (data.type === 'wecars-resize' && data.height) {
      try { $w(HTML_ID).height = data.height; } catch (_) {}
    }

    // ── Nuevo registro de cliente ──────────────────────────────────
    if (data.type === 'wecars-registro-rapido') {
      _procesarRegistro(data.payload);
    }
  });

});

// ─── Enviar lista de vendedores al iframe ──────────────────────────
function _enviarVendedores() {
  queryColeccion('Usuarios', ['Vendedor', 'Administración', 'Gerencia', 'Finanzas'], [
    { campo: 'rol', op: 'contains', valor: 'endedor' },
    { limit: 100 },
  ])
    .then(function (items) {
      const vendedores = items
        .map(function (u) {
          return {
            nombre: u.nombre || u.title || u._id,
            email:  u.email  || u.loginEmail || '',
          };
        })
        .filter(function (v) { return v.email; })
        .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });

      $w(HTML_ID).postMessage({ type: 'wecars-rr-vendedores', vendedores: vendedores });
    })
    .catch(function (err) {
      console.error('[RegistroRapido] Error cargando vendedores:', err);
      $w(HTML_ID).postMessage({ type: 'wecars-rr-vendedores', vendedores: [] });
    });
}

// ─── Procesar registro de cliente ─────────────────────────────────
function _procesarRegistro(payload) {
  if (!payload) {
    $w(HTML_ID).postMessage({ type: 'wecars-rr-error', mensaje: 'Datos incompletos. Intenta de nuevo.' });
    return;
  }

  const nombre        = (payload.nombre        || '').trim();
  const telefono      = (payload.telefono      || '').replace(/\D/g, '');
  const correo        = (payload.correo        || '').trim();
  const autoInteres   = (payload.autoInteres   || '').trim();
  const tipoPago      = (payload.tipoPago      || '').trim();
  const vendedorEmail = (payload.vendedorEmail || '').trim();
  const vendedorNombre= (payload.vendedorNombre|| '').trim();

  if (!telefono || !vendedorEmail) {
    $w(HTML_ID).postMessage({ type: 'wecars-rr-error', mensaje: 'Faltan datos requeridos (teléfono o vendedor).' });
    return;
  }

  // Construir resumen de interés
  const partesResumen = [];
  if (autoInteres) partesResumen.push(autoInteres);
  if (tipoPago)    partesResumen.push(tipoPago === 'credito' ? 'Crédito' : 'Contado');
  const resumen = partesResumen.join(' · ') || 'Sin especificar';

  // 1. Buscar o crear cliente
  findOrCreateCliente(nombre, telefono, correo, 'Vendedor', vendedorEmail, vendedorNombre)
    .then(function (resultado) {

      const esNuevo = resultado.debug !== 'cliente existente actualizado';

      // 2a. DUPLICADO — registrar intento y bloquear
      if (!esNuevo) {
        if (resultado.clienteId) {
          registrarActividad({
            tipo:           'intento_duplicado',
            clienteId:      resultado.clienteId,
            clienteNombre:  nombre,
            entidadTipo:    'cliente',
            entidadId:      resultado.clienteId,
            vendedorEmail:  vendedorEmail,
            vendedorNombre: vendedorNombre,
            descripcion:    vendedorNombre + ' intentó registrar a ' + nombre + ' (' + telefono + ') pero ya existía en el sistema.',
            metadata: { nombre, telefono, correo, autoInteres, origen: 'Registro Rápido' },
          }).catch(function (e) { console.error('[RegistroRapido] actividad duplicado:', e); });
        }
        $w(HTML_ID).postMessage({ type: 'wecars-rr-existe' });
        return; // NO crear lead
      }

      // 2b. CLIENTE NUEVO — crear lead + registrar actividad
      return crearLead({
        tipo:             'lead',
        nombre:           nombre,
        telefono:         telefono,
        correo:           correo,
        interes:          resumen,
        resumen:          resumen,
        pagina:           'Registro Rápido',
        origen:           'Vendedor',
        vendedorAsignado: vendedorEmail,
        vendedorNombre:   vendedorNombre,
        estatusLead:      'contactado',
        clienteId:        resultado.clienteId || '',
      }).then(function () {

        if (resultado.clienteId) {
          registrarActividad({
            tipo:           'cliente_creado',
            clienteId:      resultado.clienteId,
            clienteNombre:  nombre,
            entidadTipo:    'cliente',
            entidadId:      resultado.clienteId,
            vendedorEmail:  vendedorEmail,
            vendedorNombre: vendedorNombre,
            descripcion:    vendedorNombre + ' registró a ' + nombre + ' (' + telefono + ') vía Registro Rápido.',
            metadata: { nombre, telefono, correo, autoInteres, origen: 'Registro Rápido' },
          }).catch(function (e) { console.error('[RegistroRapido] registrarActividad:', e); });
        }

        const clientePayload = {
          nombre:         nombre,
          telefono:       telefono,
          correo:         correo || '—',
          interes:        autoInteres || '—',
          tipoPago:       tipoPago,
          vendedorNombre: vendedorNombre,
        };

        // 3. Éxito
        {
          $w(HTML_ID).postMessage({ type: 'wecars-rr-ok', cliente: clientePayload });
        }

      });

    })
    .catch(function (err) {
      console.error('[RegistroRapido] Error al guardar:', err);
      $w(HTML_ID).postMessage({
        type: 'wecars-rr-error',
        mensaje: 'No se pudo guardar el cliente. Verifica tu conexión e intenta de nuevo.'
      });
    });
}
