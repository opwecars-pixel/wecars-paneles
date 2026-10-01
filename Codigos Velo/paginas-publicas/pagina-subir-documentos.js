// ───────────────────────────────────────────────────────────────────
//  PÁGINA: SUBIR DOCUMENTOS (Fase 5 — autosubida del cliente)
//  Elemento HTML ID: #htmlSubirDocumentos
//  Pega SOLO este bloque en { } de la página SUBIR DOCUMENTOS
//  URL de la página: /subir-documentos — página PÚBLICA, sin
//  restricción de miembros (el cliente la abre sin iniciar sesión).
// ───────────────────────────────────────────────────────────────────

import wixLocation from 'wix-location';
import { obtenerExpedienteCliente, guardarDatosFiscalesCliente, guardarDocumentoCliente } from 'backend/expediente.jsw';

const HTML_SUBIR_ID = '#htmlSubirDocumentos';

// ID del botón nativo de subida — igual que en el Panel de Vendedores,
// hace falta un elemento nativo fuera del HTML embed porque un iframe no
// puede abrir el diálogo de archivos por sí solo.
const UPLOAD_BUTTON_CLIENTE_ID = '#uploadButtonClienteExpediente';

let clienteIdActual = null;
let tipoDocumentoParaSubidaCliente = '';

$w.onReady(function () {
  const tel = wixLocation.query.tel || '';

  $w(HTML_SUBIR_ID).onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
    if (data.type === 'wecars-resize' && data.height > 0) {
      $w(HTML_SUBIR_ID).height = data.height;
    }

    if (data.type === 'wecars-subir-ready') {
      enviarExpediente(tel);
    }

    if (data.type === 'wecars-cliente-doc-seleccionado') {
      clienteIdActual = data.clienteId;
      tipoDocumentoParaSubidaCliente = data.tipoDocumento || 'Documento general';
    }

    if (data.type === 'wecars-cliente-fiscal-guardar') {
      guardarDatosFiscalesCliente(data.clienteId, data.cambios)
        .catch((err) => console.error('[SubirDocs] Error guardando datos fiscales:', err));
    }
  });

  // Si todavía no agregaste el botón nativo de subida en el Editor, este
  // try/catch evita que se rompa el resto de la página mientras tanto.
  try {
    $w(UPLOAD_BUTTON_CLIENTE_ID).onChange(() => {
      subirArchivoCliente();
    });
  } catch (err) {
    console.error('[SubirDocs] No se encontró el elemento "' + UPLOAD_BUTTON_CLIENTE_ID + '". Agrega el botón de subida en el Editor con ese ID.', err);
  }
});

function enviarExpediente(tel) {
  obtenerExpedienteCliente(tel)
    .then((resultado) => {
      $w(HTML_SUBIR_ID).postMessage(Object.assign({ type: 'wecars-expediente-cliente' }, resultado));
    })
    .catch((err) => {
      console.error('[SubirDocs] Error cargando expediente:', err);
      $w(HTML_SUBIR_ID).postMessage({ type: 'wecars-expediente-cliente', encontrado: false });
    });
}

// Misma lógica defensiva que en el Panel de Vendedores: probamos el
// método de subida disponible y dejamos rastro claro en consola (esto
// corre en la página, así que se ve directo en el DevTools del navegador).
function subirArchivoCliente() {
  const btn = $w(UPLOAD_BUTTON_CLIENTE_ID);

  if (!clienteIdActual) {
    console.error('[SubirDocs] No hay un cliente identificado para esta subida.');
    return;
  }

  const metodo = typeof btn.uploadFiles === 'function' ? 'uploadFiles'
    : (typeof btn.startUpload === 'function' ? 'startUpload' : null);

  console.log('[SubirDocs] método de subida detectado:', metodo);

  if (!metodo) {
    console.error('[SubirDocs] El elemento de subida no tiene un método uploadFiles/startUpload disponible.');
    return;
  }

  btn[metodo]()
    .then((resultado) => {
      console.log('[SubirDocs] resultado crudo de la subida:', JSON.stringify(resultado));
      const archivo = Array.isArray(resultado) ? resultado[0] : resultado;
      const url = archivo && (archivo.url || archivo.fileUrl || archivo.downloadUrl);
      if (!url) {
        console.error('[SubirDocs] No se encontró una URL utilizable en el resultado de la subida.');
        return null;
      }
      const nombreArchivo = archivo.fileName || archivo.originalFileName || archivo.name || 'documento';
      return guardarDocumentoCliente(clienteIdActual, { nombreArchivo, url, tipoDocumento: tipoDocumentoParaSubidaCliente });
    })
    .then((doc) => {
      if (!doc) return;
      $w(HTML_SUBIR_ID).postMessage({ type: 'wecars-documento-subido-cliente', clienteId: clienteIdActual });
      btn.reset();
    })
    .catch((err) => console.error('[SubirDocs] Error en el proceso de subida:', err));
}
