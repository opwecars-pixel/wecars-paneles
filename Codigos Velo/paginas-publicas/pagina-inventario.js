// ───────────────────────────────────────────────────────────────────
//  PÁGINA: INVENTARIO
//  Elemento HTML ID: #htmlInventario
//  Pega SOLO este bloque en { } de la página INVENTARIO
//  URL de la página: /inventario
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';
// notificarLeadNuevo centralizado en backend/leads.jsw
import { fetchInventarioCars } from 'backend/datos.jsw';
import { crearLead } from 'backend/leads.jsw';

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
  getSiteConfig().then(function(config) {
    $w(HTML_INVENTARIO_ID).postMessage({ type: 'wecars-siteconfig', config: config });
  });

  $w(HTML_INVENTARIO_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_INVENTARIO_ID).height = data.height;
    }

    if (data.type === 'wecars-catalog-ready') {
      loadAndSendInventarioCompleto();
    }

    if (data.type === 'wecars-lead') {
      crearLead({
        tipo:     'lead',
        nombre:   data.data.nombre   || '',
        telefono: data.data.telefono || '',
        correo:   data.data.correo   || '',
        interes:  data.data.interes  || '',
        resumen:  data.data.interes  || '',
        origen:   data.data.origen   || 'Sitio web',
        pagina:   data.pagina        || 'Inventario',
      }).then((inserted) => {
          return findOrCreateCliente(data.data.nombre, data.data.telefono, data.data.correo, data.data.origen)
            .then((r) => {
              console.log('[Clientes] debug:', r.debug);
              // notificarLeadNuevo centralizado en backend/leads.jsw — no duplicar
              if (r.clienteId) return wixData.update('ALeads', Object.assign({}, inserted, { clienteId: r.clienteId }));
            });
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
  fetchInventarioCars()
    .then((rawItems) => {
      const items = rawItems.map((item) => ({
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
    .catch((err) => {
      console.error('[Inventario] Error cargando Cars:', err);
      $w(HTML_INVENTARIO_ID).postMessage({ type: 'wecars-inventory', items: [] });
    });
}
