// ───────────────────────────────────────────────────────────────────
//  PÁGINA: CONFIRMACIÓN POST-LEAD
//  Elemento HTML ID: #htmlConfirmacion
//  Crea una página nueva en Wix en la URL: /confirmacion
//  Agrega un elemento HTML embed con ID #htmlConfirmacion
//  Pega SOLO este bloque en { } de esa página
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixLocation from 'wix-location';

const HTML_ID = '#htmlConfirmacion';

$w.onReady(function () {
  $w(HTML_ID).onMessage((event) => {
    const data = event.data;
    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_ID).height = data.height;
    }
  });

  enviarAutos();
});

function enviarAutos() {
  // Lee los parámetros de la URL: /confirmacion?nombre=Juan&interes=SUV&origen=Facebook
  const query = wixLocation.query;
  const nombre   = query.nombre   || '';
  const interes  = query.interes  || '';
  const origen   = query.origen   || 'Sitio web';

  // Busca hasta 6 autos disponibles. Si hay palabra clave de interés,
  // intenta filtrar por marca o título; si no hay coincidencias cae al
  // fallback de los 3 más recientes disponibles.
  const baseQuery = wixData.query('Cars')
    .eq('estatusVenta', 'Disponible')
    .descending('_createdDate')
    .limit(6);

  const conFiltro = interes
    ? wixData.query('Cars')
        .eq('estatusVenta', 'Disponible')
        .contains('title', interes)
        .descending('_createdDate')
        .limit(3)
    : Promise.resolve({ items: [] });

  Promise.all([baseQuery.find().catch(() => ({ items: [] })), conFiltro.find ? conFiltro.find().catch(() => ({ items: [] })) : conFiltro])
    .then(([todosR, filtradosR]) => {
      let similares = filtradosR.items.length >= 2 ? filtradosR.items : todosR.items;
      similares = similares.slice(0, 3);

      $w(HTML_ID).postMessage({
        type: 'wecars-confirmacion',
        nombre,
        interes,
        origen,
        autos: similares.map(a => ({
          id:           a._id,
          title:        a.title        || '',
          brand:        a.brand        || '',
          year:         a.year         || '',
          precio:       parseMoneyAuto(a.priceNew),
          imagen:       a.mainMedia    || a.image || '',
          slug:         a.slug         || a._id,
          kilometros:   a.mileage      || a.kilometros || 0,
          transmision:  a.transmission || '',
        })),
      });
    })
    .catch((err) => {
      console.error('[Confirmacion] Error cargando autos:', err);
      $w(HTML_ID).postMessage({ type: 'wecars-confirmacion', nombre, interes, origen, autos: [] });
    });
}

function parseMoneyAuto(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}
