// ───────────────────────────────────────────────────────────────────
//  PÁGINA: DETALLE DE AUTO
//  Elemento HTML ID: #htmlDetalle
//  Pega SOLO este bloque en { } de la página DETALLE
//  URL de la página: /detalle  (la crea en Wix como página normal)
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { resolveVideoUrl } from 'backend/media.jsw';
import { findOrCreateCliente } from 'backend/clientes.jsw';
import { getSiteConfig } from 'backend/siteConfig.jsw';
import { getCarById } from 'backend/datos.jsw';
import { crearLead, crearLeadYVincular, actualizarClienteIdLead } from 'backend/leads.jsw';
import { crearSolicitudCredito } from 'backend/creditos.jsw';
import { registrarActividad } from 'backend/actividades.jsw';

function wixImgUrl(uri, w, h) {
  if (!uri) return '';
  if (uri.startsWith('http')) return uri;
  const match = uri.match(/wix:image:\/\/v1\/([^/]+)\/([^#?]+)/);
  if (!match) return uri;
  const fileId = match[1];
  const fname  = match[2];
  if (w && h) {
    return `https://static.wixstatic.com/media/${fileId}/v1/fill/w_${w},h_${h},al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/${fname}`;
  }
  return `https://static.wixstatic.com/media/${fileId}`;
}

// "Precio Venta" y "Crédito" son campos de texto tipo "$739,800" — esto los
// convierte a número puro (739800). Si tus campos ya son de tipo Número,
// esta función los deja igual sin problema.
function parseMoney(v) {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// "Descripción" y "Combustible" son campos de texto enriquecido (Rich Text) —
// llegan como HTML, ej. "<p class=\"font_8\">Gasolina</p>". Esto los deja en
// texto plano limpio: "Gasolina".
function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

$w.onReady(function () {
  let carPayload = null; // guardamos el auto una vez cargado
  let alturaContenido = 0; // altura completa del iframe (para restaurar al cerrar galería)
  let galeriaAbierta  = false;

  getSiteConfig().then(function(config) {
    $w('#htmlDetalle').postMessage({ type: 'wecars-siteconfig', config: config });
  });

  // El iframe nunca hace scroll interno (Velo lo estira a todo el alto de
  // la página), así que "window.scrollY" DENTRO del HTML siempre da 0.
  // Por eso le preguntamos a Wix cada instante dónde va el scroll real de
  // la página y se lo mandamos al HTML, para que sus ventanas emergentes
  // (foto grande, crédito, etc.) se puedan posicionar en el lugar correcto.
  // También mandamos la altura visible real de la ventana del visitante
  // (no la del iframe, que Velo estira a todo el contenido) para que las
  // ventanas emergentes tipo pop-up (crédito, etc.) se centren en la
  // pantalla que el usuario realmente está viendo, no en todo el iframe.
  let ultimoScrollEnviado = -1;
  let ultimaAlturaEnviada = -1;
  setInterval(() => {
    wixWindow.getBoundingRect()
      .then((rect) => {
        const y = Math.round((rect && rect.window && rect.window.scrollY) || 0);
        const h = Math.round((rect && rect.window && rect.window.height) || 0);
        if (Math.abs(y - ultimoScrollEnviado) > 4 || Math.abs(h - ultimaAlturaEnviada) > 4) {
          ultimoScrollEnviado = y;
          ultimaAlturaEnviada = h;
          $w('#htmlDetalle').postMessage({ type: 'wecars-scroll', scrollY: y, viewportHeight: h });
        }
      })
      .catch(() => {});
  }, 200);

  $w('#htmlDetalle').onMessage((event) => {
    const data = event.data;

    if (data.type === 'wecars-navegar' && data.url) { wixLocation.to(data.url); }
    if (data.type === 'wecars-resize' && data.height > 0) {
      // Solo actualizamos la altura real cuando la galería NO está abierta
      if (!galeriaAbierta) alturaContenido = data.height;
      $w('#htmlDetalle').height = galeriaAbierta ? alturaContenido : data.height;
    }
    if (data.type === 'wecars-scroll-to' && typeof data.y === 'number') {
      wixWindow.scrollTo(0, data.y).catch(() => {});
    }
    if (data.type === 'wecars-gallery-open') {
      galeriaAbierta = true;
      // Reducir iframe al tamaño del viewport → elimina el scroll de la página
      wixWindow.getBoundingRect().then(rect => {
        const vh = Math.round((rect && rect.window && rect.window.height) || 700);
        $w('#htmlDetalle').height = vh;
        wixWindow.scrollTo(0, 0).catch(() => {});
      }).catch(() => {});
    }
    if (data.type === 'wecars-gallery-close') {
      galeriaAbierta = false;
      // Restaurar altura completa del iframe
      if (alturaContenido > 0) $w('#htmlDetalle').height = alturaContenido;
    }

    // El HTML avisa que ya está listo para recibir datos
    if (data.type === 'wecars-detail-ready') {
      console.log('[Detalle] iframe listo, carPayload=', carPayload ? 'sí' : 'no');
      if (carPayload) {
        // Ya teníamos el auto cargado — re-enviarlo
        $w('#htmlDetalle').postMessage(carPayload);
      } else {
        loadCar();
      }
    }

    if (data.type === 'wecars-lead') {
      const _lNombre   = data.data.nombre   || '';
      const _lTelefono = data.data.telefono || '';
      const _lCorreo   = data.data.correo   || '';
      const _lOrigen   = data.data.origen   || 'Sitio web';
      // Ruta segura: insert con SA, luego vincular clienteId también con SA desde backend.
      crearLeadYVincular({
        tipo: 'lead', nombre: _lNombre, telefono: _lTelefono, correo: _lCorreo,
        interes: data.data.interes || '', resumen: data.data.interes || '',
        origen: _lOrigen, pagina: 'Detalle - ' + (data.data.interes || ''),
      }).then((inserted) => {
        findOrCreateCliente(_lNombre, _lTelefono, _lCorreo, _lOrigen)
          .then((r) => {
            if (r && r.clienteId) actualizarClienteIdLead(inserted._id, r.clienteId).catch(() => {});
          })
          .catch(() => {});
      }).catch(err => console.error('Error lead detalle:', err));
    }

    if (data.type === 'wecars-credito') {
      // Ruta segura: toda la orquestación (CreditApplications + ALeads + Creditos)
      // ocurre en backend con suppressAuth. CMS no necesita permisos abiertos a visitantes.
      crearSolicitudCredito(data.data)
        .then((result) => {
          console.log('[Crédito-detalle] resultado:', result);
        })
        .catch(err => console.error('[Crédito-detalle] Error:', err));
    }

    if (data.type === 'wecars-testdrive') {
      crearLead({
        tipo:     'prueba_manejo',
        nombre:   data.data.nombre   || '',
        telefono: data.data.celular  || data.data.telefono || '',
        correo:   '',
        interes:  data.data.vehiculo || '',
        resumen:  `${data.data.vehiculo||'Auto'}${data.data.fecha ? ' · '+data.data.fecha : ''}${data.data.horario ? ' · '+data.data.horario : ''}`,
        origen:   data.data.origen   || 'Sitio web',
        pagina:   'Detalle - Prueba de manejo',
      }).catch(e => console.error('[Detalle] Error lead prueba:', e));
      guardarTestDrive(data.data);
    }
  });

  function guardarTestDrive(d) {
    return findOrCreateCliente(d.nombre, d.celular, '', d.origen)
      .then(r => {
        console.log('[Clientes] debug:', r.debug);
        if (!r.clienteId) return;
        return registrarActividad({
          tipo: 'prueba_manejo',
          clienteId: r.clienteId,
          entidadTipo: 'cliente', entidadId: r.clienteId,
          vendedorEmail: 'sistema',
          vendedorNombre: 'Sitio web',
          eventKey: 'prueba_manejo:' + r.clienteId + ':' + (d.fecha || ''),
          metadata: {
            vehiculo: d.vehiculo || '',
            fecha: d.fecha || '',
            horario: d.horario || '',
          },
        });
      })
      .catch(err => console.error('Error guardando prueba de manejo:', err));
  }

  function loadCar() {
    // wixLocation.query no siempre parsea params custom — leemos desde la URL directamente
    const url = wixLocation.url || '';
    const match = url.match(/[?&]carId=([^&#]+)/);
    const carId = match ? decodeURIComponent(match[1]) : null;
    console.log('[Detalle] loadCar() url=', url, 'carId=', carId);
    if (!carId) {
      console.warn('[Detalle] carId no encontrado en URL');
      $w('#htmlDetalle').postMessage({ type: 'wecars-car-error' });
      return;
    }
    let carRef = null; // guardamos el auto para usarlo después de resolver el video
    getCarById(carId)
      .then(car => {
        carRef = car;
        console.log('[Detalle] auto encontrado:', car.title);
        console.log('[Detalle] car completo (click para expandir):', car);

        // Galería: probamos varios nombres posibles del campo de galería,
        // porque el "nombre visible" (ej. "Galeria de Fotos") casi nunca es
        // igual a la clave real interna del campo.
        const posiblesClavesGaleria = ['mediagallery', 'mediaGallery', 'gallery', 'galeriaDeFotos', 'galeriaFotos', 'photos', 'fotos', 'photoGallery', 'imageGallery', 'galleryImages'];
        let images = [];
        let imagesHD = []; // mismas fotos pero en su resolución original (sin comprimir)
        for (const clave of posiblesClavesGaleria) {
          if (Array.isArray(car[clave]) && car[clave].length) {
            console.log('[Detalle] galería encontrada en el campo:', clave);
            images   = car[clave].map(item => wixImgUrl(item.src || item, 1200, 900)).filter(Boolean);
            imagesHD = car[clave].map(item => wixImgUrl(item.src || item)).filter(Boolean);
            break;
          }
        }
        if (images.length === 0 && car.image) {
          images   = [wixImgUrl(car.image, 1200, 900)];
          imagesHD = [wixImgUrl(car.image)];
        }
        console.log('[Detalle] fotos finales:', images.length, images);
        carRef.imagesResueltas = images;
        carRef.imagesHDResueltas = imagesHD;

        // El video (si el auto tiene uno) requiere una llamada al backend
        // para conseguir su URL real — por eso esperamos a que resuelva
        // antes de armar y mandar el carPayload.
        return resolveVideoUrl(car.video);
      })
      .then(videoResult => {
        const car = carRef;
        console.log('[Detalle] resolución de video:', videoResult);

        // Fotos de interior (campo fotosInterior en Cars)
        const posiblesClavesInterior = ['fotosInterior', 'interiorPhotos', 'interior', 'fotosInt'];
        let imagesInterior = [];
        for (const clave of posiblesClavesInterior) {
          if (Array.isArray(car[clave]) && car[clave].length) {
            imagesInterior = car[clave].map(item => wixImgUrl(item.src || item, 1200, 900)).filter(Boolean);
            console.log('[Detalle] fotos interior encontradas en campo:', clave, imagesInterior.length);
            break;
          }
        }

        // Fotos 360 (campo fotos360 en Cars)
        const posiblesClaves360 = ['fotos360', 'photos360', 'gallery360', 'vista360'];
        let images360 = [];
        for (const clave of posiblesClaves360) {
          if (Array.isArray(car[clave]) && car[clave].length) {
            images360 = car[clave].map(item => wixImgUrl(item.src || item, 1200, 900)).filter(Boolean);
            console.log('[Detalle] fotos 360 encontradas en campo:', clave, images360.length);
            break;
          }
        }

        carPayload = {
          type: 'wecars-car',
          car: {
            id:              car._id,
            title:           car.title              || '',
            image:           car.imagesResueltas[0]  || '',
            images:          car.imagesResueltas,
            imagesHD:        car.imagesHDResueltas,
            imagesInterior:  imagesInterior,
            images360:       images360,
            brand:           car.brand              || '',
            year:            car.year               || '',
            type:            car.type               || '',
            transmission:    car.transmission       || '',
            km:              car.statusDescription  || 0,
            price:           parseMoney(car.priceNew),
            priceCredito:    parseMoney(car.oldPrice),
            city:            car.city               || 'León, Gto.',
            fuel:            stripHtml(car.fuel),
            description:     stripHtml(car.description),
            video:           (videoResult && videoResult.url) || '',
          }
        };
        $w('#htmlDetalle').postMessage(carPayload);

        // Autos "parecidos": en vez de exigir la misma marca (que casi
        // nunca tiene resultados si no repites marca en inventario),
        // traemos varios autos del inventario y los ordenamos por qué tan
        // parecidos son (mismo tipo de carrocería + precio cercano). Así
        // siempre mostramos opciones reales de tu inventario.
        const precioActual = parseMoney(car.priceNew);
        const tipoActual = car.type || '';
        console.log('[Detalle] buscando parecidos, tipo=', tipoActual, 'precio=', precioActual);
        return wixData.query('Cars')
          .ne('_id', carId)
          .limit(50)
          .find({ suppressAuth: true })
          .then(results => {
            const scored = results.items.map(r => {
              const rPrecio = parseMoney(r.priceNew);
              let score = 0;
              if (tipoActual && r.type === tipoActual) score += 100;
              if (precioActual && rPrecio) {
                const diffPct = Math.abs(rPrecio - precioActual) / precioActual;
                score += Math.max(0, 60 - diffPct * 100); // más cercano en precio = más puntos
              }
              return { r, score };
            });
            scored.sort((a, b) => b.score - a.score);
            return { items: scored.slice(0, 6).map(s => s.r) };
          });
      })
      .then(related => {
        console.log('[Detalle] parecidos encontrados:', related ? related.items.length : 'sin resultado (related=null)');
        if (!related) return;
        const items = related.items.map(r => ({
          id:    r._id,
          title: r.title || '',
          image: wixImgUrl(r.image, 600, 420),
          brand: r.brand || '',
          year:  r.year  || '',
          price: parseMoney(r.priceNew),
          priceCredito: parseMoney(r.oldPrice),
          km:    r.statusDescription || 0,
          transmission: r.transmission || '',
        }));
        $w('#htmlDetalle').postMessage({ type: 'wecars-related', items });
      })
      .catch(err => {
        console.error('[Detalle] Error wixData.get:', err);
        $w('#htmlDetalle').postMessage({ type: 'wecars-car-error' });
      });
  }
});
