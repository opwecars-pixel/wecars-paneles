// ───────────────────────────────────────────────────────────────────
//  PÁGINA: GARANTÍAS
//  Elemento HTML ID: #htmlGarantias
//  Pega SOLO este bloque en { } de la página GARANTIAS
// ───────────────────────────────────────────────────────────────────

import { getSiteConfig } from 'backend/siteConfig.jsw';
import wixLocation from 'wix-location';

$w.onReady(function () {
  getSiteConfig().then(function(config) {
    $w('#htmlGarantias').postMessage({ type: 'wecars-siteconfig', config: config });
  });

  $w('#htmlGarantias').onMessage((event) => {
    if (event.data.type === 'wecars-navegar' && event.data.url) { wixLocation.to(event.data.url); }
    if (event.data.type === 'wecars-resize' && event.data.height > 0) {
      $w('#htmlGarantias').height = event.data.height;
    }
  });
});
