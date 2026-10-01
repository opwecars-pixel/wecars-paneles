// ───────────────────────────────────────────────────────────────────
//  PÁGINA: TESTIMONIOS
//  Elemento HTML ID: #htmlTestimonios
//  Pega SOLO este bloque en { } de la página TESTIMONIOS
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { getSiteConfig } from 'backend/siteConfig.jsw';
import wixLocation from 'wix-location';

$w.onReady(function () {
  getSiteConfig().then(function(config) {
  $w('#htmlTestimonios').postMessage({ type: 'wecars-siteconfig', config: config });
});

  $w('#htmlTestimonios').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
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
