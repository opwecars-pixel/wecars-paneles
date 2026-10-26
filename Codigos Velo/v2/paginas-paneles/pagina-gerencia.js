// paginas-paneles/pagina-gerencia.js
// Panel Gerencia v2 — Velo page code
import wixUsers from 'wix-users';
import {
  obtenerDatosGerencia,
  actualizarMetas,
  actualizarDatosLead,
  registrarEgreso,
  actualizarComision,
  actualizarCredito,
  registrarPago,
  crearTarea,
  actualizarTarea,
  crearSolicitudAprobacion,
  firmarAprobacion,
  rechazarAprobacion,
} from 'backend/gerencia-data.jsw';

const ROLES_PERMITIDOS = ['gerencia', 'administracion'];

const OUT = {
  DATOS_SOLICITAR:    'wecars-gerencia-solicitar',
  META_GUARDAR:       'wecars-gerencia-meta-guardar',
  LEAD_ACTUALIZAR:    'wecars-gerencia-lead-actualizar',
  CREDITO_EDITAR:     'wecars-gerencia-credito-editar',
  COMISION_EDITAR:    'wecars-gerencia-comision-editar',
  EGRESO_REGISTRAR:   'wecars-gerencia-egreso-registrar',
  PAGO_REGISTRAR:     'wecars-gerencia-pago-registrar',
  TAREA_CREAR:        'wecars-gerencia-tarea-crear',
  TAREA_ACTUALIZAR:   'wecars-gerencia-tarea-actualizar',
  APROBACION_CREAR:   'wecars-gerencia-aprobacion-crear',
  APROBACION_FIRMAR:  'wecars-gerencia-aprobacion-firmar',
  APROBACION_RECHAZAR:'wecars-gerencia-aprobacion-rechazar',
};

const IN = {
  DATOS:               'wecars-gerencia-datos',
  META_RESULTADO:      'wecars-gerencia-meta-resultado',
  LEAD_ACTUALIZADO:    'wecars-gerencia-lead-actualizado',
  CREDITO_RESULTADO:   'wecars-gerencia-credito-resultado',
  COMISION_RESULTADO:  'wecars-gerencia-comision-resultado',
  EGRESO_RESULTADO:    'wecars-gerencia-egreso-resultado',
  PAGO_RESULTADO:      'wecars-gerencia-pago-resultado',
  TAREA_RESULTADO:     'wecars-gerencia-tarea-resultado',
  APROBACION_RESULTADO:'wecars-gerencia-aprobacion-resultado',
};

let _email = '';
let _rol   = 'Gerencia';

$w.onReady(async () => {
  const user = wixUsers.currentUser;

  try { _email = await user.getEmail(); } catch (_) { _email = ''; }

  try {
    const roles = await user.getRoles();
    _rol = roles[0]?.name || 'Gerencia';
  } catch (_) {}

  $w('#htmlGerencia').onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case OUT.DATOS_SOLICITAR:  await enviarDatos(); break;
      case OUT.META_GUARDAR:     await manejarMetaGuardar(msg); break;
      case OUT.LEAD_ACTUALIZAR:  await manejarLeadActualizar(msg); break;
      case OUT.CREDITO_EDITAR:   await manejarCreditoEditar(msg); break;
      case OUT.COMISION_EDITAR:  await manejarComisionEditar(msg); break;
      case OUT.EGRESO_REGISTRAR: await manejarEgresoRegistrar(msg); break;
      case OUT.PAGO_REGISTRAR:   await manejarPagoRegistrar(msg); break;
      case OUT.TAREA_CREAR:         await manejarTareaCrear(msg); break;
      case OUT.TAREA_ACTUALIZAR:    await manejarTareaActualizar(msg); break;
      case OUT.APROBACION_CREAR:    await manejarAprobacionCrear(msg); break;
      case OUT.APROBACION_FIRMAR:   await manejarAprobacionFirmar(msg); break;
      case OUT.APROBACION_RECHAZAR: await manejarAprobacionRechazar(msg); break;
    }
  });

  await enviarDatos();
});

async function enviarDatos() {
  try {
    const datos = await obtenerDatosGerencia();
    enviar(IN.DATOS, {
      ...datos,
      emailActual:  _email,
      nombreActual: _email.split('@')[0] || 'Gerente',
      rolActual:    _rol,
    });
  } catch (err) {
    console.error('[Gerencia] Error cargando datos:', err);
    enviar(IN.DATOS, {
      clientes: [], creditos: [], vendedores: [], cars: [], egresos: [], comisiones: [],
      emailActual: _email, nombreActual: _email.split('@')[0] || 'Gerente', rolActual: _rol,
    });
  }
}

async function manejarLeadActualizar(msg) {
  if (!msg.leadId) return;
  try {
    const res = await actualizarDatosLead(msg.leadId, msg.campos || {});
    enviar(IN.LEAD_ACTUALIZADO, res);
  } catch (err) {
    enviar(IN.LEAD_ACTUALIZADO, { ok: false, error: String(err) });
  }
}

async function manejarMetaGuardar(msg) {
  if (!msg.vendedores?.length) return;
  try {
    const res = await actualizarMetas(msg.vendedores);
    enviar(IN.META_RESULTADO, res);
  } catch (err) {
    enviar(IN.META_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarCreditoEditar(msg) {
  if (!msg.id) return;
  try {
    const res = await actualizarCredito(msg.id, msg.datos || {});
    enviar(IN.CREDITO_RESULTADO, res);
  } catch (err) {
    enviar(IN.CREDITO_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarComisionEditar(msg) {
  if (!msg.id) return;
  try {
    const res = await actualizarComision(msg.id, msg.datos || {});
    enviar(IN.COMISION_RESULTADO, res);
  } catch (err) {
    enviar(IN.COMISION_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarEgresoRegistrar(msg) {
  try {
    const res = await registrarEgreso(msg);
    enviar(IN.EGRESO_RESULTADO, res);
  } catch (err) {
    enviar(IN.EGRESO_RESULTADO, { ok: false, error: String(err), _tmp: msg._tmp });
  }
}

async function manejarPagoRegistrar(msg) {
  try {
    const res = await registrarPago(msg.datos || {});
    enviar(IN.PAGO_RESULTADO, res);
  } catch (err) {
    enviar(IN.PAGO_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarTareaCrear(msg) {
  try {
    const res = await crearTarea(msg.datos || {});
    enviar(IN.TAREA_RESULTADO, res);
  } catch (err) {
    enviar(IN.TAREA_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarTareaActualizar(msg) {
  if (!msg.id) return;
  try {
    const res = await actualizarTarea(msg.id, msg.datos || {});
    enviar(IN.TAREA_RESULTADO, res);
  } catch (err) {
    enviar(IN.TAREA_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarAprobacionCrear(msg) {
  try {
    const res = await crearSolicitudAprobacion(msg.datos || {});
    enviar(IN.APROBACION_RESULTADO, res);
  } catch (err) {
    enviar(IN.APROBACION_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarAprobacionFirmar(msg) {
  if (!msg.id) return;
  try {
    const res = await firmarAprobacion(msg.id, msg.tipoFirma, msg.usuarioNombre, msg.usuarioEmail);
    enviar(IN.APROBACION_RESULTADO, res);
  } catch (err) {
    enviar(IN.APROBACION_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarAprobacionRechazar(msg) {
  if (!msg.id) return;
  try {
    const res = await rechazarAprobacion(msg.id, msg.usuarioNombre, msg.notas);
    enviar(IN.APROBACION_RESULTADO, res);
  } catch (err) {
    enviar(IN.APROBACION_RESULTADO, { ok: false, error: String(err) });
  }
}

function enviar(tipo, datos) {
  try { $w('#htmlGerencia').postMessage({ type: tipo, ...datos }); } catch (_) {}
}
