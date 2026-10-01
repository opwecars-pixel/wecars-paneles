// ═══════════════════════════════════════════════════════════════════
//  WECARS BAJÍO — CÓDIGO VELO COMPLETO CON CMS
//
//  OJO: el "ID de la colección" real en Wix casi nunca es igual al nombre
//  que ves en pantalla (pasó con "Precio Venta"→priceNew, y pasa aquí
//  también). Los IDs reales confirmados en el CMS son:
//    "A_Leads"              → ID real: ALeads
//    "A_Consignas"          → ID real: CarConsignment
//    "A_SolicitudesCredito" → ID real: CreditApplications
//    "A_Clientes"           → ID real: ClientRecords
//    "Oportunidades"        → ID real: Opportunities
//    "Actividades"          → ID real: Activities
//    "Documentos"           → ID real: Documents
//  El código de abajo YA usa estos IDs reales — no los que se ven en pantalla.
//
//  Colecciones Wix que debes crear antes de publicar:
//
//  1. "A_Leads"       → nombre, telefono, correo, interes, canalContacto,
//                     mensaje, pagina, fecha (Date — auto)
//
//  2. "A_Consignas"   → nombre, telefono, correo, marca, modelo, anio,
//                     version, km, color, transmision, factura,
//                     financiamientoVigente, condicion, carroceria,
//                     mecanica, notas, precio, precioMinimo,
//                     urgencia, contactoPreferido, horario, fecha
//
//  3. "A_Testimonios" → nombre, tipo, auto, texto, recomienda,
//                     calificacion, aprobado (Boolean — default false),
//                     fecha
//
//  4. "A_SolicitudesCredito" → vehiculo, precioVehiculo (Number),
//                     nombre, celular, correo, rfc, curp, fechaNac,
//                     edad (Number), sexo, estadoCivil, dependientes,
//                     calle, numExt, numInt, cp, colonia, ciudad,
//                     estado, tipoVivienda, tipoEmpleo, empresa,
//                     puesto, antiguedad (Number), ingreso (Number),
//                     otrosIngresos (Number),
//                     ref1Nombre, ref1Celular, ref1Relacion,
//                     ref2Nombre, ref2Celular, ref2Relacion,
//                     enganchePct (Number), engancheMonto (Number),
//                     plazoMeses (Number), financiera, proposito,
//                     fecha (Date — auto), clienteId (Text — NUEVO)
//
//  5. "A_Clientes" (NUEVA — CRM de vendedores, Fase A) → nombre, telefono,
//                     correo, estatus (Text, default "Nuevo"),
//                     vendedorAsignado, notas, ultimaActividad (Date)
//
//  NUEVO: agrega también un campo "clienteId" (Text) a las colecciones
//  "A_Leads" y "A_Consignas" (ya existentes) — así cada lead/crédito/
//  consigna queda enlazado a un solo perfil de cliente en "A_Clientes",
//  sin importar por cuál página haya escrito la persona.
//
//  Cómo crear una colección en Wix:
//  Panel izquierdo → Bases de datos → + Nueva colección → ponle el nombre
//  exacto de arriba → agrega los campos con los tipos indicados.
// ═══════════════════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: INICIO
//  Elemento HTML ID: #htmlCatalogo
//  Pega este bloque en { } de la página INICIO
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';

const COLLECTION_ID     = 'Cars';
const HTML_COMPONENT_ID = '#htmlCatalogo';

// Claves de campo reales de tu colección Cars: "priceNew" = precio de
// contado (columna "Precio Venta"), "oldPrice" = precio de crédito
// (columna "Crédito"). Si en tu colección se llaman distinto, cambia
// solo el valor de la derecha.
const FIELDS = {
  nombreCarro:  'title',
  imagen:       'image',
  marca:        'brand',
  modelo:       'year',
  tipo:         'type',
  transmision:  'transmission',
  kilometraje:  'statusDescription',
  precio:       'priceNew',
  precioCredito:'oldPrice',
  ciudad:       'city',
  url:          'sourceUrl',
};

// "Precio Venta" y "Crédito" son campos de texto tipo "$739,800" — esto los
// convierte a número puro (739800) para poder usarlos en cálculos.
function parseMoney(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Convierte wix:image://v1/FILEID/... → URL pública de static.wixstatic.com
function wixImgUrl(uri, w, h) {
  if (!uri) return '';
  if (uri.startsWith('http')) return uri;
  const match = uri.match(/wix:image:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return uri;
  const fileId = match[1];
  const fname  = match[2];
  if (w && h) {
    return `https://static.wixstatic.com/media/${fileId}/v1/fill/w_${w},h_${h},al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/${fname}`;
  }
  return `https://static.wixstatic.com/media/${fileId}`;
}

// "Combustible" es un campo de texto enriquecido (Rich Text) — llega como
// HTML, ej. "<p class=\"font_8\">Gasolina</p>". Esto lo deja en texto plano.
function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

$w.onReady(function () {
  $w(HTML_COMPONENT_ID).postMessage({ type: 'wecars-siteconfig', config: getSiteConfig() });

  $w(HTML_COMPONENT_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_COMPONENT_ID).height = data.height;
    }

    if (data.type === 'wecars-catalog-ready') {
      loadAndSendInventory();
    }

    if (data.type === 'wecars-lead') {
      saveLead(data.data, data.pagina || 'Inicio');
    }

    if (data.type === 'wecars-inventory-received') {
      console.log('Inventario recibido:', data.count, 'unidades');
    }
  });

  loadAndSendInventory();
});

function loadAndSendInventory() {
  wixData.query(COLLECTION_ID)
    .limit(100)
    .find()
    .then((results) => {
      const items = results.items.map((item) => ({
        id:           item._id,
        title:        item[FIELDS.nombreCarro]  || '',
        image:        wixImgUrl(item[FIELDS.imagen], 900, 620),
        brand:        item[FIELDS.marca]        || '',
        year:         item[FIELDS.modelo]       || '',
        type:         item[FIELDS.tipo]         || '',
        transmission: item[FIELDS.transmision]  || '',
        km:           item[FIELDS.kilometraje]  || 0,
        price:        parseMoney(item[FIELDS.precio]),
        priceCredito: parseMoney(item[FIELDS.precioCredito]),
        city:         item[FIELDS.ciudad]       || 'León, Gto.',
        sourceUrl:    item[FIELDS.url]          || '',
        fuel:         stripHtml(item.fuel),
      }));

      $w(HTML_COMPONENT_ID).postMessage({ type: 'wecars-inventory', items });
    })
    .catch((err) => console.error('Error cargando Cars:', err));
}

function saveLead(data, pagina) {
  wixData.insert('ALeads', {
    nombre:        data.nombre        || '',
    telefono:      data.telefono      || '',
    correo:        data.correo        || '',
    interes:       data.interes       || '',
    canalContacto: data.canalContacto || '',
    mensaje:       data.mensaje       || '',
    origen:        data.origen        || '',
    pagina:        pagina,
    fecha:         new Date(),
  })
    .then((inserted) => {
      return findOrCreateCliente(data.nombre, data.telefono, data.correo, data.origen)
        .then((r) => { console.log('[Clientes] debug:', r.debug); if (r.clienteId) return wixData.update('ALeads', Object.assign({}, inserted, { clienteId: r.clienteId })); });
    })
    .catch((err) => console.error('Error guardando lead:', err));
}


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: INVENTARIO
//  Elemento HTML ID: #htmlInventario
//  Pega SOLO este bloque en { } de la página INVENTARIO
//  URL de la página: /inventario
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';

const HTML_INVENTARIO_ID = '#htmlInventario';

// "Precio Venta" y "Crédito" son campos de texto tipo "$739,800" — esto los
// convierte a número puro (739800). Si tus campos ya son de tipo Número,
// esta función los deja igual sin problema.
function parseMoneyInventario(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function wixImgUrlInventario(uri, w, h) {
  if (!uri) return '';
  if (uri.startsWith('http')) return uri;
  const match = uri.match(/wix:image:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return uri;
  const fileId = match[1];
  const fname  = match[2];
  if (w && h) {
    return `https://static.wixstatic.com/media/${fileId}/v1/fill/w_${w},h_${h},al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/${fname}`;
  }
  return `https://static.wixstatic.com/media/${fileId}`;
}

// "Combustible" es un campo de texto enriquecido (Rich Text) — llega como
// HTML, ej. "<p class=\"font_8\">Gasolina</p>". Esto lo deja en texto plano.
function stripHtmlInventario(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// Igual que en Detalle: probamos varios nombres posibles del campo de
// galería, porque el nombre visible casi nunca es igual a la clave real.
const POSIBLES_CLAVES_GALERIA = ['mediagallery', 'mediaGallery', 'gallery', 'galeriaDeFotos', 'galeriaFotos', 'photos', 'fotos', 'photoGallery', 'imageGallery', 'galleryImages'];
function obtenerImagenesInventario(item) {
  for (const clave of POSIBLES_CLAVES_GALERIA) {
    if (Array.isArray(item[clave]) && item[clave].length) {
      return item[clave].map(x => wixImgUrlInventario(x.src || x, 900, 620)).filter(Boolean);
    }
  }
  if (item.image) return [wixImgUrlInventario(item.image, 900, 620)];
  return [];
}

$w.onReady(function () {
  $w(HTML_INVENTARIO_ID).postMessage({ type: 'wecars-siteconfig', config: getSiteConfig() });

  $w(HTML_INVENTARIO_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_INVENTARIO_ID).height = data.height;
    }

    if (data.type === 'wecars-catalog-ready') {
      loadAndSendInventarioCompleto();
    }

    if (data.type === 'wecars-lead') {
      wixData.insert('ALeads', {
        nombre:        data.data.nombre        || '',
        telefono:      data.data.telefono      || '',
        correo:        data.data.correo        || '',
        interes:       data.data.interes       || '',
        canalContacto: data.data.canalContacto || '',
        mensaje:       data.data.mensaje       || '',
        origen:        data.data.origen        || '',
        pagina:        data.pagina || 'Inventario',
        fecha:         new Date(),
      })
        .then((inserted) => {
          return findOrCreateCliente(data.data.nombre, data.data.telefono, data.data.correo, data.data.origen)
            .then((r) => { console.log('[Clientes] debug:', r.debug); if (r.clienteId) return wixData.update('ALeads', Object.assign({}, inserted, { clienteId: r.clienteId })); });
        })
        .catch((err) => console.error('[Inventario] Error guardando lead:', err));
    }

    if (data.type === 'wecars-inventory-received') {
      console.log('[Inventario] recibidos:', data.count, 'unidades');
    }
  });

  loadAndSendInventarioCompleto();
});

function loadAndSendInventarioCompleto() {
  wixData.query('Cars')
    .limit(100)
    .find()
    .then((results) => {
      const items = results.items.map((item) => ({
        id:           item._id,
        title:        item.title              || '',
        images:       obtenerImagenesInventario(item),
        brand:        item.brand              || '',
        type:         item.type               || '',
        year:         item.year               || '',
        transmission: item.transmission       || '',
        km:           item.statusDescription  || 0,
        price:        parseMoneyInventario(item.priceNew),
        priceCredito: parseMoneyInventario(item.oldPrice),
        city:         item.city               || 'León, Gto.',
        sourceUrl:    item.sourceUrl           || '',
        highDemand:   Boolean(item.highDemand),
        fuel:         stripHtmlInventario(item.fuel),
      }));

      // El buscador rápido del Home manda a /inventario?tipo=...&precio=...
      // — se los pasamos al HTML para que ya abra con esos filtros aplicados.
      $w(HTML_INVENTARIO_ID).postMessage({
        type: 'wecars-inventory',
        items,
        filtrosIniciales: {
          tipo: wixLocation.query.tipo || '',
          precio: wixLocation.query.precio || '',
        },
      });
    })
    .catch((err) => console.error('[Inventario] Error cargando Cars:', err));
}
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: NOSOTROS
//  Elemento HTML ID: #htmlNosotros
//  Pega SOLO este bloque en { } de la página NOSOTROS
// ───────────────────────────────────────────────────────────────────

/*
$w.onReady(function () {
  $w('#htmlNosotros').onMessage((event) => {
    if (event.data.type === 'wecars-resize' && event.data.height > 0) {
      $w('#htmlNosotros').height = event.data.height;
    }
  });
});
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: CONTACTO
//  Elemento HTML ID: #htmlContacto
//  Pega SOLO este bloque en { } de la página CONTACTO
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';

$w.onReady(function () {
  $w('#htmlContacto').postMessage({ type: 'wecars-siteconfig', config: getSiteConfig() });

  $w('#htmlContacto').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w('#htmlContacto').height = data.height;
    }

    if (data.type === 'wecars-lead') {
      wixData.insert('ALeads', {
        nombre:        data.data.nombre        || '',
        telefono:      data.data.telefono      || '',
        correo:        data.data.correo        || '',
        interes:       data.data.interes       || '',
        canalContacto: data.data.canalContacto || '',
        mensaje:       data.data.mensaje       || '',
        origen:        data.data.origen        || '',
        pagina:        data.pagina             || 'Contacto',
        fecha:         new Date(),
      })
        .then((inserted) => {
          return findOrCreateCliente(data.data.nombre, data.data.telefono, data.data.correo, data.data.origen)
            .then((r) => { console.log('[Clientes] debug:', r.debug); if (r.clienteId) return wixData.update('ALeads', Object.assign({}, inserted, { clienteId: r.clienteId })); });
        })
        .catch((err) => console.error('Error guardando lead contacto:', err));
    }
  });
});
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: TESTIMONIOS
//  Elemento HTML ID: #htmlTestimonios
//  Pega SOLO este bloque en { } de la página TESTIMONIOS
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import { getSiteConfig } from 'backend/siteConfig.jsw';

$w.onReady(function () {
  $w('#htmlTestimonios').postMessage({ type: 'wecars-siteconfig', config: getSiteConfig() });

  $w('#htmlTestimonios').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w('#htmlTestimonios').height = data.height;
    }

    if (data.type === 'wecars-testimonio') {
      wixData.insert('A_Testimonios', {
        nombre:       data.data.nombre      || '',
        tipo:         data.data.tipo        || '',
        auto:         data.data.auto        || '',
        texto:        data.data.texto       || '',
        recomienda:   data.data.recomienda  || '',
        calificacion: data.data.calificacion || 0,
        aprobado:     false,
        fecha:        new Date(),
      }).catch((err) => console.error('Error guardando testimonio:', err));
    }
  });
});
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: GARANTÍAS
//  Elemento HTML ID: #htmlGarantias
//  Pega SOLO este bloque en { } de la página GARANTIAS
// ───────────────────────────────────────────────────────────────────

/*
$w.onReady(function () {
  $w('#htmlGarantias').onMessage((event) => {
    if (event.data.type === 'wecars-resize' && event.data.height > 0) {
      $w('#htmlGarantias').height = event.data.height;
    }
  });
});
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: CRÉDITO
//  Elemento HTML ID: #htmlCredito
//  Pega SOLO este bloque en { } de la página CRÉDITO
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';

$w.onReady(function () {
  $w('#htmlCredito').postMessage({ type: 'wecars-siteconfig', config: getSiteConfig() });

  $w('#htmlCredito').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w('#htmlCredito').height = data.height;
    }

    if (data.type === 'wecars-lead') {
      wixData.insert('ALeads', {
        nombre:   data.data.nombre   || '',
        telefono: data.data.telefono || '',
        correo:   data.data.correo   || '',
        interes:  data.data.interes  || '',
        origen:   data.data.origen   || '',
        pagina:   data.pagina || 'Crédito',
        fecha:    new Date(),
      })
        .then((inserted) => {
          return findOrCreateCliente(data.data.nombre, data.data.telefono, data.data.correo, data.data.origen)
            .then((r) => { console.log('[Clientes] debug:', r.debug); if (r.clienteId) return wixData.update('ALeads', Object.assign({}, inserted, { clienteId: r.clienteId })); });
        })
        .catch((err) => console.error('Error lead crédito:', err));
    }

    if (data.type === 'wecars-credito') {
      wixData.insert('CreditApplications', {
        vehiculo:       data.data.vehiculo        || '',
        precioVehiculo: data.data.precioVehiculo  || 0,
        nombre:         data.data.nombre          || '',
        celular:        data.data.celular         || '',
        correo:         data.data.correo          || '',
        rfc:            data.data.rfc             || '',
        curp:           data.data.curp            || '',
        fechaNac:       data.data.fechaNac        || '',
        edad:           data.data.edad            || 0,
        sexo:           data.data.sexo            || '',
        estadoCivil:    data.data.estadoCivil     || '',
        dependientes:   data.data.dependientes    || '',
        calle:          data.data.calle           || '',
        numExt:         data.data.numExt          || '',
        numInt:         data.data.numInt          || '',
        cp:             data.data.cp              || '',
        colonia:        data.data.colonia         || '',
        ciudad:         data.data.ciudad          || '',
        estado:         data.data.estado          || '',
        tipoVivienda:   data.data.tipoVivienda    || '',
        tipoEmpleo:     data.data.tipoEmpleo      || '',
        empresa:        data.data.empresa         || '',
        puesto:         data.data.puesto          || '',
        antiguedad:     data.data.antiguedad      || 0,
        ingreso:        data.data.ingreso         || 0,
        otrosIngresos:  data.data.otrosIngresos   || 0,
        ref1Nombre:     data.data.ref1Nombre      || '',
        ref1Celular:    data.data.ref1Celular     || '',
        ref1Relacion:   data.data.ref1Relacion    || '',
        ref2Nombre:     data.data.ref2Nombre      || '',
        ref2Celular:    data.data.ref2Celular     || '',
        ref2Relacion:   data.data.ref2Relacion    || '',
        enganchePct:    data.data.enganchePct     || 0,
        engancheMonto:  data.data.engancheMonto   || 0,
        plazoMeses:     data.data.plazoMeses      || 0,
        financiera:     data.data.financiera      || '',
        proposito:      data.data.proposito       || '',
        fecha:          new Date(),
      })
        .then((inserted) => {
          return findOrCreateCliente(data.data.nombre, data.data.celular, data.data.correo, data.data.origen)
            .then((r) => { console.log('[Clientes] debug:', r.debug); if (r.clienteId) return wixData.update('CreditApplications', Object.assign({}, inserted, { clienteId: r.clienteId })); });
        })
        .catch((err) => console.error('Error guardando solicitud crédito:', err));
    }
  });
});
*/


// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/clientes.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  clientes.jsw
//  Pega SOLO este bloque en ese archivo nuevo (no en ninguna página).
//  Todas las páginas que guardan leads/créditos/consignas usan esta misma
//  función para no repetir la lógica 6 veces.
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import { notificarLeadNuevo } from 'backend/notificaciones.jsw';

function normalizePhone(v) {
  return String(v || '').replace(/\D/g, '');
}

// Busca un cliente existente por teléfono; si no existe, lo crea. Regresa
// { clienteId, debug } — clienteId para enlazarlo al lead/crédito/consigna,
// y debug con el detalle de qué pasó (incluyendo errores), porque los
// console.error de ESTE archivo corren en el servidor de Wix y no se ven
// en la consola del navegador — por eso regresamos el debug al front para
// poder verlo ahí mismo.
// "origen" (Facebook, Instagram, TikTok, Google, Marketplace, Referido,
// Sitio web, Otro) solo se guarda cuando el cliente se CREA por primera
// vez — nunca se sobreescribe en visitas/contactos posteriores, para
// respetar la atribución de primer toque (el canal por el que en verdad
// llegó, no el último formulario que llenó).
export function findOrCreateCliente(nombre, telefono, correo, origen) {
  const tel = normalizePhone(telefono);
  if (!tel) return Promise.resolve({ clienteId: null, debug: 'sin teléfono, no se pudo identificar cliente' });

  return wixData.query('ClientRecords')
    .eq('telefono', tel)
    .limit(1)
    .find()
    .then(results => {
      if (results.items.length) {
        const cliente = results.items[0];
        const cambios = Object.assign({}, cliente, { ultimaActividad: new Date() });
        if (!cliente.nombre && nombre) cambios.nombre = nombre;
        if (!cliente.correo && correo) cambios.correo = correo;
        return wixData.update('ClientRecords', cambios).then(actualizado => ({ clienteId: actualizado._id, debug: 'cliente existente actualizado' }));
      }
      return wixData.insert('ClientRecords', {
        nombre:           nombre || '',
        telefono:         tel,
        correo:           correo || '',
        estatus:          'Nuevo',
        vendedorAsignado: '',
        notas:            '',
        origen:           origen || 'Sitio web',
        ultimaActividad:  new Date(),
      }).then(creado => {
        notificarLeadNuevo(creado).catch(err => console.error('[Clientes] Error avisando lead nuevo:', err));
        return { clienteId: creado._id, debug: 'cliente nuevo creado' };
      });
    })
    .catch(err => {
      return { clienteId: null, debug: 'ERROR: ' + (err && err.message ? err.message : JSON.stringify(err)) };
    });
}
*/


// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/notificaciones.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  notificaciones.jsw
//  Pega SOLO este bloque en ese archivo nuevo (no en ninguna página).
//
//  PASO MANUAL ÚNICO antes de publicar (una sola vez, en el Editor de
//  Wix): ve a Automatizaciones/Marketing → "Correos disparados"
//  (Triggered Emails) → Crear correo → tipo Personalizado. Ponle un
//  asunto genérico como "Notificación weCars Bajío" y agrega 3 campos
//  dinámicos en el cuerpo: {{titulo}}, {{mensaje}} y {{link}}. Al
//  guardarlo, Wix te muestra su "Email ID" (algo como
//  "a1b2c3d4-...") — cópialo y pégalo abajo en TRIGGERED_EMAIL_ID.
//  Ese MISMO correo se reutiliza para los 3 avisos de abajo (lead
//  nuevo, auto cerrado/apartado, factura subida) — solo cambia el
//  texto que llega en las variables, así no hay que crear un correo
//  distinto por cada caso.
//
//  Si algún día quieres mandar el aviso también por WhatsApp en vez de
//  solo correo, este es el único archivo que habría que tocar — las 3
//  funciones de abajo (notificarLeadNuevo, notificarAutoEstatus,
//  notificarDocumentoFactura) son el punto central de todos los avisos.
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import { contacts, triggeredEmails } from 'wix-crm-backend';

const TRIGGERED_EMAIL_ID = 'PEGA_AQUI_EL_EMAIL_ID_DEL_CORREO_DISPARADO';

function normalizarEmail(v) {
  return String(v || '').toLowerCase().trim();
}

// emailContact() manda el correo a un contactId de Wix, no a un texto de
// correo directamente — por eso primero hay que encontrar (o crear, la
// primera vez) el Contacto que corresponde a cada correo interno del
// equipo.
function obtenerOCrearContacto(email, nombre) {
  const correo = normalizarEmail(email);
  return contacts.queryContacts()
    .eq('info.emails.email', correo)
    .find()
    .then((resultado) => {
      if (resultado.items.length) return resultado.items[0]._id;
      return contacts.createContact({
        name: { first: nombre || correo },
        emails: [{ tag: 'WORK', email: correo, primary: true }],
      }, { allowDuplicates: false }).then((contacto) => contacto._id);
    });
}

function enviarAviso(email, nombre, variables) {
  if (!TRIGGERED_EMAIL_ID || TRIGGERED_EMAIL_ID.indexOf('PEGA_AQUI') === 0) {
    console.warn('[Notificaciones] Falta configurar TRIGGERED_EMAIL_ID (ver instrucciones arriba) — no se mandó el aviso.');
    return Promise.resolve();
  }
  return obtenerOCrearContacto(email, nombre)
    .then((contactId) => triggeredEmails.emailContact(TRIGGERED_EMAIL_ID, contactId, { variables }))
    .catch((err) => console.error('[Notificaciones] Error mandando aviso a', email, err));
}

// Correos activos de un rol — "activo" solo se descarta cuando es
// explícitamente false, para no perder de vista a empleados antiguos sin
// ese campo todavía llenado.
function destinatariosPorRol(rol) {
  return wixData.query('Usuarios')
    .eq('rol', rol)
    .limit(200)
    .find()
    .then((resultado) => resultado.items.filter((u) => u.activo !== false && u.email))
    .catch(() => []);
}

// Un lead nuevo cae en la bolsa "Sin asignar" y lo puede ver cualquier
// vendedor — por eso se avisa a TODOS los vendedores activos, no solo a
// uno. Se dispara únicamente cuando el cliente se CREA por primera vez
// (nunca en visitas/contactos posteriores del mismo teléfono).
export function notificarLeadNuevo(cliente) {
  return destinatariosPorRol('Vendedor').then((vendedores) => Promise.all(
    vendedores.map((v) => enviarAviso(v.email, v.nombre, {
      titulo: 'Nuevo lead sin asignar',
      mensaje: `${cliente.nombre || 'Un cliente nuevo'} (${cliente.telefono || 'sin teléfono'}) llegó por ${cliente.origen || 'el sitio web'}. Entra al panel para asignártelo.`,
      link: 'https://www.wecarsbajio.com/panel-vendedores',
    }))
  ));
}

// Una unidad se cierra (Vendido) o se aparta (Apartado) — le corresponde
// a Gerencia enterarse en el momento, no al vendedor que ya lo sabe
// porque lo marcó él mismo.
export function notificarAutoEstatus(auto, estatusNuevo) {
  return destinatariosPorRol('Gerencia').then((gerentes) => Promise.all(
    gerentes.map((g) => enviarAviso(g.email, g.nombre, {
      titulo: estatusNuevo === 'Vendido' ? 'Unidad vendida' : 'Unidad apartada',
      mensaje: `${auto.title || 'Un vehículo'} se marcó como ${String(estatusNuevo).toLowerCase()}.`,
      link: 'https://www.wecarsbajio.com/panel-gerencia',
    }))
  ));
}

// Solo facturas de SALIDA — son las que Finanzas concilia contra cada
// venta (ver tarjeta "Ganados sin factura" en Gerencia). El resto de
// documentos (INE, comprobantes, etc.) son del expediente de crédito del
// cliente y no le corresponden a Finanzas.
export function notificarDocumentoFactura(cliente, tipoDocumento) {
  return destinatariosPorRol('Finanzas').then((finanzas) => Promise.all(
    finanzas.map((f) => enviarAviso(f.email, f.nombre, {
      titulo: 'Nueva factura de salida subida',
      mensaje: `Se subió "${tipoDocumento}" para ${cliente.nombre || 'un cliente'}. Revisa el estatus de facturación en tu panel.`,
      link: 'https://www.wecarsbajio.com/panel-finanzas',
    }))
  ));
}

// Cuando Gerencia da de alta un empleado directamente (acción rápida
// desde su propio panel, sin pasar por Administración), Administración
// —dueña del directorio de permisos— debe enterarse, porque ese alta
// pudo haber sido con cualquier rol, incluido Gerencia o Administración.
// No se dispara cuando Administración da de alta desde su propio panel
// (avisarle de su propia acción no aporta nada).
export function notificarEmpleadoNuevo(empleado) {
  return destinatariosPorRol('Administración').then((administradores) => Promise.all(
    administradores.map((a) => enviarAviso(a.email, a.nombre, {
      titulo: 'Nuevo empleado dado de alta desde Gerencia',
      mensaje: `${empleado.nombre || empleado.email} se agregó con rol "${empleado.rol}". Revisa el directorio si necesitas ajustar algo.`,
      link: 'https://www.wecarsbajio.com/panel-administracion',
    }))
  ));
}
*/


// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/permisos.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  permisos.jsw
//  Única fuente de verdad de roles. Se usa SIEMPRE del lado del servidor
//  (aquí) antes de decidir qué datos mandar o qué acciones permitir —
//  nunca confiar en una verificación hecha solo en el HTML, porque el
//  HTML es inspeccionable por cualquier usuario.
//  El rol de cada quien ya NO vive en un arreglo escrito a mano en el
//  código — vive en la colección "Usuarios", y se edita ahí (a través
//  del Panel de Administración) sin tener que tocar código nunca.
//  IMPORTANTE antes de publicar este archivo: agrega primero, en el CMS,
//  un registro en "Usuarios" para cada correo de gerente (rol "Gerencia")
//  — si no, al publicar perderían el acceso a Gerencia/Comisiones/
//  eliminar clientes, porque ya no habría de dónde leer su rol.
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';

export function obtenerRol(email) {
  const correo = String(email || '').toLowerCase().trim();
  if (!correo) return Promise.resolve('');
  return wixData.query('Usuarios')
    .eq('email', correo)
    .limit(1)
    .find()
    .then((results) => (results.items.length ? (results.items[0].rol || '') : ''))
    .catch(() => '');
}

const PERFIL_VACIO = { rol: '', nombre: '', puesto: '', fechaIngreso: null };

export function obtenerPerfil(email) {
  const correo = String(email || '').toLowerCase().trim();
  if (!correo) return Promise.resolve(PERFIL_VACIO);
  return wixData.query('Usuarios')
    .eq('email', correo)
    .limit(1)
    .find()
    .then((results) => {
      if (!results.items.length) return PERFIL_VACIO;
      const u = results.items[0];
      return { rol: u.rol || '', nombre: u.nombre || '', puesto: u.puesto || '', fechaIngreso: u.fechaIngreso || null };
    })
    .catch(() => PERFIL_VACIO);
}

export function esGerente(email) {
  return obtenerRol(email).then((rol) => rol === 'Gerencia');
}

export function esGerenteOAdministracion(email) {
  return obtenerRol(email).then((rol) => rol === 'Gerencia' || rol === 'Administración');
}
*/


// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/siteConfig.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  siteConfig.jsw
//  Fuente única del número de WhatsApp y los links del menú — cámbialos
//  aquí una sola vez y las 7 páginas públicas se actualizan solas, sin
//  tener que editar cada archivo HTML por separado.
// ───────────────────────────────────────────────────────────────────

/*
const WHATSAPP_NUMBER = '524778350020';

const NAV_LINKS = [
  { key: 'inicio',      label: 'Inicio',      url: 'https://www.wecarsbajio.com/' },
  { key: 'inventario',  label: 'Inventario',  url: 'https://www.wecarsbajio.com/inventario' },
  { key: 'credito',     label: 'Crédito',     url: 'https://www.wecarsbajio.com/credito' },
  { key: 'consigna',    label: 'Consigna',    url: 'https://www.wecarsbajio.com/consigna' },
  { key: 'nosotros',    label: 'Nosotros',    url: 'https://www.wecarsbajio.com/nosotros' },
];

const NAV_MAS = [
  { key: 'contacto',     label: 'Contacto',     url: 'https://www.wecarsbajio.com/contacto' },
  { key: 'testimonios',  label: 'Testimonios',  url: 'https://www.wecarsbajio.com/testimonios' },
  { key: 'garantias',    label: 'Garantías',    url: 'https://www.wecarsbajio.com/garantias' },
];

export function getSiteConfig() {
  return { whatsappNumber: WHATSAPP_NUMBER, navLinks: NAV_LINKS, navMas: NAV_MAS };
}
*/


// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/media.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  media.jsw
//  Pega SOLO este bloque en ese archivo nuevo (no en ninguna página).
// ───────────────────────────────────────────────────────────────────

/*
import { mediaManager } from 'wix-media-backend';

// El campo "Video" de Wix guarda el archivo como "wix:video://v1/FILEID/..."
// pero para poder reproducirlo hace falta la URL pública real del archivo.
// No hay una forma 100% documentada/estable de adivinar esa URL a mano (a
// diferencia de las fotos), así que probamos varios nombres de función
// conocidos de la API de Wix uno por uno. Si ninguno existe en tu versión
// de Wix, el "debug" que regresa esta función te dice EXACTAMENTE cuáles
// métodos sí están disponibles, para ajustarlo con certeza en un segundo intento.
export function resolveVideoUrl(uri) {
  const match = String(uri || '').match(/wix:video:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return Promise.resolve({ url: '', debug: 'uri de video no reconocida' });
  const fileId = match[1];

  function extractUrl(r) {
    if (!r) return '';
    if (typeof r === 'string') return r;
    return r.fileUrl || r.url || r.downloadUrl || '';
  }

  const candidatos = ['getFileUrl', 'getDownloadUrl', 'generateFileDownloadUrl'];
  let cadena = Promise.resolve({ url: '', debug: '' });
  candidatos.forEach(function (nombre) {
    cadena = cadena.then(function (acc) {
      if (acc.url) return acc; // ya se resolvió con un candidato anterior
      if (typeof mediaManager[nombre] !== 'function') {
        return { url: '', debug: acc.debug + nombre + ': no existe. ' };
      }
      return mediaManager[nombre](fileId)
        .then(function (r) { return { url: extractUrl(r), debug: acc.debug + nombre + ': ok. ' }; })
        .catch(function (err) { return { url: '', debug: acc.debug + nombre + ': error ' + (err && err.message) + '. ' }; });
    });
  });
  return cadena.then(function (acc) {
    return {
      url: acc.url,
      debug: acc.url ? acc.debug : (acc.debug + 'Métodos disponibles en mediaManager: ' + Object.keys(mediaManager).join(', ')),
    };
  });
}

// Lo mismo que resolveVideoUrl pero para documentos del Expediente Digital
// (INE, facturas, etc.), que Wix guarda como "wix:document://v1/FILEID/...".
// Si la uri no se reconoce o ningún método resuelve, regresamos la uri tal
// cual (mejor que un link roto) y el debug para diagnosticar.
export function resolveDocumentUrl(uri) {
  const match = String(uri || '').match(/wix:document:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return Promise.resolve({ url: uri || '', debug: 'uri de documento no reconocida, se regresa tal cual' });
  const fileId = match[1];

  function extractUrl(r) {
    if (!r) return '';
    if (typeof r === 'string') return r;
    return r.fileUrl || r.url || r.downloadUrl || '';
  }

  const candidatos = ['getFileUrl', 'getDownloadUrl', 'generateFileDownloadUrl'];
  let cadena = Promise.resolve({ url: '', debug: '' });
  candidatos.forEach(function (nombre) {
    cadena = cadena.then(function (acc) {
      if (acc.url) return acc;
      if (typeof mediaManager[nombre] !== 'function') {
        return { url: '', debug: acc.debug + nombre + ': no existe. ' };
      }
      return mediaManager[nombre](fileId)
        .then(function (r) { return { url: extractUrl(r), debug: acc.debug + nombre + ': ok. ' }; })
        .catch(function (err) { return { url: '', debug: acc.debug + nombre + ': error ' + (err && err.message) + '. ' }; });
    });
  });
  return cadena.then(function (acc) {
    return {
      url: acc.url || uri,
      debug: acc.url ? acc.debug : (acc.debug + 'Métodos disponibles en mediaManager: ' + Object.keys(mediaManager).join(', ')),
    };
  });
}
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: DETALLE DE AUTO
//  Elemento HTML ID: #htmlDetalle
//  Pega SOLO este bloque en { } de la página DETALLE
//  URL de la página: /detalle  (la crea en Wix como página normal)
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { resolveVideoUrl } from 'backend/media.jsw';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';

function wixImgUrl(uri, w, h) {
  if (!uri) return '';
  if (uri.startsWith('http')) return uri;
  const match = uri.match(/wix:image:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return uri;
  const fileId = match[1];
  const fname  = match[2];
  if (w && h) {
    return `https://static.wixstatic.com/media/${fileId}/v1/fill/w_${w},h_${h},al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/${fname}`;
  }
  return `https://static.wixstatic.com/media/${fileId}`;
}

// "Precio Venta" y "Crédito" son campos de texto tipo "$739,800" — esto los
// convierte a número puro (739800). Si tus campos ya son de tipo Número,
// esta función los deja igual sin problema.
function parseMoney(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// "Descripción" y "Combustible" son campos de texto enriquecido (Rich Text) —
// llegan como HTML, ej. "<p class=\"font_8\">Gasolina</p>". Esto los deja en
// texto plano limpio: "Gasolina".
function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

$w.onReady(function () {
  let carPayload = null; // guardamos el auto una vez cargado

  $w('#htmlDetalle').postMessage({ type: 'wecars-siteconfig', config: getSiteConfig() });

  // El iframe nunca hace scroll interno (Velo lo estira a todo el alto de
  // la página), así que "window.scrollY" DENTRO del HTML siempre da 0.
  // Por eso le preguntamos a Wix cada instante dónde va el scroll real de
  // la página y se lo mandamos al HTML, para que sus ventanas emergentes
  // (foto grande, crédito, etc.) se puedan posicionar en el lugar correcto.
  // También mandamos la altura visible real de la ventana del visitante
  // (no la del iframe, que Velo estira a todo el contenido) para que las
  // ventanas emergentes tipo pop-up (crédito, etc.) se centren en la
  // pantalla que el usuario realmente está viendo, no en todo el iframe.
  let ultimoScrollEnviado = -1;
  let ultimaAlturaEnviada = -1;
  setInterval(() => {
    wixWindow.getBoundingRect()
      .then((rect) => {
        const y = Math.round((rect && rect.window && rect.window.scrollY) || 0);
        const h = Math.round((rect && rect.window && rect.window.height) || 0);
        if (Math.abs(y - ultimoScrollEnviado) > 4 || Math.abs(h - ultimaAlturaEnviada) > 4) {
          ultimoScrollEnviado = y;
          ultimaAlturaEnviada = h;
          $w('#htmlDetalle').postMessage({ type: 'wecars-scroll', scrollY: y, viewportHeight: h });
        }
      })
      .catch(() => {});
  }, 200);

  $w('#htmlDetalle').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w('#htmlDetalle').height = data.height;
    }

    // El HTML avisa que ya está listo para recibir datos
    if (data.type === 'wecars-detail-ready') {
      console.log('[Detalle] iframe listo, carPayload=', carPayload ? 'sí' : 'no');
      if (carPayload) {
        // Ya teníamos el auto cargado — re-enviarlo
        $w('#htmlDetalle').postMessage(carPayload);
      } else {
        loadCar();
      }
    }

    if (data.type === 'wecars-lead') {
      wixData.insert('ALeads', {
        nombre:   data.data.nombre   || '',
        telefono: data.data.telefono || '',
        correo:   data.data.correo   || '',
        interes:  data.data.interes  || '',
        origen:   data.data.origen   || '',
        pagina:   'Detalle - ' + (data.data.interes || ''),
        fecha:    new Date(),
      })
        .then(inserted => {
          return findOrCreateCliente(data.data.nombre, data.data.telefono, data.data.correo, data.data.origen)
            .then(r => { console.log('[Clientes] debug:', r.debug); if (r.clienteId) return wixData.update('ALeads', Object.assign({}, inserted, { clienteId: r.clienteId })); });
        })
        .catch(err => console.error('Error lead detalle:', err));
    }

    if (data.type === 'wecars-credito') {
      const d = data.data;
      wixData.insert('CreditApplications', {
        vehiculo:       d.vehiculo        || '',
        precioVehiculo: d.precioVehiculo  || 0,
        nombre:         d.nombre          || '',
        celular:        d.celular         || '',
        correo:         d.correo          || '',
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
      })
        .then(inserted => {
          return findOrCreateCliente(d.nombre, d.celular, d.correo, d.origen)
            .then(r => { console.log('[Clientes] debug:', r.debug); if (r.clienteId) return wixData.update('CreditApplications', Object.assign({}, inserted, { clienteId: r.clienteId })); });
        })
        .catch(err => console.error('Error solicitud crédito detalle:', err));
    }

    if (data.type === 'wecars-testdrive') {
      guardarTestDrive(data.data);
    }
  });

  function guardarTestDrive(d) {
    return findOrCreateCliente(d.nombre, d.celular, '', d.origen)
      .then(r => {
        console.log('[Clientes] debug:', r.debug);
        if (!r.clienteId) return;
        return wixData.insert('Activities', {
          clienteId: r.clienteId,
          tipo: 'prueba_manejo',
          resultado: '',
          detalle: `${d.vehiculo || 'Auto'}${d.fecha ? ' · ' + d.fecha : ''}${d.horario ? ' · ' + d.horario : ''}`,
          autor: 'Sitio web',
          fecha: d.fechaSolicitud ? new Date(d.fechaSolicitud) : new Date(),
        });
      })
      .catch(err => console.error('Error guardando prueba de manejo:', err));
  }

  function loadCar() {
    // wixLocation.query no siempre parsea params custom — leemos desde la URL directamente
    const url = wixLocation.url || '';
    const match = url.match(/[?&]carId=([^&#]+)/);
    const carId = match ? decodeURIComponent(match[1]) : null;
    console.log('[Detalle] loadCar() url=', url, 'carId=', carId);
    if (!carId) {
      console.warn('[Detalle] carId no encontrado en URL');
      $w('#htmlDetalle').postMessage({ type: 'wecars-car-error' });
      return;
    }
    let carRef = null; // guardamos el auto para usarlo después de resolver el video
    wixData.get('Cars', carId)
      .then(car => {
        carRef = car;
        console.log('[Detalle] auto encontrado:', car.title);
        console.log('[Detalle] car completo (click para expandir):', car);

        // Galería: probamos varios nombres posibles del campo de galería,
        // porque el "nombre visible" (ej. "Galeria de Fotos") casi nunca es
        // igual a la clave real interna del campo.
        const posiblesClavesGaleria = ['mediagallery', 'mediaGallery', 'gallery', 'galeriaDeFotos', 'galeriaFotos', 'photos', 'fotos', 'photoGallery', 'imageGallery', 'galleryImages'];
        let images = [];
        let imagesHD = []; // mismas fotos pero en su resolución original (sin comprimir)
        for (const clave of posiblesClavesGaleria) {
          if (Array.isArray(car[clave]) && car[clave].length) {
            console.log('[Detalle] galería encontrada en el campo:', clave);
            images   = car[clave].map(item => wixImgUrl(item.src || item, 1200, 900)).filter(Boolean);
            imagesHD = car[clave].map(item => wixImgUrl(item.src || item)).filter(Boolean);
            break;
          }
        }
        if (images.length === 0 && car.image) {
          images   = [wixImgUrl(car.image, 1200, 900)];
          imagesHD = [wixImgUrl(car.image)];
        }
        console.log('[Detalle] fotos finales:', images.length, images);
        carRef.imagesResueltas = images;
        carRef.imagesHDResueltas = imagesHD;

        // El video (si el auto tiene uno) requiere una llamada al backend
        // para conseguir su URL real — por eso esperamos a que resuelva
        // antes de armar y mandar el carPayload.
        return resolveVideoUrl(car.video);
      })
      .then(videoResult => {
        const car = carRef;
        console.log('[Detalle] resolución de video:', videoResult);

        carPayload = {
          type: 'wecars-car',
          car: {
            id:           car._id,
            title:        car.title              || '',
            image:        car.imagesResueltas[0]  || '',
            images:       car.imagesResueltas,
            imagesHD:     car.imagesHDResueltas,
            brand:        car.brand              || '',
            year:         car.year               || '',
            type:         car.type               || '',
            transmission: car.transmission       || '',
            km:           car.statusDescription  || 0,
            price:        parseMoney(car.priceNew),
            priceCredito: parseMoney(car.oldPrice),
            city:         car.city               || 'León, Gto.',
            fuel:         stripHtml(car.fuel),
            description:  stripHtml(car.description),
            video:        (videoResult && videoResult.url) || '',
          }
        };
        $w('#htmlDetalle').postMessage(carPayload);

        // Autos "parecidos": en vez de exigir la misma marca (que casi
        // nunca tiene resultados si no repites marca en inventario),
        // traemos varios autos del inventario y los ordenamos por qué tan
        // parecidos son (mismo tipo de carrocería + precio cercano). Así
        // siempre mostramos opciones reales de tu inventario.
        const precioActual = parseMoney(car.priceNew);
        const tipoActual = car.type || '';
        console.log('[Detalle] buscando parecidos, tipo=', tipoActual, 'precio=', precioActual);
        return wixData.query('Cars')
          .ne('_id', carId)
          .limit(50)
          .find()
          .then(results => {
            const scored = results.items.map(r => {
              const rPrecio = parseMoney(r.priceNew);
              let score = 0;
              if (tipoActual && r.type === tipoActual) score += 100;
              if (precioActual && rPrecio) {
                const diffPct = Math.abs(rPrecio - precioActual) / precioActual;
                score += Math.max(0, 60 - diffPct * 100); // más cercano en precio = más puntos
              }
              return { r, score };
            });
            scored.sort((a, b) => b.score - a.score);
            return { items: scored.slice(0, 6).map(s => s.r) };
          });
      })
      .then(related => {
        console.log('[Detalle] parecidos encontrados:', related ? related.items.length : 'sin resultado (related=null)');
        if (!related) return;
        const items = related.items.map(r => ({
          id:    r._id,
          title: r.title || '',
          image: wixImgUrl(r.image, 600, 420),
          brand: r.brand || '',
          year:  r.year  || '',
          price: parseMoney(r.priceNew),
          priceCredito: parseMoney(r.oldPrice),
          km:    r.statusDescription || 0,
          transmission: r.transmission || '',
        }));
        $w('#htmlDetalle').postMessage({ type: 'wecars-related', items });
      })
      .catch(err => {
        console.error('[Detalle] Error wixData.get:', err);
        $w('#htmlDetalle').postMessage({ type: 'wecars-car-error' });
      });
  }
});
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: CONSIGNA
//  Elemento HTML ID: #htmlConsigna
//  Pega SOLO este bloque en { } de la página CONSIGNA
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';

$w.onReady(function () {
  $w('#htmlConsigna').postMessage({ type: 'wecars-siteconfig', config: getSiteConfig() });

  $w('#htmlConsigna').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w('#htmlConsigna').height = data.height;
    }

    if (data.type === 'wecars-consigna') {
      wixData.insert('CarConsignment', {
        nombre:                 data.data.nombre                 || '',
        telefono:               data.data.telefono               || '',
        correo:                 data.data.correo                 || '',
        marca:                  data.data.marca                  || '',
        modelo:                 data.data.modelo                 || '',
        anio:                   data.data.anio                   || '',
        version:                data.data.version                || '',
        km:                     data.data.km                     || 0,
        color:                  data.data.color                  || '',
        transmision:            data.data.transmision            || '',
        factura:                data.data.factura                || '',
        financiamientoVigente:  data.data.financiamientoVigente  || '',
        condicion:              data.data.condicion              || '',
        carroceria:             data.data.carroceria             || '',
        mecanica:               data.data.mecanica               || '',
        notas:                  data.data.notas                  || '',
        precio:                 data.data.precio                 || 0,
        precioMinimo:           data.data.precioMinimo           || 0,
        urgencia:               data.data.urgencia               || '',
        contactoPreferido:      data.data.contactoPreferido      || '',
        horario:                data.data.horario                || '',
        fecha:                  new Date(),
      })
        .then((inserted) => {
          return findOrCreateCliente(data.data.nombre, data.data.telefono, data.data.correo, data.data.origen)
            .then((r) => { console.log('[Clientes] debug:', r.debug); if (r.clienteId) return wixData.update('CarConsignment', Object.assign({}, inserted, { clienteId: r.clienteId })); });
        })
        .then(() => {
          $w('#htmlConsigna').postMessage({ type: 'wecars-consigna-guardada' });
        })
        .catch((err) => {
          console.error('Error guardando consigna:', err);
          $w('#htmlConsigna').postMessage({ type: 'wecars-consigna-error' });
        });
    }
  });
});
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: PANEL DE VENDEDORES  (Fase C — CRM interno)
//  Elemento HTML ID: #htmlPanelVendedores
//  Pega SOLO este bloque en { } de la página PANEL DE VENDEDORES
//  URL de la página: /panel-vendedores (restringida a miembros con
//  el rol "Vendedor" — configurado en Fase B)
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { resolveDocumentUrl } from 'backend/media.jsw';
import { esGerente, obtenerPerfil } from 'backend/permisos.jsw';
import { notificarAutoEstatus, notificarDocumentoFactura } from 'backend/notificaciones.jsw';

const HTML_PANEL_ID = '#htmlPanelVendedores';

// ID del botón nativo de subida de archivos que hay que agregar en el
// Editor de Wix (ver instrucciones en el mensaje de esta fase). Debe
// quedar visible en algún lugar de la página (ej. esquina inferior
// derecha) — un iframe no puede abrir el diálogo de archivos por sí
// solo, por eso se necesita este elemento nativo aparte del HTML embed.
const UPLOAD_BUTTON_ID = '#uploadButtonExpediente';

// Cliente y tipo de documento que se está por subir — se llenan cuando
// el vendedor da clic en "Subir" o "Reemplazar" dentro del expediente.
let clienteParaSubida = null;
let tipoDocumentoParaSubida = '';
let razonSocialParaSubida = '';
let folioFiscalParaSubida = '';
let montoParaSubida = '';
let vendedorEmailActual = '';

$w.onReady(function () {
  wixUsers.currentUser.getEmail().then((email) => { vendedorEmailActual = email || ''; });

  $w(HTML_PANEL_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_PANEL_ID).height = data.height;
    }

    if (data.type === 'wecars-panel-ready') {
      enviarClientes();
      enviarInventarioPanel();
    }

    if (data.type === 'wecars-cliente-detalle') {
      enviarHistorial(data.clienteId);
      enviarDocumentos(data.clienteId);
      enviarOportunidades(data.clienteId);
    }

    if (data.type === 'wecars-cliente-actualizar') {
      actualizarCliente(data.clienteId, data.cambios);
    }

    if (data.type === 'wecars-cliente-crear') {
      crearCliente(data.datos);
    }

    if (data.type === 'wecars-oportunidad-crear') {
      crearOportunidad(data.clienteId, data.datos);
    }

    if (data.type === 'wecars-oportunidad-actualizar') {
      actualizarOportunidad(data.oportunidadId, data.cambios);
    }

    if (data.type === 'wecars-facturas-emitidas-solicitar') {
      enviarFacturasEmitidas();
    }

    if (data.type === 'wecars-comisiones-solicitar') {
      enviarComisiones();
    }

    if (data.type === 'wecars-actividad-crear') {
      crearActividad(data.clienteId, data.datos);
    }

    if (data.type === 'wecars-cliente-seleccionado') {
      clienteParaSubida = data.clienteId;
      tipoDocumentoParaSubida = data.tipoDocumento || 'Documento general';
      razonSocialParaSubida = data.razonSocial || '';
      folioFiscalParaSubida = data.folioFiscal || '';
      montoParaSubida = data.monto || '';
    }

    if (data.type === 'wecars-documento-validar') {
      validarDocumento(data.documentoId, data.estatus, data.motivoRechazo);
    }

    if (data.type === 'wecars-auto-actualizar') {
      actualizarAuto(data.carId, data.cambios);
    }

    if (data.type === 'wecars-cliente-eliminar') {
      eliminarCliente(data.clienteId);
    }

    if (data.type === 'wecars-estado-avanzar') {
      avanzarEstadoExpediente(data.clienteId, data.nuevoEstado, data.comentario || '');
    }

    if (data.type === 'wecars-cliente-nuevo') {
      crearClienteDesdeGerencia(data.datos, data.tareaExtra);
    }

    if (data.type === 'wecars-logout') {
      wixUsers.logout().then(() => wixLocation.to('https://www.wecarsbajio.com/entrar'));
    }
  });

  // Si todavía no agregaste el botón nativo de subida en el Editor, este
  // try/catch evita que se rompa el resto del panel mientras tanto.
  try {
    $w(UPLOAD_BUTTON_ID).onChange(() => {
      subirArchivoSeleccionado();
    });
  } catch (err) {
    console.error('[Expediente] No se encontró el elemento "' + UPLOAD_BUTTON_ID + '". Agrega el botón de subida en el Editor con ese ID.', err);
  }

  enviarClientes();
  enviarInventarioPanel();
});

// Sube el archivo elegido en el botón nativo y lo guarda en la colección
// Documents. La API exacta del botón de subida varía un poco entre
// versiones de Wix (uploadFiles vs startUpload), así que probamos el
// método disponible y dejamos un rastro claro en la consola del
// navegador (esto SÍ es código de página, no de backend, así que estos
// console.log/console.error se ven directo en el DevTools del navegador).
function subirArchivoSeleccionado() {
  const btn = $w(UPLOAD_BUTTON_ID);

  if (!clienteParaSubida) {
    console.error('[Expediente] No hay un cliente seleccionado para esta subida.');
    return;
  }

  const metodo = typeof btn.uploadFiles === 'function' ? 'uploadFiles'
    : (typeof btn.startUpload === 'function' ? 'startUpload' : null);

  console.log('[Expediente] método de subida detectado:', metodo);

  if (!metodo) {
    console.error('[Expediente] El elemento de subida no tiene un método uploadFiles/startUpload disponible. Revisa que el ID y el tipo de elemento sean correctos en el Editor.');
    return;
  }

  btn[metodo]()
    .then((resultado) => {
      console.log('[Expediente] resultado crudo de la subida:', JSON.stringify(resultado));
      const archivo = Array.isArray(resultado) ? resultado[0] : resultado;
      const url = archivo && (archivo.url || archivo.fileUrl || archivo.downloadUrl);
      if (!url) {
        console.error('[Expediente] No se encontró una URL utilizable en el resultado de la subida. Revisa el log de arriba para ver qué claves trae.');
        return null;
      }
      const nombreArchivo = archivo.fileName || archivo.originalFileName || archivo.name || 'documento';
      return wixData.insert('Documents', {
        clienteId: clienteParaSubida,
        nombreArchivo,
        url,
        tipoDocumento: tipoDocumentoParaSubida,
        razonSocial: razonSocialParaSubida,
        folioFiscal: folioFiscalParaSubida,
        monto: montoParaSubida ? Number(montoParaSubida) || 0 : 0,
        estatus: 'subido',
        fecha: new Date(),
        subidoPor: vendedorEmailActual,
      });
    })
    .then((doc) => {
      if (!doc) return;
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-documento-subido', clienteId: clienteParaSubida });
      if (doc.tipoDocumento === 'Factura de salida - PDF') {
        wixData.get('ClientRecords', clienteParaSubida)
          .then((cliente) => notificarDocumentoFactura(cliente, doc.tipoDocumento))
          .catch((err) => console.error('[Expediente] Error avisando a Finanzas:', err));
      }
      btn.reset();
    })
    .catch((err) => console.error('[Expediente] Error en el proceso de subida:', err));
}

// Administración: marca un documento como validado o rechazado (con motivo).
// Los documentos nunca se borran al reemplazarse, así que esta función solo
// actualiza el registro puntual que se validó/rechazó — el historial de
// versiones anteriores queda intacto en la colección.
function validarDocumento(documentoId, estatus, motivoRechazo) {
  if (!documentoId) return;
  wixData.get('Documents', documentoId)
    .then((doc) => {
      return wixData.update('Documents', Object.assign({}, doc, {
        estatus: estatus,
        motivoRechazo: motivoRechazo || '',
      }));
    })
    .then(() => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-documento-validado', documentoId });
    })
    .catch((err) => console.error('[Expediente] Error validando documento:', err));
}

// Manda la lista completa de clientes (ClientRecords) + el correo del
// vendedor que tiene la sesión iniciada, para el filtro "solo mis clientes"
// y el botón "Asignarme".
// Manda también TODAS las oportunidades (de todos los clientes, no solo
// el que se abre) — se usa para las pastillas de etapa en la tabla y los
// reportes de Gerencia (embudo por etapa, interés por vehículo). Es una
// sola consulta extra, ligera, y evita tener que pedirla cliente por
// cliente para poder mostrar esos resúmenes.
// SEGURIDAD: un Vendedor solo debe recibir clientes sin asignar o asignados
// a él mismo — nunca los de otros vendedores. Gerencia/Administración siguen
// recibiendo la cartera completa (con el dato de a quién está asignado cada
// uno). El filtro de "solo mis clientes" en el HTML es solo de conveniencia
// de vista; la restricción real de qué datos llegan ocurre aquí.
function enviarClientes() {
  wixUsers.currentUser.getEmail()
    .then((vendedorActual) => {
      return obtenerPerfil(vendedorActual).then((perfil) => {
        const esGerenciaOAdmin = perfil.rol === 'Gerencia' || perfil.rol === 'Administración';
        const consultaClientes = esGerenciaOAdmin
          ? wixData.query('ClientRecords').descending('ultimaActividad').limit(500)
          : wixData.query('ClientRecords').eq('vendedorAsignado', vendedorActual)
              .or(wixData.query('ClientRecords').isEmpty('vendedorAsignado'))
              .descending('ultimaActividad').limit(500);
        return Promise.all([
          consultaClientes.find(),
          wixData.query('Opportunities').limit(1000).find().catch(() => ({ items: [] })),
          // Solo pedimos lo mínimo (clienteId, fecha, autor) porque en el
          // front únicamente se usa para calcular el tiempo hasta la primera
          // actividad registrada por cliente (tiempo de respuesta).
          wixData.query('Activities').ascending('fecha').limit(2000).find().catch(() => ({ items: [] })),
        ]).then(([clientesResult, oportunidadesResult, actividadesResult]) => {
          // Las Oportunidades/Actividades no tienen vendedorAsignado propio
          // (solo clienteId) — si no filtramos, un Vendedor podría inferir
          // datos de clientes de otros vendedores a través de ellas.
          let oportunidadesVisibles = oportunidadesResult.items;
          let actividadesVisibles = actividadesResult.items;
          if (!esGerenciaOAdmin) {
            const idsVisibles = new Set(clientesResult.items.map((c) => c._id));
            oportunidadesVisibles = oportunidadesVisibles.filter((o) => idsVisibles.has(o.clienteId));
            actividadesVisibles = actividadesVisibles.filter((a) => idsVisibles.has(a.clienteId));
          }
          $w(HTML_PANEL_ID).postMessage({
            type: 'wecars-clientes',
            items: clientesResult.items,
            oportunidades: oportunidadesVisibles,
            actividades: actividadesVisibles.map((a) => ({ clienteId: a.clienteId, fecha: a.fecha, autor: a.autor })),
            vendedorActual: vendedorActual || '',
            rolActual: perfil.rol || '',
            nombreActual: perfil.nombre || '',
            puestoActual: perfil.puesto || '',
            fechaIngresoActual: perfil.fechaIngreso || null,
          });
        });
      });
    })
    .catch((err) => {
      console.error('[Panel] Error cargando clientes:', err);
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-clientes', items: [], oportunidades: [], actividades: [], vendedorActual: '', rolActual: '', nombreActual: '', puestoActual: '', fechaIngresoActual: null });
    });
}

// "Precio Venta" y "Costo de adquisición" llegan como texto tipo "$739,800"
// en Wix Data — esto los convierte a número puro. Si ya son de tipo
// Número en tu colección, esta función los deja igual sin problema.
function parseMoneyAuto(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Manda el inventario completo (con estatus de venta y costo, si ya
// agregaste esos campos en Cars) para las tarjetas de Inventario y
// Utilidad de la vista Gerencia. "estatusVenta" y "costoAdquisicion" son
// campos que quizá tengas que agregar tú mismo en el Content Manager de
// Wix si no existen todavía — si no existen, llegan vacíos/0 sin romper
// nada (Disponible por default).
// "costoAdquisicion" es información de margen — solo Gerencia debe
// recibirla. La verificación de rol ocurre AQUÍ, antes del postMessage:
// si no es gerente, el campo nunca sale del servidor (no se manda como
// null ni oculto por CSS — simplemente no viaja al navegador).
function enviarInventarioPanel() {
  wixUsers.currentUser.getEmail()
    .then((email) => esGerente(email))
    .then((esManager) => {
      wixData.query('Cars').limit(500).find()
        .then((results) => {
          $w(HTML_PANEL_ID).postMessage({
            type: 'wecars-inventario-panel',
            items: results.items.map((item) => ({
              id:               item._id,
              title:            item.title            || '',
              brand:            item.brand             || '',
              numeroInventario: item.numeroInventario   || null,
              precioVenta:      parseMoneyAuto(item.priceNew),
              costoAdquisicion: esManager ? parseMoneyAuto(item.costoAdquisicion) : undefined,
              estatusVenta:     item.estatusVenta       || 'Disponible',
              fechaCreacion:    item._createdDate,
            })),
          });
        })
        .catch((err) => {
          console.error('[Panel] Error cargando inventario:', err);
          $w(HTML_PANEL_ID).postMessage({ type: 'wecars-inventario-panel', items: [] });
        });
    });
}

// Actualiza el estatus de venta (y/o costo de adquisición) de un auto
// desde la tarjeta de Inventario del Panel.
function actualizarAuto(carId, cambios) {
  if (!carId) return;
  let estatusAnterior = '';
  let actualizado = null;
  wixData.get('Cars', carId)
    .then((auto) => {
      estatusAnterior = auto.estatusVenta || 'Disponible';
      actualizado = Object.assign({}, auto, cambios);
      return wixData.update('Cars', actualizado);
    })
    .then(() => {
      const estatusNuevo = actualizado.estatusVenta || 'Disponible';
      if ((estatusNuevo === 'Apartado' || estatusNuevo === 'Vendido') && estatusNuevo !== estatusAnterior) {
        notificarAutoEstatus(actualizado, estatusNuevo).catch((err) => console.error('[Panel] Error avisando a Gerencia:', err));
      }
      enviarInventarioPanel();
    })
    .catch((err) => console.error('[Panel] Error actualizando auto:', err));
}

// Junta todo el historial de un cliente (leads + créditos + consignas +
// actividades registradas a mano) buscando por su clienteId.
function enviarHistorial(clienteId) {
  Promise.all([
    wixData.query('ALeads').eq('clienteId', clienteId).find().catch(() => ({ items: [] })),
    wixData.query('CreditApplications').eq('clienteId', clienteId).find().catch(() => ({ items: [] })),
    wixData.query('CarConsignment').eq('clienteId', clienteId).find().catch(() => ({ items: [] })),
    wixData.query('Activities').eq('clienteId', clienteId).find().catch(() => ({ items: [] })),
  ]).then(([leads, creditos, consignas, actividades]) => {
    $w(HTML_PANEL_ID).postMessage({
      type: 'wecars-cliente-historial',
      clienteId,
      leads: leads.items,
      creditos: creditos.items,
      consignas: consignas.items,
      actividades: actividades.items,
    });
  });
}

// Documentos guardados de este cliente. El campo "url" que guarda Wix es
// un identificador interno (wix:document://...), no un link abrible — lo
// "traducimos" a un link real aquí mismo, cada vez que se piden los
// documentos (no se guarda resuelto, por si ese link llegara a expirar).
function enviarDocumentos(clienteId) {
  wixData.query('Documents')
    .eq('clienteId', clienteId)
    .descending('fecha')
    .find()
    .then((results) => {
      return Promise.all(results.items.map((doc) =>
        resolveDocumentUrl(doc.url).then((r) => {
          if (r.url === doc.url && /^wix:document:\/\//.test(doc.url || '')) {
            console.error('[Panel] No se pudo resolver el link de "' + (doc.nombreArchivo || 'documento') + '":', r.debug);
          }
          return Object.assign({}, doc, { url: r.url || doc.url });
        })
      ));
    })
    .then((documentos) => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-cliente-documentos', clienteId, documentos });
    })
    .catch((err) => {
      console.error('[Panel] Error cargando documentos:', err);
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-cliente-documentos', clienteId, documentos: [] });
    });
}

// Oportunidades de venta (cada intento de venta) de este cliente.
function enviarOportunidades(clienteId) {
  wixData.query('Opportunities')
    .eq('clienteId', clienteId)
    .find()
    .then((results) => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-cliente-oportunidades', clienteId, oportunidades: results.items });
    })
    .catch((err) => {
      console.error('[Panel] Error cargando oportunidades:', err);
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-cliente-oportunidades', clienteId, oportunidades: [] });
    });
}

// Manda TODAS las facturas de salida ya emitidas (de todos los clientes),
// para el reporte consolidado de Gerencia. Se pide solo cuando el gerente
// entra a esa pestaña, no en cada carga del panel — así los vendedores no
// pagan el costo de esta consulta.
function enviarFacturasEmitidas() {
  wixData.query('Documents')
    .eq('tipoDocumento', 'Factura de salida - PDF')
    .limit(1000)
    .find()
    .then((results) => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-facturas-emitidas', items: results.items });
    })
    .catch((err) => {
      console.error('[Panel] Error cargando facturas emitidas:', err);
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-facturas-emitidas', items: [] });
    });
}

// Todas las ventas cerradas (para el reporte de comisiones de Gerencia).
// Se pide solo al entrar a esa pestaña, igual que las facturas emitidas.
function enviarComisiones() {
  wixData.query('Ventas')
    .descending('fecha')
    .limit(1000)
    .find()
    .then((results) => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-comisiones', items: results.items });
    })
    .catch((err) => {
      console.error('[Panel] Error cargando comisiones:', err);
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-comisiones', items: [] });
    });
}

// Guarda los cambios que el vendedor edita desde el panel (estatus, origen,
// vendedor asignado, notas, o los datos fiscales). Solo toca los campos que
// realmente vienen en "cambios" — así un guardado parcial (ej. solo los
// datos fiscales) nunca borra el resto de la información del cliente.
const CAMPOS_EDITABLES_CLIENTE = ['nombre', 'correo', 'direccion', 'fechaNacimiento', 'estatus', 'origen', 'vendedorAsignado', 'notas', 'rfc', 'usoCFDI', 'regimenFiscal', 'correoFiscal', 'codigoPostalFiscal', 'proximoSeguimiento', 'proximoSeguimientoNota', 'tipoInteres', 'presupuestoMax'];

function actualizarCliente(clienteId, cambios) {
  wixData.get('ClientRecords', clienteId)
    .then((cliente) => {
      const seVolvioGanado = cliente.estatus !== 'Ganado' && cambios.estatus === 'Ganado';
      const actualizado = Object.assign({}, cliente);
      CAMPOS_EDITABLES_CLIENTE.forEach((campo) => {
        if (cambios[campo] !== undefined) actualizado[campo] = cambios[campo];
      });
      actualizado.ultimaActividad = new Date();
      return wixData.update('ClientRecords', actualizado).then(() => {
        if (seVolvioGanado) crearVentaSiGanado(clienteId, actualizado);
      });
    })
    .catch((err) => console.error('[Panel] Error actualizando cliente:', err));
}

// Cuánto se lleva el vendedor de comisión por cada venta cerrada — % fijo
// sobre el precio de venta. Cambia este número al % real de tu negocio.
const COMISION_PORCENTAJE = 0.02; // 2%

// Se dispara solo cuando un cliente pasa a estatus "Ganado" por primera
// vez (nunca en ediciones posteriores, para no duplicar la venta). Toma
// el vehículo/precio de la Oportunidad más avanzada de ese cliente —
// prioriza la que ya llegó a "Entregado"; si ninguna llegó tan lejos,
// usa la más reciente. Si el cliente no tiene ninguna oportunidad
// registrada, no se puede saber qué se vendió ni en cuánto, así que no
// se crea la venta (mejor no inventar el dato que crear uno incorrecto).
function crearVentaSiGanado(clienteId, cliente) {
  wixData.query('Opportunities').eq('clienteId', clienteId).find()
    .then((results) => {
      if (!results.items.length) {
        console.warn('[Panel] Cliente pasó a Ganado sin oportunidades registradas — no se creó la venta:', clienteId);
        return;
      }
      const entregada = results.items.find((o) => o.etapa === 'Entregado');
      const elegida = entregada || results.items.slice().sort((a, b) => new Date(b.fechaCreacion || 0) - new Date(a.fechaCreacion || 0))[0];
      const precioVenta = elegida.valorEstimado || 0;
      const comisionMonto = precioVenta * COMISION_PORCENTAJE;
      return wixData.insert('Ventas', {
        clienteId: clienteId,
        vendedorId: cliente.vendedorAsignado || '',
        vehiculo: elegida.vehiculo || '',
        precioVenta: precioVenta,
        comisionPorcentaje: COMISION_PORCENTAJE,
        comisionMonto: comisionMonto,
        fecha: new Date(),
      });
    })
    .catch((err) => console.error('[Panel] Error creando venta:', err));
}

// Eliminar un cliente es irreversible y solo lo puede hacer Gerencia. La
// verificación de rol se hace AQUÍ (servidor), nunca confiando en que el
// botón esté oculto en el HTML — un vendedor no puede forzar el borrado
// mandando el mensaje manualmente, porque esGerente() vuelve a validar
// su correo real (wixUsers.currentUser) antes de tocar la base de datos.
// Queda registro en AuditLog de quién borró qué y cuándo.
function eliminarCliente(clienteId) {
  if (!clienteId) return;
  let emailQueElimina = '';
  wixUsers.currentUser.getEmail()
    .then((email) => {
      emailQueElimina = email;
      return esGerente(email);
    })
    .then((esManager) => {
      if (!esManager) {
        console.error('[Panel] Intento de eliminar cliente sin permisos:', emailQueElimina);
        $w(HTML_PANEL_ID).postMessage({ type: 'wecars-cliente-eliminar-error', clienteId });
        return;
      }
      return wixData.get('ClientRecords', clienteId)
        .then((cliente) => {
          return wixData.insert('AuditLog', {
            accion: 'eliminar_cliente',
            clienteId: clienteId,
            detalle: `${cliente.nombre || 'Sin nombre'} · ${cliente.telefono || ''}`,
            realizadoPor: emailQueElimina,
            fecha: new Date(),
          }).catch((err) => console.error('[Panel] Error guardando auditoría (se continúa con el borrado):', err));
        })
        .then(() => wixData.remove('ClientRecords', clienteId))
        .then(() => {
          $w(HTML_PANEL_ID).postMessage({ type: 'wecars-cliente-eliminado', clienteId });
        });
    })
    .catch((err) => console.error('[Panel] Error eliminando cliente:', err));
}

// Registro manual de un cliente que llegó por fuera del sitio (Facebook,
// referido, llamada...). No pasa por findOrCreateCliente porque aquí el
// vendedor ya escribe los datos directamente, no viene de un formulario.
function crearCliente(datos) {
  wixData.insert('ClientRecords', {
    nombre:           datos.nombre           || '',
    telefono:         String(datos.telefono || '').replace(/\D/g, ''),
    correo:           datos.correo           || '',
    origen:           datos.origen           || 'Otro',
    estatus:          datos.estatus          || 'Nuevo',
    vendedorAsignado: datos.vendedorAsignado || '',
    notas:            datos.notas            || '',
    ultimaActividad:  new Date(),
  })
    .then((creado) => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-cliente-creado', cliente: creado });
    })
    .catch((err) => console.error('[Panel] Error creando cliente manual:', err));
}

// Crea una nueva oportunidad de venta para el cliente (un vehículo de
// interés con su propia etapa dentro del pipeline).
function crearOportunidad(clienteId, datos) {
  wixData.insert('Opportunities', {
    clienteId:              clienteId,
    vehiculo:               datos.vehiculo               || '',
    valorEstimado:          datos.valorEstimado           || 0,
    etapa:                  datos.etapa                   || 'Lead nuevo',
    formaPago:              datos.formaPago               || '',
    institucionFinanciera:  datos.institucionFinanciera   || '',
    fechaCreacion:  new Date(),
  })
    .then(() => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-oportunidad-creada', clienteId });
      return wixData.get('ClientRecords', clienteId).then((cliente) => wixData.update('ClientRecords', Object.assign({}, cliente, { ultimaActividad: new Date() })));
    })
    .catch((err) => console.error('[Panel] Error creando oportunidad:', err));
}

// Mueve una oportunidad existente a otra etapa del pipeline y/o actualiza
// su nota rápida — usado por el stepper visual de la "ficha de progreso".
// No crea un registro nuevo: actualiza el mismo que ya existía.
function actualizarOportunidad(oportunidadId, cambios) {
  if (!oportunidadId) return;
  wixData.get('Opportunities', oportunidadId)
    .then((op) => {
      const actualizado = Object.assign({}, op);
      if (cambios.etapa !== undefined) actualizado.etapa = cambios.etapa;
      if (cambios.notaEtapa !== undefined) actualizado.notaEtapa = cambios.notaEtapa;
      return wixData.update('Opportunities', actualizado).then(() => op.clienteId);
    })
    .then((clienteId) => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-oportunidad-actualizada', clienteId });
      if (clienteId) {
        return wixData.get('ClientRecords', clienteId).then((cliente) => wixData.update('ClientRecords', Object.assign({}, cliente, { ultimaActividad: new Date() })));
      }
    })
    .catch((err) => console.error('[Panel] Error actualizando oportunidad:', err));
}

// Registra una actividad manual (llamada o nota) en el historial del
// cliente, y actualiza su última actividad para que suba en la lista.
function crearActividad(clienteId, datos) {
  wixData.insert('Activities', {
    clienteId: clienteId,
    tipo:      datos.tipo      || 'nota',
    resultado: datos.resultado || '',
    detalle:   datos.detalle   || datos.nota || '',
    titulo:    datos.titulo    || '',
    autor:     datos.autor     || '',
    asignadoA: datos.asignadoA || '',
    prioridad: datos.prior     || '',
    due:       datos.due       || '',
    col:       datos.col       || '',
    categoria: datos.cat       || '',
    fecha:     new Date(),
  })
    .then(() => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-actividad-creada', clienteId });
      return wixData.get('ClientRecords', clienteId).then((cliente) => wixData.update('ClientRecords', Object.assign({}, cliente, { ultimaActividad: new Date() })));
    })
    .catch((err) => console.error('[Panel] Error creando actividad:', err));
}

// Avanza el estatusExpediente de un cliente en el CMS y crea un movimiento
// en Activities. Responde con wecars-estado-resultado para que el HTML
// actualice el badge sin necesidad de recargar la página.
function avanzarEstadoExpediente(clienteId, nuevoEstado, comentario) {
  if (!clienteId || !nuevoEstado) return;
  wixData.get('ClientRecords', clienteId)
    .then((cliente) => {
      const estadoAnterior = cliente.estatusExpediente || '';
      const actualizado = Object.assign({}, cliente, {
        estatusExpediente: nuevoEstado,
        ultimaActividad:   new Date(),
      });
      return wixData.update('ClientRecords', actualizado)
        .then(() => wixData.insert('Activities', {
          clienteId,
          tipo:          'estado',
          estadoAnterior,
          estadoNuevo:   nuevoEstado,
          detalle:       comentario || '',
          autor:         '',
          fecha:         new Date(),
        }))
        .then(() => {
          $w(HTML_PANEL_ID).postMessage({
            type:       'wecars-estado-resultado',
            ok:         true,
            clienteId,
            cliente:    actualizado,
            movimiento: { estadoAnterior, estadoNuevo: nuevoEstado, detalle: comentario, fecha: new Date().toISOString() },
          });
        });
    })
    .catch((err) => {
      console.error('[Panel] Error avanzando estado:', err);
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-estado-resultado', ok: false, clienteId, error: err.message || 'Error al guardar' });
    });
}

// Crea un cliente nuevo que viene desde el panel de Gerencia (wecars-cliente-nuevo).
// Diferente de crearCliente() porque también puede recibir una tareaExtra.
function crearClienteDesdeGerencia(datos, tareaExtra) {
  wixData.insert('ClientRecords', {
    nombre:            datos.nombre           || '',
    telefono:          String(datos.telefono  || '').replace(/\D/g, ''),
    correo:            datos.email            || '',
    origen:            datos.origen           || 'Otro',
    estatus:           datos.estatus          || 'Nuevo',
    estatusExpediente: datos.estatusExpediente || 'nuevo_lead',
    vendedorAsignado:  datos.vendedorAsignado || '',
    vehiculoInteres:   datos.vehiculoInteres  || '',
    ultimaActividad:   new Date(),
    fechaRegistro:     new Date(),
  })
    .then((creado) => {
      $w(HTML_PANEL_ID).postMessage({ type: 'wecars-cliente-creado', cliente: creado });
      if (tareaExtra && creado._id) {
        return wixData.insert('Activities', {
          clienteId:      creado._id,
          tipo:           'tarea',
          titulo:         tareaExtra.titulo      || 'Seguimiento',
          detalle:        tareaExtra.desc        || '',
          asignadoA:      tareaExtra.asignadoA   || '',
          asignadoNombre: tareaExtra.asignadoNombre || '',
          creadoPor:      tareaExtra.creadoPor   || '',
          prioridad:      tareaExtra.prior       || 'media',
          due:            tareaExtra.due         || '',
          col:            tareaExtra.col         || 'por-hacer',
          categoria:      tareaExtra.cat         || 'Seguimiento',
          fecha:          new Date(),
        });
      }
    })
    .catch((err) => console.error('[Panel] Error creando cliente desde Gerencia:', err));
}
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: ADMINISTRACIÓN
//  Elemento HTML ID: #htmlAdministracion
//  Pega SOLO este bloque en { } de la página PANEL DE ADMINISTRACIÓN
//  URL de la página: /panel-administracion
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { obtenerRol, obtenerPerfil } from 'backend/permisos.jsw';

const HTML_ADMIN_ID = '#htmlAdministracion';

$w.onReady(function () {
  $w(HTML_ADMIN_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_ADMIN_ID).height = data.height;
    }

    if (data.type === 'wecars-empleados-solicitar') {
      enviarEmpleados();
    }

    if (data.type === 'wecars-empleado-crear') {
      crearEmpleado(data.datos);
    }

    if (data.type === 'wecars-empleado-actualizar') {
      actualizarEmpleado(data.empleadoId, data.datos);
    }

    if (data.type === 'wecars-logout') {
      wixUsers.logout().then(() => wixLocation.to('https://www.wecarsbajio.com/entrar'));
    }
  });

  enviarEmpleados();
});

// Solo Gerencia o Administración reciben el directorio real — cualquier
// otro rol recibe una lista vacía (el HTML ya se encarga de mostrar el
// mensaje de "sin acceso" cuando eso pasa).
function enviarEmpleados() {
  wixUsers.currentUser.getEmail()
    .then((email) => {
      return obtenerPerfil(email).then((perfil) => {
        const base = { emailActual: email, rolActual: perfil.rol, nombreActual: perfil.nombre, puestoActual: perfil.puesto, fechaIngresoActual: perfil.fechaIngreso };
        const tieneAcceso = perfil.rol === 'Gerencia' || perfil.rol === 'Administración';
        if (!tieneAcceso) {
          $w(HTML_ADMIN_ID).postMessage(Object.assign({ type: 'wecars-empleados', items: [] }, base));
          return;
        }
        return wixData.query('Usuarios').limit(500).find()
          .then((results) => {
            $w(HTML_ADMIN_ID).postMessage(Object.assign({ type: 'wecars-empleados', items: results.items }, base));
          });
      });
    })
    .catch((err) => {
      console.error('[Administración] Error cargando empleados:', err);
      $w(HTML_ADMIN_ID).postMessage({ type: 'wecars-empleados', items: [], rolActual: '', emailActual: '', nombreActual: '', puestoActual: '', fechaIngresoActual: null });
    });
}

function crearEmpleado(datos) {
  wixUsers.currentUser.getEmail()
    .then((email) => obtenerRol(email).then((rol) => ({ email, rol })))
    .then(({ rol }) => {
      if (rol !== 'Gerencia' && rol !== 'Administración') {
        $w(HTML_ADMIN_ID).postMessage({ type: 'wecars-empleado-error', mensaje: 'No tienes permiso para agregar empleados.' });
        return;
      }
      return wixData.insert('Usuarios', {
        nombre: datos.nombre || '',
        email: String(datos.email || '').toLowerCase().trim(),
        rol: datos.rol || 'Vendedor',
        puesto: datos.puesto || '',
        fechaIngreso: datos.fechaIngreso || '',
        activo: datos.activo !== false,
        altaOrigen: 'Administración',
      }).then(() => {
        $w(HTML_ADMIN_ID).postMessage({ type: 'wecars-empleado-creado' });
      });
    })
    .catch((err) => {
      console.error('[Administración] Error creando empleado:', err);
      $w(HTML_ADMIN_ID).postMessage({ type: 'wecars-empleado-error', mensaje: 'Ocurrió un error al guardar.' });
    });
}

function actualizarEmpleado(empleadoId, datos) {
  if (!empleadoId) return;
  wixUsers.currentUser.getEmail()
    .then((email) => obtenerRol(email))
    .then((rol) => {
      if (rol !== 'Gerencia' && rol !== 'Administración') {
        $w(HTML_ADMIN_ID).postMessage({ type: 'wecars-empleado-error', mensaje: 'No tienes permiso para editar empleados.' });
        return;
      }
      return wixData.get('Usuarios', empleadoId)
        .then((empleado) => {
          const actualizado = Object.assign({}, empleado, {
            nombre: datos.nombre !== undefined ? datos.nombre : empleado.nombre,
            email: datos.email !== undefined ? String(datos.email).toLowerCase().trim() : empleado.email,
            rol: datos.rol !== undefined ? datos.rol : empleado.rol,
            puesto: datos.puesto !== undefined ? datos.puesto : empleado.puesto,
            fechaIngreso: datos.fechaIngreso !== undefined ? datos.fechaIngreso : empleado.fechaIngreso,
            activo: datos.activo !== undefined ? datos.activo : empleado.activo,
          });
          return wixData.update('Usuarios', actualizado);
        })
        .then(() => {
          $w(HTML_ADMIN_ID).postMessage({ type: 'wecars-empleado-actualizado' });
        });
    })
    .catch((err) => {
      console.error('[Administración] Error actualizando empleado:', err);
      $w(HTML_ADMIN_ID).postMessage({ type: 'wecars-empleado-error', mensaje: 'Ocurrió un error al guardar.' });
    });
}
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: ENTRAR
//  Elemento HTML ID: #htmlEntrar
//  Pega SOLO este bloque en { } de la página ENTRAR
//  URL de la página: /entrar — este es el único link que tu gente
//  necesita memorizar; Velo decide solo a qué panel mandarlos según
//  su rol en la colección Usuarios.
// ───────────────────────────────────────────────────────────────────

/*
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { obtenerRol } from 'backend/permisos.jsw';

const HTML_ENTRAR_ID = '#htmlEntrar';

// A dónde mandar a cada rol. Cuando Gerencia o Finanzas tengan su propia
// página, solo se cambia/agrega la línea correspondiente aquí — nada
// más en todo el sistema depende de esto.
const RUTAS_POR_ROL = {
  'Vendedor': 'https://www.wecarsbajio.com/panel-vendedores',
  'Gerencia': 'https://www.wecarsbajio.com/panel-gerencia',
  'Administración': 'https://www.wecarsbajio.com/panel-administracion',
  'Finanzas': 'https://www.wecarsbajio.com/panel-finanzas',
};

$w.onReady(function () {
  $w(HTML_ENTRAR_ID).onMessage((event) => {
    const data = event.data;
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_ENTRAR_ID).height = data.height;
    }
  });

  wixUsers.currentUser.getEmail()
    .then((email) => obtenerRol(email))
    .then((rol) => {
      const destino = RUTAS_POR_ROL[rol];
      if (destino) {
        wixLocation.to(destino);
      } else {
        $w(HTML_ENTRAR_ID).postMessage({ type: 'wecars-sin-panel', rol: rol || '' });
      }
    })
    .catch((err) => {
      console.error('[Entrar] Error verificando rol:', err);
      $w(HTML_ENTRAR_ID).postMessage({ type: 'wecars-sin-panel', rol: '' });
    });
});
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: GERENCIA
//  Elemento HTML ID: #htmlGerencia
//  Pega SOLO este bloque en { } de la página PANEL DE GERENCIA
//  URL de la página: /panel-gerencia
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { obtenerRol, obtenerPerfil } from 'backend/permisos.jsw';
import { notificarEmpleadoNuevo } from 'backend/notificaciones.jsw';

const HTML_GERENCIA_ID = '#htmlGerencia';

$w.onReady(function () {
  $w(HTML_GERENCIA_ID).onMessage((event) => {
    const data = event.data;
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_GERENCIA_ID).height = data.height;
    }
    if (data.type === 'wecars-gerencia-solicitar') {
      enviarDatosGerencia();
    }
    if (data.type === 'wecars-cliente-actualizar') {
      actualizarClienteGerencia(data.clienteId, data.cambios);
    }
    if (data.type === 'wecars-empleado-crear') {
      crearEmpleadoDesdeGerencia(data.datos);
    }
    if (data.type === 'wecars-logout') {
      wixUsers.logout().then(() => wixLocation.to('https://www.wecarsbajio.com/entrar'));
    }
  });

  enviarDatosGerencia();
});

function parseMoneyAuto(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Solo Gerencia recibe los datos reales — cualquier otro rol recibe
// arreglos vacíos (el HTML muestra "sin acceso" cuando eso pasa).
function enviarDatosGerencia() {
  wixUsers.currentUser.getEmail()
    .then((email) => obtenerPerfil(email).then((perfil) => ({ email, perfil })))
    .then(({ email, perfil }) => {
      const base = { emailActual: email, rolActual: perfil.rol, nombreActual: perfil.nombre, puestoActual: perfil.puesto, fechaIngresoActual: perfil.fechaIngreso };
      if (perfil.rol !== 'Gerencia') {
        $w(HTML_GERENCIA_ID).postMessage(Object.assign({ type: 'wecars-gerencia-datos', clientes: [], oportunidades: [], actividades: [], inventario: [], facturas: [], ventas: [], empleados: [] }, base));
        return;
      }
      return Promise.all([
        wixData.query('ClientRecords').descending('ultimaActividad').limit(500).find(),
        wixData.query('Opportunities').limit(1000).find().catch(() => ({ items: [] })),
        wixData.query('Activities').ascending('fecha').limit(2000).find().catch(() => ({ items: [] })),
        wixData.query('Cars').limit(500).find().catch(() => ({ items: [] })),
        wixData.query('Documents').eq('tipoDocumento', 'Factura de salida - PDF').limit(1000).find().catch(() => ({ items: [] })),
        wixData.query('Ventas').descending('fecha').limit(1000).find().catch(() => ({ items: [] })),
        wixData.query('Usuarios').limit(500).find().catch(() => ({ items: [] })),
      ]).then(([clientesResult, oportunidadesResult, actividadesResult, carsResult, facturasResult, ventasResult, usuariosResult]) => {
        $w(HTML_GERENCIA_ID).postMessage(Object.assign({
          type: 'wecars-gerencia-datos',
          clientes: clientesResult.items,
          oportunidades: oportunidadesResult.items,
          actividades: actividadesResult.items.map((a) => ({ clienteId: a.clienteId, fecha: a.fecha, autor: a.autor })),
          inventario: carsResult.items.map((item) => ({
            id: item._id,
            title: item.title || '',
            brand: item.brand || '',
            precioVenta: parseMoneyAuto(item.priceNew),
            costoAdquisicion: parseMoneyAuto(item.costoAdquisicion),
            estatusVenta: item.estatusVenta || 'Disponible',
            fechaCreacion: item._createdDate,
          })),
          facturas: facturasResult.items,
          ventas: ventasResult.items,
          empleados: usuariosResult.items.map((u) => ({ email: u.email || '', nombre: u.nombre || '', puesto: u.puesto || '', fechaIngreso: u.fechaIngreso || null })),
        }, base));
      });
    })
    .catch((err) => {
      console.error('[Gerencia] Error cargando datos:', err);
      $w(HTML_GERENCIA_ID).postMessage({ type: 'wecars-gerencia-datos', rolActual: '', emailActual: '', nombreActual: '', puestoActual: '', fechaIngresoActual: null, clientes: [], oportunidades: [], actividades: [], inventario: [], facturas: [], ventas: [], empleados: [] });
    });
}

// Dar de alta un empleado directamente desde Gerencia — mismo destino
// (colección Usuarios) que usa el Panel de Administración, para que ambos
// paneles administren exactamente la misma fuente de verdad de roles.
function crearEmpleadoDesdeGerencia(datos) {
  wixUsers.currentUser.getEmail()
    .then((email) => obtenerRol(email))
    .then((rol) => {
      if (rol !== 'Gerencia') {
        $w(HTML_GERENCIA_ID).postMessage({ type: 'wecars-empleado-error', mensaje: 'No tienes permiso para agregar empleados.' });
        return;
      }
      return wixData.insert('Usuarios', {
        nombre: datos.nombre || '',
        email: String(datos.email || '').toLowerCase().trim(),
        rol: datos.rol || 'Vendedor',
        puesto: datos.puesto || '',
        fechaIngreso: datos.fechaIngreso || '',
        activo: datos.activo !== false,
        altaOrigen: 'Gerencia',
      }).then((creado) => {
        notificarEmpleadoNuevo(creado).catch((err) => console.error('[Gerencia] Error avisando a Administración:', err));
        $w(HTML_GERENCIA_ID).postMessage({ type: 'wecars-empleado-creado' });
      });
    })
    .catch((err) => {
      console.error('[Gerencia] Error creando empleado:', err);
      $w(HTML_GERENCIA_ID).postMessage({ type: 'wecars-empleado-error', mensaje: 'Ocurrió un error al guardar.' });
    });
}

function actualizarClienteGerencia(clienteId, cambios) {
  wixUsers.currentUser.getEmail()
    .then((email) => obtenerRol(email))
    .then((rol) => {
      if (rol !== 'Gerencia') return;
      return wixData.get('ClientRecords', clienteId)
        .then((cliente) => {
          const actualizado = Object.assign({}, cliente, cambios, { ultimaActividad: new Date() });
          return wixData.update('ClientRecords', actualizado);
        });
    })
    .catch((err) => console.error('[Gerencia] Error actualizando cliente:', err));
}
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: FINANZAS
//  Elemento HTML ID: #htmlFinanzas
//  Pega SOLO este bloque en { } de la página PANEL DE FINANZAS
//  URL de la página: /panel-finanzas
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { obtenerPerfil } from 'backend/permisos.jsw';

const HTML_FINANZAS_ID = '#htmlFinanzas';

$w.onReady(function () {
  $w(HTML_FINANZAS_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_FINANZAS_ID).height = data.height;
    }
    if (data.type === 'wecars-finanzas-solicitar') {
      enviarDatosFinanzas();
    }
    if (data.type === 'wecars-logout') {
      wixUsers.logout().then(() => wixLocation.to('https://www.wecarsbajio.com/entrar'));
    }

    // Guarda un pago o egreso en la colección Pagos
    if (data.type === 'wecars-pago-registrado' && data.pago) {
      const p = data.pago;
      wixData.insert('Pagos', {
        clienteId:     p.clienteId    || '',
        clienteNombre: p.clienteNombre || '',
        vendedor:      p.vendedor     || '',
        tipo:          p.tipo         || 'Pago',
        categoria:     p.categoria    || '',
        descripcion:   p.descripcion  || '',
        monto:         Number(p.monto) || 0,
        referencia:    p.ref          || '',
        fecha:         p.fecha ? new Date(p.fecha) : new Date(),
        registradoPor: p.by           || '',
      }).catch((err) => console.error('[Finanzas] Error guardando pago:', err));
    }

    // Avance automático de estado cuando Finanzas confirma un pago
    if (data.type === 'wecars-estado-avanzar' && data.clienteId && data.nuevoEstado) {
      wixData.get('ClientRecords', data.clienteId)
        .then((c) => wixData.update('ClientRecords', Object.assign({}, c, {
          estatusExpediente: data.nuevoEstado,
          ultimaActividad:   new Date(),
        })))
        .then(() => {
          if (data.comentario) {
            return wixData.insert('Activities', {
              clienteId:   data.clienteId,
              tipo:        'estado',
              estadoNuevo: data.nuevoEstado,
              detalle:     data.comentario,
              autor:       'Finanzas',
              fecha:       new Date(),
            });
          }
        })
        .catch((err) => console.error('[Finanzas] Error avanzando estado:', err));
    }
  });

  enviarDatosFinanzas();
});

// Solo Finanzas o Gerencia reciben los datos reales.
function enviarDatosFinanzas() {
  wixUsers.currentUser.getEmail()
    .then((email) => obtenerPerfil(email).then((perfil) => ({ email, perfil })))
    .then(({ email, perfil }) => {
      const base = { emailActual: email, rolActual: perfil.rol, nombreActual: perfil.nombre, puestoActual: perfil.puesto, fechaIngresoActual: perfil.fechaIngreso };
      const tieneAcceso = perfil.rol === 'Finanzas' || perfil.rol === 'Gerencia';
      if (!tieneAcceso) {
        $w(HTML_FINANZAS_ID).postMessage(Object.assign({ type: 'wecars-finanzas-datos', clientes: [], facturas: [], ventas: [], pagos: [] }, base));
        return;
      }
      return Promise.all([
        wixData.query('ClientRecords').limit(500).find(),
        wixData.query('Documents').eq('tipoDocumento', 'Factura de salida - PDF').limit(1000).find().catch(() => ({ items: [] })),
        wixData.query('Ventas').descending('fecha').limit(1000).find().catch(() => ({ items: [] })),
        wixData.query('Pagos').descending('fecha').limit(1000).find().catch(() => ({ items: [] })),
      ]).then(([clientesResult, facturasResult, ventasResult, pagosResult]) => {
        $w(HTML_FINANZAS_ID).postMessage(Object.assign({
          type:     'wecars-finanzas-datos',
          clientes: clientesResult.items,
          facturas: facturasResult.items,
          ventas:   ventasResult.items,
          pagos:    pagosResult.items,
        }, base));
      });
    })
    .catch((err) => {
      console.error('[Finanzas] Error cargando datos:', err);
      $w(HTML_FINANZAS_ID).postMessage({ type: 'wecars-finanzas-datos', rolActual: '', emailActual: '', nombreActual: '', puestoActual: '', fechaIngresoActual: null, clientes: [], facturas: [], ventas: [], pagos: [] });
    });
}
*/


// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/expediente.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  expediente.jsw
//  Pega SOLO este bloque en ese archivo nuevo (no en ninguna página).
//
//  Por qué va en el backend y no en la página: la página de autosubida
//  la abren visitantes anónimos (el cliente, sin haber iniciado sesión).
//  Para que puedan leer/guardar su propio expediente SIN tener que abrir
//  el permiso de lectura de "ClientRecords"/"Documents" a "Cualquiera"
//  (lo cual expondría los datos de TODOS los clientes a cualquier
//  visitante), estas funciones usan { suppressAuth: true } — eso les
//  permite saltarse los permisos de la colección solo para esta puerta
//  puntual y controlada, que además solo regresa el registro que
//  coincide con el teléfono recibido, nunca una lista completa.
// ───────────────────────────────────────────────────────────────────

/*
import wixData from 'wix-data';
import { resolveDocumentUrl } from 'backend/media.jsw';

function normalizePhone(v) {
  return String(v || '').replace(/\D/g, '');
}

// Busca al cliente por teléfono (viene del link ?tel=... que genera el
// vendedor desde el panel) y regresa solo lo necesario para la página
// pública de autosubida.
export function obtenerExpedienteCliente(telefono) {
  const tel = normalizePhone(telefono);
  if (!tel) return Promise.resolve({ encontrado: false });

  return wixData.query('ClientRecords')
    .eq('telefono', tel)
    .limit(1)
    .find({ suppressAuth: true })
    .then((results) => {
      if (!results.items.length) return { encontrado: false };
      const c = results.items[0];
      return wixData.query('Documents')
        .eq('clienteId', c._id)
        .find({ suppressAuth: true })
        .then((docsResult) => Promise.all(docsResult.items.map((doc) =>
          resolveDocumentUrl(doc.url).then((r) => Object.assign({}, doc, { url: r.url || doc.url }))
        )))
        .then((documentos) => ({
          encontrado: true,
          clienteId: c._id,
          nombre: c.nombre || '',
          rfc: c.rfc || '',
          usoCFDI: c.usoCFDI || '',
          regimenFiscal: c.regimenFiscal || '',
          correoFiscal: c.correoFiscal || '',
          codigoPostalFiscal: c.codigoPostalFiscal || '',
          documentos,
        }));
    })
    .catch((err) => {
      console.error('[Expediente] Error buscando cliente por teléfono:', err);
      return { encontrado: false };
    });
}

// Guarda los datos fiscales que el CLIENTE captura desde la página
// pública. Solo toca los campos fiscales — nunca estatus, vendedor
// asignado, notas, etc.
export function guardarDatosFiscalesCliente(clienteId, cambios) {
  return wixData.get('ClientRecords', clienteId, { suppressAuth: true })
    .then((cliente) => {
      const actualizado = Object.assign({}, cliente);
      ['rfc', 'usoCFDI', 'regimenFiscal', 'correoFiscal', 'codigoPostalFiscal'].forEach((campo) => {
        if (cambios[campo] !== undefined) actualizado[campo] = cambios[campo];
      });
      return wixData.update('ClientRecords', actualizado, { suppressAuth: true });
    })
    .catch((err) => console.error('[Expediente] Error guardando datos fiscales del cliente:', err));
}

// Guarda un documento subido por el propio cliente desde la página pública.
export function guardarDocumentoCliente(clienteId, datos) {
  return wixData.insert('Documents', {
    clienteId,
    nombreArchivo: datos.nombreArchivo || 'documento',
    url: datos.url,
    tipoDocumento: datos.tipoDocumento || 'Documento general',
    estatus: 'subido',
    fecha: new Date(),
    subidoPor: 'Cliente',
  }, { suppressAuth: true });
}
*/


// ───────────────────────────────────────────────────────────────────
//  PÁGINA: SUBIR DOCUMENTOS (Fase 5 — autosubida del cliente)
//  Elemento HTML ID: #htmlSubirDocumentos
//  Pega SOLO este bloque en { } de la página SUBIR DOCUMENTOS
//  URL de la página: /subir-documentos — página PÚBLICA, sin
//  restricción de miembros (el cliente la abre sin iniciar sesión).
// ───────────────────────────────────────────────────────────────────

/*
import wixLocation from 'wix-location';
import { obtenerExpedienteCliente, guardarDatosFiscalesCliente, guardarDocumentoCliente } from 'backend/expediente.jsw';

const HTML_SUBIR_ID = '#htmlSubirDocumentos';

// ID del botón nativo de subida — igual que en el Panel de Vendedores,
// hace falta un elemento nativo fuera del HTML embed porque un iframe no
// puede abrir el diálogo de archivos por sí solo.
const UPLOAD_BUTTON_CLIENTE_ID = '#uploadButtonClienteExpediente';

let clienteIdActual = null;
let tipoDocumentoParaSubidaCliente = '';

$w.onReady(function () {
  const tel = wixLocation.query.tel || '';

  $w(HTML_SUBIR_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_SUBIR_ID).height = data.height;
    }

    if (data.type === 'wecars-subir-ready') {
      enviarExpediente(tel);
    }

    if (data.type === 'wecars-cliente-doc-seleccionado') {
      clienteIdActual = data.clienteId;
      tipoDocumentoParaSubidaCliente = data.tipoDocumento || 'Documento general';
    }

    if (data.type === 'wecars-cliente-fiscal-guardar') {
      guardarDatosFiscalesCliente(data.clienteId, data.cambios)
        .catch((err) => console.error('[SubirDocs] Error guardando datos fiscales:', err));
    }
  });

  // Si todavía no agregaste el botón nativo de subida en el Editor, este
  // try/catch evita que se rompa el resto de la página mientras tanto.
  try {
    $w(UPLOAD_BUTTON_CLIENTE_ID).onChange(() => {
      subirArchivoCliente();
    });
  } catch (err) {
    console.error('[SubirDocs] No se encontró el elemento "' + UPLOAD_BUTTON_CLIENTE_ID + '". Agrega el botón de subida en el Editor con ese ID.', err);
  }
});

function enviarExpediente(tel) {
  obtenerExpedienteCliente(tel)
    .then((resultado) => {
      $w(HTML_SUBIR_ID).postMessage(Object.assign({ type: 'wecars-expediente-cliente' }, resultado));
    })
    .catch((err) => {
      console.error('[SubirDocs] Error cargando expediente:', err);
      $w(HTML_SUBIR_ID).postMessage({ type: 'wecars-expediente-cliente', encontrado: false });
    });
}

// Misma lógica defensiva que en el Panel de Vendedores: probamos el
// método de subida disponible y dejamos rastro claro en consola (esto
// corre en la página, así que se ve directo en el DevTools del navegador).
function subirArchivoCliente() {
  const btn = $w(UPLOAD_BUTTON_CLIENTE_ID);

  if (!clienteIdActual) {
    console.error('[SubirDocs] No hay un cliente identificado para esta subida.');
    return;
  }

  const metodo = typeof btn.uploadFiles === 'function' ? 'uploadFiles'
    : (typeof btn.startUpload === 'function' ? 'startUpload' : null);

  console.log('[SubirDocs] método de subida detectado:', metodo);

  if (!metodo) {
    console.error('[SubirDocs] El elemento de subida no tiene un método uploadFiles/startUpload disponible.');
    return;
  }

  btn[metodo]()
    .then((resultado) => {
      console.log('[SubirDocs] resultado crudo de la subida:', JSON.stringify(resultado));
      const archivo = Array.isArray(resultado) ? resultado[0] : resultado;
      const url = archivo && (archivo.url || archivo.fileUrl || archivo.downloadUrl);
      if (!url) {
        console.error('[SubirDocs] No se encontró una URL utilizable en el resultado de la subida.');
        return null;
      }
      const nombreArchivo = archivo.fileName || archivo.originalFileName || archivo.name || 'documento';
      return guardarDocumentoCliente(clienteIdActual, { nombreArchivo, url, tipoDocumento: tipoDocumentoParaSubidaCliente });
    })
    .then((doc) => {
      if (!doc) return;
      $w(HTML_SUBIR_ID).postMessage({ type: 'wecars-documento-subido-cliente', clienteId: clienteIdActual });
      btn.reset();
    })
    .catch((err) => console.error('[SubirDocs] Error en el proceso de subida:', err));
}
*/
