// ───────────────────────────────────────────────────────────────────
//  PÁGINA: CRÉDITO
//  Elemento HTML ID: #htmlCredito
//  Pega SOLO este bloque en { } de la página CRÉDITO
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';
import { notificarLeadNuevo } from 'backend/notificaciones.jsw';
import { crearCredito } from 'backend/creditos.jsw';

function parseMoneyCredito(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function wixImgUrlCredito(uri, w, h) {
  if (!uri) return '';
  if (uri.startsWith('http')) return uri;
  const match = uri.match(/wix:image:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return uri;
  const fileId = match[1];
  const fname  = match[2];
  if (w && h) return `https://static.wixstatic.com/media/${fileId}/v1/fill/w_${w},h_${h},al_c,q_85,enc_avif,quality_auto/${fname}`;
  return `https://static.wixstatic.com/media/${fileId}`;
}

function stripHtmlCredito(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

const POSIBLES_GALERIA = ['mediagallery','mediaGallery','gallery','galeriaDeFotos','galeriaFotos','photos','fotos'];
function obtenerImagenesCredito(item) {
  for (const clave of POSIBLES_GALERIA) {
    if (Array.isArray(item[clave]) && item[clave].length) {
      return item[clave].map(x => wixImgUrlCredito(x.src || x, 700, 480)).filter(Boolean);
    }
  }
  if (item.image) return [wixImgUrlCredito(item.image, 700, 480)];
  return [];
}

function loadAndSendInventarioCredito() {
  wixData.query('Cars').limit(100).find()
    .then((results) => {
      const items = results.items.map((item) => ({
        id:           item._id,
        title:        item.title          || '',
        images:       obtenerImagenesCredito(item),
        brand:        item.brand          || '',
        year:         item.year           || '',
        type:         item.type           || '',
        km:           item.statusDescription || 0,
        price:        parseMoneyCredito(item.priceNew),
        priceCredito: parseMoneyCredito(item.oldPrice),
        fuel:         stripHtmlCredito(item.fuel),
      }));
      $w('#htmlCredito').postMessage({ type: 'wecars-inventory', items });
    })
    .catch((err) => console.error('[Crédito] Error cargando inventario:', err));
}

$w.onReady(function () {

  getSiteConfig().then(function(config) {
    $w('#htmlCredito').postMessage({ type: 'wecars-siteconfig', config: config });
  });

  loadAndSendInventarioCredito();

  $w('#htmlCredito').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w('#htmlCredito').height = data.height;
    }

    if (data.type === 'wecars-catalog-ready') {
      loadAndSendInventarioCredito();
    }

    if (data.type === 'wecars-scroll') {
      wixWindow.scrollTo(0, data.y || 0);
    }

    // ── Opción rápida: solo nombre + celular ──────────────────────
    // Se dispara cuando el usuario elige "Solo dejar mis datos"
    if (data.type === 'wecars-lead') {
      const nombre   = data.data.nombre   || '';
      const telefono = data.data.telefono || data.data.celular || '';
      const correo   = data.data.correo   || '';
      const origen   = data.data.origen   || 'Sitio web';

      wixData.insert('ALeads', {
        nombre, telefono, correo,
        tipo:             'credito',
        interes:          'Solicitud de crédito (datos básicos)',
        resumen:          'Solicitud de crédito (datos básicos)',
        origen,
        pagina:           'Crédito',
        fecha:            new Date(),
        estatusLead:      'nuevo',
        vendedorAsignado: '',
        vendedorNombre:   '',
      })
      .then((inserted) => {
        return findOrCreateCliente(nombre, telefono, correo, origen)
          .then((r) => {
            console.log('[Crédito-lead] debug:', r.debug);
            notificarLeadNuevo({ nombre, telefono, correo, interes: 'Crédito (datos básicos)', pagina: 'Crédito', origen, vehiculo: '', ingreso: '', empresa: '' });
            if (r.clienteId) {
              return wixData.update('ALeads', Object.assign({}, inserted, { clienteId: r.clienteId }));
            }
          });
      })
      .catch((err) => console.error('[Crédito-lead] Error:', err));
    }

    // ── Solicitud completa de crédito (5 pasos) ───────────────────
    if (data.type === 'wecars-credito') {
      const nombre   = data.data.nombre  || '';
      const celular  = data.data.celular || '';
      const correo   = data.data.correo  || '';
      const origen   = data.data.origen  || 'Sitio web';
      const vehiculo = data.data.vehiculo || 'Sin especificar';
      const precio   = data.data.precioVehiculo || 0;

      // 1. Guardar solicitud completa en CreditApplications
      wixData.insert('CreditApplications', {
        vehiculo,
        precioVehiculo: precio,
        nombre, celular, correo,
        rfc:            data.data.rfc            || '',
        curp:           data.data.curp           || '',
        fechaNac:       data.data.fechaNac       || '',
        edad:           data.data.edad           || 0,
        sexo:           data.data.sexo           || '',
        estadoCivil:    data.data.estadoCivil    || '',
        dependientes:   data.data.dependientes   || '',
        calle:          data.data.calle          || '',
        numExt:         data.data.numExt         || '',
        numInt:         data.data.numInt         || '',
        cp:             data.data.cp             || '',
        colonia:        data.data.colonia        || '',
        ciudad:         data.data.ciudad         || '',
        estado:         data.data.estado         || '',
        tipoVivienda:   data.data.tipoVivienda   || '',
        tipoEmpleo:     data.data.tipoEmpleo     || '',
        empresa:        data.data.empresa        || '',
        puesto:         data.data.puesto         || '',
        antiguedad:     data.data.antiguedad     || 0,
        ingreso:        data.data.ingreso        || 0,
        otrosIngresos:  data.data.otrosIngresos  || 0,
        ref1Nombre:     data.data.ref1Nombre     || '',
        ref1Celular:    data.data.ref1Celular    || '',
        ref1Relacion:   data.data.ref1Relacion   || '',
        ref2Nombre:     data.data.ref2Nombre     || '',
        ref2Celular:    data.data.ref2Celular    || '',
        ref2Relacion:   data.data.ref2Relacion   || '',
        enganchePct:    data.data.enganchePct    || 0,
        engancheMonto:  data.data.engancheMonto  || 0,
        plazoMeses:     data.data.plazoMeses     || 0,
        financiera:     data.data.financiera     || '',
        proposito:      data.data.proposito      || '',
        fecha: new Date(),
      })
      .then((creditoInserted) => {
        // 2. También insertar en ALeads para que aparezca en el panel
        return wixData.insert('ALeads', {
          nombre, telefono: celular, correo,
          tipo:             'credito',
          interes:          'Solicitud de crédito — ' + vehiculo + (precio ? ' $' + precio.toLocaleString() : ''),
          resumen:          'Crédito completo — ' + vehiculo + (precio ? ' $' + precio.toLocaleString() : ''),
          origen,
          pagina:           'Crédito',
          fecha:            new Date(),
          estatusLead:      'nuevo',
          vendedorAsignado: '',
          vendedorNombre:   '',
        })
        .then((leadInserted) => {
          // 3. Crear/actualizar ClientRecord (aparece en panel de vendedores)
          return findOrCreateCliente(nombre, celular, correo, origen)
            .then((r) => {
              console.log('[Crédito-completo] debug:', r.debug);
              notificarLeadNuevo({ nombre, telefono: celular, correo, interes: 'Solicitud de crédito — ' + vehiculo, pagina: 'Crédito', origen, vehiculo, ingreso: String(data.data.ingreso || ''), empresa: data.data.empresa || data.data.tipoEmpleo || '' });
              if (!r.clienteId) return Promise.resolve();

              // Etapa 1: actualizar ALeads con clienteId (sin dependencias)
              const etapa1 = wixData.update('ALeads', Object.assign({}, leadInserted, { clienteId: r.clienteId }));

              // Etapa 2: crear en Creditos → capturar creditoId → linkear en CreditApplications
              const etapa2 = crearCredito({
                clienteId: r.clienteId,
                leadId: leadInserted._id || '',
                vehiculoInteres: data.data.vehiculo || '',
                monto: data.data.engancheMonto ? (data.data.precioVehiculo || 0) - (data.data.engancheMonto || 0) : (data.data.precioVehiculo || 0),
                enganche: data.data.engancheMonto || 0,
                plazoMeses: data.data.plazoMeses || 0,
                financiera: data.data.financiera || '',
                origen: 'web',
                nombre: nombre, celular, correo,
                rfc: data.data.rfc || '',
                curp: data.data.curp || '',
                ingreso: data.data.ingreso || 0,
                empresa: data.data.empresa || data.data.tipoEmpleo || '',
              }, 'sistema', 'Sistema')
                .then((resultado) => {
                  // Capturar creditoId solo si crearCredito tuvo éxito
                  const creditoId = (resultado && resultado.ok && resultado.credito && resultado.credito._id)
                    ? resultado.credito._id
                    : '';
                  if (!creditoId) {
                    console.warn('[Crédito-completo] crearCredito no devolvió ID:', resultado);
                  }
                  return wixData.update('CreditApplications', Object.assign({}, creditoInserted, {
                    clienteId: r.clienteId,
                    creditoId,
                    estatus: creditoId ? 'vinculada' : 'error_interno',
                    errorDetalle: creditoId ? '' : ('crearCredito sin ID: ' + JSON.stringify(resultado)),
                  }));
                })
                .catch((err) => {
                  console.error('[Crédito-completo] Error en crearCredito:', err);
                  return wixData.update('CreditApplications', Object.assign({}, creditoInserted, {
                    clienteId: r.clienteId,
                    creditoId: '',
                    estatus: 'error_interno',
                    errorDetalle: String(err),
                  }));
                });

              return Promise.all([etapa1, etapa2]);
            });
        });
      })
      .catch((err) => console.error('[Crédito-completo] Error:', err));
    }
  });
});
