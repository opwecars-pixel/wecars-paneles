// ───────────────────────────────────────────────────────────────────
//  PÁGINA: NOSOTROS
//  Elemento HTML ID: #htmlNosotros
//  Pega SOLO este bloque en { } de la página NOSOTROS
// ───────────────────────────────────────────────────────────────────

import { getSiteConfig } from 'backend/siteConfig.jsw';
import wixLocation from 'wix-location';

$w.onReady(function () {
  getSiteConfig().then(function(config) {
    $w('#htmlNosotros').postMessage({ type: 'wecars-siteconfig', config: config });
  });

  $w('#htmlNosotros').onMessage((event) => {
    if (event.data.type === 'wecars-navegar' && event.data.url) { wixLocation.to(event.data.url); }
    if (event.data.type === 'wecars-resize' && event.data.height > 0) {
      $w('#htmlNosotros').height = event.data.height;
    }
  });
});
