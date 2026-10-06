// ───────────────────────────────────────────────────────────────────
//  PÁGINA: CONTACTO
//  Elemento HTML ID: #htmlContacto
//  Pega SOLO este bloque en { } de la página CONTACTO
// ───────────────────────────────────────────────────────────────────

import wixLocation from 'wix-location';
import { crearLeadYVincular, actualizarClienteIdLead } from 'backend/leads.jsw';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';
// notificarLeadNuevo ya se llama desde backend/leads.jsw → no duplicar aquí

$w.onReady(function () {
  getSiteConfig().then(function(config) {
  $w('#htmlContacto').postMessage({ type: 'wecars-siteconfig', config: config });
});

  $w('#htmlContacto').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w('#htmlContacto').height = data.height;
    }

    if (data.type === 'wecars-lead') {
      const nombre   = data.data.nombre        || '';
      const telefono = data.data.telefono      || '';
      const correo   = data.data.correo        || '';
      const interes  = data.data.interes       || data.data.mensaje || '';
      const origen   = data.data.origen        || 'Sitio web';
      const pagina   = data.pagina             || 'Contacto';

      // Ruta segura: insert con SA, luego vincular clienteId también con SA desde backend.
      crearLeadYVincular({
        tipo:          'lead',
        nombre, telefono, correo, interes,
        canalContacto: data.data.canalContacto || '',
        mensaje:       data.data.mensaje       || '',
        origen,
        pagina,
      }).then((inserted) => {
        findOrCreateCliente(nombre, telefono, correo, origen)
          .then((r) => {
            if (r && r.clienteId) actualizarClienteIdLead(inserted._id, r.clienteId).catch(() => {});
          })
          .catch(() => {});
        const params = new URLSearchParams({ nombre, interes, origen }).toString();
        wixLocation.to('/confirmacion?' + params);
      }).catch((err) => console.error('Error guardando lead contacto:', err));
    }
  });
});
