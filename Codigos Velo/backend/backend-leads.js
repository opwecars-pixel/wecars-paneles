// ───────────────────────────────────────────────────────────────────
//  BACKEND: backend/leads.jsw
//  En Wix Studio → panel izquierdo → carpeta "Backend"
//  Clic derecho → "New .jsw file" → nombre: leads.jsw
//  Pega SOLO este bloque.
//
//  Qué hace:
//    - Centraliza todos los leads (inventario, consigna, crédito, prueba)
//    - Controla quién puede ver cada lead según rol
//    - Vendedor puede reclamar lead sin asignar
//    - Gerencia/Admin puede asignar y reasignar
//    - Manda notificación WhatsApp cuando llega un lead nuevo
//
//  Campos que necesitas agregar a la colección ALeads en el CMS:
//    tipo             Text    → 'lead' | 'consigna' | 'credito' | 'prueba_manejo'
//    resumen          Text    → resumen breve de lo que quiere el cliente
//    estatusLead      Text    → 'nuevo' | 'asignado' | 'contactado' | 'cerrado'
//    vendedorAsignado Text    → email del vendedor asignado (vacío = sin asignar)
//    vendedorNombre   Text    → nombre visible del vendedor
// ───────────────────────────────────────────────────────────────────

import wixData from 'wix-data';
import { fetch } from 'wix-fetch';
import { registrarActividad } from 'backend/actividades.jsw';
import wixUsersBackend from 'wix-users-backend';
import { obtenerRol, normalizarRol } from 'backend/permisos.jsw';

const SA = { suppressAuth: true };

// ─── CONFIGURACIÓN WHATSAPP ───────────────────────────────────────
// Opción A — Make.com / Zapier / n8n:
//   Crea un webhook en Make/Zapier que reciba un POST con JSON y mande WhatsApp.
//   Pega aquí la URL del webhook.
//
// Opción B — Twilio WhatsApp API:
//   Usa la función notificarTwilio() al final de este archivo.
//   Rellena TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, y NUMERO_DESTINO.
//
// Deja vacío si todavía no configuras WhatsApp — el sistema funciona igual sin él.
const WHATSAPP_WEBHOOK_URL = ''; // ← pega aquí tu URL de Make/Zapier (Opción A)

// Solo para Opción B (Twilio) — ignora si usas webhook:
const TWILIO_ACCOUNT_SID   = '';
const TWILIO_AUTH_TOKEN    = '';
const TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886'; // número Twilio sandbox
const NUMEROS_DESTINO      = []; // ej. ['whatsapp:+521234567890', 'whatsapp:+529876543210']


// ─── CREAR LEAD ───────────────────────────────────────────────────
/**
 * Inserta un lead unificado en ALeads desde cualquier página pública.
 * Llámalo desde pagina-consignas.js, pagina-inventario.js, pagina-detalle.js.
 *
 * @param {object} datos
 *   tipo:     'lead' | 'consigna' | 'credito' | 'prueba_manejo'
 *   nombre:   string
 *   telefono: string
 *   correo:   string  (opcional)
 *   interes:  string  (auto o servicio de interés)
 *   resumen:  string  (descripción breve)
 *   pagina:   string  ('Inventario' | 'Detalle' | 'Consigna' | 'Crédito')
 *   origen:   string  ('Sitio web' | 'WhatsApp' | etc.)
 */
export function crearLead(datos) {
  const lead = {
    nombre:           datos.nombre           || '',
    telefono:         datos.telefono         || datos.celular || '',
    correo:           datos.correo           || '',
    interes:          datos.interes          || '',
    origen:           datos.origen           || 'Sitio web',
    pagina:           datos.pagina           || '',
    tipo:             datos.tipo             || 'lead',
    resumen:          datos.resumen          || datos.interes || '',
    estatusLead:      datos.estatusLead || (datos.vendedorAsignado ? 'asignado' : 'nuevo'),
    vendedorAsignado: datos.vendedorAsignado || '',
    vendedorNombre:   datos.vendedorNombre   || '',
    clienteId:        datos.clienteId        || '',
    fecha:            new Date(),
  };

  return wixData.insert('ALeads', lead, SA)
    .then((inserted) => {
      _notificarWhatsApp(lead).catch((e) => console.error('[Leads] WhatsApp error:', e));
      registrarActividad({
        tipo: 'lead_recibido', leadId: inserted._id,
        entidadTipo: 'lead', entidadId: inserted._id,
        vendedorEmail: 'sistema',
        vendedorNombre: 'Sistema',
        metadata: { nombre: inserted.nombre, tipo: inserted.tipo, pagina: inserted.pagina },
      }).catch(() => {});
      return inserted;
    });
}


// ─── FETCH LEADS (filtrado por rol) ──────────────────────────────
/**
 * Devuelve leads filtrados según el rol del usuario:
 *   Gerencia / Administracion / Finanzas → todos los leads
 *   Vendedor → leads sin asignar + los propios
 */
export function fetchLeads(rolActual, emailActual) {
  const rolN = _normalizar(rolActual);
  // Soporta roles simples ("Gerencia") y compuestos ("Finanzas , Vendedor")
  const roles = rolN.split(',').map(function(r) { return r.trim(); });
  const esAdmin = roles.some(function(r) { return ['gerencia', 'administracion', 'finanzas'].includes(r); });

  if (esAdmin) {
    return wixData.query('ALeads')
      .descending('fecha')
      .limit(500)
      .find(SA)
      .then((r) => r.items)
      .catch(() => []);
  }

  // Vendedor: sin asignar + asignados a él (ALeads + Consignas, sin VTA)
  return Promise.all([
    wixData.query('ALeads').eq('estatusLead', 'nuevo').descending('fecha').limit(200).find(SA).catch(() => ({ items: [] })),
    wixData.query('ALeads').eq('vendedorAsignado', emailActual).descending('fecha').limit(200).find(SA).catch(() => ({ items: [] })),
    wixData.query('Consignas').eq('estatusConsigna', 'nueva').descending('_createdDate').limit(100).find(SA).catch(() => ({ items: [] })),
    wixData.query('Consignas').eq('vendedorAsignado', emailActual).descending('_createdDate').limit(100).find(SA).catch(() => ({ items: [] })),
  ])
    .then(([sinAsignarR, propiosR, consSinR, consPropiosR]) => {
      const visto = new Set();
      const items = [];
      sinAsignarR.items.concat(propiosR.items).forEach((l) => {
        if (!visto.has(l._id)) { visto.add(l._id); items.push(l); }
      });
      consSinR.items.concat(consPropiosR.items).forEach((c) => {
        const fakeId = 'cons-' + c._id;
        if (visto.has(fakeId)) return;
        visto.add(fakeId);
        const vehiculo = [c.marca, c.modelo, c.anio, c.version].filter(Boolean).join(' ');
        const est = c.estatusConsigna === 'asignada' ? 'asignado' : c.estatusConsigna === 'cerrada' ? 'cerrado' : 'nuevo';
        items.push({
          _id: fakeId, _srcId: c._id, _srcCol: 'Consignas',
          nombre: c.nombre || '', telefono: c.telefono || '', correo: c.correo || '',
          tipo: 'consigna', interes: vehiculo,
          resumen: vehiculo + (c.precio ? ' · $' + Number(c.precio).toLocaleString('es-MX') : ''),
          estatusLead: est, vendedorAsignado: c.vendedorAsignado || '', vendedorNombre: c.vendedorNombre || '',
          origen: c.origen || 'Sitio web', pagina: 'Consigna',
          fecha: c.fecha || c._createdDate, _createdDate: c._createdDate,
        });
      });
      items.sort((a, b) => new Date(b.fecha || b._createdDate || 0) - new Date(a.fecha || a._createdDate || 0));
      return items;
    })
    .catch(() => []);
}


// ─── RECLAMAR LEAD (vendedor se auto-asigna) ─────────────────────
/**
 * Un vendedor reclama un lead sin asignar.
 * Si ya tiene vendedor asignado, devuelve error.
 */
// Roles que pueden actuar en nombre de otro usuario (asignación delegada)
var _ROLES_PRIVILEGIADOS_LEADS = ['gerencia', 'administracion'];

export function reclamarLead(leadId, vendedorEmail, vendedorNombre) {
  // F2-03: verificar identidad del actor en el servidor
  return wixUsersBackend.currentUser.getEmail()
    .catch(function() { return ''; })
    .then(function(actorEmail) {
      if (!actorEmail) {
        return { ok: false, error: 'No autenticado. Inicia sesión para reclamar leads.' };
      }
      var actorNorm = actorEmail.toLowerCase().trim();
      var solNorm   = (vendedorEmail || '').toLowerCase().trim();

      var autorizadoP;
      if (actorNorm === solNorm) {
        autorizadoP = Promise.resolve(true);
      } else {
        autorizadoP = obtenerRol(actorEmail)
          .then(function(rol) {
            return _ROLES_PRIVILEGIADOS_LEADS.indexOf(normalizarRol(rol)) !== -1;
          })
          .catch(function() { return false; });
      }

      return autorizadoP.then(function(autorizado) {
        if (!autorizado) {
          return { ok: false, error: 'No autorizado: no puedes reclamar leads a nombre de otro vendedor.' };
        }
        return _reclamarLeadInterno(leadId, vendedorEmail, vendedorNombre);
      });
    });
}

function _reclamarLeadInterno(leadId, vendedorEmail, vendedorNombre) {
  if (leadId && leadId.startsWith('cons-')) {
    const realId = leadId.slice(5);
    return wixData.get('Consignas', realId, SA)
      .then((c) => {
        if (c.vendedorAsignado) {
          return { ok: false, error: 'Esta consigna ya fue reclamada por otro vendedor.' };
        }
        // Crear o encontrar ClientRecord para la consigna (origen = 'consigna')
        // estatusExpediente NO se establece aquí — consigna tiene su propio proceso especializado
        const tel = String(c.telefono || '').replace(/\D/g, '');
        let telNorm = tel;
        if (telNorm.length === 13 && telNorm.startsWith('521')) telNorm = telNorm.slice(3);
        else if (telNorm.length === 12 && telNorm.startsWith('52')) telNorm = telNorm.slice(2);
        const variantes = telNorm.length === 10
          ? [telNorm, '52' + telNorm, '521' + telNorm]
          : (telNorm ? [telNorm] : []);

        const buscarDup = variantes.length
          ? wixData.query('ClientRecords').hasSome('telefono', variantes).limit(1).find(SA).catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] });

        return buscarDup.then((dupR) => {
          const clienteExistente = dupR.items[0] || null;
          const crearOActualizar = clienteExistente
            ? wixData.update('ClientRecords', Object.assign({}, clienteExistente, {
                ultimaActividad: new Date(),
                ...((!clienteExistente.vendedorAsignado && vendedorEmail) ? { vendedorAsignado: vendedorEmail, vendedorNombre: vendedorNombre || '' } : {}),
              }), SA)
            : wixData.insert('ClientRecords', {
                nombre:           c.nombre   || '',
                telefono:         telNorm    || tel || '',
                correo:           c.correo   || c.email || '',
                origen:           'consigna',
                vendedorAsignado: vendedorEmail  || '',
                vendedorNombre:   vendedorNombre || '',
                ultimaActividad:  new Date(),
                // estatusExpediente deliberadamente ausente — consigna no usa pipeline comprador
              }, SA);

          return crearOActualizar.then((cliente) => {
          const clienteId = (cliente && cliente._id) || '';
          const vehiculo = [c.marca, c.modelo, c.anio, c.version].filter(Boolean).join(' ') || c.interes || '';

          // ALead tipo consigna para que aparezca en el inbox
          const insertLead = clienteId
            ? wixData.insert('ALeads', {
                nombre:           c.nombre   || '',
                telefono:         c.telefono || '',
                correo:           c.correo   || c.email || '',
                tipo:             'consigna',
                interes:          vehiculo,
                resumen:          vehiculo + (c.precio ? ' · $' + Number(c.precio).toLocaleString('es-MX') : ''),
                estatusLead:      'asignado',
                vendedorAsignado: vendedorEmail  || '',
                vendedorNombre:   vendedorNombre || '',
                origen:           c.origen || 'Sitio web',
                pagina:           'Consigna',
                clienteId,
                fechaAsignacion:  new Date(),
              }, SA).catch(() => null)
            : Promise.resolve(null);

          // Actualizar Consigna con vendedor + clienteId
          const updateConsigna = wixData.update('Consignas', Object.assign({}, c, {
            vendedorAsignado: vendedorEmail  || '',
            vendedorNombre:   vendedorNombre || '',
            estatusConsigna:  'asignada',
            clienteId:        clienteId || c.clienteId || '',
          }), SA);

          return Promise.all([insertLead, updateConsigna]).then(() => {
            registrarActividad({
              tipo: 'lead_reclamado',
              clienteId,
              entidadTipo: 'consigna', entidadId: realId,
              vendedorEmail,
              vendedorNombre,
              metadata: { nombre: c.nombre, tipo: 'consigna' },
              eventKey: `lead_reclamado:cons-${realId}:${vendedorEmail}`,
            }).catch(() => {});
            return {
              ok:      true,
              cliente: clienteId ? { _id: clienteId, nombre: c.nombre || '' } : null,
            };
          });
        });
      })
      })
      .catch((e) => ({ ok: false, error: String(e) }));
  }

  if (leadId && leadId.startsWith('vta-')) {
    const realId = leadId.slice(4);
    return wixData.get('VerificaAuto', realId, SA)
      .then((v) => {
        if (v.vendedorAsignado) {
          return { ok: false, error: 'Esta verificación ya fue reclamada por otro vendedor.' };
        }
        // Dedup por teléfono — VerificaAuto usa clienteTelefono
        const tel = String(v.clienteTelefono || '').replace(/\D/g, '');
        let telNorm = tel;
        if (telNorm.length === 13 && telNorm.startsWith('521')) telNorm = telNorm.slice(3);
        else if (telNorm.length === 12 && telNorm.startsWith('52')) telNorm = telNorm.slice(2);
        const variantes = telNorm.length === 10
          ? [telNorm, '52' + telNorm, '521' + telNorm]
          : (telNorm ? [telNorm] : []);

        const buscarDup = variantes.length
          ? wixData.query('ClientRecords').hasSome('telefono', variantes).limit(1).find(SA).catch(() => ({ items: [] }))
          : Promise.resolve({ items: [] });

        return buscarDup.then((dupR) => {
          const clienteExistente = dupR.items[0] || null;
          const crearOActualizar = clienteExistente
            ? wixData.update('ClientRecords', Object.assign({}, clienteExistente, {
                ultimaActividad: new Date(),
                ...((!clienteExistente.vendedorAsignado && vendedorEmail) ? { vendedorAsignado: vendedorEmail, vendedorNombre: vendedorNombre || '' } : {}),
              }), SA)
            : wixData.insert('ClientRecords', {
                nombre:           v.clienteNombre    || '',
                telefono:         telNorm || tel      || '',
                correo:           '',
                origen:           'verifica_auto',
                vendedorAsignado: vendedorEmail  || '',
                vendedorNombre:   vendedorNombre || '',
                ultimaActividad:  new Date(),
                // estatusExpediente deliberadamente ausente — VerificaAuto no usa pipeline comprador
              }, SA);

          return crearOActualizar.then((cliente) => {
            const clienteId = (cliente && cliente._id) || '';

            // ALead tipo verificacion para inbox
            const insertLead = clienteId
              ? wixData.insert('ALeads', {
                  nombre:           v.clienteNombre    || '',
                  telefono:         v.clienteTelefono  || '',
                  correo:           '',
                  tipo:             'verificacion',
                  interes:          v.autoDescripcion  || '',
                  resumen:          'Verificación: ' + (v.autoDescripcion || '') + (v.vin ? ' · VIN: ' + v.vin : ''),
                  estatusLead:      'asignado',
                  vendedorAsignado: vendedorEmail  || '',
                  vendedorNombre:   vendedorNombre || '',
                  origen:           'Sitio web',
                  pagina:           'Verifica tu Auto',
                  clienteId,
                  fechaAsignacion:  new Date(),
                }, SA).catch(() => null)
              : Promise.resolve(null);

            // Actualizar VerificaAuto con vendedor + clienteId
            const updateVta = wixData.update('VerificaAuto', Object.assign({}, v, {
              vendedorAsignado: vendedorEmail  || '',
              vendedorNombre:   vendedorNombre || '',
              clienteId:        clienteId || v.clienteId || '',
            }), SA);

            return Promise.all([insertLead, updateVta]).then(() => {
              registrarActividad({
                tipo: 'lead_reclamado',
                clienteId,
                entidadTipo: 'verificacion', entidadId: realId,
                vendedorEmail,
                vendedorNombre,
                metadata: { nombre: v.clienteNombre, tipo: 'verificacion' },
                eventKey: `lead_reclamado:vta-${realId}:${vendedorEmail}`,
              }).catch(() => {});
              return {
                ok:      true,
                cliente: clienteId ? { _id: clienteId, nombre: v.clienteNombre || '' } : null,
              };
            });
          });
        });
      })
      .catch((e) => ({ ok: false, error: String(e) }));
  }
  return wixData.get('ALeads', leadId, SA)
    .then((lead) => {
      if (lead.vendedorAsignado) {
        return { ok: false, error: 'Este lead ya fue reclamado por otro vendedor.' };
      }
      const tel = String(lead.telefono || '').replace(/\D/g, '');
      // Verificar si ya existe ClientRecord con ese teléfono (anti-duplicado)
      const buscarDup = tel
        ? wixData.query('ClientRecords').hasSome('telefono', [tel, '52'+tel, '521'+tel]).limit(1).find(SA).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });

      return buscarDup.then((dupR) => {
        const clienteExistente = dupR.items[0] || null;
        // Marcar lead como asignado/convertido en ALeads
        const updateLead = wixData.update('ALeads', Object.assign({}, lead, {
          vendedorAsignado: vendedorEmail,
          vendedorNombre:   vendedorNombre,
          estatusLead:      clienteExistente ? 'convertido' : 'asignado',
          fechaAsignacion:  new Date(),
        }), SA);

        // Crear ClientRecord solo si no existe duplicado
        const crearCliente = clienteExistente
          ? Promise.resolve(clienteExistente)
          : wixData.insert('ClientRecords', {
              nombre:              lead.nombre    || '',
              telefono:            tel            || lead.telefono || '',
              correo:              lead.correo    || lead.email || '',
              origen:              lead.pagina    || lead.origen || 'Sitio web',
              vehiculoInteres:     lead.interes   || lead.resumen || '',
              notas:               lead.resumen   || '',
              vendedorAsignado:    vendedorEmail,
              vendedorNombre:      vendedorNombre,
              estatusExpediente:   'nuevo_lead',
              departamentoActual:  'Vendedor',
              ultimaActividad:     new Date(),
              leadId:              leadId,
            }, SA).catch(() => null);

        return Promise.all([updateLead, crearCliente]).then(([, cliente]) => {
          registrarActividad({
            tipo: 'lead_reclamado',
            leadId,
            clienteId:  (cliente && cliente._id) || lead.clienteId || '',
            entidadTipo: 'lead', entidadId: leadId,
            vendedorEmail,
            vendedorNombre,
            metadata: { nombre: lead.nombre, origen: lead.origen, tipo: lead.tipo },
            eventKey: `lead_reclamado:${leadId}:${vendedorEmail}`,
          }).catch(() => {});
          return {
            ok:     true,
            cliente: cliente ? { _id: cliente._id, nombre: cliente.nombre } : null,
            yaExistia: !!clienteExistente,
          };
        });
      });
    })
    .catch((e) => ({ ok: false, error: String(e) }));
}


// ─── ASIGNAR / REASIGNAR LEAD (Gerencia / Admin) ─────────────────
/**
 * Gerencia o Admin asigna o reasigna un lead a cualquier vendedor.
 * Para desasignar, pasa vendedorEmail = '' y vendedorNombre = ''.
 */
export function asignarLead(leadId, vendedorEmail, vendedorNombre) {
  // F2-03: solo Gerencia y Administración pueden asignar leads a terceros
  return wixUsersBackend.currentUser.getEmail()
    .catch(function() { return ''; })
    .then(function(actorEmail) {
      if (!actorEmail) {
        return { ok: false, error: 'No autenticado. Inicia sesión para asignar leads.' };
      }
      return obtenerRol(actorEmail)
        .then(function(rol) {
          if (_ROLES_PRIVILEGIADOS_LEADS.indexOf(normalizarRol(rol)) === -1) {
            return { ok: false, error: 'No autorizado: solo Gerencia y Administración pueden asignar leads.' };
          }
          return _asignarLeadInterno(leadId, vendedorEmail, vendedorNombre);
        })
        .catch(function(e) { return { ok: false, error: String(e) }; });
    });
}

function _asignarLeadInterno(leadId, vendedorEmail, vendedorNombre) {
  // ── Consigna ────────────────────────────────────────────────────
  if (leadId && leadId.startsWith('cons-')) {
    const realId = leadId.slice(5);
    const est = vendedorEmail ? 'asignada' : 'nueva';
    return wixData.get('Consignas', realId, SA)
      .then((c) => {
        const updateConsigna = wixData.update('Consignas', Object.assign({}, c, {
          vendedorAsignado: vendedorEmail  || '',
          vendedorNombre:   vendedorNombre || '',
          estatusConsigna:  est,
        }), SA);
        // Propagar al ClientRecord si la consigna ya tiene clienteId
        const updateCliente = c.clienteId
          ? wixData.get('ClientRecords', c.clienteId, SA)
              .then((cr) => wixData.update('ClientRecords', Object.assign({}, cr, {
                vendedorAsignado: vendedorEmail  || '',
                vendedorNombre:   vendedorNombre || '',
              }), SA))
              .catch(() => null)
          : Promise.resolve(null);
        return Promise.all([updateConsigna, updateCliente]);
      })
      .then(() => {
        if (vendedorEmail) {
          registrarActividad({
            tipo: 'lead_asignado',
            entidadTipo: 'consigna', entidadId: realId,
            vendedorEmail,
            vendedorNombre,
            metadata: { vendedorNombre, vendedorEmail },
            eventKey: `lead_asignado:cons-${realId}:${vendedorEmail}:${Math.floor(Date.now()/(5*60*1000))}`,
          }).catch(() => {});
        }
        return { ok: true };
      })
      .catch((e) => ({ ok: false, error: String(e) }));
  }

  // ── VerificaAuto ─────────────────────────────────────────────────
  if (leadId && leadId.startsWith('vta-')) {
    const realId = leadId.slice(4);
    return wixData.get('VerificaAuto', realId, SA)
      .then((v) => {
        const updateVta = wixData.update('VerificaAuto', Object.assign({}, v, {
          vendedorAsignado: vendedorEmail  || '',
          vendedorNombre:   vendedorNombre || '',
        }), SA);
        // Propagar al ClientRecord si VerificaAuto ya tiene clienteId
        const updateCliente = v.clienteId
          ? wixData.get('ClientRecords', v.clienteId, SA)
              .then((cr) => wixData.update('ClientRecords', Object.assign({}, cr, {
                vendedorAsignado: vendedorEmail  || '',
                vendedorNombre:   vendedorNombre || '',
              }), SA))
              .catch(() => null)
          : Promise.resolve(null);
        return Promise.all([updateVta, updateCliente]);
      })
      .then(() => {
        if (vendedorEmail) {
          registrarActividad({
            tipo: 'lead_asignado',
            entidadTipo: 'verificacion', entidadId: realId,
            vendedorEmail,
            vendedorNombre,
            metadata: { vendedorNombre, vendedorEmail },
            eventKey: `lead_asignado:vta-${realId}:${vendedorEmail}:${Math.floor(Date.now()/(5*60*1000))}`,
          }).catch(() => {});
        }
        return { ok: true };
      })
      .catch((e) => ({ ok: false, error: String(e) }));
  }

  // ── Lead normal ──────────────────────────────────────────────────
  // Captura lead + actor en paralelo para tener ambos disponibles al registrar actividad
  var _lead = null;
  return Promise.all([
    wixData.get('ALeads', leadId, SA),
    wixUsersBackend.currentUser.getEmail().catch(() => ''),
  ]).then(([lead, actorEmail]) => {
    _lead = lead;
    const updateLead = wixData.update('ALeads', Object.assign({}, lead, {
      vendedorAsignado: vendedorEmail  || '',
      vendedorNombre:   vendedorNombre || '',
      estatusLead:      vendedorEmail ? 'asignado' : 'nuevo',
      fechaAsignacion:  vendedorEmail ? new Date() : (lead.fechaAsignacion || null),
    }), SA);

    // Propagar al ClientRecord si el lead ya tiene clienteId (fue reclamado antes)
    const clienteIdRef = lead.clienteId || '';
    const updateCliente = clienteIdRef
      ? wixData.get('ClientRecords', clienteIdRef, SA)
          .then((cr) => wixData.update('ClientRecords', Object.assign({}, cr, {
            vendedorAsignado: vendedorEmail  || '',
            vendedorNombre:   vendedorNombre || '',
          }), SA))
          .catch(() => null)
      : Promise.resolve(null);

    return Promise.all([updateLead, updateCliente]).then(() => actorEmail);
  })
  .then((actorEmail) => {
    if (vendedorEmail) {
      registrarActividad({
        tipo: 'lead_asignado',
        leadId,
        clienteId:   _lead.clienteId || '',
        entidadTipo: 'lead', entidadId: leadId,
        vendedorEmail,
        vendedorNombre,
        metadata: {
          vendedorNombre,
          vendedorEmail,
          asignadoPorEmail: actorEmail,
        },
        eventKey: `lead_asignado:${leadId}:${_lead.vendedorAsignado||''}:${vendedorEmail}:${Math.floor(Date.now()/(5*60*1000))}`,
      }).catch(() => {});
    }
    return { ok: true };
  })
  .catch((e) => ({ ok: false, error: String(e) }));
}


// ─── ACTUALIZAR ESTATUS DE LEAD ───────────────────────────────────
/**
 * Cambia el estatus de un lead.
 * estatusLead: 'nuevo' | 'asignado' | 'contactado' | 'cerrado'
 */
export function actualizarEstatusLead(leadId, nuevoEstatus) {
  if (leadId && leadId.startsWith('cons-')) {
    const realId = leadId.slice(5);
    const est = nuevoEstatus === 'cerrado' ? 'cerrada' : nuevoEstatus === 'asignado' ? 'asignada' : 'nueva';
    return wixData.get('Consignas', realId, SA)
      .then((c) => wixData.update('Consignas', Object.assign({}, c, { estatusConsigna: est }), SA))
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: String(e) }));
  }
  if (leadId && leadId.startsWith('vta-')) {
    const realId = leadId.slice(4);
    const st = nuevoEstatus === 'cerrado' ? 'Listo' : nuevoEstatus === 'contactado' ? 'En proceso' : 'Pendiente';
    return wixData.get('VerificaAuto', realId, SA)
      .then((v) => wixData.update('VerificaAuto', Object.assign({}, v, { status: st }), SA))
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: String(e) }));
  }
  return wixData.get('ALeads', leadId, SA)
    .then((lead) => wixData.update('ALeads', Object.assign({}, lead, { estatusLead: nuevoEstatus }), SA))
    .then(() => ({ ok: true }))
    .catch((e) => ({ ok: false, error: String(e) }));
}

// Guarda el clienteId en el ALeads para que la deduplicación de contactos funcione
// y el lead no aparezca como duplicado después de ser convertido.
export function vincularClienteALead(leadId, clienteId) {
  if (!leadId || !clienteId || leadId.startsWith('cons-') || leadId.startsWith('vta-')) {
    return Promise.resolve({ ok: true });
  }
  return wixData.get('ALeads', leadId, SA)
    .then((lead) => wixData.update('ALeads', Object.assign({}, lead, { clienteId, estatusLead: 'cerrado' }), SA))
    .then(() => ({ ok: true }))
    .catch((e) => ({ ok: false, error: String(e) }));
}


// ─── CREAR LEAD Y VINCULAR CLIENTE (ruta segura para páginas públicas) ──
/**
 * Inserta un lead en ALeads y lo vincula al ClientRecord, todo desde backend
 * con suppressAuth. Úsalo desde páginas públicas para eliminar la necesidad
 * de abrir ALeads.Create / ALeads.Update a visitantes.
 *
 * @returns {Promise<object>} El lead insertado (igual que crearLead)
 */
export async function crearLeadYVincular(datos) {
  return crearLead(datos);
}

export async function actualizarClienteIdLead(leadId, clienteId) {
  if (!leadId || !clienteId) return { ok: true };
  try {
    const lead = await wixData.get('ALeads', leadId, SA);
    await wixData.update('ALeads', Object.assign({}, lead, { clienteId }), SA);
    return { ok: true };
  } catch (e) {
    console.error('[backend-leads] actualizarClienteIdLead:', e);
    return { ok: false, error: String(e) };
  }
}

// ─── WHATSAPP (interno) ───────────────────────────────────────────
const TIPO_LABEL = {
  lead:          '🚗 Lead de inventario',
  consigna:      '🔄 Solicitud de consigna',
  credito:       '💳 Solicitud de crédito',
  prueba_manejo: '🏁 Prueba de manejo',
};

function _notificarWhatsApp(lead) {
  const etiqueta = TIPO_LABEL[lead.tipo] || '📋 Lead nuevo';
  const lineas = [
    `*${etiqueta}*`,
    `👤 *${lead.nombre}*`,
    `📱 ${lead.telefono}`,
  ];
  if (lead.correo)  lineas.push(`✉️ ${lead.correo}`);
  if (lead.interes) lineas.push(`🚘 ${lead.interes}`);
  if (lead.resumen && lead.resumen !== lead.interes) lineas.push(`📝 ${lead.resumen}`);
  lineas.push(`📍 ${lead.pagina || lead.origen}`);
  const mensaje = lineas.join('\n');

  // Opción A — Webhook (Make / Zapier / n8n)
  if (WHATSAPP_WEBHOOK_URL) {
    return fetch(WHATSAPP_WEBHOOK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mensaje, nombre: lead.nombre, telefono: lead.telefono, correo: lead.correo, tipo: lead.tipo, interes: lead.interes, pagina: lead.pagina }),
    });
  }

  // Opción B — Twilio directo
  if (TWILIO_ACCOUNT_SID && NUMEROS_DESTINO.length) {
    return Promise.all(NUMEROS_DESTINO.map((dest) => _notificarTwilio(mensaje, dest)));
  }

  return Promise.resolve();
}

function _notificarTwilio(mensaje, destino) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credencial = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({ From: TWILIO_WHATSAPP_FROM, To: destino, Body: mensaje }).toString();
  return fetch(url, {
    method:  'POST',
    headers: { 'Authorization': `Basic ${credencial}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

function _normalizar(str) {
  return String(str || '').toLowerCase().replace(/[áéíóú]/g, (c) => ({ á:'a', é:'e', í:'i', ó:'o', ú:'u' }[c]));
}
