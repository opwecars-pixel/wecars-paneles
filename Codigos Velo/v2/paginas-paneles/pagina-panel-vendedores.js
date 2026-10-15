// ═══════════════════════════════════════════════════════════════════════
//  weCars ERP v2 — Página: Panel Vendedor
//  Archivo: Codigos Velo/v2/paginas-paneles/pagina-panel-vendedores.js
//
//  Colecciones CMS:
//    ALeads     → pipeline de leads (lectura + edición propia)
//    Activities → historial de actividades por cliente
//    Cars       → inventario (SOLO LECTURA para vendedores)
//    Citas      → agenda del vendedor
//    Usuarios   → perfil del usuario actual (fuente de verdad de rol)
//
//  Protocolo: postMessage iframe ↔ Velo (WC.OUT / WC.IN)
// ═══════════════════════════════════════════════════════════════════════

import wixData from 'wix-data';
import wixUsers from 'wix-users';
import { subscribe, publish } from 'wix-realtime';
import { subirDocumento, listarDocumentos } from 'backend/media-upload';
import { generarTokenCredito, submitSolicitudPublica } from 'backend/credito-publico.jsw';

// ── ID del elemento iframe en la página Wix ─────────────────────────────
const HTML_ID  = '#htmlPanelVendedores';
const CANAL_RT = { name: 'wecars-erp-v2' };

// ── Contratos de mensaje (espejo de wecars-messages.js) ─────────────────
const OUT = {
  READY:            'wecars-ready',
  RESIZE:           'wecars-resize',
  LEAD_LISTAR:      'wecars-lead-listar',
  LEAD_CREAR:       'wecars-lead-crear',
  LEAD_EDITAR:      'wecars-lead-editar',
  ACTIVIDAD_LISTAR: 'wecars-actividad-listar',
  ACTIVIDAD_CREAR:  'wecars-actividad-crear',
  CARS_LISTAR:      'wecars-cars-listar',
  CARS_GET:         'wecars-cars-get',
  DOC_LISTAR:       'wecars-doc-listar',
  CITA_LISTAR:      'wecars-cita-listar',
  CITA_CREAR:       'wecars-cita-crear',
  DOC_SUBIR:        'wecars-doc-subir',
  CIERRE_CREAR:            'wecars-cierre-crear',
  CREDITO_CREAR:           'wecars-credito-crear',
  CREDITO_TOKEN_GENERAR:   'wecars-credito-token-generar',
};
const IN = {
  CONTEXTO:          'wecars-contexto',
  ERROR:             'wecars-error',
  LEADS_LISTA:       'wecars-leads-lista',
  LEAD_RESULTADO:    'wecars-lead-resultado',
  ACTIVIDADES_LISTA: 'wecars-actividades-lista',
  CARS_LISTA:        'wecars-cars-lista',
  CARRO_RESULTADO:   'wecars-carro-resultado',
  DOCS_LISTA:        'wecars-docs-lista',
  DOC_RESULTADO:     'wecars-doc-resultado',
  CITAS_LISTA:       'wecars-citas-lista',
  CITA_RESULTADO:    'wecars-cita-resultado',
  CIERRE_RESULTADO:          'wecars-cierre-resultado',
  CREDITO_RESULTADO:         'wecars-credito-resultado',
  CREDITO_TOKEN_RESULTADO:   'wecars-credito-token-resultado',
  REALTIME_UPDATE:           'wecars-realtime-update',
};

// ── Helpers ──────────────────────────────────────────────────────────────
function enviar(tipo, payload = {}) {
  $w(HTML_ID).postMessage({ type: tipo, ...payload });
}
function enviarError(mensaje, detalle) {
  enviar(IN.ERROR, { codigo: 'ERR', mensaje, detalle: detalle || '' });
  console.error('[weCars v2]', mensaje, detalle);
}

// ── Estado de sesión ─────────────────────────────────────────────────────
let vendedorId     = null;
let vendedorNombre = '';
let vendedorRol    = 'Vendedor';
let sucursal       = 'Bajío';

const ROLES_GERENCIA = ['Gerencia','Dirección','direccion','Administración','admin','gerencia'];
function esGerencia() { return ROLES_GERENCIA.includes(vendedorRol); }

// ════════════════════════════════════════════════════════════════════════
//  $w.onReady
// ════════════════════════════════════════════════════════════════════════
$w.onReady(async function () {

  $w(HTML_ID).onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    // El RESIZE lo manejamos en línea (no necesita await)
    if (msg.type === OUT.RESIZE && msg.height) {
      try { $w(HTML_ID).height = msg.height; } catch (_) {}
      return;
    }

    await despacharMensaje(msg);
  });

  // Realtime: re-emitir actualizaciones a este iframe
  // subscribe() devuelve una Promise — necesita .catch() para evitar Uncaught rejection
  try {
    const sub = subscribe(CANAL_RT, (m) => {
      const p = m.payload || {};
      if (p.type === IN.REALTIME_UPDATE) enviar(IN.REALTIME_UPDATE, p);
    });
    if (sub && typeof sub.catch === 'function') {
      sub.catch(e => console.warn('[weCars v2] realtime no disponible:', e?.message || e));
    }
  } catch (e) {
    console.warn('[weCars v2] realtime:', e.message);
  }
});

// ════════════════════════════════════════════════════════════════════════
//  Despachador
// ════════════════════════════════════════════════════════════════════════
async function despacharMensaje(msg) {
  switch (msg.type) {
    case OUT.READY:            await manejarReady();                             break;
    case OUT.LEAD_LISTAR:      await manejarLeadListar(msg.filtros || {});       break;
    case OUT.LEAD_CREAR:       await manejarLeadCrear(msg.datos || {});          break;
    case OUT.LEAD_EDITAR:      await manejarLeadEditar(msg.leadId, msg.cambios); break;
    case OUT.ACTIVIDAD_LISTAR: await manejarActividadListar(msg.clienteId);      break;
    case OUT.ACTIVIDAD_CREAR:  await manejarActividadCrear(msg.datos || {});     break;
    case OUT.CARS_LISTAR:      await manejarCarsListar(msg.filtros || {});       break;
    case OUT.CARS_GET:         await manejarCarsGet(msg.carId);                  break;
    case OUT.DOC_LISTAR:       await manejarDocListar(msg.entidadTipo, msg.entidadId); break;
    case OUT.DOC_SUBIR:        await manejarDocSubir(msg);                             break;
    case OUT.CITA_LISTAR:      await manejarCitaListar(msg.filtros || {});       break;
    case OUT.CITA_CREAR:       await manejarCitaCrear(msg.datos || {});          break;
    case OUT.CIERRE_CREAR:          await manejarCierreCrear(msg.datos || {});        break;
    case OUT.CREDITO_CREAR:         await manejarCreditoCrear(msg);                   break;
    case OUT.CREDITO_TOKEN_GENERAR: await manejarCreditoTokenGenerar(msg);            break;
    default: break;
  }
}

// ════════════════════════════════════════════════════════════════════════
//  1. READY → CONTEXTO
//     Identifica al usuario desde Usuarios CMS (fuente de verdad).
//     Fallback: inferir rol desde Wix roles si no está en Usuarios.
// ════════════════════════════════════════════════════════════════════════
async function manejarReady() {
  try {
    const user = wixUsers.currentUser;
    if (!user.loggedIn) {
      enviarError('Debes iniciar sesión para acceder al panel');
      return;
    }

    let email = '';
    try { email = await user.getEmail(); } catch (_) {}

    let roles = [];
    try { roles = await user.getRoles(); } catch (_) {}

    vendedorId     = email || user.id;
    vendedorNombre = email;

    // Usuarios CMS como fuente de verdad para nombre, rol y sucursal
    try {
      const q = await wixData
        .query('Usuarios')
        .eq('email', email)
        .limit(1)
        .find({ suppressAuth: true });

      if (q.items.length) {
        const u       = q.items[0];
        vendedorNombre = u.nombre   || email;
        vendedorRol    = u.rol      || 'Vendedor';
        sucursal       = u.sucursal || 'Bajío';
      } else {
        vendedorRol = roles.some(r => ROLES_GERENCIA.includes(r.name)) ? 'Gerencia' : 'Vendedor';
      }
    } catch (_) {}

    enviar(IN.CONTEXTO, {
      usuario:    vendedorNombre,
      email,
      vendedorId,
      rol:        vendedorRol,
      sucursal,
      permisos: {
        verTodos:       esGerencia(),
        editarLeads:    true,
        verInventario:  true,
        crearLeads:     true,
      },
    });

  } catch (err) {
    enviarError('Error al cargar el contexto', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  2. LEAD_LISTAR
//     Colección: ALeads
//     Campos que devuelve: _id, nombre, email, telefono, telefono2,
//       fuente, interes, presupuesto, estatus, vendedorId, notas,
//       ciudad, direccion, ingresoMensual, rfc, curp, situacionLaboral,
//       engancheDisponible, comprobantesIngreso, historialCredito,
//       ultimaActividad, _createdDate, _updatedDate
//
//     Gerencia ve todos; vendedor ve solo sus leads (filtro vendedorId).
// ════════════════════════════════════════════════════════════════════════
async function manejarLeadListar(filtros) {
  try {
    if (!vendedorId) return;

    let q = wixData
      .query('ALeads')
      .descending('_updatedDate')
      .limit(filtros.limit || 100);

    // Vendedor solo ve los suyos
    if (!esGerencia()) {
      q = q.eq('vendedorId', vendedorId);
    }

    // Filtros opcionales del panel
    if (filtros.estatus) q = q.eq('estatus', filtros.estatus);

    const r = await q.find({ suppressAuth: true });

    // Normalizar campos de ALeads — cubre nombres en español e inglés
    const p = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '') || '';
    const items = r.items.map(lead => ({
      ...lead,
      // Pipeline
      etapa:   p(lead.etapa,  lead.estatus, lead.status, lead.stage, lead.pipeline) || 'Nuevo',
      estatus: p(lead.estatus,lead.etapa,   lead.status, lead.stage)               || 'Nuevo',
      // Contacto
      nombre:   p(lead.nombre,   lead.name,      lead.fullName,   lead.title,    lead.contactName),
      telefono: p(lead.telefono, lead.phone,      lead.phoneNumber,lead.tel,      lead.celular, lead.mobile, lead.cell),
      telefono2:p(lead.telefono2,lead.phone2,     lead.altPhone,   lead.secondPhone),
      email:    p(lead.email,    lead.correo,     lead.mail,       lead.emailAddress),
      ciudad:   p(lead.ciudad,   lead.city,       lead.municipio,  lead.town),
      direccion:p(lead.direccion,lead.address,    lead.street,     lead.fullAddress),
      origen:   p(lead.origen,   lead.source,     lead.fuente,     lead.leadSource, lead.channel, lead.canal, lead.from),
      fuente:   p(lead.fuente,   lead.source,     lead.origen,     lead.leadSource),
      // Perfil financiero
      ingresoMensual:      p(lead.ingresoMensual,     lead.monthlyIncome,  lead.income,     lead.ingreso,   lead.salario),
      presupuesto:         p(lead.presupuesto,         lead.budget,         lead.carBudget,  lead.totalBudget),
      engancheDisponible:  p(lead.engancheDisponible,  lead.downPayment,    lead.enganche,   lead.deposit,   lead.initialPayment),
      comprobantesIngreso: p(lead.comprobantesIngreso, lead.incomeProof,    lead.proofOfIncome, lead.comprobantes),
      historialCredito:    p(lead.historialCredito,    lead.creditHistory,  lead.credit,     lead.credito,   lead.creditScore, lead.buro),
      situacionLaboral:    p(lead.situacionLaboral,    lead.employmentStatus, lead.occupation, lead.ocupacion, lead.empleo, lead.employment),
      rfc:  p(lead.rfc,  lead.taxId,    lead.rfcNumber),
      curp: p(lead.curp, lead.nationalId,lead.idNumber),
      // Auto de interés
      interes:         p(lead.interes,         lead.carInterest, lead.interestCar, lead.autoInteres, lead.interesAuto, lead.vehicleInterest),
      autoPresupuesto: p(lead.autoPresupuesto, lead.carBudget,   lead.vehicleBudget, lead.presupuestoAuto),
      tipoCompra:      p(lead.tipoCompra,      lead.purchaseType,lead.buyType,     lead.paymentType),
      enganche:        p(lead.enganche,        lead.downPayment, lead.deposit),
      // Notas
      notas: p(lead.notas, lead.notes, lead.comments, lead.observations, lead.remarks),
    }));

    enviar(IN.LEADS_LISTA, {
      items,
      total: r.totalCount,
    });

  } catch (err) {
    enviarError('Error al cargar leads', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  3. LEAD_CREAR
//     Colección: ALeads — inserta nuevo prospecto asignado al vendedor.
// ════════════════════════════════════════════════════════════════════════
async function manejarLeadCrear(datos) {
  try {
    if (!vendedorId) {
      enviar(IN.LEAD_RESULTADO, { ok: false, error: 'Sin sesión activa' });
      return;
    }

    const nuevoLead = {
      nombre:      datos.nombre      || '',
      email:       datos.email       || '',
      telefono:    datos.telefono    || datos.tel   || '',
      telefono2:   datos.telefono2   || '',
      fuente:      datos.fuente      || datos.origen || '',
      interes:        datos.interes     || datos.autoInteres || '',
      autoInteresId:  datos.autoInteresId || null, // ID del auto en CMS (del catálogo)
      presupuesto:    datos.presupuesto || '',
      estatus:        datos.etapa       || datos.estatus || 'Nuevo',
      vendedorId,
      notas:          datos.notaInicial || datos.notas || '',
      ciudad:         datos.ciudad      || '',
      fecha:          new Date().toISOString().split('T')[0],
    };

    const insertado = await wixData.insert('ALeads', nuevoLead, { suppressAuth: true });

    if (datos.notaInicial) {
      await wixData.insert('Activities', {
        clienteId:   insertado._id,
        vendedorId,
        autor:       vendedorNombre,
        tipo:        'nota',
        descripcion: datos.notaInicial,
        fecha:       new Date().toISOString(),
        resultado:   '',
      }, { suppressAuth: true });
    }

    enviar(IN.LEAD_RESULTADO, { ok: true, lead: insertado, creado: true });
    _notificarActualizacion('ALeads', insertado._id, 'crear');

  } catch (err) {
    enviar(IN.LEAD_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  4. LEAD_EDITAR
//     Colección: ALeads — actualiza campos permitidos.
//     Seguridad:
//       - Vendedor solo puede editar sus propios leads.
//       - Gerencia puede editar cualquier lead.
//       - LISTA BLANCA de campos editables (no se pueden sobreescribir
//         campos internos como _id, _createdDate, vendedorId, etc.)
//     Normalización: el iframe puede enviar "etapa" o "estatus" —
//       siempre se guarda como "estatus" en CMS.
// ════════════════════════════════════════════════════════════════════════
async function manejarLeadEditar(leadId, cambios) {
  try {
    if (!leadId || !cambios) {
      enviar(IN.LEAD_RESULTADO, { ok: false, error: 'Parámetros faltantes' });
      return;
    }

    const actual = await wixData.get('ALeads', leadId, { suppressAuth: true });
    if (!actual) {
      enviar(IN.LEAD_RESULTADO, { ok: false, error: 'Lead no encontrado' });
      return;
    }

    // Seguridad: vendedor solo edita los suyos; Gerencia edita todos.
    // Si el lead no tiene vendedorId asignado aún, cualquier vendedor puede editarlo.
    const leadTieneVendedor = actual.vendedorId && actual.vendedorId.trim() !== '';
    if (!esGerencia() && leadTieneVendedor && actual.vendedorId !== vendedorId) {
      enviar(IN.LEAD_RESULTADO, { ok: false, error: 'No puedes editar leads de otro vendedor' });
      return;
    }
    // Si el lead no tiene vendedor asignado, asignarlo al vendedor actual
    if (!leadTieneVendedor && vendedorId) {
      cambios.vendedorId = vendedorId;
    }

    // Normalizar etapa → estatus (el HTML usa "etapa" internamente)
    if (cambios.etapa && !cambios.estatus) {
      cambios.estatus = cambios.etapa;
    }
    delete cambios.etapa;

    // Lista blanca de campos editables en ALeads
    const CAMPOS_EDITABLES = [
      // Contacto
      'nombre', 'email', 'telefono', 'telefono2',
      'fuente', 'origen', 'ciudad', 'direccion',
      // Perfil financiero
      'ingresoMensual', 'presupuesto', 'rfc', 'curp',
      'situacionLaboral', 'engancheDisponible',
      'comprobantesIngreso', 'historialCredito',
      // Auto de interés
      'interes', 'autoPresupuesto', 'tipoCompra',
      'enganche', 'autoPartePago',
      // Pipeline
      'estatus', 'notas', 'ultimaActividad',
      // Asignación (solo si el lead no tenía vendedor)
      'vendedorId',
    ];

    const actualizado = { _id: leadId };
    CAMPOS_EDITABLES.forEach(campo => {
      if (cambios[campo] !== undefined) actualizado[campo] = cambios[campo];
    });

    const guardado = await wixData.update('ALeads', actualizado, { suppressAuth: true });
    enviar(IN.LEAD_RESULTADO, { ok: true, lead: guardado });

    // Actividad automática al cambiar etapa
    if (cambios.estatus) {
      await wixData.insert('Activities', {
        clienteId:   leadId,
        vendedorId,
        autor:       vendedorNombre,
        tipo:        'sistema',
        descripcion: `Etapa cambiada a ${cambios.estatus}`,
        fecha:       new Date().toISOString(),
        resultado:   '',
      }, { suppressAuth: true }).catch(() => {});
      _notificarActualizacion('ALeads', leadId, 'actualizar');
    }

  } catch (err) {
    enviar(IN.LEAD_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  5. ACTIVIDAD_LISTAR
//     Colección: Activities
//     Campos: _id, clienteId, vendedorId, autor, tipo, descripcion,
//             fecha, resultado, proximoPaso
// ════════════════════════════════════════════════════════════════════════
async function manejarActividadListar(clienteId) {
  try {
    if (!clienteId) return;

    const q = await wixData
      .query('Activities')
      .eq('clienteId', clienteId)
      .descending('fecha')
      .limit(50)
      .find({ suppressAuth: true });

    enviar(IN.ACTIVIDADES_LISTA, { items: q.items });

  } catch (err) {
    enviarError('Error al cargar actividades', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  6. ACTIVIDAD_CREAR
//     Colección: Activities — inserta nota, llamada, WhatsApp, cita, etc.
//     También actualiza `ultimaActividad` en ALeads para ranking.
// ════════════════════════════════════════════════════════════════════════
async function manejarActividadCrear(datos) {
  try {
    const nueva = {
      clienteId:   datos.clienteId   || '',
      vendedorId,
      autor:       vendedorNombre,
      tipo:        datos.tipo        || 'nota',
      descripcion: datos.texto       || datos.descripcion || '',
      fecha:       datos.fecha       || new Date().toISOString(),
      resultado:   datos.resultado   || '',
      proximoPaso: datos.proximoPaso || '',
    };

    if (!nueva.clienteId || !nueva.descripcion) return;

    await wixData.insert('Activities', nueva, { suppressAuth: true });

    await wixData.update('ALeads', {
      _id:             nueva.clienteId,
      ultimaActividad: nueva.fecha,
    }, { suppressAuth: true }).catch(() => {});

    // Recargar historial en el iframe
    await manejarActividadListar(nueva.clienteId);

  } catch (err) {
    enviarError('Error al guardar actividad', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  UTILIDAD: convertir URLs de imágenes Wix a URLs HTTP directas.
//
//  Wix CMS guarda imágenes en formato propietario:
//    "wix:image://v1/{fileId}/{filename}#originWidth=X&originHeight=Y"
//  o como objeto: { src: "wix:image://...", ... }
//  o como URL directa: "https://static.wixstatic.com/media/..."
//
//  Este helper los normaliza todos a una URL HTTP lista para <img>.
// ════════════════════════════════════════════════════════════════════════
function _wixUrlToHttp(src) {
  if (!src) return null;
  // Ya es URL HTTP
  if (typeof src === 'string' && src.startsWith('http')) return src;
  // Objeto Wix con propiedad src
  if (typeof src === 'object' && src !== null) {
    const rawSrc = src.src || src.url || src.uri || '';
    if (rawSrc.startsWith('http')) return rawSrc;
    src = rawSrc;
  }
  if (typeof src !== 'string') return null;
  // Formato: wix:image://v1/{fileId}/{filename}#...
  const m = src.match(/wix:image:\/\/v1\/([^\/\#]+)/);
  if (m) {
    return `https://static.wixstatic.com/media/${m[1]}`;
  }
  // Formato corto sin v1: wix:image://{fileId}
  const m2 = src.match(/wix:image:\/\/([^\/\#]+)/);
  if (m2) {
    return `https://static.wixstatic.com/media/${m2[1]}`;
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════
//  NORMALIZACIÓN DE AUTO
//  El CMS Cars puede tener distintos nombres de campo según cómo los
//  configuró el administrador en Wix. Esta función mapea todas las
//  variaciones conocidas al nombre estándar que espera el HTML.
// ════════════════════════════════════════════════════════════════════════
function _normalizarAuto(car) {
  // Helper: primer valor truthy de una lista
  const p = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '') || '';

  return {
    ...car,
    fotos: _normalizarFotosAuto(car),

    // ── IDs confirmados del CMS weCars ────────────────────────────────
    marca:   p(car.marca,   car.make,  car.brand),
    modelo:  p(car.modelo,  car.model, car.title, car.name),
    año:     p(car.year,    car.año,   car.anio),        // ID en CMS: "year"
    version: p(car.version, car.trim),                   // ID en CMS: "version"
    color:   p(car.color,   car.colour),                 // ID en CMS: "color"

    km:              p(car.statusDescription, car.kilometraje, car.km, car.mileage), // ID: "statusDescription"
    vin:             p(car.vin,              car.niv),                               // ID: "vin"
    noInventario: p(car.numeroInventario, car.stockNumber),   // Nº inventario interno
    consecutivo:  p(car.consecutivo,     car.folioFactura),  // ID: "consecutivo" = consecutivo de facturas
    consFactura:  p(car.consecutivo,     car.folioFactura),  // alias

    transmision: p(car.transmission, car.transmision, car.transsmision), // ID: "transmission"
    combustible: p(car.fuel,         car.combustible, car.full),         // ID: "fuel"
    carroceria:  p(car.bodyType,     car.carroceria),

    precio:        p(car.precioVenta,   car.precio, car.price),     // ID: "precioVenta"
    precioContado: p(car.precioContado, car.costoAdquisicion),      // ID: "precioContado"
    precioCredito: p(car.credito,       car.creditPrice),

    ubicacion: p(car.ciudad,   car.ubicacion, car.location),   // ID: "ciudad"
    sucursal:  p(car.ciudad,   car.sucursal,  car.branch),

    estatus:     p(car.estatusVenta, car.estatus, car.status) || 'disponible', // ID: "estatusVenta"
    tipoFactura: p(car.tipofactura,  car.tipoFactura, car.factura),             // ID: "tipofactura"

    // ── Estado del vehículo ────────────────────────────────────────────
    // IDs del CMS weCars: "llaves", "manual", "holograma" (del CSV)
    checkMecanico: car.checkMecanico ?? car.mechanicalCheck ?? null,
    llaves:        car.llaves   ?? null,
    manual:        car.manual   ?? null,
    holograma:     car.holograma ?? null,

    // Wix inglés: tireLife / tireCondition / tires | Español: vidaLlantas / llantas
    vidaLlantas: p(car.vidaLlantas, car.tireLife, car.tireCondition, car.tires, car.llantas, car.nivelLlantas, car.tirePct),

    // Wix inglés: cosmeticDetails / aestheticDetails / cosmetic | Español: detallesEsteticos
    detallesEsteticos: p(car.detallesEsteticos, car.cosmeticDetails, car.aestheticDetails, car.cosmetic, car.esteticos, car.detallesEst, car.scratches, car.bodyDamage),

    // ── Notas / descripción ────────────────────────────────────────────
    // IDs del CMS weCars: "notasInternas" y "descripción" (del CSV)
    notas:        p(car.notasInternas, car.notas, car.descripción, car.description, car.notes, car.comments, car.observaciones),
    descripcion:  p(car.descripción,   car.longDescription, car.description, car.notas),
    motor:        p(car.motor,         car.engine, car.engineType),
    placas:       p(car.placas,        car.plates, car.licensePlate),
    condicion:    p(car.condición,     car.condition, car.estado),

    // Wix genera automáticamente "slug" para dynamic pages
    slug: p(car.slug, car.pageUrl, car.url, car.link, car.pageLink),
  };
}

// Normaliza todos los campos de fotos/imágenes de un auto a un array de URLs HTTP.
// Intenta múltiples nombres de campo porque cada instalación de Wix puede variar.
function _normalizarFotosAuto(car) {
  // IDs confirmados del CMS weCars:
  //   image        — foto de portada/exterior (string) → va PRIMERO
  //   gallerymedia — galería completa (array JSON)     → se agrega después

  const toUrl = _wixUrlToHttp;

  // 1. Portada exterior: ID confirmado "image"
  const portadaSrc = car.image || car.imagenes || car.imagen || car.mainImage || car.coverImage;
  const portadaUrl = portadaSrc && !Array.isArray(portadaSrc) ? toUrl(portadaSrc) : null;

  // 2. Galería completa: ID confirmado "gallerymedia"
  const galeriaSrc = car.gallerymedia || car.galeriaDeFotos || car.fotos || car.photos ||
                     car.images || car.gallery || car.media;
  let galeriaUrls = [];
  if (Array.isArray(galeriaSrc) && galeriaSrc.length) {
    galeriaUrls = galeriaSrc.map(toUrl).filter(Boolean);
  }

  // 3. Fotos de interior (al final)
  const interiorSrc = car.fotosInterior;
  let interiorUrls = [];
  if (Array.isArray(interiorSrc) && interiorSrc.length) {
    interiorUrls = interiorSrc.map(toUrl).filter(Boolean);
  }

  // Combinar: portada primero, luego galería (sin duplicar portada), luego interior
  const todas = [];
  if (portadaUrl) todas.push(portadaUrl);
  for (const u of galeriaUrls) {
    if (u !== portadaUrl) todas.push(u);
  }
  for (const u of interiorUrls) {
    if (!todas.includes(u)) todas.push(u);
  }

  // Fallback: si no hay nada todavía, intentar galería como array de strings
  if (!todas.length && Array.isArray(galeriaSrc)) {
    const fallback = galeriaSrc.map(toUrl).filter(Boolean);
    todas.push(...fallback);
  }

  return todas;
}

// ════════════════════════════════════════════════════════════════════════
//  7. CARS_LISTAR  (SOLO LECTURA)
//     Colección: Cars — devuelve autos disponibles con fotos normalizadas.
//     Vendedores: SOLO LECTURA.
// ════════════════════════════════════════════════════════════════════════
async function manejarCarsListar(filtros) {
  try {
    let q = wixData
      .query('Cars')
      .descending('_createdDate')
      .limit(filtros.limit || 80);

    // Excluir vendidos y de baja
    q = q.ne('estatus', 'vendido').ne('estatus', 'Vendido')
         .ne('estatus', 'baja').ne('estatus', 'Baja');

    // Búsqueda por texto: marca, modelo o version
    if (filtros.busqueda && filtros.busqueda.trim()) {
      const termino = filtros.busqueda.trim();
      const porMarca   = wixData.query('Cars').contains('marca',   termino);
      const porModelo  = wixData.query('Cars').contains('modelo',  termino);
      const porVersion = wixData.query('Cars').contains('version', termino);
      q = wixData.query('Cars')
        .or(porMarca, porModelo, porVersion)
        .ne('estatus', 'vendido').ne('estatus', 'Vendido')
        .descending('_createdDate')
        .limit(filtros.limit || 80);
    }

    if (filtros.sucursal) {
      q = q.eq('sucursal', filtros.sucursal);
    }

    const r = await q.find({ suppressAuth: true });

    // Normalizar campos Y fotos antes de enviar al iframe
    const items = r.items.map(_normalizarAuto);

    enviar(IN.CARS_LISTA, { items, total: r.totalCount });

  } catch (err) {
    enviarError('Error al cargar inventario', err.message);
  }
}

// ════════════════════════════════════════════════════════════════════════
//  8. CARS_GET  (SOLO LECTURA)
//     Devuelve el detalle completo de un auto por su _id.
// ════════════════════════════════════════════════════════════════════════
async function manejarCarsGet(carId) {
  try {
    if (!carId) return;
    const raw = await wixData.get('Cars', carId, { suppressAuth: true });
    if (!raw) {
      enviar(IN.CARRO_RESULTADO, { ok: false, error: 'Auto no encontrado' });
      return;
    }
    const car = _normalizarAuto(raw);
    enviar(IN.CARRO_RESULTADO, { ok: true, car });
  } catch (err) {
    enviar(IN.CARRO_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  9. DOC_LISTAR
//     Colección: Docs (o el nombre que uses en tu CMS para documentos)
//     Busca documentos asociados a una entidad (cliente o vehículo).
//     Si la colección no existe aún, devuelve lista vacía sin error.
// ════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
//  9b. DOC_SUBIR
//      Recibe base64 del iframe, lo sube a Wix Media y guarda en Docs.
//      El iframe NO puede acceder a Wix APIs directamente — por eso
//      pasa el archivo en base64 y aquí lo subimos.
// ════════════════════════════════════════════════════════════════════════
async function manejarDocSubir(msg) {
  try {
    const { entidadId, entidadTipo, tipo, base64, fileName, mimeType } = msg;
    if (!entidadId || !base64) {
      enviar(IN.DOC_RESULTADO, { ok: false, error: 'Datos incompletos para subir documento' });
      return;
    }
    // Delegar al backend (.jsw) que sí puede usar wix-media-backend
    const resultado = await subirDocumento({
      entidadId, entidadTipo, tipo, base64, fileName, mimeType,
      vendedorId,
    });
    enviar(IN.DOC_RESULTADO, resultado);
  } catch (err) {
    console.error('[DOC_SUBIR]', err.message);
    enviar(IN.DOC_RESULTADO, { ok: false, error: err.message });
  }
}

async function manejarDocListar(entidadTipo, entidadId) {
  try {
    if (!entidadId) {
      enviar(IN.DOCS_LISTA, { items: [] });
      return;
    }

    const q = await wixData
      .query('Docs')
      .eq('entidadId', entidadId)
      .eq('entidadTipo', entidadTipo || 'cliente')
      .descending('_createdDate')
      .limit(30)
      .find({ suppressAuth: true });

    enviar(IN.DOCS_LISTA, { items: q.items });

  } catch (err) {
    // Docs puede no existir aún — no bloquear al usuario
    enviar(IN.DOCS_LISTA, { items: [] });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  10. CITA_LISTAR
//      Colección: Citas — agenda del vendedor.
//      Graceful degradation: si Citas no existe, retorna lista vacía.
// ════════════════════════════════════════════════════════════════════════
async function manejarCitaListar(filtros) {
  try {
    let q = wixData
      .query('Citas')
      .eq('vendedorId', vendedorId)
      .ascending('fechaHora')
      .limit(30);

    if (filtros.hoy) {
      const hoy    = new Date(); hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
      q = q.ge('fechaHora', hoy).lt('fechaHora', manana);
    }

    const r = await q.find({ suppressAuth: true });
    enviar(IN.CITAS_LISTA, { items: r.items });

  } catch (err) {
    enviar(IN.CITAS_LISTA, { items: [] });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  11. CITA_CREAR
//      Colección: Citas — nueva cita para el vendedor.
// ════════════════════════════════════════════════════════════════════════
async function manejarCitaCrear(datos) {
  try {
    const nueva = {
      clienteId:      datos.clienteId      || '',
      clienteNombre:  datos.clienteNombre  || '',
      vendedorId,
      tipo:           datos.tipo           || 'visita',
      fechaHora:      datos.fechaHora ? new Date(datos.fechaHora) : new Date(),
      hora:           datos.hora           || '',
      lugar:          datos.lugar          || '',
      notas:          datos.notas          || '',
      estatus:        'pendiente',
    };

    const insertada = await wixData.insert('Citas', nueva, { suppressAuth: true });
    enviar(IN.CITA_RESULTADO, { ok: true, cita: insertada });

  } catch (err) {
    enviar(IN.CITA_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  12. CIERRE_CREAR
//      Colección: Cierres — registra la venta y marca el auto como vendido.
// ════════════════════════════════════════════════════════════════════════
async function manejarCierreCrear(datos) {
  try {
    // 1. Insertar en colección Cierres
    const cierre = {
      leadId:        datos.leadId        || '',
      clienteNombre: datos.clienteNombre || '',
      autoId:        datos.autoId        || '',
      autoTexto:     datos.autoTexto     || '',
      precioVenta:   parseFloat(datos.precioVenta)  || 0,
      formaPago:     datos.formaPago     || 'Contado',
      fecha:         datos.fecha ? new Date(datos.fecha) : new Date(),
      banco:         datos.banco         || '',
      notas:         datos.notas         || '',
      comision:      parseFloat(datos.comision)  || 0,
      vendedorId:    datos.vendedorId    || vendedorId,
      estatus:       'Pendiente',
    };

    const insertado = await wixData.insert('Cierres', cierre, { suppressAuth: true });

    // 2. Marcar el auto como vendido en Cars
    if (datos.autoId) {
      try {
        const auto = await wixData.get('Cars', datos.autoId);
        if (auto) {
          await wixData.update('Cars', {
            _id:          auto._id,
            estatusVenta: 'Vendido',
          }, { suppressAuth: true });
        }
      } catch (eAuto) {
        console.warn('[CierreCrear] No se pudo actualizar estatus del auto:', eAuto.message);
      }
    }

    // 3. Actualizar lead a Ganado
    if (datos.leadId) {
      try {
        await wixData.update('ALeads', {
          _id:    datos.leadId,
          etapa:  'Ganado',
          estatus:'Ganado',
          ultimaActividad: new Date().toISOString(),
        }, { suppressAuth: true });
      } catch (eLead) {
        console.warn('[CierreCrear] No se pudo actualizar lead:', eLead.message);
      }
    }

    // 4. Actividad automática
    await wixData.insert('Activities', {
      clienteId:   datos.leadId || '',
      vendedorId,
      autor:       vendedorId,
      tipo:        'cierre',
      descripcion: `Venta cerrada: ${datos.autoTexto || ''} · $${Number(datos.precioVenta||0).toLocaleString('es-MX')} · ${datos.formaPago||''}`,
      fecha:       new Date().toISOString(),
      resultado:   'positivo',
    }, { suppressAuth: true });

    enviar(IN.CIERRE_RESULTADO, { ok: true, cierre: insertado });
    _notificarActualizacion('Cierres', insertado._id, 'crear');

  } catch (err) {
    console.error('[CierreCrear]', err);
    enviar(IN.CIERRE_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  13. CREDITO_TOKEN_GENERAR
//      Genera un token de un solo uso (72h) para que el cliente llene
//      la solicitud desde su celular vía link personalizado.
// ════════════════════════════════════════════════════════════════════════
async function manejarCreditoTokenGenerar(msg) {
  try {
    const resultado = await generarTokenCredito({
      leadId:        msg.leadId        || '',
      vendedorId:    msg.vendedorId    || vendedorId,
      leadNombre:    msg.leadNombre    || '',
      autoInteres:   msg.autoInteres   || '',
      precioRef:     msg.precioRef     || 0,
      autoInteresId: msg.autoInteresId || '',
    });
    enviar(IN.CREDITO_TOKEN_RESULTADO, resultado);
  } catch (err) {
    console.error('[CreditoTokenGenerar]', err);
    enviar(IN.CREDITO_TOKEN_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  14. CREDITO_CREAR
//      El vendedor llena el form directamente — guarda en CreditApplications
//      y crea el registro en Creditos.
// ════════════════════════════════════════════════════════════════════════
async function manejarCreditoCrear(msg) {
  try {
    const datos = { ...msg };
    delete datos.type;

    const nombre = [datos.nombres, datos.apPat, datos.apMat].filter(Boolean).join(' ');
    const solicitud = await wixData.insert('CreditApplications', {
      ...datos,
      nombre,
      vendedorId,
      origen: 'vendedor',
      fecha:  new Date().toISOString(),
    }, { suppressAuth: true });

    const folio = `WC-${new Date().getFullYear()}-${solicitud._id.slice(-5).toUpperCase()}`;

    const credito = await wixData.insert('Creditos', {
      folio,
      leadId:         datos.clienteId     || '',
      vendedorId,
      solicitudId:    solicitud._id,
      vehiculoId:     datos.vehiculo       || '',
      precioVehiculo: datos.precioVehiculo || 0,
      engancheMonto:  datos.engancheMonto  || 0,
      plazoMeses:     datos.plazoMeses     || 0,
      financiera:     datos.financiera     || '',
      estado:         'solicitud_enviada',
      origen:         'vendedor',
      fechaSolicitud: new Date().toISOString(),
    }, { suppressAuth: true });

    // Actualizar ALeads
    if (datos.clienteId) {
      try {
        const lead = await wixData.get('ALeads', datos.clienteId);
        if (lead) {
          await wixData.update('ALeads', {
            ...lead,
            creditoActivoId: credito._id,
            creditoFolio:    folio,
          }, { suppressAuth: true });
        }
      } catch (_) {}
    }

    enviar(IN.CREDITO_RESULTADO, { ok: true, folio, creditoId: credito._id });
  } catch (err) {
    console.error('[CreditoCrear]', err);
    enviar(IN.CREDITO_RESULTADO, { ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  UTILIDAD: notificar actualización realtime a otros paneles abiertos
// ════════════════════════════════════════════════════════════════════════
function _notificarActualizacion(coleccion, id, accion) {
  try {
    publish(CANAL_RT, {
      type:      IN.REALTIME_UPDATE,
      coleccion,
      id,
      accion,
      _from:     'vendedores',
    });
  } catch (e) { /* no crítico */ }
}

// ════════════════════════════════════════════════════════════════════════
//  CAMPOS CMS — REFERENCIA DE MAPEO
//  ─────────────────────────────────────────────────────────────────────
//  ALeads:
//    nombre, email, telefono, telefono2, fuente, ciudad, direccion,
//    interes, presupuesto, estatus, vendedorId, notas, fecha,
//    ingresoMensual, rfc, curp, situacionLaboral, engancheDisponible,
//    comprobantesIngreso, historialCredito, ultimaActividad,
//    autoPresupuesto, tipoCompra, enganche, autoPartePago
//
//  Activities:
//    clienteId, vendedorId, autor, tipo, descripcion,
//    fecha, resultado, proximoPaso
//
//  Cars (solo lectura):
//    marca, modelo, año, version, color, km, precio, precioContado,
//    estatus, combustible, transmision, carroceria, descripcion, fotos,
//    vin, niv, numeroSerie, serie, consecutivo, folioInterno, folio,
//    ubicacion, sucursal, lote, checkMecanico, vidaLlantas,
//    detallesEsteticos, tipoFactura, garantia, notas
//
//  Usuarios:
//    email, nombre, rol, sucursal
//
//  Citas:
//    clienteId, clienteNombre, vendedorId, tipo, fechaHora,
//    hora, lugar, notas, estatus
//
//  Docs:
//    entidadId, entidadTipo, slotId, slotLabel, url, fileName,
//    mimeType, subidoPor, _createdDate
// ════════════════════════════════════════════════════════════════════════
