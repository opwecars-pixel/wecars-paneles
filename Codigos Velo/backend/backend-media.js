// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/media.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  media.jsw
//  Pega SOLO este bloque en ese archivo nuevo (no en ninguna página).
// ───────────────────────────────────────────────────────────────────

import { mediaManager } from 'wix-media-backend';

// Sube una imagen (base64) al Media Manager de Wix y regresa la URL pública.
// Se llama desde pagina-administracion.js cuando el admin sube una foto de carro.
export function subirFotoCarroBackend(base64, fileName, mimeType) {
  try {
    const buffer = Buffer.from(base64, 'base64');
    return mediaManager.upload(
      '/wecars/carros',   // carpeta en el Media Manager
      buffer,
      fileName,
      { mimeType: mimeType || 'image/jpeg', mediaOptions: { isPrivate: false } }
    ).then((result) => {
      const wixUrl = result.fileUrl || result.url || '';
      // Convertir wix:image://... a URL pública de static.wixstatic.com
      const match = wixUrl.match(/wix:image:\/\/v1\/([^/]+)\/([^#?]+)/);
      const publicUrl = match
        ? `https://static.wixstatic.com/media/${match[1]}`
        : wixUrl;
      return { ok: true, wixUrl, url: publicUrl };
    });
  } catch (e) {
    return Promise.resolve({ ok: false, error: String(e), wixUrl: '', url: '' });
  }
}

// El campo "Video" de Wix guarda el archivo como "wix:video://v1/FILEID/..."
// pero para poder reproducirlo hace falta la URL pública real del archivo.
// No hay una forma 100% documentada/estable de adivinar esa URL a mano (a
// diferencia de las fotos), así que probamos varios nombres de función
// conocidos de la API de Wix uno por uno. Si ninguno existe en tu versión
// de Wix, el "debug" que regresa esta función te dice EXACTAMENTE cuáles
// métodos sí están disponibles, para ajustarlo con certeza en un segundo intento.
export function resolveVideoUrl(uri) {
  const match = String(uri || '').match(/wix:video:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return Promise.resolve({ url: '', debug: 'uri de video no reconocida' });
  const fileId = match[1];

  function extractUrl(r) {
    if (!r) return '';
    if (typeof r === 'string') return r;
    return r.fileUrl || r.url || r.downloadUrl || '';
  }

  const candidatos = ['getFileUrl', 'getDownloadUrl', 'generateFileDownloadUrl'];
  let cadena = Promise.resolve({ url: '', debug: '' });
  candidatos.forEach(function (nombre) {
    cadena = cadena.then(function (acc) {
      if (acc.url) return acc; // ya se resolvió con un candidato anterior
      if (typeof mediaManager[nombre] !== 'function') {
        return { url: '', debug: acc.debug + nombre + ': no existe. ' };
      }
      return mediaManager[nombre](fileId)
        .then(function (r) { return { url: extractUrl(r), debug: acc.debug + nombre + ': ok. ' }; })
        .catch(function (err) { return { url: '', debug: acc.debug + nombre + ': error ' + (err && err.message) + '. ' }; });
    });
  });
  return cadena.then(function (acc) {
    return {
      url: acc.url,
      debug: acc.url ? acc.debug : (acc.debug + 'Métodos disponibles en mediaManager: ' + Object.keys(mediaManager).join(', ')),
    };
  });
}

// Sube un video (base64) al Media Manager y regresa la URL wix:video://
export function subirVideoCarroBackend(base64, fileName, mimeType) {
  try {
    const buffer = Buffer.from(base64, 'base64');
    return mediaManager.upload(
      '/wecars/carros/videos',
      buffer,
      fileName,
      { mimeType: mimeType || 'video/mp4', mediaOptions: { isPrivate: false } }
    ).then((result) => {
      const wixUrl = result.fileUrl || result.url || '';
      return { ok: true, wixUrl, url: wixUrl };
    });
  } catch (e) {
    return Promise.resolve({ ok: false, error: String(e), wixUrl: '', url: '' });
  }
}

// Lo mismo que resolveVideoUrl pero para documentos del Expediente Digital
// (INE, facturas, etc.), que Wix guarda como "wix:document://v1/FILEID/...".
// Si la uri no se reconoce o ningún método resuelve, regresamos la uri tal
// cual (mejor que un link roto) y el debug para diagnosticar.
export function resolveDocumentUrl(uri) {
  const match = String(uri || '').match(/wix:document:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return Promise.resolve({ url: uri || '', debug: 'uri de documento no reconocida, se regresa tal cual' });
  const fileId = match[1];

  function extractUrl(r) {
    if (!r) return '';
    if (typeof r === 'string') return r;
    return r.fileUrl || r.url || r.downloadUrl || '';
  }

  const candidatos = ['getFileUrl', 'getDownloadUrl', 'generateFileDownloadUrl'];
  let cadena = Promise.resolve({ url: '', debug: '' });
  candidatos.forEach(function (nombre) {
    cadena = cadena.then(function (acc) {
      if (acc.url) return acc;
      if (typeof mediaManager[nombre] !== 'function') {
        return { url: '', debug: acc.debug + nombre + ': no existe. ' };
      }
      return mediaManager[nombre](fileId)
        .then(function (r) { return { url: extractUrl(r), debug: acc.debug + nombre + ': ok. ' }; })
        .catch(function (err) { return { url: '', debug: acc.debug + nombre + ': error ' + (err && err.message) + '. ' }; });
    });
  });
  return cadena.then(function (acc) {
    return {
      url: acc.url || uri,
      debug: acc.url ? acc.debug : (acc.debug + 'Métodos disponibles en mediaManager: ' + Object.keys(mediaManager).join(', ')),
    };
  });
}
