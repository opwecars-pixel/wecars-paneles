// paginas-paneles/pagina-gerencia.js
// Panel Gerencia v2 — Velo page code
import wixUsers from 'wix-users';
import {
  obtenerDatosGerencia,
  actualizarMetas,
  actualizarDatosLead,
} from 'backend/gerencia-data.jsw';

const ROLES_PERMITIDOS = ['gerencia', 'administracion'];

const OUT = {
  DATOS_SOLICITAR:  'wecars-gerencia-solicitar',
  META_GUARDAR:     'wecars-gerencia-meta-guardar',
  LEAD_ACTUALIZAR:  'wecars-gerencia-lead-actualizar',
};

const IN = {
  DATOS:             'wecars-gerencia-datos',
  META_RESULTADO:    'wecars-gerencia-meta-resultado',
  LEAD_ACTUALIZADO:  'wecars-gerencia-lead-actualizado',
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

function enviar(tipo, datos) {
  try { $w('#htmlGerencia').postMessage({ type: tipo, ...datos }); } catch (_) {}
}
