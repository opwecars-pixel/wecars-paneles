// ───────────────────────────────────────────────────────────────────
//  PÁGINA: CONSIGNA
//  Elemento HTML ID: #htmlConsigna
//  Pega SOLO este bloque en el editor de la página CONSIGNA en Velo
// ───────────────────────────────────────────────────────────────────

import { getSiteConfig } from 'backend/siteConfig.jsw';
import { notificarConsignaNueva } from 'backend/notificaciones.jsw';
import { insertarConsigna } from 'backend/datos.jsw';
import { crearLead } from 'backend/leads.jsw';
import wixLocation from 'wix-location';
// findOrCreateCliente NO se usa aquí: consignas van solo a Gerencia/Admin
// hasta que Gerencia asigne un vendedor y cree el ClientRecord manualmente.

$w.onReady(function () {
  getSiteConfig().then(function(config) {
    $w('#htmlConsigna').postMessage({ type: 'wecars-siteconfig', config: config });
  });

  $w('#htmlConsigna').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w('#htmlConsigna').height = data.height;
    }

    if (data.type === 'wecars-consigna') {
      const d = data.data;
      const vehiculo = [d.marca, d.modelo, d.anio, d.version].filter(Boolean).join(' ');
      crearLead({
        tipo:     'consigna',
        nombre:   d.nombre   || '',
        telefono: d.telefono || '',
        correo:   d.correo   || '',
        interes:  vehiculo,
        resumen:  `${vehiculo}${d.precio ? ' · $'+Number(d.precio).toLocaleString('es-MX') : ''}${d.urgencia ? ' · '+d.urgencia : ''}`,
        pagina:   'Consigna',
        origen:   d.origen   || 'Sitio web',
      }).catch(e => console.error('[Consigna] Error creando lead:', e));

      insertarConsigna({
        nombre:                d.nombre                || '',
        telefono:              d.telefono              || '',
        correo:                d.correo                || '',
        marca:                 d.marca                 || '',
        modelo:                d.modelo                || '',
        anio:                  d.anio                  || '',
        version:               d.version               || '',
        km:                    d.km                    || 0,
        color:                 d.color                 || '',
        transmision:           d.transmision           || '',
        factura:               d.factura               || '',
        financiamientoVigente: d.financiamientoVigente || '',
        condicion:             d.condicion             || '',
        carroceria:            d.carroceria            || '',
        mecanica:              d.mecanica              || '',
        notas:                 d.notas                 || '',
        precio:                d.precio                || 0,
        precioMinimo:          d.precioMinimo          || 0,
        urgencia:              d.urgencia              || '',
        contactoPreferido:     d.contactoPreferido     || '',
        horario:               d.horario               || '',
        origen:                d.origen                || 'Sitio web',
        fecha:                 new Date(),
      })
      .then(() => {
        $w('#htmlConsigna').postMessage({ type: 'wecars-consigna-guardada' });
        notificarConsignaNueva({
          nombre:   d.nombre,
          telefono: d.telefono,
          correo:   d.correo,
          vehiculo: vehiculo,
          precio:   d.precio,
          urgencia: d.urgencia,
          origen:   d.origen || 'Sitio web',
        }).catch((err) => console.error('[Consigna] Error notificando:', err));
      })
      .catch((err) => {
        console.error('[Consigna] Error guardando:', err);
        $w('#htmlConsigna').postMessage({ type: 'wecars-consigna-error' });
      });
    }
  });
});
