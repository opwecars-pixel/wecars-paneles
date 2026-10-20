// paginas-paneles/pagina-fi.js
// Panel F&I v2 — Velo page code
import wixUsers from 'wix-users';
import wixData  from 'wix-data';
import {
  obtenerDatosFI,
  actualizarCredito,
  guardarDocumentosFI,
} from 'backend/fi-creditos.jsw';

const ROLES_PERMITIDOS = ['fi', 'finanzas', 'gerencia', 'administracion'];

const OUT = {
  DATOS_SOLICITAR: 'wecars-fi-solicitar',
  CREDITO_EDITAR:  'wecars-fi-credito-editar',
  DOCS_GUARDAR:    'wecars-fi-docs-guardar',
};

const IN = {
  DATOS:             'wecars-fi-datos',
  CREDITO_RESULTADO: 'wecars-fi-credito-resultado',
  DOCS_RESULTADO:    'wecars-fi-docs-resultado',
};

let _vendedores = [];
let _email      = '';
let _rol        = 'F&I';

$w.onReady(async () => {
  const user = wixUsers.currentUser;

  try { _email = await user.getEmail(); } catch (_) { _email = ''; }

  try {
    const roles = await user.getRoles();
    _rol = roles[0]?.name || 'F&I';
  } catch (_) {}

  try {
    const res = await wixData.query('Vendedores').limit(200).find({ suppressAuth: true });
    _vendedores = res.items || [];
  } catch (_) { _vendedores = []; }

  $w('#htmlFI').onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case OUT.DATOS_SOLICITAR: await enviarDatos(); break;
      case OUT.CREDITO_EDITAR:  await manejarCreditoEditar(msg); break;
      case OUT.DOCS_GUARDAR:    await manejarDocsGuardar(msg); break;
    }
  });

  await enviarDatos();
});

async function enviarDatos() {
  try {
    const datos = await obtenerDatosFI();
    enviar(IN.DATOS, {
      ...datos,
      vendedores:   _vendedores,
      emailActual:  _email,
      nombreActual: _email.split('@')[0] || 'Usuario',
      rolActual:    _rol,
    });
  } catch (err) {
    console.error('[FI] Error cargando datos:', err);
    enviar(IN.DATOS, {
      clientes: [], creditos: [], vendedores: [],
      emailActual: _email, nombreActual: _email.split('@')[0] || 'Usuario', rolActual: _rol,
    });
  }
}

async function manejarCreditoEditar(msg) {
  if (!msg.id || !msg.datos) return;
  try {
    const res = await actualizarCredito(msg.id, msg.datos);
    enviar(IN.CREDITO_RESULTADO, res);
  } catch (err) {
    enviar(IN.CREDITO_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarDocsGuardar(msg) {
  if (!msg.id || !msg.datos?.documentosFI) return;
  try {
    const res = await guardarDocumentosFI(msg.id, msg.datos.documentosFI);
    enviar(IN.DOCS_RESULTADO, res);
  } catch (err) {
    enviar(IN.DOCS_RESULTADO, { ok: false, error: String(err) });
  }
}

function enviar(tipo, datos) {
  try { $w('#htmlFI').postMessage({ type: tipo, ...datos }); } catch (_) {}
}
