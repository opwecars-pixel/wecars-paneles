// ───────────────────────────────────────────────────────────────────
//  BACKEND: backend/actividades.jsw
//
//  CAMPOS QUE DEBE TENER LA COLECCIÓN "Activities" EN EL CMS:
//    (los marcados con * son nuevos — agrégalos antes de publicar)
//    vendedorEmail   Text    — email del ejecutor
//    origen          Text    — 'automatico' | 'manual' | 'incidencia'
//    entidadTipo     Text    — 'cliente' | 'lead' | 'oportunidad' | 'venta' |
//                              'cita' | 'consigna' | 'credito' | 'auto' | 'sistema' | 'manual'
//    entidadId       Text    — ID real en su colección (para enlace a evidencia)
//    leadId          Text    — ref a ALeads
//    oportunidadId   Text    — ref a Opportunities
//    ventaId         Text    — ref a Ventas
//    citaId          Text    — ref a Citas
//    autoId          Text    — ref a Cars
//    consignacionId  Text *  — ref a Consignas
//    creditoId       Text *  — ref a Creditos / CreditApplications
//    eventKey        Text *  — clave de idempotencia: "{tipo}:{sourceId}"
//                              Permite detectar y descartar duplicados.
//                              Índice recomendado: campo "eventKey".
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import wixUsersBackend from 'wix-users-backend';
import { obtenerPerfil, normalizarRol } from 'backend/permisos.jsw';

const SA = { suppressAuth: true };

// ── TIMEZONE ──────────────────────────────────────────────────────
// Los servidores Wix corren en UTC.
// México Central (CDMX, Bajío) opera en UTC-6 permanente desde octubre 2022:
// el Congreso mexicano abolió el horario de verano (DST/CDT) mediante decreto.
// El offset 6 es correcto e intencional — no existe variación estacional para
// la zona America/Mexico_City desde 2023. No requiere ajuste.
const MX_UTC_OFFSET_H = 6;

/**
 * Inicio del día operativo para una fecha México dada.
 * fechaStr: 'YYYY-MM-DD' (el día como lo ve el usuario en México).
 * Si no se pasa fechaStr, calcula "hoy" en México desde el UTC del servidor.
 */
function _inicioDiaOperativo(fechaStr) {
  const f = fechaStr || _fechaHoyMexico();
  return new Date(f + 'T' + _pad(MX_UTC_OFFSET_H) + ':00:00.000Z');
}

function _finDiaOperativo(fechaStr) {
  return new Date(_inicioDiaOperativo(fechaStr).getTime() + 24 * 3600 * 1000 - 1);
}

// Calcula la fecha de "hoy" en México desde el reloj UTC del servidor.
function _fechaHoyMexico() {
  const mexicoMs = Date.now() - MX_UTC_OFFSET_H * 3600 * 1000;
  return new Date(mexicoMs).toISOString().split('T')[0];
}

function _pad(n) { return String(n).padStart(2, '0'); }

// ── TIPOS ─────────────────────────────────────────────────────────

// El sistema genera estos tipos — el vendedor no puede declararlos manualmente
const TIPOS_AUTOMATICOS = new Set([
  'cliente_creado',
  'lead_recibido',
  'lead_reclamado',
  'lead_asignado',
  'cotizacion_creada',
  'cotizacion_actualizada',
  'cita_agendada',
  'consigna_captada',
  'credito_ingresado',
  'credito_actualizado',
  'credito_autorizado',
  'credito_rechazado',
  'venta_cerrada',
  'auto_actualizado',
  'estado_avanzado',
  'prueba_manejo',
]);

// El vendedor declara estos tipos al registrar actividad manual
const TIPOS_MANUALES = new Set([
  'llamada',
  'visita',
  'whatsapp',
  'email',
  'nota',
  'nota_lead',
  'seguimiento',
  'junta',
  'capacitacion',
  'visita_externa',
  'actividad_administrativa',
  'actividad_especial',
  'otra_actividad',
  'mensaje-gerencia', // comunicados internos de Gerencia al equipo
]);

// Administración registra estos tipos
const TIPOS_INCIDENCIA = new Set([
  'ausencia',
  'permiso',
  'dia_no_laborable',
  'otra_incidencia',
]);

// ── FUNCIÓN PRINCIPAL ──────────────────────────────────────────────

/**
 * Registra una actividad en el sistema.
 *
 * @param {object} datos
 *   tipo            string  — ver listas de tipos arriba
 *   clienteId       string  — ID en ClientRecords (opcional)
 *   leadId          string  — ID en ALeads (opcional)
 *   oportunidadId   string  — ID en Opportunities (opcional)
 *   ventaId         string  — ID en Ventas (opcional)
 *   citaId          string  — ID en Citas (opcional)
 *   autoId          string  — ID en Cars (opcional)
 *   consignacionId  string  — ID en Consignas (opcional)
 *   creditoId       string  — ID en Creditos / CreditApplications (opcional)
 *   entidadTipo     string  — tipo de la entidad principal referenciada
 *   entidadId       string  — ID de la entidad principal
 *   vendedorEmail   string  — email del ejecutor
 *   vendedorNombre  string  — nombre visible del ejecutor
 *   descripcion     string  — texto libre (solo para manuales)
 *   detalle         string  — detalle adicional
 *   resultado       string  — 'positivo' | 'negativo' | 'pendiente' | ''
 *   metadata        object  — datos adicionales (guardados como JSON en 'detalle')
 *   eventKey        string  — clave de idempotencia: "{tipo}:{sourceId}"
 *                             Si se pasa y ya existe un Activity con este eventKey,
 *                             se descarta el duplicado silenciosamente.
 */
export function registrarActividad(datos) {
  if (!datos || !datos.tipo) {
    return Promise.resolve({ ok: false, error: 'tipo es requerido' });
  }

  const tipo = datos.tipo;
  let origen = 'manual';
  if (TIPOS_AUTOMATICOS.has(tipo)) origen = 'automatico';
  if (TIPOS_INCIDENCIA.has(tipo))  origen = 'incidencia';

  // Para actividades automáticas la descripción se genera aquí — no puede ser inyectada
  const descripcion = origen === 'automatico'
    ? (_descripcionAutomatica(tipo, datos) || datos.descripcion || '')
    : (datos.descripcion || datos.detalle || '');

  const registro = {
    // ── Campos existentes ────────────────────────────────────────
    clienteId:     datos.clienteId     || '',
    clienteNombre: datos.clienteNombre || datos.nombre || '',
    tipo,
    descripcion,
    detalle:       datos.metadata ? JSON.stringify(datos.metadata) : (datos.detalle || ''),
    fecha:         new Date(),
    resultado:     datos.resultado     || '',
    autor:         datos.vendedorNombre || datos.autor || datos.vendedorEmail || '',
    // ── Campos nuevos de actividades.jsw ────────────────────────
    vendedorEmail:   datos.vendedorEmail   || '',
    vendedorNombre:  datos.vendedorNombre  || '',
    origen,
    entidadTipo:     datos.entidadTipo     || '',
    entidadId:       datos.entidadId       || datos.clienteId || '',
    leadId:          datos.leadId          || '',
    oportunidadId:   datos.oportunidadId   || '',
    ventaId:         datos.ventaId         || '',
    citaId:          datos.citaId          || '',
    autoId:          datos.autoId          || '',
    consignacionId:  datos.consignacionId  || '',
    creditoId:       datos.creditoId       || '',
    eventKey:        datos.eventKey        || '',
  };

  // ── Idempotencia ─────────────────────────────────────────────
  // Si se pasa eventKey, verificar si ya existe antes de insertar.
  if (registro.eventKey) {
    return wixData.query('Activities')
      .eq('eventKey', registro.eventKey)
      .limit(1)
      .find(SA)
      .then((r) => {
        if (r.items.length > 0) {
          return { ok: true, duplicate: true, actividadId: r.items[0]._id, origen };
        }
        return wixData.insert('Activities', registro, SA)
          .then((item) => ({ ok: true, actividadId: item._id, origen }));
      })
      .catch((e) => {
        console.error('[Actividades] Error registrando actividad con eventKey:', tipo, e);
        return { ok: false, error: String(e) };
      });
  }

  return wixData.insert('Activities', registro, SA)
    .then((item) => ({ ok: true, actividadId: item._id, origen }))
    .catch((e) => {
      console.error('[Actividades] Error registrando actividad:', tipo, e);
      return { ok: false, error: String(e) };
    });
}


// ── FETCH ACTIVIDADES VENDEDOR ─────────────────────────────────────

/**
 * Obtiene actividades de un vendedor para un rango de fechas.
 * La fecha se interpreta como día operativo en México (UTC-6).
 *
 * @param {string} vendedorEmail
 * @param {string} desde  — 'YYYY-MM-DD' (fecha México)
 * @param {string} hasta  — 'YYYY-MM-DD' (fecha México)
 * @param {number} limit
 */
export function fetchActividadesVendedor(vendedorEmail, desde, hasta, limit) {
  if (!vendedorEmail) return Promise.resolve([]);
  const lim = limit || 200;
  const fechaDesde = _inicioDiaOperativo(desde || null);
  const fechaHasta = _finDiaOperativo(hasta || null);

  return wixData.query('Activities')
    .eq('vendedorEmail', vendedorEmail)
    .ge('fecha', fechaDesde)
    .le('fecha', fechaHasta)
    .descending('fecha')
    .limit(lim)
    .find(SA)
    .then((r) => r.items)
    .catch(() => []);
}


// ── FETCH ACTIVIDADES EQUIPO (solo Gerencia / Administración) ──────

/**
 * Devuelve actividades de todo el equipo para un día.
 * SEGURIDAD: verifica rol del usuario que llama via wix-users-backend.
 * Si no tiene rol Gerencia o Administración → devuelve objeto con error,
 * NO devuelve [] silenciosamente (para detectar problemas de permisos).
 *
 * @param {string} fecha — 'YYYY-MM-DD' (fecha México), default hoy México
 */
export function fetchActividadesEquipo(fecha) {
  return wixUsersBackend.currentUser.getEmail()
    .then((email) => obtenerPerfil(email))
    .then((perfil) => {
      if (!_esRolAdministrativo(perfil.rol)) {
        return { actividades: [], vendedores: [], error: 'Sin permisos — requiere Gerencia o Administración', sinPermiso: true };
      }
      const fechaDesde = _inicioDiaOperativo(fecha || null);
      const fechaHasta = _finDiaOperativo(fecha || null);
      return Promise.all([
        wixData.query('Activities')
          .ge('fecha', fechaDesde)
          .le('fecha', fechaHasta)
          .descending('fecha')
          .limit(1000)
          .find(SA),
        wixData.query('Usuarios')
          .eq('estatus', 'activo')
          .limit(100)
          .find(SA),
      ]).then(([actR, usuariosR]) => ({
        actividades: actR.items,
        vendedores:  usuariosR.items,
      }));
    })
    .catch(() => ({ actividades: [], vendedores: [], error: 'Error interno' }));
}


// ── FETCH KPIs VENDEDOR ────────────────────────────────────────────

/**
 * KPIs de un vendedor para una fecha.
 * SEGURIDAD:
 *   - Vendedor → solo puede consultar sus propios KPIs.
 *   - Gerencia / Administración → puede consultar cualquier vendedor.
 * Si el caller no tiene permiso para ver ese vendedor → devuelve KPIs vacíos.
 *
 * @param {string} vendedorEmail — email del vendedor a consultar
 * @param {string} fecha         — 'YYYY-MM-DD' (fecha México)
 */
export function fetchKpisVendedor(vendedorEmail, fecha) {
  if (!vendedorEmail) return Promise.resolve(_kpisVacios());

  return wixUsersBackend.currentUser.getEmail()
    .then((callerEmail) => obtenerPerfil(callerEmail).then((perfil) => ({ callerEmail, perfil })))
    .then(({ callerEmail, perfil }) => {
      const esAdmin = _esRolAdministrativo(perfil.rol);
      const esPropios = callerEmail.toLowerCase() === String(vendedorEmail).toLowerCase();
      if (!esAdmin && !esPropios) {
        return _kpisVacios(); // vendedor intentando ver KPIs ajenos
      }
      const fechaDesde = _inicioDiaOperativo(fecha || null);
      const fechaHasta = _finDiaOperativo(fecha || null);
      return wixData.query('Activities')
        .eq('vendedorEmail', vendedorEmail)
        .ge('fecha', fechaDesde)
        .le('fecha', fechaHasta)
        .limit(500)
        .find(SA)
        .then((r) => _calcularKpis(r.items));
    })
    .catch(() => _kpisVacios());
}


// ── REGISTRAR INCIDENCIA ───────────────────────────────────────────

/**
 * Registra una incidencia (ausencia, permiso, etc.).
 * Solo debe llamarlo Administración.
 */
export function registrarIncidencia(datos) {
  return registrarActividad(Object.assign({}, datos, { origen: 'incidencia' }));
}


// ── INTERNOS ──────────────────────────────────────────────────────

function _esRolAdministrativo(rol) {
  const r = normalizarRol(rol);
  return r === 'gerencia' || r === 'administracion';
}

function _descripcionAutomatica(tipo, d) {
  const m = d.metadata || {};
  const PLANTILLAS = {
    cliente_creado:        `Cliente nuevo: ${m.nombre || ''}`,
    lead_recibido:         `Lead recibido: ${m.nombre || ''} (${m.tipo || ''})`,
    lead_reclamado:        `Lead reclamado por vendedor`,
    lead_asignado:         `Lead asignado a ${m.vendedorNombre || ''}`,
    cotizacion_creada:     `Cotización: ${m.vehiculo || ''} — $${m.monto ? Number(m.monto).toLocaleString('es-MX') : '—'}`,
    cotizacion_actualizada:`Cotización actualizada — etapa: ${m.etapa || ''}`,
    cita_agendada:         `Cita agendada`,
    consigna_captada:      `Consigna captada: ${m.vehiculo || ''}`,
    credito_ingresado:     `Crédito ingresado`,
    credito_actualizado:   `Crédito actualizado — estatus: ${m.estatus || ''}`,
    credito_autorizado:    `Crédito autorizado`,
    credito_rechazado:     `Crédito rechazado`,
    venta_cerrada:         `Venta cerrada: ${m.vehiculo || ''} — $${m.monto ? Number(m.monto).toLocaleString('es-MX') : '—'}`,
    auto_actualizado:      `Vehículo actualizado: ${m.vehiculo || ''}`,
    estado_avanzado:       `Expediente → ${m.estadoLabel || m.nuevoEstado || ''}`,
    prueba_manejo:         `Prueba de manejo: ${m.vehiculo || ''}`,
  };
  return PLANTILLAS[tipo] || '';
}

function _calcularKpis(items) {
  const kpis = _kpisVacios();
  kpis.total = items.length;
  items.forEach((a) => {
    const t = a.tipo || '';
    if (t === 'llamada')                kpis.llamadas++;
    else if (t === 'visita')            kpis.visitas++;
    else if (t === 'whatsapp')          kpis.whatsapp++;
    else if (t === 'email')             kpis.emails++;
    else if (t === 'seguimiento')       kpis.seguimientos++;
    else if (t === 'cotizacion_creada') kpis.cotizaciones++;
    else if (t === 'cita_agendada')     kpis.citas++;
    else if (t === 'credito_ingresado' || t === 'credito_autorizado') kpis.creditos++;
    else if (t === 'consigna_captada')  kpis.consignas++;
    else if (t === 'venta_cerrada')     kpis.ventas++;
    else if (t === 'cliente_creado')    kpis.clientesNuevos++;
    else if (t === 'lead_reclamado' || t === 'lead_recibido') kpis.leads++;
    if (a.origen === 'automatico')      kpis.automaticas++;
    else if (a.origen === 'manual')     kpis.manuales++;
  });
  return kpis;
}

function _kpisVacios() {
  return {
    total: 0, llamadas: 0, visitas: 0, whatsapp: 0, emails: 0,
    seguimientos: 0, cotizaciones: 0, citas: 0, creditos: 0,
    consignas: 0, ventas: 0, clientesNuevos: 0, leads: 0,
    automaticas: 0, manuales: 0,
  };
}


// ── PRODUCTIVIDAD COMERCIAL ────────────────────────────────────────
// Solo estos tipos se contabilizan como productividad del vendedor.
// Eventos de sistema (lead_recibido, consigna_captada, credito_*,
// cliente_creado) se excluyen — pertenecen al sistema o a Finanzas,
// no al vendedor.
const TIPOS_PRODUCTIVIDAD = new Set([
  // automáticos atribuibles al vendedor (post-corrección de atribución)
  'lead_asignado', 'lead_reclamado',
  'cotizacion_creada', 'cotizacion_actualizada',
  'cita_agendada', 'estado_avanzado', 'venta_cerrada', 'prueba_manejo',
  // manuales
  'llamada', 'visita', 'whatsapp', 'email', 'nota', 'nota_lead',
  'seguimiento', 'junta', 'capacitacion', 'visita_externa',
  'actividad_administrativa', 'actividad_especial', 'otra_actividad',
  'publicacion_externa',
]);

// Emails que pertenecen al sistema o a un área — nunca a un vendedor individual.
const EMAILS_NO_ATRIBUIBLES = new Set(['sistema', 'finanzas', '']);


// ── FETCH RESUMEN EQUIPO (Nivel 1 Supervisión) ─────────────────────

/**
 * Resumen de productividad de todo el equipo para una fecha.
 * Devuelve KPIs por vendedor calculados en backend — NO envía el
 * timeline completo al frontend (prevención de N+1 y volumen).
 *
 * SEGURIDAD: requiere Gerencia o Administración.
 *
 * @param {string} fecha — 'YYYY-MM-DD' México, default hoy México
 */
export function fetchResumenEquipo(fecha) {
  return wixUsersBackend.currentUser.getEmail()
    .then((email) => obtenerPerfil(email))
    .then((perfil) => {
      if (!_esRolAdministrativo(perfil.rol)) {
        return { error: 'Sin permisos — requiere Gerencia o Administración', sinPermiso: true };
      }
      const fechaConsulta = fecha || _fechaHoyMexico();
      const fechaDesde = _inicioDiaOperativo(fechaConsulta);
      const fechaHasta = _finDiaOperativo(fechaConsulta);

      return Promise.all([
        wixData.query('Activities')
          .ge('fecha', fechaDesde)
          .le('fecha', fechaHasta)
          .ascending('fecha')
          .limit(2000)
          .find(SA),
        wixData.query('Usuarios')
          .eq('estatus', 'activo')
          .limit(100)
          .find(SA),
      ]).then(([actR, usuariosR]) => {
        const todasActividades = actR.items;
        const usuarios = usuariosR.items;

        // Agrupar actividades por vendedorEmail
        const porVendedor = {};
        todasActividades.forEach((a) => {
          const em = a.vendedorEmail || '';
          if (!porVendedor[em]) porVendedor[em] = [];
          porVendedor[em].push(a);
        });

        // Calcular resumen para cada vendedor activo
        const resumenPorVendedor = {};
        usuarios.forEach((u) => {
          const em = u.email || u.correo || '';
          if (!em) return;
          const acts = porVendedor[em] || [];
          const actsProductividad = acts.filter((a) =>
            TIPOS_PRODUCTIVIDAD.has(a.tipo) && !EMAILS_NO_ATRIBUIBLES.has(a.vendedorEmail || '')
          );

          // Primera y última actividad del día (todas, no solo productividad)
          let primeraActividad = null;
          let ultimaActividad = null;
          acts.forEach((a) => {
            if (!primeraActividad || a.fecha < primeraActividad) primeraActividad = a.fecha;
            if (!ultimaActividad || a.fecha > ultimaActividad) ultimaActividad = a.fecha;
          });

          resumenPorVendedor[em] = {
            kpis: _calcularKpisProductividad(actsProductividad),
            primeraActividad,
            ultimaActividad,
            totalActividades: acts.length,
            actividadesProductividad: actsProductividad.length,
            sinActividad: acts.length === 0,
          };
        });

        return {
          fecha: fechaConsulta,
          vendedores: usuarios,
          resumenPorVendedor,
          totalActividades: todasActividades.length,
        };
      });
    })
    .catch((e) => ({ error: String(e), sinPermiso: false }));
}


// ── FETCH TIMELINE VENDEDOR (Nivel 2 Supervisión, paginado) ────────

/**
 * Timeline de actividades de un vendedor para una fecha.
 * Soporta paginación para no cargar volúmenes futuros completos.
 *
 * SEGURIDAD: requiere Gerencia o Administración.
 *
 * @param {string} vendedorEmail
 * @param {string} fecha   — 'YYYY-MM-DD' México
 * @param {number} limit   — default 50
 * @param {number} skip    — default 0
 */
export function fetchTimelineVendedor(vendedorEmail, fecha, limit, skip) {
  if (!vendedorEmail) return Promise.resolve({ ok: false, error: 'vendedorEmail requerido' });

  return wixUsersBackend.currentUser.getEmail()
    .then((email) => obtenerPerfil(email))
    .then((perfil) => {
      if (!_esRolAdministrativo(perfil.rol)) {
        return { ok: false, error: 'Sin permisos', sinPermiso: true };
      }
      const lim = limit || 50;
      const sk  = skip  || 0;
      const fechaDesde = _inicioDiaOperativo(fecha || null);
      const fechaHasta = _finDiaOperativo(fecha || null);

      return wixData.query('Activities')
        .eq('vendedorEmail', vendedorEmail)
        .ge('fecha', fechaDesde)
        .le('fecha', fechaHasta)
        .ascending('fecha')
        .limit(lim)
        .skip(sk)
        .find(SA)
        .then((r) => ({
          ok: true,
          items: r.items,
          totalCount: r.totalCount,
          hasMore: sk + r.items.length < r.totalCount,
          skip: sk,
          limit: lim,
        }));
    })
    .catch((e) => ({ ok: false, error: String(e) }));
}


// ── FETCH EVIDENCIA (Nivel 3 Supervisión, on-demand) ───────────────

/**
 * Recupera el registro real del CSM para una Activity.
 * Se consulta SOLO al hacer click en "Ver evidencia" — nunca en lote.
 *
 * SEGURIDAD: requiere Gerencia o Administración.
 *
 * @param {string} entidadTipo — 'cliente'|'lead'|'oportunidad'|'venta'|
 *                               'cita'|'consigna'|'credito'|'auto'
 * @param {string} entidadId   — _id real en la colección
 */
export function fetchEvidencia(entidadTipo, entidadId) {
  if (!entidadTipo || !entidadId) {
    return Promise.resolve({ ok: false, motivo: 'sin_referencia' });
  }

  const COLECCION = {
    cliente:    'ClientRecords',
    lead:       'ALeads',
    oportunidad:'Opportunities',
    venta:      'Ventas',
    cita:       'citas',
    consigna:   'Consignas',
    credito:    'Creditos',
    auto:       'Cars',
  };

  const coleccion = COLECCION[entidadTipo];
  if (!coleccion) {
    return Promise.resolve({ ok: false, motivo: 'tipo_desconocido' });
  }

  return wixUsersBackend.currentUser.getEmail()
    .then((email) => obtenerPerfil(email))
    .then((perfil) => {
      if (!_esRolAdministrativo(perfil.rol)) {
        return { ok: false, motivo: 'sin_permisos' };
      }
      return wixData.get(coleccion, entidadId, SA)
        .then((registro) => ({ ok: true, tipo: entidadTipo, coleccion, registro }))
        .catch(() => ({ ok: false, motivo: 'no_encontrado' }));
    })
    .catch(() => ({ ok: false, motivo: 'error_interno' }));
}


// ── INTERNO: KPIs de productividad ────────────────────────────────
// Diferente de _calcularKpis: solo cuenta tipos en TIPOS_PRODUCTIVIDAD
// y no incluye lead_recibido en el conteo de leads.
function _calcularKpisProductividad(items) {
  const kpis = _kpisVacios();
  kpis.total = items.length;
  items.forEach((a) => {
    const t = a.tipo || '';
    if (t === 'llamada')                            kpis.llamadas++;
    else if (t === 'visita')                        kpis.visitas++;
    else if (t === 'whatsapp')                      kpis.whatsapp++;
    else if (t === 'email')                         kpis.emails++;
    else if (t === 'seguimiento')                   kpis.seguimientos++;
    else if (t === 'cotizacion_creada')             kpis.cotizaciones++;
    else if (t === 'cita_agendada')                 kpis.citas++;
    else if (t === 'consigna_captada')              kpis.consignas++;
    else if (t === 'venta_cerrada')                 kpis.ventas++;
    else if (t === 'cliente_creado')                kpis.clientesNuevos++;
    else if (t === 'lead_reclamado' || t === 'lead_asignado') kpis.leads++;
    if (a.origen === 'automatico')                  kpis.automaticas++;
    else if (a.origen === 'manual')                 kpis.manuales++;
  });
  return kpis;
}
