/**
 * weCars ERP v2 — Contratos de mensajes postMessage
 * Fuente única de tipos de mensaje entre iframe ↔ Velo.
 * Incluir en cada panel: <script src="../shared/wecars-messages.js"></script>
 */

const WC = {

  /* ── Tipos de mensaje saliente (iframe → Velo) ─── */
  OUT: {
    READY:            'wecars-ready',           // iframe listo, pide contexto de usuario
    RESIZE:           'wecars-resize',           // {height}
    NAVIGATE:         'wecars-navigate',         // {url} navegar a otra página Wix

    // Clientes / prospectos
    CLIENTE_BUSCAR:   'wecars-cliente-buscar',   // {q, filtros}
    CLIENTE_CREAR:    'wecars-cliente-crear',    // {datos}
    CLIENTE_EDITAR:   'wecars-cliente-editar',   // {clienteId, cambios}
    CLIENTE_GET:      'wecars-cliente-get',      // {clienteId}

    // Leads
    LEAD_CREAR:       'wecars-lead-crear',       // {datos}
    LEAD_EDITAR:      'wecars-lead-editar',      // {leadId, cambios}
    LEAD_LISTAR:      'wecars-lead-listar',      // {filtros}

    // Actividades
    ACTIVIDAD_CREAR:  'wecars-actividad-crear',  // {datos}
    ACTIVIDAD_LISTAR: 'wecars-actividad-listar', // {clienteId}

    // Inventario
    CARS_LISTAR:      'wecars-cars-listar',      // {filtros}
    CARS_GET:         'wecars-cars-get',         // {carroId}
    CARS_CREAR:       'wecars-cars-crear',       // {datos}
    CARS_EDITAR:      'wecars-cars-editar',      // {carroId, cambios}

    // Foto
    FOTO_SUBIR:       'wecars-foto-subir',       // {carroId, base64, fileName, mimeType}

    // Expediente documentos
    DOC_SUBIR:        'wecars-doc-subir',        // {entidadTipo, entidadId, tipo, base64, fileName}
    DOC_LISTAR:       'wecars-doc-listar',       // {entidadTipo, entidadId}

    // Citas
    CITA_CREAR:       'wecars-cita-crear',       // {datos}
    CITA_EDITAR:      'wecars-cita-editar',      // {citaId, cambios}
    CITA_LISTAR:      'wecars-cita-listar',      // {filtros}

    // Tareas
    TAREA_CREAR:      'wecars-tarea-crear',      // {datos}
    TAREA_EDITAR:     'wecars-tarea-editar',     // {tareaId, cambios}

    // Operaciones
    APARTADO_CREAR:   'wecars-apartado-crear',   // {datos}
    CIERRE_CREAR:     'wecars-cierre-crear',     // {datos}
  },

  /* ── Tipos de mensaje entrante (Velo → iframe) ─── */
  IN: {
    CONTEXTO:         'wecars-contexto',         // {usuario, rol, sucursal, permisos}
    ERROR:            'wecars-error',            // {codigo, mensaje, detalle?}

    CLIENTE_RESULTADO:'wecars-cliente-resultado',// {ok, cliente?, error?}
    CLIENTES_LISTA:   'wecars-clientes-lista',   // {items, total, pagina}
    LEAD_RESULTADO:   'wecars-lead-resultado',   // {ok, lead?, error?}
    LEADS_LISTA:      'wecars-leads-lista',      // {items, total}
    ACTIVIDADES_LISTA:'wecars-actividades-lista',// {items}

    CARS_LISTA:       'wecars-cars-lista',       // {items, total}
    CARRO_RESULTADO:  'wecars-carro-resultado',  // {ok, carro?, creado?, error?}
    FOTO_RESULTADO:   'wecars-foto-resultado',   // {ok, url?, error?}
    DOC_RESULTADO:    'wecars-doc-resultado',    // {ok, url?, error?}
    DOCS_LISTA:       'wecars-docs-lista',       // {items}

    CITAS_LISTA:      'wecars-citas-lista',      // {items}
    CITA_RESULTADO:   'wecars-cita-resultado',   // {ok, cita?, error?}
    TAREAS_LISTA:     'wecars-tareas-lista',     // {items}
    TAREA_RESULTADO:  'wecars-tarea-resultado',  // {ok, tarea?, error?}

    APARTADO_RESULTADO:'wecars-apartado-resultado',// {ok, apartado?, error?}
    CIERRE_RESULTADO: 'wecars-cierre-resultado', // {ok, cierre?, error?}

    REALTIME_UPDATE:  'wecars-realtime-update',  // {coleccion, id, accion}
  },

  /* ── Helper: enviar mensaje al padre (Velo) ─────── */
  send(tipo, payload = {}) {
    window.parent.postMessage({ type: tipo, ...payload }, '*');
  },

  /* ── Helper: registrar handler de entrada ────────── */
  on(tipo, handler) {
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === tipo) handler(e.data);
    });
  },

  /* ── Helper: registrar múltiples handlers ────────── */
  onMany(mapa) {
    window.addEventListener('message', (e) => {
      if (!e.data || !e.data.type) return;
      const handler = mapa[e.data.type];
      if (handler) handler(e.data);
    });
  },
};

/* Exponer globalmente */
window.WC = WC;
