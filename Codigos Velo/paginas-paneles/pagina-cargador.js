// ══════════════════════════════════════════════════════════════════════
//  PANEL CARGADOR DE FOTOS — weCars Bajío
//  Rol requerido: "cargador" (o "administracion" / "Gerencia")
//  Acceso mínimo: solo colección Cars (fotos, videos)
// ══════════════════════════════════════════════════════════════════════
import wixUsers from 'wix-users';
import { subirFotoCarroBackend, subirVideoCarroBackend } from 'backend/media.jsw';
import { obtenerPerfil } from 'backend/permisos.jsw';
import {
  queryCarsBackend,
  getCarroBackend,
  insertarCarroCargador,
  actualizarFotosCarro,
  generarNumeroInventario,
} from 'backend/operaciones.jsw';

const HTML_ID = '#htmlCargador';
const ROLES_CARGADOR = ['cargador', 'administracion', 'administración', 'gerencia'];

$w.onReady(function () {
  $w(HTML_ID).onMessage(async (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    // ── Solicitar datos iniciales ──────────────────────────────────────
    if (data.type === 'wecars-cargador-solicitar') {
      try {
        const email = await wixUsers.currentUser.getEmail();
        const perfil = await obtenerPerfil(email);
        const rol = (perfil && perfil.rol) ? perfil.rol.toLowerCase().trim() : '';
        const tieneAcceso = ROLES_CARGADOR.includes(rol);

        if (!tieneAcceso) {
          $w(HTML_ID).postMessage({ type: 'wecars-cargador-datos', ok: false, error: 'Sin acceso' });
          return;
        }

        const inventario = await queryCarsBackend(200);

        $w(HTML_ID).postMessage({
          type:      'wecars-cargador-datos',
          ok:        true,
          nombre:    perfil.nombre || email,
          email,
          inventario,
        });
      } catch (e) {
        $w(HTML_ID).postMessage({ type: 'wecars-cargador-datos', ok: false, error: String(e) });
      }
    }

    // ── Crear nuevo auto ───────────────────────────────────────────────
    if (data.type === 'wecars-cargador-crear-auto' && data.datos) {
      try {
        const item = await insertarCarroCargador(Object.assign({
          estatusVenta:    'Disponible',
          fotos:           [],
          fotosCategorias: { exterior: [], interior: [], extras: [] },
          video:           '',
        }, data.datos));
        $w(HTML_ID).postMessage({ type: 'wecars-cargador-auto-creado', ok: true, carro: item });
      } catch (e) {
        $w(HTML_ID).postMessage({ type: 'wecars-cargador-auto-creado', ok: false, error: String(e) });
      }
    }

    // ── Subir foto (base64) ────────────────────────────────────────────
    if (data.type === 'wecars-cargador-foto' && data.carroId && data.base64) {
      try {
        const result = await subirFotoCarroBackend(
          data.base64, data.fileName || 'foto.jpg', data.mimeType || 'image/jpeg'
        );
        if (!result.ok || !result.url) throw new Error(result.error || 'Upload falló');

        const carro = await getCarroBackend(data.carroId);
        const fotos = Array.isArray(carro.fotos) ? [...carro.fotos] : [];
        const cats  = carro.fotosCategorias || { exterior: [], interior: [], extras: [] };
        const cat   = data.categoria || 'extras';

        fotos.push(result.url);
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push({ url: result.url, slot: data.slot, label: data.label || '' });

        const actualizado = await actualizarFotosCarro(data.carroId, {
          fotos,
          fotosCategorias: cats,
          fotoPrincipal: carro.fotoPrincipal || (cat === 'exterior' ? result.url : carro.fotoPrincipal),
        });

        $w(HTML_ID).postMessage({
          type:      'wecars-cargador-foto-ok',
          ok:        true,
          carroId:   data.carroId,
          slot:      data.slot,
          categoria: cat,
          url:       result.url,
          carro:     actualizado,
        });
      } catch (e) {
        $w(HTML_ID).postMessage({
          type:      'wecars-cargador-foto-ok',
          ok:        false,
          carroId:   data.carroId,
          slot:      data.slot,
          categoria: data.categoria,
          error:     String(e),
        });
      }
    }

    // ── Subir video (base64) ───────────────────────────────────────────
    if (data.type === 'wecars-cargador-video' && data.carroId && data.base64) {
      try {
        const result = await subirVideoCarroBackend(
          data.base64, data.fileName || 'video.mp4', data.mimeType || 'video/mp4'
        );
        if (!result.ok || !result.wixUrl) throw new Error(result.error || 'Upload de video falló');

        const actualizado = await actualizarFotosCarro(data.carroId, {
          video:    result.wixUrl,
          videoUrl: result.url,
        });

        $w(HTML_ID).postMessage({
          type:    'wecars-cargador-video-ok',
          ok:      true,
          carroId: data.carroId,
          wixUrl:  result.wixUrl,
          url:     result.url,
          carro:   actualizado,
        });
      } catch (e) {
        $w(HTML_ID).postMessage({
          type:    'wecars-cargador-video-ok',
          ok:      false,
          carroId: data.carroId,
          error:   String(e),
        });
      }
    }

    // ── Eliminar foto de un slot ───────────────────────────────────────
    if (data.type === 'wecars-cargador-foto-eliminar' && data.carroId && data.url) {
      try {
        const carro = await getCarroBackend(data.carroId);
        const fotos = (Array.isArray(carro.fotos) ? carro.fotos : []).filter((u) => u !== data.url);
        const cats  = carro.fotosCategorias || {};
        ['exterior', 'interior', 'extras'].forEach((c) => {
          if (Array.isArray(cats[c])) cats[c] = cats[c].filter((f) => f.url !== data.url);
        });
        const fp = carro.fotoPrincipal === data.url ? (fotos[0] || '') : carro.fotoPrincipal;

        const actualizado = await actualizarFotosCarro(data.carroId, {
          fotos,
          fotosCategorias: cats,
          fotoPrincipal:   fp,
        });

        $w(HTML_ID).postMessage({
          type:    'wecars-cargador-foto-eliminada',
          ok:      true,
          carroId: data.carroId,
          url:     data.url,
          carro:   actualizado,
        });
      } catch (e) {
        $w(HTML_ID).postMessage({
          type:    'wecars-cargador-foto-eliminada',
          ok:      false,
          carroId: data.carroId,
          error:   String(e),
        });
      }
    }
  });
});
