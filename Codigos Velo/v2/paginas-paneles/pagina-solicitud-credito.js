// ═══════════════════════════════════════════════════════════════════════
//  weCars ERP v2 — Página pública: Solicitud de Crédito
//  Archivo: paginas-paneles/pagina-solicitud-credito.js
//
//  Esta página vive en Wix como "/solicitud-credito".
//  Tiene un HtmlComponent con el archivo pagina-solicitud-credito-publica.html.
//  El HtmlComponent se comunica con esta página vía onMessage/postMessage.
//
//  Flujo:
//    1. Cliente abre link: wecarsbajio.com/solicitud-credito?t=wc_xxxxx
//    2. El HTML pide validar el token vía postMessage
//    3. Esta página llama al backend y responde con los datos de prefill
//    4. Cliente llena el form y envía
//    5. Esta página llama submitSolicitudPublica() y responde con folio
// ═══════════════════════════════════════════════════════════════════════

import wixLocation from 'wix-location';
import { validarToken, submitSolicitudPublica } from 'backend/credito-publico.jsw';

$w.onReady(function () {
  const htmlComp = $w('#htmlSolicitudCredito'); // ID del HtmlComponent en Wix Editor

  // Escuchar mensajes del HtmlComponent
  htmlComp.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    // ── 1. Validar token ──────────────────────────────────────────────
    if (msg.type === 'wecars-validar-token') {
      const resultado = await validarToken(msg.token);
      htmlComp.postMessage({
        type: 'wecars-token-resultado',
        ...resultado,
      });
      return;
    }

    // ── 2. Enviar solicitud completa ──────────────────────────────────
    if (msg.type === 'wecars-submit-solicitud') {
      const resultado = await submitSolicitudPublica(msg.token, msg.datos);
      htmlComp.postMessage({
        type: 'wecars-solicitud-resultado',
        ...resultado,
      });
      return;
    }
  });

  // Pasar el token del URL al HtmlComponent cuando cargue
  // (para que el HTML lo lea directamente desde window.location)
  // No es necesario pasarlo manualmente — el HTML lo lee con URLSearchParams.
});
