// ═══════════════════════════════════════════════════════════════════════
//  weCars ERP v2 — Página: Operaciones
//  Archivo: Codigos Velo/v2/paginas-paneles/pagina-operaciones.js
//
//  Colecciones CMS:
//    Cars       → inventario completo (CRUD total para Operaciones)
//    Usuarios   → equipo de vendedores (CRUD para Operaciones)
//    ALeads     → todos los leads de todos los vendedores
//    Creditos   → solicitudes de crédito enviadas por vendedores
//
//  HtmlComponent en Wix: #htmlOperaciones
//  Protocolo: postMessage iframe ↔ Velo (WC.OUT / WC.IN)
// ═══════════════════════════════════════════════════════════════════════

import wixData from 'wix-data';
import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import { obtenerTodosLosLeads, obtenerTodosLosCars, obtenerTodosLosUsuarios, crearCar, editarCar, obtenerCar, crearLead, editarLead } from 'backend/operaciones-data';
import { subirFotoVehiculo, obtenerUrlSubidaFoto, confirmarFotoSubida, obtenerUrlSubidaVideo, subirDocumento, obtenerUrlSubidaDoc, confirmarDocSubida } from 'backend/media-upload';
import { generarTokenCredito } from 'backend/credito-publico.jsw';

const HTML_ID = '#htmlOperaciones';

// ── Contratos de mensaje ─────────────────────────────────────────────
const OUT = {
  READY:             'wecars-ready',
  RESIZE:            'wecars-resize',
  CARS_LISTAR:       'wecars-cars-listar',
  CAR_CREAR:         'wecars-car-crear',
  CAR_EDITAR:        'wecars-car-editar',
  CAR_GET:           'wecars-car-get',
  USUARIOS_LISTAR:   'wecars-usuarios-listar',
  USUARIO_CREAR:     'wecars-usuario-crear',
  USUARIO_EDITAR:    'wecars-usuario-editar',
  LEADS_LISTAR_TODOS:'wecars-leads-listar-todos',
  LEAD_CREAR:        'wecars-lead-crear',
  LEAD_EDITAR:       'wecars-lead-editar',
  CREDITOS_LISTAR:   'wecars-creditos-listar',
  CREDITO_EDITAR:    'wecars-credito-editar',
  DOC_SUBIR:         'wecars-doc-subir',
  DOC_URL_SOLICITAR: 'wecars-doc-url-solicitar',
  DOC_URL_CONFIRMAR: 'wecars-doc-url-confirmar',
  FOTO_SUBIR:        'wecars-foto-subir',
  FOTO_URL_SOLICITAR: 'wecars-foto-url-solicitar',
  FOTO_URL_CONFIRMAR: 'wecars-foto-url-confirmar',
  VIDEO_URL_SOLICITAR: 'wecars-video-url-solicitar',
  ALIADOS_LISTAR:    'wecars-aliados-listar',
  GENERAR_TOKEN:     'wecars-generar-token',
};

const IN = {
  CONTEXTO:          'wecars-contexto',
  ERROR:             'wecars-error',
  CARS_LISTA:        'wecars-cars-lista',
  CAR_RESULTADO:     'wecars-car-resultado',
  USUARIOS_LISTA:    'wecars-usuarios-lista',
  USUARIO_RESULTADO: 'wecars-usuario-resultado',
  LEADS_LISTA:       'wecars-leads-lista',
  LEAD_CREADO:       'wecars-lead-creado',
  LEAD_RESULTADO:    'wecars-lead-resultado',
  CREDITOS_LISTA:    'wecars-creditos-lista',
  CREDITO_RESULTADO: 'wecars-credito-resultado',
  DOC_RESULTADO:     'wecars-doc-resultado',
  DOC_URL_RESULTADO: 'wecars-doc-url-resultado',
  FOTO_RESULTADO:    'wecars-foto-resultado',
  FOTO_URL_RESULTADO: 'wecars-foto-url-resultado',
  VIDEO_URL_RESULTADO: 'wecars-video-url-resultado',
  ALIADOS_LISTA:     'wecars-aliados-lista',
  TOKEN_GENERADO:    'wecars-token-generado',
};

let _htmlComp = null;

function enviar(tipo, payload = {}) {
  if (_htmlComp) _htmlComp.postMessage({ type: tipo, ...payload });
}
function enviarError(mensaje, detalle) {
  enviar(IN.ERROR, { codigo: 'ERR', mensaje, detalle: detalle || '' });
}

// ── Altura del iframe ────────────────────────────────────────────────
$w.onReady(() => {
  _htmlComp = $w(HTML_ID);

  _htmlComp.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    if (msg.type === OUT.RESIZE) {
      const h = Number(msg.height);
      if (h > 0) {
        try { _htmlComp.height = h; } catch (_) {}
      }
      return;
    }

    try {
      switch (msg.type) {
        case OUT.READY:             await manejarReady();                   break;
        case OUT.CARS_LISTAR:       await manejarCarsListar(msg);           break;
        case OUT.CAR_CREAR:         await manejarCarCrear(msg);             break;
        case OUT.CAR_EDITAR:        await manejarCarEditar(msg);            break;
        case OUT.CAR_GET:           await manejarCarGet(msg);               break;
        case OUT.USUARIOS_LISTAR:   await manejarUsuariosListar(msg);       break;
        case OUT.USUARIO_CREAR:     await manejarUsuarioCrear(msg);         break;
        case OUT.USUARIO_EDITAR:    await manejarUsuarioEditar(msg);        break;
        case OUT.LEADS_LISTAR_TODOS:await manejarLeadsListarTodos(msg);     break;
        case OUT.LEAD_CREAR:        await manejarLeadCrear(msg);            break;
        case OUT.LEAD_EDITAR:       await manejarLeadEditar(msg);           break;
        case OUT.CREDITOS_LISTAR:   await manejarCreditosListar(msg);       break;
        case OUT.CREDITO_EDITAR:    await manejarCreditoEditar(msg);        break;
        case OUT.ALIADOS_LISTAR:    await manejarAliadosListar(msg);        break;
        case OUT.DOC_SUBIR:          await manejarDocSubir(msg);              break;
        case OUT.DOC_URL_SOLICITAR:  await manejarDocUrlSolicitar(msg);      break;
        case OUT.DOC_URL_CONFIRMAR:  await manejarDocUrlConfirmar(msg);      break;
        case OUT.GENERAR_TOKEN:     await manejarGenerarToken(msg);         break;
        case OUT.FOTO_SUBIR:           await manejarFotoSubir(msg);             break;
        case OUT.FOTO_URL_SOLICITAR:   await manejarFotoUrlSolicitar(msg);     break;
        case OUT.FOTO_URL_CONFIRMAR:   await manejarFotoUrlConfirmar(msg);     break;
        case OUT.VIDEO_URL_SOLICITAR:  await manejarVideoUrlSolicitar(msg);    break;
        default: break;
      }
    } catch (err) {
      console.error('[Operaciones] Error en', msg.type, err);
      enviarError('Error interno: ' + msg.type, err.message);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
//  1. READY → CONTEXTO
// ════════════════════════════════════════════════════════════════════════
async function manejarReady() {
  const user = wixUsers.currentUser;
  if (!user.loggedIn) {
    enviarError('Debes iniciar sesión para acceder a este panel');
    return;
  }

  let email = '';
  try { email = await user.getEmail(); } catch (_) {}

  let nombre   = email;
  let rol      = 'Operaciones';
  let sucursal = 'Bajío';

  try {
    const q = await wixData.query('Usuarios').eq('email', email).limit(1).find({ suppressAuth: true });
    if (q.items.length) {
      const u = q.items[0];
      nombre   = u.nombre   || email;
      rol      = u.rol      || 'Operaciones';
      sucursal = u.sucursal || 'Bajío';
    }
  } catch (_) {}

  let siteOrigin = 'https://www.wecarsbajio.com';
  try { const u = new URL(wixLocation.url); siteOrigin = u.origin; } catch (_) {}
  enviar(IN.CONTEXTO, {
    usuario:   nombre,
    email,
    rol,
    sucursal,
    siteUrl: siteOrigin,
    permisos: {
      verTodos:      true,
      editarLeads:   true,
      editarCars:    true,
      gestionarTeam: true,
    },
  });
}

// ════════════════════════════════════════════════════════════════════════
//  2. CARS_LISTAR — devuelve todo el inventario (via backend para bypass permisos)
// ════════════════════════════════════════════════════════════════════════
async function manejarCarsListar(msg) {
  const r = await obtenerTodosLosCars(msg.limite || 200);
  enviar(IN.CARS_LISTA, { items: r.items, total: r.total });
  if (!r.ok) enviarError('Error al cargar inventario', r.error);
}

// ════════════════════════════════════════════════════════════════════════
//  3. CAR_CREAR — via backend (suppressAuth solo funciona en .jsw)
// ════════════════════════════════════════════════════════════════════════
async function manejarCarCrear(msg) {
  if (!msg.datos) { enviar(IN.CAR_RESULTADO, { ok: false, error: 'Sin datos' }); return; }
  const r = await crearCar(msg.datos);
  enviar(IN.CAR_RESULTADO, r);
}

// ════════════════════════════════════════════════════════════════════════
//  4. CAR_EDITAR — via backend (suppressAuth solo funciona en .jsw)
// ════════════════════════════════════════════════════════════════════════
async function manejarCarEditar(msg) {
  if (!msg.id || !msg.datos) {
    enviar(IN.CAR_RESULTADO, { ok: false, error: 'Parámetros faltantes' });
    return;
  }
  const r = await editarCar(msg.id, msg.datos);
  enviar(IN.CAR_RESULTADO, r);
}

// ════════════════════════════════════════════════════════════════════════
//  5. CAR_GET — via backend
// ════════════════════════════════════════════════════════════════════════
async function manejarCarGet(msg) {
  if (!msg.id) return;
  const r = await obtenerCar(msg.id);
  enviar(IN.CAR_RESULTADO, r);
}

// ════════════════════════════════════════════════════════════════════════
//  6. USUARIOS_LISTAR (via backend para bypass permisos)
// ════════════════════════════════════════════════════════════════════════
async function manejarUsuariosListar(msg) {
  const r = await obtenerTodosLosUsuarios(''); // sin filtro: el frontend filtra por rol
  enviar(IN.USUARIOS_LISTA, r); // incluye ok/error además de items
}

// ════════════════════════════════════════════════════════════════════════
//  7. USUARIO_CREAR — crea el registro en Usuarios CMS
//     Nota: el acceso real a Wix Members se da desde Wix Studio (invitación)
//     Aquí solo guardamos el perfil en el CMS
// ════════════════════════════════════════════════════════════════════════
async function manejarUsuarioCrear(msg) {
  if (!msg.nombre || !msg.email) {
    enviar(IN.USUARIO_RESULTADO, { ok: false, error: 'Nombre y correo requeridos' });
    return;
  }
  try {
    // Verificar si ya existe
    const existe = await wixData.query('Usuarios').eq('email', msg.email).limit(1).find({ suppressAuth: true });
    if (existe.items.length) {
      enviar(IN.USUARIO_RESULTADO, { ok: false, error: 'Ya existe un usuario con ese correo' });
      return;
    }
    const nuevo = await wixData.insert('Usuarios', {
      nombre:       msg.nombre,
      email:        msg.email,
      telefono:     msg.telefono || '',
      rol:          msg.rol || 'Vendedor',
      sucursal:     msg.sucursal || 'Bajío',
      metaMensual:  msg.metaMensual || 5,
      activo:       true,
      _createdDate: new Date(),
    }, { suppressAuth: true });
    enviar(IN.USUARIO_RESULTADO, { ok: true, usuario: nuevo, creado: true });
  } catch (err) {
    enviar(IN.USUARIO_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  8. USUARIO_EDITAR
// ════════════════════════════════════════════════════════════════════════
async function manejarUsuarioEditar(msg) {
  if (!msg.id || !msg.datos) {
    enviar(IN.USUARIO_RESULTADO, { ok: false, error: 'Parámetros faltantes' });
    return;
  }
  try {
    const actual = await wixData.get('Usuarios', msg.id, { suppressAuth: true });
    if (!actual) { enviar(IN.USUARIO_RESULTADO, { ok: false, error: 'Usuario no encontrado' }); return; }
    const actualizado = await wixData.update('Usuarios', {
      ...actual,
      ...msg.datos,
      _id: msg.id,
    }, { suppressAuth: true });
    enviar(IN.USUARIO_RESULTADO, { ok: true, usuario: actualizado });
  } catch (err) {
    enviar(IN.USUARIO_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  9. LEADS_LISTAR_TODOS — todos los leads via backend (bypass permisos Member)
// ════════════════════════════════════════════════════════════════════════
async function manejarLeadCrear(msg) {
  if (!msg.datos) {
    enviar(IN.LEAD_CREADO, { ok: false, error: 'Sin datos' });
    return;
  }
  const r = await crearLead(msg.datos);
  enviar(IN.LEAD_CREADO, r);
}

async function manejarLeadEditar(msg) {
  if (!msg.id || !msg.datos) {
    enviar(IN.LEAD_RESULTADO, { ok: false, error: 'Parámetros faltantes' });
    return;
  }
  const r = await editarLead(msg.id, msg.datos);
  enviar(IN.LEAD_RESULTADO, r);
}

async function manejarLeadsListarTodos(msg) {
  const r = await obtenerTodosLosLeads(msg.limite || 5000);
  enviar(IN.LEADS_LISTA, { items: r.items, total: r.total });
  if (!r.ok) enviarError('Error al cargar clientes', r.error);
}

// ════════════════════════════════════════════════════════════════════════
//  10. CREDITOS_LISTAR
// ════════════════════════════════════════════════════════════════════════
async function manejarCreditosListar(msg) {
  try {
    const r = await wixData
      .query('Creditos')
      .descending('_createdDate')
      .limit(200)
      .find({ suppressAuth: true });
    enviar(IN.CREDITOS_LISTA, { items: r.items });
  } catch (err) {
    enviar(IN.CREDITOS_LISTA, { items: [] });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  11. CREDITO_EDITAR — actualizar estatus del crédito (F&I)
// ════════════════════════════════════════════════════════════════════════
async function manejarCreditoEditar(msg) {
  if (!msg.id || !msg.datos) return;
  try {
    const actual = await wixData.get('Creditos', msg.id, { suppressAuth: true });
    if (!actual) return;
    await wixData.update('Creditos', { ...actual, ...msg.datos, _id: msg.id }, { suppressAuth: true });
    enviar(IN.CREDITO_RESULTADO, { ok: true });
  } catch (err) {
    enviar(IN.CREDITO_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  13. GENERAR_TOKEN — genera token seguro de crédito y devuelve link completo
// ════════════════════════════════════════════════════════════════════════
async function manejarGenerarToken(msg) {
  if (!msg.leadId || !msg.vendedorId) {
    enviar(IN.TOKEN_GENERADO, { ok: false, error: 'Faltan datos del lead o vendedor' });
    return;
  }
  const r = await generarTokenCredito({
    leadId:        msg.leadId,
    vendedorId:    msg.vendedorId,
    leadNombre:    msg.leadNombre    || '',
    autoInteres:   msg.autoInteres   || '',
    precioRef:     msg.precioRef     || 0,
    autoInteresId: msg.autoInteresId || '',
  });
  if (r.ok) {
    // wixLocation.url da la URL completa de la página actual, de la que extraemos el origen
    let siteOrigin = 'https://www.wecarsbajio.com';
    try {
      const u = new URL(wixLocation.url);
      siteOrigin = u.origin;
    } catch (_) {}
    r.link = `${siteOrigin}/solicitud-credito?t=${r.token}`;
  }
  enviar(IN.TOKEN_GENERADO, r);
}

// ════════════════════════════════════════════════════════════════════════
//  DOC_URL_SOLICITAR / DOC_URL_CONFIRMAR — subida directa de documentos
// ════════════════════════════════════════════════════════════════════════
async function manejarDocUrlSolicitar(msg) {
  const r = await obtenerUrlSubidaDoc({
    entidadId:   msg.entidadId   || '',
    entidadTipo: msg.entidadTipo || 'auto',
    tipo:        msg.tipo        || 'otro',
    fileName:    msg.fileName    || `doc_${Date.now()}.pdf`,
    mimeType:    msg.mimeType    || 'application/pdf',
  });
  enviar(IN.DOC_URL_RESULTADO, { ...r, tipo: msg.tipo, entidadId: msg.entidadId, entidadTipo: msg.entidadTipo, fileName: msg.fileName });
}

async function manejarDocUrlConfirmar(msg) {
  const r = await confirmarDocSubida({
    entidadId:   msg.entidadId   || '',
    entidadTipo: msg.entidadTipo || 'auto',
    tipo:        msg.tipo        || 'otro',
    fileName:    msg.fileName    || '',
    mimeType:    msg.mimeType    || '',
    url:         msg.url         || '',
    vendedorId:  msg.vendedorId  || '',
  });
  enviar(IN.DOC_RESULTADO, r);
}

// ════════════════════════════════════════════════════════════════════════
//  14. DOC_SUBIR — sube documento de cliente/vehículo via backend
// ════════════════════════════════════════════════════════════════════════
async function manejarDocSubir(msg) {
  if (!msg.base64) {
    enviar(IN.DOC_RESULTADO, { ok: false, error: 'Sin datos', tipo: msg.tipo || '' });
    return;
  }
  const r = await subirDocumento({
    entidadId:   msg.entidadId   || '',
    entidadTipo: msg.entidadTipo || 'lead',
    tipo:        msg.tipo        || 'otro',
    base64:      msg.base64,
    fileName:    msg.fileName    || `doc_${Date.now()}.pdf`,
    mimeType:    msg.mimeType    || 'application/pdf',
    vendedorId:  msg.vendedorId  || '',
  });
  enviar(IN.DOC_RESULTADO, r);
}

// ════════════════════════════════════════════════════════════════════════
//  14. FOTO_URL_SOLICITAR / FOTO_URL_CONFIRMAR — subida directa al browser
// ════════════════════════════════════════════════════════════════════════
async function manejarFotoUrlSolicitar(msg) {
  const r = await obtenerUrlSubidaFoto({
    carId:    msg.carId    || '',
    idx:      msg.idx      || 0,
    gridId:   msg.gridId   || '',
    fileName: msg.fileName || `foto_${Date.now()}.jpg`,
    mimeType: msg.mimeType || 'image/jpeg',
  });
  enviar(IN.FOTO_URL_RESULTADO, r);
}

async function manejarFotoUrlConfirmar(msg) {
  const r = await confirmarFotoSubida({
    carId:  msg.carId  || '',
    idx:    msg.idx    || 0,
    gridId: msg.gridId || '',
    url:    msg.url    || '',
  });
  enviar(IN.FOTO_RESULTADO, { ...r, idx: msg.idx });
}

// ════════════════════════════════════════════════════════════════════════
//  14b. FOTO_SUBIR — legacy base64 path (fallback)
// ════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
//  14. FOTO_SUBIR — sube foto a Wix Media via backend
// ════════════════════════════════════════════════════════════════════════
async function manejarFotoSubir(msg) {
  if (!msg.base64) {
    enviar(IN.FOTO_RESULTADO, { ok: false, error: 'Sin datos', idx: msg.idx || 0 });
    return;
  }
  const r = await subirFotoVehiculo({
    carId:  msg.carId  || '',
    idx:    msg.idx    || 0,
    base64: msg.base64,
    nombre: msg.nombre || `foto_${Date.now()}.jpg`,
    tipo:   msg.tipo   || 'image/jpeg',
  });
  enviar(IN.FOTO_RESULTADO, r);
}

// ════════════════════════════════════════════════════════════════════════
//  VIDEO_URL_SOLICITAR — devuelve URL firmada para subida directa al browser
// ════════════════════════════════════════════════════════════════════════
async function manejarVideoUrlSolicitar(msg) {
  const r = await obtenerUrlSubidaVideo({
    carId:    msg.carId    || '',
    fileName: msg.fileName || `video_${Date.now()}.mp4`,
    mimeType: msg.mimeType || 'video/mp4',
  });
  enviar(IN.VIDEO_URL_RESULTADO, r);
}

// ════════════════════════════════════════════════════════════════════════
//  12. ALIADOS_LISTAR
// ════════════════════════════════════════════════════════════════════════
async function manejarAliadosListar(msg) {
  try {
    const r = await wixData.query('Aliados').ascending('nombre').limit(100).find({ suppressAuth: true });
    enviar(IN.ALIADOS_LISTA, { items: r.items });
  } catch (err) {
    enviar(IN.ALIADOS_LISTA, { items: [] });
  }
}
