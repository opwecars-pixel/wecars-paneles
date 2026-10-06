// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/notificaciones.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" (Nuevo archivo) → nómbralo exactamente:
//  notificaciones.jsw
//  Pega SOLO este bloque en ese archivo nuevo (no en ninguna página).
//
//  PASO MANUAL ÚNICO antes de publicar (una sola vez, en el Editor de
//  Wix): ve a Automatizaciones/Marketing → "Correos disparados"
//  (Triggered Emails) → Crear correo → tipo Personalizado. Ponle un
//  asunto genérico como "Notificación weCars Bajío" y agrega 3 campos
//  dinámicos en el cuerpo: {{titulo}}, {{mensaje}} y {{link}}. Al
//  guardarlo, Wix te muestra su "Email ID" (algo como
//  "a1b2c3d4-...") — cópialo y pégalo abajo en TRIGGERED_EMAIL_ID.
//  Ese MISMO correo se reutiliza para los 3 avisos de abajo (lead
//  nuevo, auto cerrado/apartado, factura subida) — solo cambia el
//  texto que llega en las variables, así no hay que crear un correo
//  distinto por cada caso.
//
//  Si algún día quieres mandar el aviso también por WhatsApp en vez de
//  solo correo, este es el único archivo que habría que tocar — las 3
//  funciones de abajo (notificarLeadNuevo, notificarAutoEstatus,
//  notificarDocumentoFactura) son el punto central de todos los avisos.
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { contacts, triggeredEmails } from 'wix-crm-backend';

// ─── CONFIGURACIÓN RÁPIDA ─────────────────────────────────────────────────
// Pon aquí el correo del dueño/gerente. Es el fallback SIEMPRE — aunque no
// haya nadie en la colección Usuarios, este correo siempre recibirá el aviso.
const CORREO_OWNER       = 'rodrigocastillo.9718@gmail.com';
const NOMBRE_OWNER       = 'Rodrigo';

// ID del Triggered Email creado en Wix (Automatizaciones → Correos disparados).
// Ya está configurado; si lo recreás, actualizá este ID.
const TRIGGERED_EMAIL_ID = '4c8cb294-f452-4e76-8a7a-65419ec14a21';

function normalizarEmail(v) {
  return String(v || '').toLowerCase().trim();
}

// emailContact() manda el correo a un contactId de Wix, no a un texto de
// correo directamente — por eso primero hay que encontrar (o crear, la
// primera vez) el Contacto que corresponde a cada correo interno del
// equipo.
function obtenerOCrearContacto(email, nombre) {
  const correo = normalizarEmail(email);
  return contacts.queryContacts()
    .eq('info.emails.email', correo)
    .find()
    .then((resultado) => {
      if (resultado.items.length) return resultado.items[0]._id;
      return contacts.createContact({
        name: { first: nombre || correo },
        emails: [{ tag: 'WORK', email: correo, primary: true }],
      }, { allowDuplicates: false }).then((contacto) => contacto._id);
    });
}

function enviarAviso(email, nombre, variables) {
  if (!TRIGGERED_EMAIL_ID || TRIGGERED_EMAIL_ID.indexOf('PEGA_AQUI') === 0) {
    console.warn('[Notificaciones] Falta configurar TRIGGERED_EMAIL_ID (ver instrucciones arriba) — no se mandó el aviso.');
    return Promise.resolve();
  }
  return obtenerOCrearContacto(email, nombre)
    .then((contactId) => triggeredEmails.emailContact(TRIGGERED_EMAIL_ID, contactId, { variables }))
    .catch((err) => console.error('[Notificaciones] Error mandando aviso a', email, err));
}

// Correos activos de un rol — "activo" solo se descarta cuando es
// explícitamente false, para no perder de vista a empleados antiguos sin
// ese campo todavía llenado.
function destinatariosPorRol(rol) {
  return wixData.query('Usuarios')
    .eq('rol', rol)
    .limit(200)
    .find()
    .then((resultado) => resultado.items.filter((u) => u.activo !== false && u.email))
    .catch(() => []);
}

// Un lead nuevo cae en la bolsa "Sin asignar". Se avisa a TODOS los
// vendedores activos, a Gerencia, y siempre al owner como fallback.
export function notificarLeadNuevo(cliente) {
  const vars = {
    titulo:  'Nuevo lead sin asignar — weCars Bajío',
    mensaje: [
      `👤 ${cliente.nombre || 'Sin nombre'}`,
      `📱 ${cliente.telefono || 'Sin teléfono'}`,
      cliente.correo  ? `✉️ ${cliente.correo}`  : '',
      cliente.interes ? `🚘 Interés: ${cliente.interes}` : '',
      `📍 Origen: ${cliente.pagina || cliente.origen || 'Sitio web'}`,
      ``,
      `Entra al panel para asignártelo.`,
    ].filter(Boolean).join('\n'),
    link: 'https://www.wecarsbajio.com/panel-vendedores',
  };

  // 1. Owner directo (siempre)
  const avisarOwner = enviarAviso(CORREO_OWNER, NOMBRE_OWNER, vars);

  // 2. Todos los vendedores activos
  const avisarVendedores = destinatariosPorRol('Vendedor').then((vendedores) =>
    Promise.all(vendedores
      .filter((v) => normalizarEmail(v.email) !== normalizarEmail(CORREO_OWNER))
      .map((v) => enviarAviso(v.email, v.nombre, vars))
    )
  );

  // 3. Gerencia (para que también se entere aunque no sea vendedor)
  const avisarGerencia = destinatariosPorRol('Gerencia').then((gerentes) =>
    Promise.all(gerentes
      .filter((g) => normalizarEmail(g.email) !== normalizarEmail(CORREO_OWNER))
      .map((g) => enviarAviso(g.email, g.nombre, {
        titulo:  'Nuevo lead — weCars Bajío',
        mensaje: vars.mensaje,
        link:    'https://www.wecarsbajio.com/panel-administracion',
      }))
    )
  );

  return Promise.all([avisarOwner, avisarVendedores, avisarGerencia]);
}

// Aviso específico cuando alguien llena el formulario de consigna.
// Se manda a todos los vendedores activos con el detalle del vehículo
// y el precio que pide el propietario — distinto al lead genérico porque
// aquí ya sabemos exactamente qué auto quieren consignar.
export function notificarConsignaNueva(consigna) {
  const fmt = (n) => n ? '$' + Math.round(n).toLocaleString('es-MX') : '—';
  const vars = {
    titulo: 'Nueva solicitud de consigna — weCars Bajío',
    mensaje: [
      `🔄 ${consigna.nombre || 'Un propietario'} quiere consignar un ${consigna.vehiculo || 'vehículo'}.`,
      `💰 Precio solicitado: ${fmt(consigna.precio)}.`,
      consigna.urgencia ? `⚡ Urgencia: ${consigna.urgencia}.` : '',
      `📱 Tel: ${consigna.telefono || '—'}  |  Origen: ${consigna.origen || 'Sitio web'}.`,
      ``,
      `Entra al panel para contactarlo y asignártelo.`,
    ].filter(Boolean).join('\n'),
    link: 'https://www.wecarsbajio.com/panel-vendedores',
  };

  const avisarOwner = enviarAviso(CORREO_OWNER, NOMBRE_OWNER, vars);
  const avisarVendedores = destinatariosPorRol('Vendedor').then((vendedores) =>
    Promise.all(vendedores
      .filter((v) => normalizarEmail(v.email) !== normalizarEmail(CORREO_OWNER))
      .map((v) => enviarAviso(v.email, v.nombre, vars))
    )
  );

  return Promise.all([avisarOwner, avisarVendedores]);
}

// Una unidad se cierra (Vendido) o se aparta (Apartado) — le corresponde
// a Gerencia enterarse en el momento, no al vendedor que ya lo sabe
// porque lo marcó él mismo.
export function notificarAutoEstatus(auto, estatusNuevo) {
  return destinatariosPorRol('Gerencia').then((gerentes) => Promise.all(
    gerentes.map((g) => enviarAviso(g.email, g.nombre, {
      titulo: estatusNuevo === 'Vendido' ? 'Unidad vendida' : 'Unidad apartada',
      mensaje: `${auto.title || 'Un vehículo'} se marcó como ${String(estatusNuevo).toLowerCase()}.`,
      link: 'https://www.wecarsbajio.com/panel-gerencia',
    }))
  ));
}

// Solo facturas de SALIDA — son las que Finanzas concilia contra cada
// venta (ver tarjeta "Ganados sin factura" en Gerencia). El resto de
// documentos (INE, comprobantes, etc.) son del expediente de crédito del
// cliente y no le corresponden a Finanzas.
export function notificarDocumentoFactura(cliente, tipoDocumento) {
  return destinatariosPorRol('Finanzas').then((finanzas) => Promise.all(
    finanzas.map((f) => enviarAviso(f.email, f.nombre, {
      titulo: 'Nueva factura de salida subida',
      mensaje: `Se subió "${tipoDocumento}" para ${cliente.nombre || 'un cliente'}. Revisa el estatus de facturación en tu panel.`,
      link: 'https://www.wecarsbajio.com/panel-finanzas',
    }))
  ));
}

// Cuando Gerencia da de alta un empleado directamente (acción rápida
// desde su propio panel, sin pasar por Administración), Administración
// —dueña del directorio de permisos— debe enterarse, porque ese alta
// pudo haber sido con cualquier rol, incluido Gerencia o Administración.
// No se dispara cuando Administración da de alta desde su propio panel
// (avisarle de su propia acción no aporta nada).
export function notificarEmpleadoNuevo(empleado) {
  return destinatariosPorRol('Administración').then((administradores) => Promise.all(
    administradores.map((a) => enviarAviso(a.email, a.nombre, {
      titulo: 'Nuevo empleado dado de alta desde Gerencia',
      mensaje: `${empleado.nombre || empleado.email} se agregó con rol "${empleado.rol}". Revisa el directorio si necesitas ajustar algo.`,
      link: 'https://www.wecarsbajio.com/panel-administracion',
    }))
  ));
}

// Aviso al vendedor con su lista de clientes que llevan +24h sin contacto.
// Se llama desde backend/recordatorios.jsw (job diario) — nunca desde el
// navegador, porque aquí no hay forma de paginar bien la lista desde el
// front sin exponer datos de otros vendedores.
// Reporte semanal a Gerencia — se manda cada lunes desde jobs.config.
// Recibe un objeto stats con los números ya calculados (el job los calcula
// desde Ventas, ClientRecords y Comisiones antes de llamar aquí).
export function notificarReporteSemanal(gerente, stats) {
  const fmt = (n) => n != null ? '$' + Math.round(n).toLocaleString('es-MX') : '—';
  const mensaje = [
    `Resumen de la semana pasada en weCars Bajío:`,
    ``,
    `• Leads nuevos: ${stats.leadsNuevos ?? 0}`,
    `• Autos vendidos: ${stats.autosVendidos ?? 0}`,
    `• Facturado: ${fmt(stats.facturado)}`,
    `• Ticket promedio: ${fmt(stats.ticketPromedio)}`,
    `• Comisiones pendientes de pago: ${fmt(stats.comisionesPendientes)}`,
    `• Clientes sin actividad +24h: ${stats.sinActividad ?? 0}`,
  ].join('\n');
  return enviarAviso(gerente.email, gerente.nombre, {
    titulo: `Reporte semanal weCars Bajío — semana del ${stats.semanaLabel || ''}`,
    mensaje,
    link: 'https://www.wecarsbajio.com/panel-vendedores',
  });
}

export function notificarInactividad(vendedor, clientes) {
  const cuantos = clientes.length;
  const lista = clientes.slice(0, 5)
    .map((c) => `• ${c.nombre || 'Sin nombre'} (${c.telefono || 'sin tel'}) — ${c.estatus || ''}`)
    .join('\n');
  const extras = cuantos > 5 ? `\n...y ${cuantos - 5} más.` : '';
  return enviarAviso(vendedor.email, vendedor.nombre, {
    titulo: `${cuantos} cliente${cuantos > 1 ? 's' : ''} sin actividad en +24 h`,
    mensaje: `Los siguientes clientes llevan más de 24 horas sin contacto:\n\n${lista}${extras}\n\nEntra al panel para darles seguimiento.`,
    link: 'https://www.wecarsbajio.com/panel-vendedores',
  });
}
