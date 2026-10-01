// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/expediente.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  expediente.jsw
//  Pega SOLO este bloque en ese archivo nuevo (no en ninguna página).
//
//  Por qué va en el backend y no en la página: la página de autosubida
//  la abren visitantes anónimos (el cliente, sin haber iniciado sesión).
//  Para que puedan leer/guardar su propio expediente SIN tener que abrir
//  el permiso de lectura de "ClientRecords"/"Documents" a "Cualquiera"
//  (lo cual expondría los datos de TODOS los clientes a cualquier
//  visitante), estas funciones usan { suppressAuth: true } — eso les
//  permite saltarse los permisos de la colección solo para esta puerta
//  puntual y controlada, que además solo regresa el registro que
//  coincide con el teléfono recibido, nunca una lista completa.
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { resolveDocumentUrl } from 'backend/media.jsw';

function normalizePhone(v) {
  return String(v || '').replace(/\D/g, '');
}

// Busca al cliente por teléfono (viene del link ?tel=... que genera el
// vendedor desde el panel) y regresa solo lo necesario para la página
// pública de autosubida.
export function obtenerExpedienteCliente(telefono) {
  const tel = normalizePhone(telefono);
  if (!tel) return Promise.resolve({ encontrado: false });

  return wixData.query('ClientRecords')
    .eq('telefono', tel)
    .limit(1)
    .find({ suppressAuth: true })
    .then((results) => {
      if (!results.items.length) return { encontrado: false };
      const c = results.items[0];
      return wixData.query('Documents')
        .eq('clienteId', c._id)
        .find({ suppressAuth: true })
        .then((docsResult) => Promise.all(docsResult.items.map((doc) =>
          resolveDocumentUrl(doc.url).then((r) => Object.assign({}, doc, { url: r.url || doc.url }))
        )))
        .then((documentos) => ({
          encontrado: true,
          clienteId: c._id,
          nombre: c.nombre || '',
          rfc: c.rfc || '',
          usoCFDI: c.usoCFDI || '',
          regimenFiscal: c.regimenFiscal || '',
          correoFiscal: c.correoFiscal || '',
          codigoPostalFiscal: c.codigoPostalFiscal || '',
          documentos,
        }));
    })
    .catch((err) => {
      console.error('[Expediente] Error buscando cliente por teléfono:', err);
      return { encontrado: false };
    });
}

// Guarda los datos fiscales que el CLIENTE captura desde la página
// pública. Solo toca los campos fiscales — nunca estatus, vendedor
// asignado, notas, etc.
export function guardarDatosFiscalesCliente(clienteId, cambios) {
  return wixData.get('ClientRecords', clienteId, { suppressAuth: true })
    .then((cliente) => {
      const actualizado = Object.assign({}, cliente);
      ['rfc', 'usoCFDI', 'regimenFiscal', 'correoFiscal', 'codigoPostalFiscal'].forEach((campo) => {
        if (cambios[campo] !== undefined) actualizado[campo] = cambios[campo];
      });
      return wixData.update('ClientRecords', actualizado, { suppressAuth: true });
    })
    .catch((err) => console.error('[Expediente] Error guardando datos fiscales del cliente:', err));
}

// Guarda un documento subido por el propio cliente desde la página pública.
export function guardarDocumentoCliente(clienteId, datos) {
  return wixData.insert('Documents', {
    clienteId,
    nombreArchivo: datos.nombreArchivo || 'documento',
    url: datos.url,
    tipoDocumento: datos.tipoDocumento || 'Documento general',
    estatus: 'subido',
    fecha: new Date(),
    subidoPor: 'Cliente',
  }, { suppressAuth: true });
}
