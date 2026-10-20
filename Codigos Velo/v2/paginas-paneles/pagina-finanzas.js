// paginas-paneles/pagina-finanzas.js
// Panel Finanzas v2 — Velo page code
import wixUsers from 'wix-users';
import wixData  from 'wix-data';
import {
  obtenerDatosFinanzas,
  actualizarClienteFinanzas,
  actualizarCredito,
  actualizarComision,
  registrarPago,
  registrarEgreso,
  actualizarDatosCar,
} from 'backend/finanzas-data.jsw';

const ROLES_PERMITIDOS = ['finanzas', 'gerencia', 'administracion'];

const OUT = {
  DATOS_SOLICITAR:  'wecars-finanzas-solicitar',
  CLIENTE_EDITAR:   'wecars-cliente-actualizar',
  CAR_EDITAR:       'wecars-car-editar-fin',
  CREDITO_EDITAR:   'wecars-credito-editar',
  COMISION_EDITAR:  'wecars-comision-editar',
  PAGO_REGISTRAR:   'wecars-pago-registrado',
  EGRESO_REGISTRAR: 'wecars-egreso-registrado',
};

const IN = {
  DATOS:               'wecars-finanzas',
  PAGO_RESULTADO:      'wecars-pago-resultado',
  COMISION_EDITADA:    'wecars-comision-editada',
  CREDITO_RESULTADO:   'wecars-credito-resultado',
  CLIENTE_ACTUALIZADO: 'wecars-cliente-actualizado-fin',
  CAR_RESULTADO:       'wecars-car-resultado-fin',
  EGRESO_RESULTADO:    'wecars-egreso-resultado',
};

let _vendedores = [];
let _email      = '';
let _rol        = 'Finanzas';

$w.onReady(async () => {
  const user = wixUsers.currentUser;

  // Obtener email de forma segura
  try { _email = await user.getEmail(); } catch (_) { _email = ''; }

  // Verificar rol (no bloquear si falla — algunos roles no están configurados)
  try {
    const roles = await user.getRoles();
    const rol = roles[0];
    _rol = rol?.name || 'Finanzas';
    const tieneAcceso = roles.some(r => ROLES_PERMITIDOS.includes((r.name || '').toLowerCase()));
    if (!tieneAcceso) console.warn('[Finanzas] Rol sin acceso configurado:', _rol);
  } catch (_) { /* continuar sin verificar rol */ }

  // Cargar lista de vendedores
  try {
    const res = await wixData.query('Vendedores').limit(200).find({ suppressAuth: true });
    _vendedores = res.items || [];
  } catch (_) { _vendedores = []; }

  // Escuchar mensajes del iframe
  $w('#htmlFinanzas').onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case OUT.DATOS_SOLICITAR:  await enviarDatos(); break;
      case OUT.CLIENTE_EDITAR:   await manejarClienteEditar(msg); break;
      case OUT.CAR_EDITAR:       await manejarCarEditar(msg); break;
      case OUT.CREDITO_EDITAR:   await manejarCreditoEditar(msg); break;
      case OUT.COMISION_EDITAR:  await manejarComisionEditar(msg); break;
      case OUT.PAGO_REGISTRAR:   await manejarPagoRegistrar(msg); break;
      case OUT.EGRESO_REGISTRAR: await manejarEgresoRegistrar(msg); break;
    }
  });

  // Enviar datos al cargar
  await enviarDatos();
});

// ── Enviar datos completos ─────────────────────────────────────────────────
async function enviarDatos() {
  try {
    const datos = await obtenerDatosFinanzas();
    enviar(IN.DATOS, {
      ...datos,
      vendedores:   _vendedores,
      emailActual:  _email,
      nombreActual: _email.split('@')[0] || 'Usuario',
      rolActual:    _rol,
    });
  } catch (err) {
    console.error('[Finanzas] Error cargando datos:', err);
    // Enviar estructura vacía para que el panel no quede en blanco
    enviar(IN.DATOS, {
      clientes: [], creditos: [], pagos: [], comisiones: [], egresos: [],
      vendedores: [], emailActual: _email, nombreActual: _email.split('@')[0] || 'Usuario', rolActual: _rol,
    });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────
async function manejarClienteEditar(msg) {
  if (!msg.id || !msg.datos) return;
  try {
    const res = await actualizarClienteFinanzas(msg.id, msg.datos);
    enviar(IN.CLIENTE_ACTUALIZADO, res);
  } catch (err) {
    enviar(IN.CLIENTE_ACTUALIZADO, { ok: false, error: String(err) });
  }
}

async function manejarCarEditar(msg) {
  if (!msg.autoId || !msg.datos) return;
  try {
    const res = await actualizarDatosCar(msg.autoId, msg.datos);
    enviar(IN.CAR_RESULTADO, res);
  } catch (err) {
    enviar(IN.CAR_RESULTADO, { ok: false, error: String(err) });
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

async function manejarComisionEditar(msg) {
  if (!msg.id || !msg.datos) return;
  try {
    const res = await actualizarComision(msg.id, msg.datos);
    enviar(IN.COMISION_EDITADA, res);
  } catch (err) {
    enviar(IN.COMISION_EDITADA, { ok: false, error: String(err) });
  }
}

async function manejarPagoRegistrar(msg) {
  try {
    const res = await registrarPago(msg);
    enviar(IN.PAGO_RESULTADO, res);
  } catch (err) {
    enviar(IN.PAGO_RESULTADO, { ok: false, error: String(err) });
  }
}

async function manejarEgresoRegistrar(msg) {
  try {
    const res = await registrarEgreso(msg);
    enviar(IN.EGRESO_RESULTADO, res);
  } catch (err) {
    console.error('[Finanzas] Error registrando egreso:', err);
    enviar(IN.EGRESO_RESULTADO, { ok: false, error: String(err) });
  }
}

// ── Enviar al iframe ───────────────────────────────────────────────────────
function enviar(tipo, datos) {
  try { $w('#htmlFinanzas').postMessage({ type: tipo, ...datos }); } catch (_) {}
}
