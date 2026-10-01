// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/clientes.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  clientes.jsw
//  Pega SOLO este bloque en ese archivo nuevo (no en ninguna página).
//  Todas las páginas que guardan leads/créditos/consignas usan esta misma
//  función para no repetir la lógica 6 veces.
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsersBackend from 'wix-users-backend';
import { obtenerPerfil } from 'backend/permisos.jsw';
import { notificarLeadNuevo } from 'backend/notificaciones.jsw';

function normalizePhone(v) {
  let tel = String(v || '').replace(/\D/g, '');
  // Quitar prefijo internacional mexicano si el resultado excede 10 dígitos.
  // +52 477... → 52477... (12 dígitos) → 477... (10 dígitos)
  // +521 477... → 521477... (13 dígitos) → 477... (10 dígitos)
  if (tel.length === 13 && tel.startsWith('521')) tel = tel.slice(3);
  else if (tel.length === 12 && tel.startsWith('52'))  tel = tel.slice(2);
  return tel;
}

// Busca un cliente existente por teléfono; si no existe, lo crea. Regresa
// { clienteId, debug } — clienteId para enlazarlo al lead/crédito/consigna,
// y debug con el detalle de qué pasó (incluyendo errores), porque los
// console.error de ESTE archivo corren en el servidor de Wix y no se ven
// en la consola del navegador — por eso regresamos el debug al front para
// poder verlo ahí mismo.
// "origen" (Facebook, Instagram, TikTok, Google, Marketplace, Referido,
// Sitio web, Otro) solo se guarda cuando el cliente se CREA por primera
// vez — nunca se sobreescribe en visitas/contactos posteriores, para
// respetar la atribución de primer toque (el canal por el que en verdad
// llegó, no el último formulario que llenó).
export function findOrCreateCliente(nombre, telefono, correo, origen, vendedorEmail, vendedorNombre) {
  const tel = normalizePhone(telefono);
  if (!tel) return Promise.resolve({ clienteId: null, debug: 'sin teléfono, no se pudo identificar cliente' });

  // Buscar por todas las variantes del teléfono para evitar duplicados cuando el
  // número fue guardado con o sin prefijo internacional (52/521).
  const variantes = [tel];
  if (tel.length === 10) { variantes.push('52' + tel); variantes.push('521' + tel); }

  const SA = { suppressAuth: true };
  return wixData.query('ClientRecords')
    .hasSome('telefono', variantes)
    .limit(1)
    .find(SA)
    .then(results => {
      if (results.items.length) {
        const cliente = results.items[0];
        const cambios = Object.assign({}, cliente, { ultimaActividad: new Date() });
        if (!cliente.nombre && nombre) cambios.nombre = nombre;
        if (!cliente.correo && correo) cambios.correo = correo;
        // Normalizar el teléfono al formato limpio de 10 dígitos si estaba con prefijo
        if (cliente.telefono !== tel) cambios.telefono = tel;
        // Asignar vendedor solo si el registro no tenía uno (primer toque)
        if (!cliente.vendedorAsignado && vendedorEmail) {
          cambios.vendedorAsignado = vendedorEmail;
          cambios.vendedorNombre   = vendedorNombre || '';
        }
        return wixData.update('ClientRecords', cambios, SA).then(actualizado => ({ clienteId: actualizado._id, debug: 'cliente existente actualizado' }));
      }
      return wixData.insert('ClientRecords', {
        nombre:           nombre          || '',
        telefono:         tel,
        correo:           correo          || '',
        estatus:          'Nuevo',
        estatusExpediente:'nuevo_lead',
        vendedorAsignado: vendedorEmail   || '',
        vendedorNombre:   vendedorNombre  || '',
        notas:            '',
        origen:           origen          || 'Sitio web',
        ultimaActividad:  new Date(),
        fechaLlegada:     new Date(),
      }, SA).then(creado => {
        notificarLeadNuevo(creado).catch(err => console.error('[Clientes] Error avisando lead nuevo:', err));
        return { clienteId: creado._id, debug: 'cliente nuevo creado' };
      });
    })
    .catch(err => {
      return { clienteId: null, debug: 'ERROR: ' + (err && err.message ? err.message : JSON.stringify(err)) };
    });
}

// Crea un ClientRecord verificando primero que no exista duplicado por teléfono.
// Devuelve { ok, yaExiste, cliente, vendedorNombre } para que el front pueda
// mostrar "Ya es cliente de [vendedor]" en lugar de crear un duplicado.
export function crearClienteSeguro(datos) {
  const tel = normalizePhone(datos.telefono);
  if (!tel) return Promise.resolve({ ok: false, error: 'Teléfono requerido' });

  const variantes = [tel];
  if (tel.length === 10) { variantes.push('52' + tel); variantes.push('521' + tel); }

  const SA = { suppressAuth: true };
  return wixData.query('ClientRecords')
    .hasSome('telefono', variantes)
    .limit(1)
    .find(SA)
    .then(results => {
      if (results.items.length) {
        const existente = results.items[0];
        return {
          ok: false,
          yaExiste: true,
          clienteId: existente._id,
          cliente: existente,
          vendedorNombre: existente.vendedorNombre || existente.vendedorAsignado || 'Sin asignar',
          mensaje: `Este teléfono ya está registrado${existente.vendedorAsignado ? ' — cliente de ' + (existente.vendedorNombre || existente.vendedorAsignado) : ''}`
        };
      }
      const nuevo = Object.assign({
        estatus: 'Nuevo',
        ultimaActividad: new Date(),
        origen: 'Manual',
      }, datos, { telefono: tel });
      delete nuevo._id;
      return wixData.insert('ClientRecords', nuevo, SA)
        .then(creado => {
          notificarLeadNuevo(creado).catch(() => {});
          return { ok: true, yaExiste: false, clienteId: creado._id, cliente: creado };
        });
    })
    .catch(err => ({ ok: false, error: String(err && err.message ? err.message : err) }));
}

// C2: Cambia el auto asignado a un cliente. Si el cliente estaba en estado
// 'apartado', libera el auto anterior (Cars.estatus → 'disponible') antes
// de asignar el nuevo. Solo el vendedor asignado o Gerencia pueden hacer esto.
export async function cambiarUnidadCliente(clienteId, nuevoAutoId) {
  const SA = { suppressAuth: true };
  const email = await wixUsersBackend.currentUser.getEmail();
  if (!email) throw new Error('No autenticado');
  const perfil = await obtenerPerfil(email);
  const rolesPermitidos = ['vendedor', 'Gerencia', 'Administración', 'Admin'];
  if (!rolesPermitidos.includes(perfil && perfil.rol)) throw new Error('Sin permiso');

  const cliente = await wixData.get('ClientRecords', clienteId, SA);
  if (!cliente) throw new Error('Cliente no encontrado');

  // Solo el vendedor asignado o roles superiores
  if (perfil.rol === 'vendedor' && cliente.vendedorAsignado !== email) {
    throw new Error('Solo el vendedor asignado puede cambiar la unidad');
  }

  const autoAnteriorId = cliente.autoId;
  const estadosQueBloquean = ['apartado', 'credito_aprobado', 'firma_contrato'];

  // Liberar auto anterior si existe y el cliente estaba en estado que lo bloqueaba
  if (autoAnteriorId && autoAnteriorId !== nuevoAutoId && estadosQueBloquean.includes(cliente.estatusExpediente)) {
    const autoAnterior = await wixData.get('Cars', autoAnteriorId, SA).catch(() => null);
    if (autoAnterior && autoAnterior.estatus === 'apartado') {
      await wixData.update('Cars', Object.assign({}, autoAnterior, { estatus: 'disponible' }), SA);
    }
  }

  // Marcar nuevo auto como apartado si aplica
  if (nuevoAutoId && estadosQueBloquean.includes(cliente.estatusExpediente)) {
    const nuevoAuto = await wixData.get('Cars', nuevoAutoId, SA).catch(() => null);
    if (nuevoAuto) {
      await wixData.update('Cars', Object.assign({}, nuevoAuto, { estatus: 'apartado' }), SA);
    }
  }

  // Actualizar el cliente
  const clienteActualizado = Object.assign({}, cliente, {
    autoId: nuevoAutoId || null,
    ultimaActividad: new Date(),
  });
  const resultado = await wixData.update('ClientRecords', clienteActualizado, SA);
  return { ok: true, cliente: resultado };
}

// Elimina un ClientRecord. Solo roles Administración / Gerencia / Admin.
export async function eliminarCliente(clienteId) {
  const SA = { suppressAuth: true };
  const email = await wixUsersBackend.currentUser.getEmail();
  if (!email) throw new Error('No autenticado');
  const perfil = await obtenerPerfil(email);
  const rolesPermitidos = ['Administración', 'Gerencia', 'Admin'];
  if (!rolesPermitidos.includes(perfil && perfil.rol)) {
    throw new Error('Sin permiso para eliminar contactos');
  }
  // M5: guardar snapshot del cliente antes de eliminarlo para trazabilidad
  const clienteSnapshot = await wixData.get('ClientRecords', clienteId, SA).catch(() => null);
  await wixData.remove('ClientRecords', clienteId, SA);
  // Log en Activities — no bloqueamos si falla
  if (clienteSnapshot) {
    wixData.insert('Activities', {
      tipo: 'cliente_eliminado',
      clienteId: clienteId,
      entidadTipo: 'cliente',
      entidadId: clienteId,
      vendedorEmail: email,
      fecha: new Date(),
      metadata: {
        nombre: clienteSnapshot.nombre || '',
        telefono: clienteSnapshot.telefono || '',
        correo: clienteSnapshot.correo || '',
        estatusExpediente: clienteSnapshot.estatusExpediente || '',
        vendedorAnterior: clienteSnapshot.vendedorAsignado || '',
        origen: clienteSnapshot.origen || '',
      },
    }, SA).catch(() => {});
  }
  return { ok: true };
}
