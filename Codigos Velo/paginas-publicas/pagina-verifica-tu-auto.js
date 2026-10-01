/**
 * weCars Bajío — Página "Verifica tu Auto"
 * Elemento HTML ID: #htmlVerifica
 *
 * Recibe postMessages del HTML embed y guarda solicitudes
 * en la colección VerificaAuto del CMS.
 *
 * Mensajes que maneja:
 *   HTML → Velo : { type: 'wecars-vta-nuevo', ...campos }
 *   Velo → HTML : { type: 'wecars-vta-nuevo-ok',    item: {...} }
 *                 { type: 'wecars-vta-nuevo-error', error: '...' }
 *                 { type: 'wecars-resize', height: N }
 */

import wixData from 'wix-data';

$w.onReady(function () {

  /* ── Ajustar altura del iframe ──────────────────────────────── */
  $w('#htmlVerifica').onMessage(async (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    /* Resize del iframe */
    if (data.type === 'wecars-resize' && data.height) {
      $w('#htmlVerifica').height = data.height;
      return;
    }

    /* ── Nueva solicitud de verificación ─────────────────────── */
    if (data.type === 'wecars-vta-nuevo') {
      try {
        const nueva = {
          clienteNombre:        (data.clienteNombre   || '').trim(),
          clienteTelefono:      (data.clienteTelefono || '').trim(),
          clienteEmail:         (data.clienteEmail    || '').trim(),
          autoDescripcion:      (data.autoDescripcion || '').trim(),
          vin:                  (data.vin             || '').trim(),
          placas:               (data.placas          || '').trim(),
          status:               'Pendiente',
          precioPagado:         189,
          fechaSolicitud:       new Date(),
          metodo:               data.metodo || 'formulario',  // 'whatsapp' | 'formulario'
        };

        // Validación mínima — nombre y teléfono requeridos
        if (!nueva.clienteNombre || !nueva.clienteTelefono) {
          $w('#htmlVerifica').postMessage({
            type:  'wecars-vta-nuevo-error',
            error: 'Nombre y teléfono son obligatorios.',
          });
          return;
        }

        const guardado = await wixData.insert('VerificaAuto', nueva, { suppressAuth: true });

        $w('#htmlVerifica').postMessage({
          type: 'wecars-vta-nuevo-ok',
          item: guardado,
        });

      } catch (e) {
        console.error('[VerificaTuAuto] Error al guardar solicitud:', e);
        $w('#htmlVerifica').postMessage({
          type:  'wecars-vta-nuevo-error',
          error: String(e.message || e),
        });
      }
    }
  });
});
