// ───────────────────────────────────────────────────────────────────
//  PÁGINA: INICIO
//  Elemento HTML ID: #htmlCatalogo
//  Pega este bloque en { } de la página INICIO
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { crearLeadYVincular, actualizarClienteIdLead } from 'backend/leads.jsw';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';
import { notificarLeadNuevo } from 'backend/notificaciones.jsw';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';

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
  getSiteConfig().then(function(config) {
    $w(HTML_COMPONENT_ID).postMessage({ type: 'wecars-siteconfig', config: config });
  });

  $w(HTML_COMPONENT_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_COMPONENT_ID).height = data.height;
    }
    if (data.type === 'wecars-scroll-to' && typeof data.y === 'number') {
      wixWindow.scrollTo(0, data.y).catch(() => {});
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
  const nombre   = data.nombre        || '';
  const telefono = data.telefono      || '';
  const correo   = data.correo        || '';
  const interes  = data.interes       || '';
  const origen   = data.origen        || 'Sitio web';

  // Ruta segura: insert con SA, luego vincular clienteId también con SA desde backend.
  crearLeadYVincular({
    tipo:          'lead',
    nombre, telefono, correo, interes,
    canalContacto: data.canalContacto || '',
    mensaje:       data.mensaje       || '',
    origen,
    pagina,
  }).then((inserted) => {
    findOrCreateCliente(nombre, telefono, correo, origen)
      .then((r) => {
        if (r && r.clienteId) actualizarClienteIdLead(inserted._id, r.clienteId).catch(() => {});
      })
      .catch(() => {});
  }).catch((err) => console.error('Error guardando lead:', err));

  notificarLeadNuevo({ nombre, telefono, correo, interes, pagina, origen, vehiculo: '', ingreso: '', empresa: '' });
}
