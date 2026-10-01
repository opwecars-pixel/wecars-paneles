/**
 * GAMIFICACIÓN — CÓDIGO VELO COMPARTIDO
 * Pegar en: Wix Editor → cada página que tenga un iframe de panel
 *
 * Páginas donde va este código:
 *   - panel-vendedores      → funciones: gm_guardar, gm_obtenerPropio
 *   - panel-gerencia        → funciones: gm_obtenerMes, gm_listaVendedores
 *   - panel-administracion  → funciones: gm_obtenerMes
 *
 * COLECCIÓN CMS REQUERIDA → crearla en Wix CMS con ID: "GamificacionMensual"
 *
 * Campos de la colección GamificacionMensual:
 * ─────────────────────────────────────────────────────────────────
 * _id              (auto)        — generado por Wix
 * vendedorEmail    Text          — email del vendedor (clave de búsqueda)
 * vendedorNombre   Text          — nombre visible
 * mes              Text          — formato "YYYY-MM" ej: "2026-07"
 * xpTotal          Number        — XP acumulado en el mes
 * ventasMes        Number        — ventas cerradas (Ganado+facturado)
 * nivelNombre      Text          — "Prospecto", "Asesor", etc.
 * nivelEmoji       Text          — emoji del nivel
 * prestigio        Number        — índice 0–100
 * racha            Number        — días de racha activos
 * citasMes         Number        — citas agendadas en el mes
 * contactadosMes   Number        — clientes contactados en el mes
 * cotizacionesMes  Number        — cotizaciones enviadas
 * logros           Text          — JSON array de IDs desbloqueados
 * tierNombre       Text          — "Meta mínima", "Hall of Fame", etc.
 * tierEmoji        Text          — emoji del tier
 * esFinaldeMes     Boolean       — true cuando el mes está cerrado (no editar)
 * _updatedDate     (auto)        — última modificación
 * ─────────────────────────────────────────────────────────────────
 *
 * PERMISOS de la colección:
 *   Leer: Cualquier persona conectada
 *   Crear: Admin del sitio
 *   Actualizar: Admin del sitio
 *   Eliminar: Admin del sitio
 * (El código Velo usa suppressAuth:true para escribir desde backend)
 */

import wixData from 'wix-data';

const GM_COL = 'GamificacionMensual';

/** Mes actual en formato YYYY-MM usando zona horaria México Central (UTC-6 permanente desde 2023). */
function mesActual() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
}

/** Mes anterior en formato YYYY-MM usando zona horaria México Central (UTC-6 permanente desde 2023). */
function mesAnterior() {
  const actual = mesActual(); // "YYYY-MM" ya en hora México
  const [year, month] = actual.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  return prevYear + '-' + String(prevMonth).padStart(2, '0');
}

/**
 * Guarda o actualiza el registro de gamificación de un vendedor en el mes actual.
 * Llamado cuando el panel de vendedores envía postMessage tipo 'wecars-gm-guardar'.
 *
 * @param {object} datos — payload del postMessage
 */
export async function gm_guardar(datos) {
  const mes = mesActual();
  const email = (datos.vendedorEmail || '').toLowerCase().trim();
  if (!email) return { ok: false, error: 'Sin email' };

  // Buscar si ya existe registro para este vendedor+mes
  const result = await wixData.query(GM_COL)
    .eq('vendedorEmail', email)
    .eq('mes', mes)
    .limit(1)
    .find({ suppressAuth: true });

  const record = {
    vendedorEmail:   email,
    vendedorNombre:  datos.vendedorNombre  || '',
    mes,
    xpTotal:         Number(datos.xpTotal        || 0),
    ventasMes:       Number(datos.ventasMes       || 0),
    nivelNombre:     datos.nivelNombre     || '',
    nivelEmoji:      datos.nivelEmoji      || '',
    prestigio:       Number(datos.prestigio        || 0),
    racha:           Number(datos.racha            || 0),
    citasMes:        Number(datos.citasMes         || 0),
    contactadosMes:  Number(datos.contactadosMes   || 0),
    cotizacionesMes: Number(datos.cotizacionesMes  || 0),
    logros:          JSON.stringify(datos.logros || []),
    tierNombre:      datos.tierNombre      || '',
    tierEmoji:       datos.tierEmoji       || '',
    esFinaldeMes:    false,
  };

  if (result.items.length > 0) {
    // No sobrescribir si el mes ya está cerrado
    if (result.items[0].esFinaldeMes) return { ok: false, error: 'Mes cerrado' };
    await wixData.update(GM_COL, { _id: result.items[0]._id, ...record }, { suppressAuth: true });
  } else {
    await wixData.insert(GM_COL, record, { suppressAuth: true });
  }

  return { ok: true, mes };
}

/**
 * Cierra el mes anterior automáticamente (marca esFinaldeMes=true).
 * Llamar desde Wix Automations el día 2 de cada mes a las 00:01.
 * También se puede llamar manualmente desde Gerencia.
 */
export async function gm_cerrarMesAnterior() {
  const mes = mesAnterior();
  const result = await wixData.query(GM_COL)
    .eq('mes', mes)
    .eq('esFinaldeMes', false)
    .limit(100)
    .find({ suppressAuth: true });

  for (const item of result.items) {
    await wixData.update(GM_COL, { ...item, esFinaldeMes: true }, { suppressAuth: true });
  }
  return { ok: true, mes, cerrados: result.items.length };
}

/**
 * Obtiene el historial de un vendedor (todos los meses disponibles).
 * Para la vista "Mi historial" en el panel de vendedores.
 */
export async function gm_obtenerPropio(email) {
  if (!email) return [];
  const result = await wixData.query(GM_COL)
    .eq('vendedorEmail', email.toLowerCase().trim())
    .descending('mes')
    .limit(24)
    .find({ suppressAuth: true });
  return result.items.map(_limpiarItem);
}

/**
 * Obtiene todos los vendedores de un mes específico.
 * Para la Liga del mes en Gerencia y Administración.
 *
 * @param {string} mes — formato "YYYY-MM"
 */
export async function gm_obtenerMes(mes) {
  if (!mes) mes = mesActual();
  const result = await wixData.query(GM_COL)
    .eq('mes', mes)
    .ascending('vendedorNombre')
    .limit(50) // soporta hasta 50 vendedores (más que suficiente para 40)
    .find({ suppressAuth: true });
  return result.items.map(_limpiarItem);
}

/**
 * Lista todos los meses que tienen al menos un registro.
 * Para el navegador de meses en Gerencia.
 */
export async function gm_listasMeses() {
  const result = await wixData.query(GM_COL)
    .descending('mes')
    .limit(500)
    .find({ suppressAuth: true });

  const meses = [...new Set(result.items.map(i => i.mes))].sort().reverse();
  return meses;
}

/** Limpia el item antes de enviarlo al iframe (quita campos internos de Wix) */
function _limpiarItem(item) {
  return {
    vendedorEmail:   item.vendedorEmail,
    vendedorNombre:  item.vendedorNombre,
    mes:             item.mes,
    xpTotal:         item.xpTotal || 0,
    ventasMes:       item.ventasMes || 0,
    nivelNombre:     item.nivelNombre || '',
    nivelEmoji:      item.nivelEmoji || '',
    prestigio:       item.prestigio || 0,
    racha:           item.racha || 0,
    citasMes:        item.citasMes || 0,
    contactadosMes:  item.contactadosMes || 0,
    cotizacionesMes: item.cotizacionesMes || 0,
    logros:          _parseLogros(item.logros),
    tierNombre:      item.tierNombre || '',
    tierEmoji:       item.tierEmoji || '',
    esFinaldeMes:    item.esFinaldeMes || false,
    updatedDate:     item._updatedDate,
  };
}

function _parseLogros(val) {
  try { return JSON.parse(val || '[]'); } catch { return []; }
}
