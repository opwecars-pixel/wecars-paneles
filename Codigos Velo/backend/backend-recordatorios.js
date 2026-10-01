// ───────────────────────────────────────────────────────────────────
//  ARCHIVO DE BACKEND NUEVO: backend/recordatorios.jsw
//  En el panel de Velo (columna izquierda), busca la carpeta "Backend".
//  Clic derecho → "New File" → nómbralo exactamente: recordatorios.jsw
//  Pega SOLO este bloque en ese archivo.
//
//  Este archivo se dispara automáticamente todos los días a las 9am
//  (configurado en jobs.config — ver ese archivo).
//
//  También exporta obtenerClientesInactivos() para que el panel de
//  vendedores pueda mostrar badges de alerta sin hacer una consulta
//  extra al cargar (la función filtra solo los clientes del vendedor
//  activo, nunca expone datos de otros vendedores).
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { notificarInactividad, notificarReporteSemanal } from 'backend/notificaciones.jsw';

// Horas sin actividad para considerarse "cliente abandonado"
const HORAS_LIMITE = 24;

// Solo se avisa por clientes que todavía están en juego — los cerrados
// (Ganado, Perdido) no necesitan seguimiento.
const ESTATUSES_ACTIVOS = ['Nuevo', 'Contactado', 'En seguimiento', 'Propuesta enviada', 'Negociando', 'Calificado'];

// Job diario — Wix lo llama automáticamente según jobs.config.
// Busca todos los clientes activos sin actividad en las últimas 24h,
// los agrupa por vendedor y manda un correo resumen a cada uno.
export function verificarInactividad() {
  const limite = new Date(Date.now() - HORAS_LIMITE * 60 * 60 * 1000);

  return wixData.query('ClientRecords')
    .lt('ultimaActividad', limite)
    .hasSome('estatus', ESTATUSES_ACTIVOS)
    .limit(500)
    .find()
    .then((results) => {
      if (!results.items.length) return;

      // Agrupar por vendedorAsignado (email del vendedor)
      const porVendedor = {};
      results.items.forEach((c) => {
        const email = c.vendedorAsignado || '';
        if (!email) return; // Sin asignar — no hay a quién avisarle
        if (!porVendedor[email]) porVendedor[email] = [];
        porVendedor[email].push(c);
      });

      // Cargar perfiles de vendedores activos para tener nombre y email
      return wixData.query('Usuarios')
        .eq('rol', 'Vendedor')
        .limit(200)
        .find()
        .then((vendRes) => {
          const vendedores = vendRes.items.filter(
            (v) => v.activo !== false && v.email && porVendedor[v.email]
          );
          return Promise.all(
            vendedores.map((v) => notificarInactividad(v, porVendedor[v.email]))
          );
        });
    })
    .catch((e) => console.error('[Recordatorios] Error en verificarInactividad:', e));
}

// Job semanal — cada lunes a las 8am (ver jobs.config).
// Calcula stats de la semana anterior y manda reporte a Gerencia.
export function reporteSemanal() {
  const ahora = new Date();
  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(ahora.getDate() - 7);
  inicioSemana.setHours(0, 0, 0, 0);
  const semanaLabel = inicioSemana.toLocaleDateString('es-MX', { day: '2-digit', month: 'long' });

  return Promise.all([
    wixData.query('ClientRecords').gt('_createdDate', inicioSemana).count().catch(() => 0),
    wixData.query('Ventas').gt('fecha', inicioSemana).find().catch(() => ({ items: [] })),
    wixData.query('Comisiones').hasSome('estatus', ['Pendiente', 'Liberada']).find().catch(() => ({ items: [] })),
    wixData.query('ClientRecords')
      .lt('ultimaActividad', new Date(Date.now() - 24 * 3600 * 1000))
      .hasSome('estatus', ESTATUSES_ACTIVOS)
      .count().catch(() => 0),
    wixData.query('Usuarios').eq('rol', 'Gerencia').limit(10).find().catch(() => ({ items: [] })),
  ]).then(([leadsNuevos, ventasR, comisionesR, sinActividad, gerentesR]) => {
    const ventas = ventasR.items;
    const facturado = ventas.reduce((s, v) => s + (Number(v.precioVenta) || 0), 0);
    const comisionesPendientes = comisionesR.items.reduce((s, c) => s + (Number(c.monto) || 0), 0);
    const stats = {
      leadsNuevos,
      autosVendidos: ventas.length,
      facturado,
      ticketPromedio: ventas.length ? Math.round(facturado / ventas.length) : 0,
      comisionesPendientes,
      sinActividad,
      semanaLabel,
    };
    const gerentes = gerentesR.items.filter(g => g.activo !== false && g.email);
    return Promise.all(gerentes.map(g => notificarReporteSemanal(g, stats)));
  }).catch(e => console.error('[Recordatorios] Error en reporteSemanal:', e));
}

// Llamada desde pagina-panel-vendedores.js al cargar el panel.
// Devuelve solo los _id de los clientes inactivos de ESE vendedor —
// nunca devuelve datos de otros vendedores.
export function obtenerClientesInactivos(vendedorEmail) {
  if (!vendedorEmail) return Promise.resolve([]);
  const limite = new Date(Date.now() - HORAS_LIMITE * 60 * 60 * 1000);
  return wixData.query('ClientRecords')
    .eq('vendedorAsignado', vendedorEmail)
    .lt('ultimaActividad', limite)
    .hasSome('estatus', ESTATUSES_ACTIVOS)
    .limit(200)
    .find()
    .then((r) => r.items.map((c) => c._id))
    .catch(() => []);
}
