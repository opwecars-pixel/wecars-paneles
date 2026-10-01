# AUDITORÍA MAESTRA — WECARS BAJÍO ERP
**Documento vivo — actualizado con cada fase ejecutada**
*Iniciado: 2026-08-22 | Última actualización: 2026-08-22*

---

## ÍNDICE
1. [Arquitectura del Sistema](#arquitectura)
2. [Mapa de Colecciones CMS](#colecciones)
3. [Mapa de Mensajes postMessage](#mensajes)
4. [Mapa de BroadcastChannel](#broadcast)
5. [Diagnóstico Maestro](#diagnostico)
6. [Plan de Fases](#fases)
7. [Bitácora de Ejecución](#bitacora)

---

## 1. ARQUITECTURA DEL SISTEMA {#arquitectura}

### Patrón arquitectural
WeCars Bajío es un ERP construido en **Wix Studio + Velo**. El patrón base es:

```
Wix Page (.js Velo)  ←──postMessage──→  HTML iframe (panel)
        │
        ├── imports backend/*.jsw  (funciones de servidor)
        │         ├── wix-data (CMS queries)
        │         └── otros backends (permisos, actividades, etc.)
        │
        └── BroadcastChannel 'wecars-erp-v2'  (sync entre paneles)
```

### Módulos / Paneles
| Panel | URL | Archivo Velo | Archivo HTML |
|-------|-----|--------------|--------------|
| Vendedor | /panel-vendedores | pagina-panel-vendedores.js | pagina-panel-vendedores.html |
| Gerencia | /panel-gerencia | pagina-gerencia.js | pagina-gerencia.html |
| Finanzas | /panel-finanzas | pagina-finanzas.js | pagina-finanzas.html |
| Administración | /panel-administracion | pagina-administracion.js | pagina-administracion.html |
| Créditos web | /solicitud-credito | pagina-creditos.js | pagina-creditos.html / solicitud-credito.html |
| Registro rápido | /registro-rapido | pagina-registro-rapido.js | registro-rapido.html |
| Subir documentos | /subir-documentos | pagina-subir-documentos.js | pagina-subir-documentos.html |

### Backends (.jsw)
| Archivo | Responsabilidad |
|---------|----------------|
| permisos.jsw | Fuente de verdad de roles (obtenerPerfil, obtenerRol) |
| datos.jsw | Carga masiva de datos para dashboards (fetch*) |
| creditos.jsw | State machine de créditos (ÚNICA fuente) |
| leads.jsw | Gestión de leads (ALeads + Consignas + VerificaAuto) |
| flujo.jsw | State machine de expedientes (ClientRecords) |
| actividades.jsw | Registro y consulta de actividades / KPIs |
| clientes.jsw | findOrCreateCliente (deduplicación por teléfono) |
| expediente.jsw | Página pública: documentos y datos fiscales del cliente |
| media.jsw | Upload de fotos, resolución de URLs de Wix |
| notificaciones.jsw | Emails transaccionales vía wix-crm-backend |
| siteConfig.jsw | Configuración ERP en CMS (ConfigERP) |
| gamificacion-cms.jsw | CRUD de tabla GamificacionMensual |

---

## 2. MAPA DE COLECCIONES CMS {#colecciones}

| Colección | Fuente principal | Lectores | Estado |
|-----------|-----------------|----------|--------|
| **ClientRecords** | clientes.jsw, flujo.jsw | Todos los paneles | ✅ Activa |
| **Usuarios** | pagina-gerencia.js, pagina-administracion.js | permisos.jsw, actividades.jsw | ✅ Activa |
| **ALeads** | leads.jsw | Todos los paneles | ✅ Activa |
| **Cars** | pagina-administracion.js | flujo.jsw, datos.jsw | ✅ Activa |
| **Creditos** | creditos.jsw | Finanzas, Admin, Gerencia, Vendedor | ✅ Activa |
| **Activities** | actividades.jsw | Panel vendedor, Gerencia | ✅ Activa |
| **Opportunities** | datos.jsw, flujo.jsw | Panel vendedor | ✅ Activa |
| **Ventas** | flujo.jsw | datos.jsw, Gerencia | ✅ Activa |
| **Comisiones** | pagina-finanzas.js | datos.jsw | ✅ Activa |
| **Facturas** | pagina-finanzas.js | datos.jsw | ✅ Activa |
| **Pagos** | pagina-finanzas.js | datos.jsw | ✅ Activa |
| **Documents** | expediente.jsw | Panel vendedor | ✅ Activa |
| **Historial** | flujo.jsw | pagina-gerencia.js | ✅ Activa |
| **Consignas** | leads.jsw | Admin, Gerencia | ✅ Activa |
| **SolicitudesCompra** | pagina-panel-vendedores.js | Admin | ✅ Activa |
| **Tasks** | datos.jsw | Vendedor, Gerencia, Admin | ✅ Activa |
| **citas** (minúscula) | pagina-panel-vendedores.js | datos.jsw | ⚠️ Nombre inconsistente |
| **Citas** (mayúscula) | pagina-gerencia.js | — | ⚠️ Nombre inconsistente |
| **GamificacionMensual** | gamificacion-cms.jsw | Panel vendedor, Gerencia | ✅ Activa |
| **ConfigERP** | siteConfig.jsw | siteConfig.jsw | ✅ Activa |
| **CierreOperacion** | pagina-gerencia.js, pagina-administracion.js | — | ✅ Activa |
| **CreditApplications** | pagina-creditos.js (LEGACY) | Nadie | ❌ Colección legacy sin usar |
| **VerificaAuto** | leads.jsw | Gerencia, Admin | ✅ Activa |
| **Configuracion** | pagina-administracion.js (permisos-erp) | — | ✅ Activa |

---

## 3. MAPA DE MENSAJES POSTMESSAGE {#mensajes}

### Mensajes sin handler (enviados desde HTML, ignorados por Velo)
| Tipo | Enviado por | Handler | Impacto |
|------|------------|---------|---------|
| `wecars-lead-convertir` | panel-vendedores.html | ❌ Panel Vendedor NO tiene handler | CRÍTICO — botón silencioso |
| `wecars-scroll-top` | panel-vendedores.html | ❌ Sin handler | Bajo — notificación ignorada |
| `wecars-modal-abierto/cerrado` | panel-vendedores.html | ❌ Sin handler | Bajo — intencional |

### Mensajes Velo→HTML sin consumidor conocido
| Tipo | Emitido por | Observación |
|------|------------|-------------|
| `wecars-tarea-debug` | pagina-gerencia.js | Debug code — eliminar antes de producción |

---

## 4. MAPA DE BROADCASTCHANNEL {#broadcast}

Canal: `'wecars-erp-v2'`

| Tipo BC | Emitido por | Escuchado por | Estado |
|---------|------------|---------------|--------|
| `wecars-estado-update` | todos los paneles | panel-vendedores.html | ✅ OK |
| `wecars-venta-cerrada` | gerencia, vendedor | panel-vendedores.html | ✅ OK |
| `wecars-comision-pagada-bc` | finanzas | panel-vendedores.html | ✅ OK |
| `wecars-inventario-nuevo` | administracion | panel-vendedores.html | ✅ OK |
| `wecars-tarea-asignada` | gerencia, admin | panel-vendedores.html | ✅ OK |
| `wecars-cliente-nuevo` | vendedor, gerencia, admin | panel-vendedores.html | ✅ OK |
| `credito-nuevo` | panel-vendedores.js | panel-vendedores.html | ✅ OK |
| `wecars-credito-update` | pagina-finanzas.js, pagina-administracion.js | ? | ⚠️ No hay handler BC explícito |
| `credito-estado-actualizado` | creditos.jsw (BACKEND) | panel-vendedores.html | ❌ BroadcastChannel en backend — falla silenciosamente |
| `ge-nota-vendedor` | pagina-gerencia.js | panel-vendedores.html | ⚠️ Nombre inconsistente (HTML envía `wecars-nota-vendedor`, BC emite `ge-nota-vendedor`) |
| `wecars-cierre-creado/actualizado` | gerencia, admin | ❌ Nadie escucha | ⚠️ BC sin consumidor |
| `wecars-solicitud-compra-nueva` | panel-vendedores.js | ❌ Nadie escucha | ⚠️ BC sin consumidor |

---

## 5. DIAGNÓSTICO MAESTRO {#diagnostico}

### 🔴 CRÍTICOS — Rompen funcionalidad ahora mismo

**[C-001] Import roto en Finanzas**
- **Archivo:** `Codigos Velo/pagina-finanzas.js` línea 21
- **Problema:** `import { avanzarEstadoCredito } from 'backend/backend-creditos.jsw'` — el archivo real en Wix se llama `creditos.jsw` (sin prefijo `backend-`). Este import falla en tiempo de carga del módulo, lo que significa que TODO el módulo de finanzas puede romper (dependiendo de cómo Wix maneja imports fallidos en módulos ES).
- **Impacto:** El flujo completo de avance de créditos desde Finanzas está roto. Cualquier dictamen (Aprobar/Rechazar) silenciosamente falla.
- **Acción:** CORREGIR — cambiar import a `'backend/creditos.jsw'`

**[C-002] `wecars-lead-convertir` sin handler en Panel Vendedor**
- **Archivo:** `pagina-panel-vendedores.js`
- **Problema:** El HTML del panel de vendedores tiene botón "Convertir lead a cliente" que envía `wecars-lead-convertir`. El Velo de esta página no tiene handler para ese tipo. El mensaje se pierde silenciosamente.
- **Impacto:** Los vendedores no pueden convertir leads desde su panel.
- **Acción:** IMPLEMENTAR — agregar handler en pagina-panel-vendedores.js (copiar lógica de gerencia.js)

**[C-003] BroadcastChannel en código de backend**
- **Archivo:** `Codigos Velo/backend-creditos.js` líneas 296-307
- **Problema:** `new BroadcastChannel('wecars-erp-v2')` en un archivo `.jsw` que corre en el servidor de Wix. `BroadcastChannel` es exclusivamente una API de browser. El `try/catch` silencia el error, pero la notificación en tiempo real de cambios de estado de crédito nunca llega.
- **Impacto:** Cuando Finanzas aprueba/rechaza un crédito, los otros paneles no se actualizan en tiempo real vía backend.
- **Acción:** CORREGIR — eliminar el BroadcastChannel del backend. El BC ya está correctamente implementado en los Velos de página (pagina-finanzas.js línea 66, pagina-administracion.js). El backend no debe intentar hacer BC.

**[C-004] Colección `citas` vs `Citas` (case-sensitive)**
- **Archivos:** `pagina-panel-vendedores.js` (inserta en `'citas'`) vs `pagina-gerencia.js` (consulta `'Citas'`)
- **Problema:** En Wix CMS los nombres de colección son case-sensitive. `'citas'` y `'Citas'` son colecciones diferentes. Las citas que crean los vendedores no aparecen en la vista de Gerencia.
- **Impacto:** Gerencia ve 0 citas aunque los vendedores las creen.
- **Acción:** NORMALIZAR — definir el nombre correcto y unificar en ambos archivos.

**[C-005] Double insert en página de créditos web**
- **Archivo:** `pagina-creditos.js`
- **Problema:** Al recibir una solicitud de crédito web, el código inserta en `CreditApplications` (legacy) Y llama `crearCredito()` que inserta en `Creditos`. Quedan registros huérfanos en `CreditApplications` que ningún panel lee.
- **Impacto:** Datos inconsistentes. Cada solicitud web genera 2 registros.
- **Acción:** CORREGIR — eliminar el insert en `CreditApplications`. Solo usar `crearCredito()`.

---

### 🟠 IMPORTANTES — Degradan funcionalidad significativamente

**[I-001] `fetchDatosVendedor` devuelve TODOS los clientes sin filtrar por vendedor**
- **Archivo:** `Codigos Velo/backend-datos.js`
- **Problema:** La función no tiene `.eq('vendedorAsignado', email)` en la query de ClientRecords. Devuelve hasta 500 registros de todos los vendedores. El filtrado ocurre en el HTML del panel.
- **Impacto:** (1) Carga innecesaria de datos. (2) Riesgo de privacidad: un vendedor con acceso al tráfico de red puede ver clientes de otros. (3) Con 40 vendedores, 500 clientes por vendedor = base que crece rápido.
- **Acción:** CORREGIR — agregar `.eq('vendedorAsignado', email)` en la query de ClientRecords dentro de `fetchDatosVendedor`. Mantener sin filtro para rol Gerencia/Admin.

**[I-002] suppressAuth (SA) en Velo de página es ignorado**
- **Archivos:** Todos los archivos `.js` de página (BT-002, BT-026)
- **Problema:** `const SA = { suppressAuth: true }` en archivos `.js` de página Velo es ignorado por Wix — solo funciona en `.jsw` de backend. Todas las operaciones `wixData.insert/update/get` en los paneles que usen SA fallan si los permisos de la colección requieren admin.
- **Impacto:** Si las colecciones tienen permisos restrictivos, las operaciones de escritura de los paneles fallan silenciosamente para usuarios no-admin.
- **Acción:** CONSULTAR con usuario — se requiere definir los permisos de cada colección en Wix CMS y verificar cuáles están en modo restrictivo. La solución es mover las operaciones al backend (.jsw) donde SA sí funciona.

**[I-003] Gamificación deshabilitada en Admin**
- **Archivo:** `pagina-administracion.js`
- **Problema:** Los handlers de `wecars-gm-obtener-mes` y `wecars-gm-lista-meses` devuelven arrays vacíos hardcodeados. No usan `gamificacion-cms.jsw`.
- **Impacto:** La vista de Liga/Gamificación en el panel de Administración siempre aparece vacía.
- **Acción:** IMPLEMENTAR — conectar los handlers al backend de gamificación igual que en Gerencia.

**[I-004] Subida de fotos de carros siempre falla en Admin**
- **Archivo:** `pagina-administracion.js`
- **Problema:** `subirFotoCarroBackend` está redefinida localmente como stub que siempre devuelve `{ok: false, error: 'No disponible'}`. La función real de `backend/media.jsw` existe pero nunca se importa en Admin.
- **Impacto:** Ningún admin puede subir fotos de carros desde el iframe.
- **Acción:** CORREGIR — importar `subirFotoCarroBackend` de `backend/media.jsw` y eliminar el stub local.

**[I-005] Nombre de campo incorrecto en `wecars-consigna-asignar`**
- **Archivo:** `pagina-administracion.js`
- **Problema:** Al asignar una consigna, escribe `estatus: 'Asignada'` pero el resto del sistema (leads.jsw, filtros) usa el campo `estatusConsigna`.
- **Impacto:** Las consignas asignadas desde Admin no cambian su `estatusConsigna` y siguen apareciendo como no asignadas en los filtros.
- **Acción:** CORREGIR — cambiar `estatus` por `estatusConsigna` en el handler.

**[I-006] Offset UTC-6 hardcodeado (no considera horario de verano)**
- **Archivo:** `Codigos Velo/backend-actividades.js`
- **Problema:** El "día operativo" usa UTC-6 fijo. México usa CDT (UTC-5) de marzo a noviembre. Durante ~6 meses al año, el día operativo queda desfasado 1 hora.
- **Impacto:** Actividades y KPIs del día pueden estar mal agrupadas durante el verano.
- **Acción:** CORREGIR — usar offset dinámico según la fecha.

**[I-007] `wecars-tarea-debug` en producción**
- **Archivo:** `pagina-gerencia.js`
- **Problema:** El Velo de Gerencia emite mensajes de tipo `wecars-tarea-debug` hacia el HTML — código de depuración que nunca debió llegar a producción.
- **Acción:** CORREGIR — eliminar.

---

### 🟡 MENORES — Inconsistencias y deuda técnica

**[M-001] CSVs de demo con esquema diferente al código**
- Los archivos en `Datos Demo CMS/` usan nombres de campo distintos a los que el código espera:
  - `ALeads.csv`: `fuente` → código usa `origen`; `estatus` → código usa `estatusLead`; `vendedorId` → código usa `vendedorAsignado`
  - `Activities.csv`: `vendedorId` → código usa `vendedorEmail`
  - `Cars.csv`: `precio` → código usa `priceNew`/`precioVenta`; `estatus` → código usa `estatusVenta`
  - `Creditos.csv`: valores de estatus (`activo`, `preaprobado`) vs state machine (`solicitud_enviada`, etc.)
  - `Comisiones.csv`: `pct` → código usa `comisionPorcentaje`
- **Acción:** NORMALIZAR los CSVs o crear un script de migración si ya hay datos en producción.

**[M-002] Funciones exportadas pero nunca importadas**
- `esGerente`, `esGerenteOAdministracion` (permisos.jsw) — nadie las usa
- `construirNotificacion` (flujo.jsw) — documentación, no código real
- `notificarEmpleadoNuevo`, `notificarAutoEstatus`, `notificarConsignaNueva`, `notificarInactividad`, `notificarReporteSemanal` (notificaciones.jsw) — nunca se llaman
- `registrarIncidencia`, `fetchActividadesEquipo`, `fetchKpisVendedor` (actividades.jsw) — no se usan
- `insertarConsigna` (datos.jsw) — archivo de consignas no está en repo
- **Acción:** CONSERVAR (son extensiones futuras documentadas). Verificar que `recordatorios.jsw` existe en Wix (lo usan `notificarInactividad` y `notificarReporteSemanal`).

**[M-003] Duplicación de código entre paneles**
- `enviarLeadsGerencia`, `enviarLeadsAdmin`, `enviarLeadsFinanzas` — lógica casi idéntica en 3 archivos
- Lógica de `wecars-lead-convertir` duplicada entre gerencia y admin
- **Acción:** BACKLOG — no bloquea; candidato para refactorización futura.

**[M-004] `notificarEmpleadoNuevo` nunca se llama al crear empleado**
- Cuando Gerencia o Admin crean un empleado nuevo, la función de notificación existe pero no se invoca.
- **Acción:** IMPLEMENTAR — agregar llamada en los handlers de `wecars-empleado-crear`.

**[M-005] `notificarAutoEstatus` nunca se llama al cambiar estatus de carro**
- **Acción:** IMPLEMENTAR — agregar en flujo.jsw al cambiar estatus de Cars.

**[M-006] `ge-nota-vendedor` vs `wecars-nota-vendedor` (BC inconsistente)**
- Gerencia emite BC `ge-nota-vendedor` pero debería ser consistente con el tipo del postMessage.
- **Acción:** NORMALIZAR — verificar qué escucha el HTML de vendedor y unificar.

**[M-007] `fetchLeads` para Vendedor no incluye VerificaAuto**
- Los leads de verificación de auto solo los ven Gerencia/Admin.
- **Acción:** CONSULTAR — ¿debe el vendedor ver solicitudes VerificaAuto que le hayan sido asignadas?

**[M-008] IDs compuestos fake en leads (cons-xxx, vta-xxx)**
- leads.jsw crea IDs como `'cons-' + consigna._id` para unificar tipos. Si algún código hace `wixData.get('ALeads', 'cons-xxx')` fallará.
- **Acción:** REVISAR — confirmar que ningún panel hace get por ese ID compuesto.

---

## 6. PLAN DE FASES {#fases}

> **Regla de oro:** Cada fase termina con una auditoría de verificación. No se avanza hasta confirmar que la fase anterior no introdujo regresiones.

### FASE 1 — Correcciones Críticas (C-001 a C-005)
**Objetivo:** Eliminar los 5 bugs que rompen funcionalidad ahora mismo.

| # | Tarea | Archivo | Tipo |
|---|-------|---------|------|
| 1.1 | Corregir import roto en Finanzas | pagina-finanzas.js línea 21 | CORREGIR |
| 1.2 | Agregar handler `wecars-lead-convertir` en Panel Vendedor | pagina-panel-vendedores.js | IMPLEMENTAR |
| 1.3 | Eliminar BroadcastChannel del backend de créditos | backend-creditos.js líneas 296-307 | CORREGIR |
| 1.4 | Normalizar nombre de colección citas (`citas` → `Citas` o viceversa) | pagina-panel-vendedores.js + pagina-gerencia.js | NORMALIZAR |
| 1.5 | Eliminar double-insert en página de créditos web | pagina-creditos.js | CORREGIR |

**Verificación Fase 1:** Confirmar que el panel de Finanzas carga sin errores de módulo, que el botón de convertir lead funciona en el panel de vendedor, y que las citas creadas por vendedores aparecen en Gerencia.

---

### FASE 2 — Correcciones Importantes (I-001 a I-007)
**Objetivo:** Restaurar funcionalidad degradada silenciosamente.

| # | Tarea | Archivo | Tipo |
|---|-------|---------|------|
| 2.1 | Filtrar `fetchDatosVendedor` por vendedorEmail | backend-datos.js | CORREGIR |
| 2.2 | Conectar gamificación en Admin | pagina-administracion.js | IMPLEMENTAR |
| 2.3 | Corregir import de `subirFotoCarroBackend` en Admin | pagina-administracion.js | CORREGIR |
| 2.4 | Corregir campo `estatusConsigna` en handler de Admin | pagina-administracion.js | CORREGIR |
| 2.5 | Corregir offset UTC dinámico en actividades | backend-actividades.js | CORREGIR |
| 2.6 | Eliminar `wecars-tarea-debug` de Gerencia | pagina-gerencia.js | CORREGIR |

**Nota sobre I-002 (suppressAuth):** Este ítem requiere decisión del usuario sobre los permisos de cada colección en Wix CMS. Se trata como CONSULTAR — se incluye en la verificación de Fase 2 pero la solución completa depende de la respuesta.

**Verificación Fase 2:** Verificar que Admin puede subir fotos, que las consignas asignadas cambian de estado correctamente, que la gamificación aparece en Admin, y que los vendedores solo ven sus clientes.

---

### FASE 3 — Normalización de Datos (M-001, M-006)
**Objetivo:** Alinear los CSVs de demo con el esquema real del código y eliminar inconsistencias de nombres.

| # | Tarea | Archivo | Tipo |
|---|-------|---------|------|
| 3.1 | Actualizar CSVs de demo con campos correctos | Datos Demo CMS/*.csv | NORMALIZAR |
| 3.2 | Normalizar BC `ge-nota-vendedor` → `wecars-nota-vendedor` | pagina-gerencia.js + panel HTML | NORMALIZAR |
| 3.3 | Verificar que `recordatorios.jsw` existe en Wix | — | VERIFICAR |

**Verificación Fase 3:** Importar CSVs corregidos y verificar que los paneles muestran datos correctamente.

---

### FASE 4 — Implementaciones Pendientes (M-004, M-005, M-007)
**Objetivo:** Conectar funciones que existen en backend pero nunca se llaman.

| # | Tarea | Archivo | Tipo |
|---|-------|---------|------|
| 4.1 | Llamar `notificarEmpleadoNuevo` al crear empleado | pagina-gerencia.js, pagina-administracion.js | IMPLEMENTAR |
| 4.2 | Llamar `notificarAutoEstatus` al cambiar estatus de carro | flujo.jsw | IMPLEMENTAR |
| 4.3 | [CONSULTAR] ¿Vendedor debe ver VerificaAuto asignados? | leads.jsw | CONSULTAR |

**Verificación Fase 4:** Crear empleado y verificar recepción de email. Cambiar estatus de carro y verificar notificación.

---

### FASE 5 — Auditoría Visual y UX
**Objetivo:** Verificar que la identidad visual de WeCars es consistente en todos los paneles.

- Revisar consistencia de paleta de colores entre paneles
- Revisar consistencia de tipografía y espaciado
- Revisar responsive en mobile/tablet
- Verificar estados de loading, vacío y error en todos los paneles
- Verificar mensajes de feedback al usuario (toasts, alertas)

---

### FASE 6 — Auditoría de Seguridad y Permisos
**Objetivo:** Resolver BT-002/BT-026 (suppressAuth en page-level) con decisiones concretas.

- Definir permisos de cada colección en Wix CMS
- Mover operaciones críticas de escritura al backend (.jsw)
- Verificar que ningún usuario de rol incorrecto puede llegar a un panel no autorizado
- Revisar que `obtenerPerfil()` se llama antes de cualquier operación sensible

---

### FASE 7 — QA End-to-End
**Objetivo:** Validar flujos completos de principio a fin.

**Flujo 1:** Lead web → crédito web → panel Finanzas → dictamen → notificación vendedor
**Flujo 2:** Registro rápido → expediente vendedor → estado Admin → Finanzas → cierre → comisión
**Flujo 3:** Consigna → asignación Admin → seguimiento vendedor → cierre
**Flujo 4:** Nuevo empleado → Gerencia crea → notificación → aparece en selects de paneles
**Flujo 5:** Gamificación — vendedor registra actividades → Gerencia cierra mes → liga final

---

### FASE 8 — Auditoría Final
**Objetivo:** Re-leer todos los archivos modificados. Confirmar que no hay regresiones. Declarar el proyecto listo para producción.

---

## 7. BITÁCORA DE EJECUCIÓN {#bitacora}

### Pre-Fase (Completado: 2026-08-22)
- [x] Lectura de todos los backends (.jsw)
- [x] Lectura de todos los Velo de página (.js)
- [x] Lectura de esquemas CSV
- [x] Construcción del mapa completo del sistema
- [x] Diagnóstico maestro
- [x] Plan de fases

### Fase 1 — COMPLETADA (2026-08-22)

| Bug | Archivo | Cambio | Estado |
|-----|---------|--------|--------|
| C-001 | pagina-finanzas.js:21 | `'backend/backend-creditos.jsw'` → `'backend/creditos.jsw'` | ✅ |
| C-002 | pagina-panel-vendedores.js:~365 | Handler `wecars-lead-convertir` insertado (24 líneas) | ✅ |
| C-003 | backend-creditos.js:296-307 | Eliminado bloque `BroadcastChannel` de servidor | ✅ |
| C-004 | pagina-gerencia.js:305 | `'Citas'`→`'citas'`, `createdAt`→`_createdDate` | ✅ |
| C-005 | pagina-creditos.js:194-238 | Flujo secuencial: crearCredito→creditoId→CreditApplications.update | ✅ |

**Requisito pendiente de usuario para C-005:** Agregar campo `creditoId` (Texto) a la colección `CreditApplications` en Wix CMS Editor.

### Fase 2 — EN PROGRESO (2026-08-22)

**I-001 — COMPLETADO**
| Ítem | Archivo | Cambio | Estado |
|------|---------|--------|--------|
| I-001 | backend-datos.js:54-109 | fetchDatosVendedor usa wixUsersBackend.currentUser internamente; filtra ClientRecords y Opportunities por vendedor autenticado; reduce Activities a limit(300) | ✅ |

**I-002 — DIAGNÓSTICO COMPLETO (sin implementar)**
Ver sección de diagnóstico en el cuerpo del documento. Requiere auditoría de permisos CMS antes de cualquier cambio de código.

**N-003 — COMPLETADO (2026-08-22)**
| Campo | Valor |
|-------|-------|
| Archivo | `Codigos Velo/pagina-detalle.js` |
| Cambio import | Línea 16: agregado `import { crearCredito } from 'backend/creditos.jsw';` |
| Cambio handler | Líneas 118-231: handler `wecars-credito` normalizado al mismo flujo secuencial de `pagina-creditos.js` |
| Flujo nuevo | CreditApplications.insert → crearLead → findOrCreateCliente → [etapa1: ALeads.clienteId, etapa2: crearCredito → creditoId → CreditApplications.{clienteId,creditoId}] |
| Anti-duplication | crearCredito() tiene guarda interna por clienteId activo (yaExistia=true si ya existe) |
| Error handling | Si crearCredito falla: CreditApplications preserva clienteId, creditoId='' (rastreable); no hay orphan total |
| Estado | ✅ IMPLEMENTADO |

**Mapa final de puntos de entrada de crédito (post N-003):**
| Punto | Archivo | CreditApplications | ALeads | ClientRecords | Creditos | Estado |
|-------|---------|-------------------|--------|---------------|----------|--------|
| Solicitud web completa | pagina-creditos.js | ✅ insert | ✅ insert | ✅ findOrCreate | ✅ crearCredito | COMPLETO |
| Detalle de auto | pagina-detalle.js | ✅ insert | ✅ crearLead | ✅ findOrCreate | ✅ crearCredito | COMPLETO ← **corregido N-003** |
| ERP vendedor | pagina-panel-vendedores.js | no aplica | no aplica | ✅ | ✅ crearCredito | CORRECTO |
| Backend (función) | backend-creditos.js | no aplica | no aplica | actualiza creditoActivoId | ✅ insert | FUENTE ÚNICA |

**I-004 — COMPLETADO (2026-08-22)**
| Ítem | Archivo | Cambio | Estado |
|------|---------|--------|--------|
| I-004 stub eliminado | pagina-administracion.js:28-30 | Eliminada función stub local `subirFotoCarroBackend()` | ✅ |
| I-004 import conectado | pagina-administracion.js:28 | `import { subirFotoCarroBackend } from 'backend/media.jsw';` | ✅ |

**Flujo I-004 corregido:**
`HTML → postMessage {wecars-foto-subir, carroId, base64} → subirFotoCarroBackend (backend/media.jsw) → mediaManager.upload('/wecars/carros') → publicUrl → Cars.fotos[].push(url) + Cars.fotoPrincipal → postMessage {wecars-foto-resultado, ok:true, carro}`

**Fuente de verdad fotos:** `Cars.fotos[]` + `Cars.fotoPrincipal` — compatible con catálogo (pagina-creditos.js lee campo `fotos` en POSIBLES_GALERIA).

**Hallazgo de seguridad registrado en backlog:** `carroId` viene del iframe sin validación de pertenencia — riesgo bajo (página solo para admins autenticados), pero registrado para fase 6.

**I-005 — COMPLETADO (2026-08-22)**

**Campo canónico determinado:** `estatusConsigna` (evidencia: usado consistentemente en backend-leads.js y pagina-gerencia.js; `estatus` en este contexto era error de pagina-administracion.js)

**Valores del state machine de Consignas:**
- `'nueva'` — recién creada, sin vendedor asignado
- `'asignada'` — vendedor asignado
- `'cerrada'` — vehículo cerrado / ingresado a inventario

**Bugs corregidos:**

| Bug | Archivo | Línea | Antes | Después | Estado |
|-----|---------|-------|-------|---------|--------|
| I-005a | pagina-administracion.js:230 | wecars-consigna-asignar | `estatus: 'Asignada'` | `estatusConsigna: 'asignada'` | ✅ |
| I-005b | pagina-administracion.js:229 | wecars-consigna-asignar | `vendedorEmail` | `vendedorAsignado` (campo leído por backend-leads.js) | ✅ |
| I-005c | pagina-administracion.js:242 | wecars-consigna-cerrar | `estatus: 'Cerrada'` | `estatusConsigna: 'cerrada'` | ✅ |
| I-005d | backend-datos.js:148 | insertarConsigna | sin estatusConsigna en insert | `Object.assign({ estatusConsigna: 'nueva' }, datos)` | ✅ |

**Nota sobre registros históricos:** consignas creadas antes del fix carecen de `estatusConsigna`. Admin y Gerencia las siguen viendo (sin filtro). Vendedores no las encontraban antes ni las encontrarán ahora vía `eq('estatusConsigna','nueva')` — esto era el comportamiento pre-existente, no un regreso. El fix solo corrige comportamiento hacia adelante.

**Auditoría de segundo orden (post-fix):**
Todas las escrituras a `Consignas`: usan `estatusConsigna` ✅
Todas las lecturas de `Consignas` que filtran por estado: usan `estatusConsigna` ✅
Campo `estatus` en contexto Consignas: eliminado completamente ✅

**Hallazgo adicional (backlog Fase 6):** `pagina-administracion.js:219` — query de Consignas sin `suppressAuth: true`. Si la colección tiene permisos restrictivos puede fallar silenciosamente. Registrado para auditoría de permisos.

**I-003 — COMPLETADO (2026-08-22)**

**Causa raíz:** Los handlers `wecars-gm-obtener-mes` y `wecars-gm-lista-meses` en `pagina-administracion.js` eran stubs que devolvían arrays vacíos. Comentario original: *"desactivada hasta que gamificacion-cms.jsw esté en backend"*. El backend existe (`gamificacion-cms.js`) y ya estaba en uso por Gerencia y Vendedor.

**Fuente de verdad única:** Colección `GamificacionMensual` — escrita por el panel Vendedor (`gm_guardar`), leída por Gerencia y ahora también por Admin (`gm_obtenerMes`, `gm_listasMeses`). Los tres módulos leen la misma colección ✅.

**Metas:** `ConfigERP` → claves `meta_ventas_mensual` (default:10) y `meta_equipo_mensual` (default:12). Son exclusivas de Gerencia — Admin no las necesita (solo ve ranking, no performance management).

**Cambios realizados:**

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `pagina-administracion.js:28` | `import { gm_obtenerMes, gm_listasMeses } from 'backend/gamificacion-cms.jsw';` | ✅ |
| `pagina-administracion.js:366-377` | Stubs reemplazados por llamadas reales a `gm_obtenerMes` y `gm_listasMeses` | ✅ |

**Hallazgo de diseño (no bug):** `GamificacionMensual.ventasMes` es empujado por el HTML del vendedor, no calculado desde `Ventas` collection en backend. Si el vendedor no abre el panel ese mes, `ventasMes` puede ser 0 o stale. Registrado para fase 7 (QA).

---

*Este documento se actualiza con cada fase completada.*
