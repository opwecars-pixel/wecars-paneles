# Backlog Técnico — weCars Bajío ERP
**Última actualización:** 2026-08-25  
**Estado del proyecto:** Auditoría arquitectural transversal completada — Fase A en ejecución  
**Regla:** Ningún elemento de este Backlog se implementa sin autorización explícita.

---

## Leyenda de prioridades
- 🔴 **CRÍTICO** — Riesgo de corrupción de datos, pérdida de funcionalidad o falla silenciosa en producción
- 🟠 **ALTO** — Afecta a múltiples usuarios, causa comportamiento incorrecto o inconsistente
- 🟡 **MEDIO** — Degradación de rendimiento o experiencia, pero sistema funciona
- 🟢 **BAJO** — Mejora de mantenibilidad, legibilidad o rendimiento marginal

---

## ÍNDICE RÁPIDO

| ID | Prioridad | Módulo | Categoría | Estado |
|----|-----------|--------|-----------|--------|
| BT-001 | 🔴 CRÍTICO | Vendedores | Seguridad | ✅ RESUELTO — Fase E-1 (2026-08-02) |
| BT-002 | 🔴 CRÍTICO | Todos | Arquitectura | 🔄 E-2 INVÁLIDA — suppressAuth ignorado en página. Rediseño pendiente |
| BT-026 | 🔴 CRÍTICO | Gerencia/Finanzas/Admin | Arquitectura | suppressAuth en página pre-existente — todos ignorados. Scope ampliado |
| BT-003 | 🟠 ALTO | Vendedores | Rendimiento | ✅ RESUELTO — 2026-08-18 |
| BT-004 | 🟠 ALTO | Admin | Rendimiento | Pendiente |
| BT-005 | 🟠 ALTO | Finanzas | Rendimiento | ✅ RESUELTO — 2026-08-18 |
| BT-006 | 🟠 ALTO | Todos | Conectividad | Pendiente |
| BT-007 | 🟠 ALTO | Vendedores | Arquitectura | ✅ RESUELTO — 2026-08-18 |
| BT-008 | 🟠 ALTO | Gerencia/Finanzas | Conectividad | Pendiente |
| BT-009 | 🟡 MEDIO | Usuarios CMS | Datos | Pendiente |
| BT-010 | 🟡 MEDIO | Vendedores | Rendimiento | ✅ RESUELTO — 2026-08-18 |
| BT-011 | 🟡 MEDIO | Gerencia | Rendimiento | Pendiente |
| BT-012 | 🟡 MEDIO | Admin | Rendimiento | Pendiente |
| BT-013 | 🟡 MEDIO | Finanzas | Rendimiento | Pendiente |
| BT-014 | 🟡 MEDIO | Vendedores | Mantenibilidad | Pendiente |
| BT-015 | 🟡 MEDIO | CMS | Arquitectura | Pendiente |
| BT-016 | 🟡 MEDIO | Vendedores | Conectividad | ✅ RESUELTO — 2026-08-18 |
| BT-017 | 🟡 MEDIO | Todos | Backend | ✅ RESUELTO — 2026-08-18 |
| BT-018 | 🟡 MEDIO | Todos | Backend | Pendiente |
| BT-019 | 🟢 BAJO | Todos | Mantenibilidad | Pendiente |
| BT-020 | 🟢 BAJO | Vendedores | UX | Pendiente |
| BT-021 | 🟢 BAJO | Todos | Rendimiento | Pendiente |
| BT-022 | 🟢 BAJO | CMS | Arquitectura | Pendiente |
| BT-023 | 🟠 ALTO | Admin | Funcionalidad incompleta | Pendiente — requiere investigación |
| BT-024 | 🟠 ALTO | Admin | Bug — tipo de retorno | Pendiente — requiere investigación |
| BT-025 | 🟡 MEDIO | Admin | Route muerta — native upload | Pendiente — requiere investigación |
| **BT-027** | 🔴 CRÍTICO | Todos | Arquitectura — escritura concurrente | Pendiente |
| **BT-028** | 🔴 CRÍTICO | Finanzas | Bug — `estatusFinanciero` paralelo | Pendiente |
| **BT-029** | 🟠 ALTO | Todos | Arquitectura — `EF` copiado 3 veces | Pendiente |
| **BT-030** | 🟠 ALTO | Todos | Arquitectura — `_rA()` copiado 3 veces | Pendiente |
| **BT-031** | 🟠 ALTO | Todos | Arquitectura — `CR_ESTADOS` copiado 4 veces | Pendiente |
| **BT-032** | 🟠 ALTO | Vendedores/Gerencia | Bug — `esGanado()`/`esPerdido()` incompatibles | Pendiente |
| **BT-033** | 🟠 ALTO | Vendedores | Bug — kanban usa `c.estatus` legacy no `estatusExpediente` | Pendiente |
| **BT-034** | 🟠 ALTO | Todos | Core — `resolverEstadoCliente` no compartida entre paneles | Pendiente — Fase C |
| **BT-035** | 🟡 MEDIO | Vendedores/Gerencia | Inconsistencia — umbral estancamiento 3 vs 7 días | Pendiente — decisión de negocio |
| **BT-036** | 🟡 MEDIO | Vendedores/Gerencia | Duplicación — `ETAPAS_PIPELINE` + `normalizarEtapa()` en 2 paneles | Pendiente |
| **BT-037** | 🟡 MEDIO | Todos | Seguridad — postMessage usa `'*'` como targetOrigin | Pendiente |
| **BT-038** | 🟢 BAJO | Todos | Duplicación — sidebar/resize/logout en 4 paneles | Pendiente — Fase E |
| **BT-039** | 🟢 BAJO | Todos | Arquitectura — `ESTATUS_LIST` hardcodeado 4 veces | Pendiente |

---

## DETALLE DE ELEMENTOS

---

### BT-001
**ID:** BT-001  
**Prioridad:** 🔴 CRÍTICO  
**Módulo:** Vendedores (backend)  
**Archivo:** `Codigos Velo/backend-flujo.js`  
**Categoría:** Seguridad  
**Fase origen:** Auditoría maestra (VEL-019)

**Estado:** ✅ RESUELTO — Fase E-1 (2026-08-02)  
**Solución aplicada:** Cambiado `if (rol && rol !== 'Gerencia' && !rolesOk.includes(rol))` por `if (!rol || (rol !== 'Gerencia' && !rolesOk.includes(rol)))` en línea 141 de `backend-flujo.js`.

**Descripción:**  
La función `avanzarEstado()` tiene una comprobación de rol que puede ser eludida si el rol es vacío o nulo. La condición actual es `if (rol && rol !== 'Gerencia' && ...)`, lo que significa que si `rol = ''` o `rol = null`, la condición entera falla silenciosamente y el usuario pasa el filtro de permisos sin tener el rol correcto.

**Beneficio esperado:**  
Garantizar que ningún usuario sin rol asignado pueda avanzar estados restringidos. Cierre de brecha de seguridad.

**Riesgo de no hacerlo:**  
Un vendedor sin perfil completo en el CMS (campo rol vacío) puede avanzar expedientes a cualquier estado, incluyendo `venta_cerrada`, sin autorización. Con 40 vendedores, la probabilidad de un registro de Usuarios incompleto es real.

**Riesgo de implementarlo:**  
Bajo. El cambio está contenido en `backend-flujo.js` dentro de la función `avanzarEstado`. No afecta la firma de la función ni sus llamadores.

**Dependencias:**  
Ninguna. Independiente.

**Complejidad estimada:** Baja (1 archivo, 1 condición)  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Mínimo (el usuario con rol vacío recibirá un error explícito en lugar de un avance silencioso)  
**Impacto en mantenimiento:** Positivo — la lógica de permisos se vuelve clara y auditable

---

### BT-002
**ID:** BT-002  
**Prioridad:** 🔴 CRÍTICO  
**Módulo:** Todos los paneles  
**Archivo:** `Codigos Velo/pagina-panel-vendedores.js`, `pagina-gerencia.js`, `pagina-finanzas.js`, `pagina-administracion.js`  
**Categoría:** Arquitectura (suppressAuth en código de página)  
**Fase origen:** Auditoría maestra (VEL-002, VEL-003, VEL-006, VEL-007)

**Descripción:**  
En los 4 archivos de página Velo hay llamadas directas a `wixData.insert()` / `wixData.update()` con `suppressAuth: true`. Esta opción es **silenciosamente ignorada en código de página** — solo funciona en archivos `.jsw` de backend. Las escrituras ocurren con los permisos del usuario autenticado, lo que puede fallar si las colecciones tienen permisos restrictivos configurados en el CMS.

**Beneficio esperado:**  
Garantizar que todas las escrituras críticas (Historial, Activities, Citas, Tasks, etc.) lleguen al CMS sin errores de permisos.

**Riesgo de no hacerlo:**  
Fallas silenciosas de escritura al CMS para usuarios con rol no-admin. Los datos se pierden sin notificación visible al usuario.

**Riesgo de implementarlo:**  
Alto — requiere crear funciones backend y mover lógica de los 4 archivos de página. Mayor superficie de cambio del proyecto.

**Dependencias:**  
Completar primero las fases anteriores (backend establecido y estable). Programado para Fase 7.

**Complejidad estimada:** Alta (4 archivos de página + nuevas funciones backend)  
**Impacto en rendimiento:** Positivo (backend es más eficiente para escrituras con suppressAuth real)  
**Impacto en UX:** Ninguno visible  
**Impacto en mantenimiento:** Muy positivo — escrituras centralizadas y auditables

---

### BT-003
**ID:** BT-003  
**Prioridad:** 🟠 ALTO  
**Módulo:** Vendedores  
**Archivo:** `HTML/pagina-panel-vendedores.html`  
**Categoría:** Rendimiento (triple init)  
**Fase origen:** Auditoría de renders (VEL-005)

**Descripción:**  
En `pagina-panel-vendedores.js`, las funciones `enviarClientes()`, `enviarInventarioPanel()` y `enviarComisiones()` se llaman dos veces dentro del mismo bloque `$w.onReady` (líneas 41-43 y 249-251). El HTML puede recibir los datos 2-3 veces y ejecutar `renderTodo()` 2-3 veces en el primer segundo de carga.

**Beneficio esperado:**  
Eliminar parpadeo visual en carga inicial. Reducir llamadas al backend de 3-6 a 3 (una por tipo de dato).

**Riesgo de no hacerlo:**  
Con 40 vendedores usando el panel simultáneamente, el servidor Wix recibe el doble de peticiones de datos en los primeros segundos de cada sesión.

**Riesgo de implementarlo:**  
Medio — si el segundo bloque de llamadas existe por alguna razón de timing o race condition, eliminar el duplicado puede causar que el HTML no reciba los datos en edge cases.

**Dependencias:**  
Ninguna técnica. Recomendable hacer después de que la Fase 2 esté estable.

**Complejidad estimada:** Baja (1 archivo, eliminar 3 líneas duplicadas)  
**Impacto en rendimiento:** Alto (50% menos llamadas backend en carga inicial)  
**Impacto en UX:** Visible (elimina parpadeo de tabla en el primer segundo)  
**Impacto en mantenimiento:** Positivo

---

### BT-004
**ID:** BT-004  
**Prioridad:** 🟠 ALTO  
**Módulo:** Administración  
**Archivo:** `HTML/pagina-administracion.html`  
**Categoría:** Rendimiento (renders en carga inicial)  
**Fase origen:** Auditoría de renders

**Descripción:**  
`renderDashboard()` se ejecuta hasta 5 veces en carga inicial porque cada uno de los 5 mensajes de datos (`wecars-inventario-datos`, `wecars-comisiones-datos`, `wecars-ventas-datos`, `wecars-facturas-datos`, `wecars-cierres-datos`) llama a `renderDashboard()` individualmente. Los primeros 4 renders muestran KPIs con datos incompletos.

**Beneficio esperado:**  
Reducir de 5 a 1 el número de renders del dashboard en carga. Eliminar visualización de KPIs incorrectos durante los primeros renders parciales.

**Riesgo de no hacerlo:**  
El administrador puede ver cifras incorrectas brevemente al entrar al panel. Con datos financieros, esto puede causar confusión o toma de decisiones sobre datos parciales.

**Riesgo de implementarlo:**  
Medio — requiere un mecanismo de "esperando N mensajes" (contador o flags) que puede introducir bugs de sincronización si algún mensaje llega tardíamente o no llega.

**Dependencias:**  
BT-002 (no dependencia directa, pero si se mueven las escrituras a backend, también conviene consolidar la carga de datos).

**Complejidad estimada:** Media (1 archivo HTML, lógica de contador de mensajes)  
**Impacto en rendimiento:** Alto (5× → 1× render en carga inicial)  
**Impacto en UX:** Alto (elimina KPIs incorrectos brevemente visibles)  
**Impacto en mantenimiento:** Medio (agrega lógica de sincronización)

---

### BT-005
**ID:** BT-005  
**Prioridad:** 🟠 ALTO  
**Módulo:** Finanzas  
**Archivo:** `HTML/pagina-finanzas.html`  
**Categoría:** Rendimiento (render por keystroke)  
**Fase origen:** Auditoría de renders

**Descripción:**  
Los campos de filtro en Finanzas tienen listener de evento `'input'` que llama `renderClientes()` en cada pulsación de tecla. Con hasta 500 registros, cada tecla reconstruye 500 filas del DOM. Una búsqueda típica de 5 caracteres genera 5 reconstrucciones completas del DOM.

**Beneficio esperado:**  
Reducir el trabajo del browser durante búsqueda de ~95%. Mejorar experiencia en dispositivos lentos o con muchos clientes.

**Riesgo de no hacerlo:**  
Degradación progresiva conforme crece el número de clientes. A 500 registros el impacto ya es perceptible en hardware modesto.

**Riesgo de implementarlo:**  
Bajo — un debounce de 200ms es un cambio localizado y seguro. No cambia la lógica de filtrado, solo su frecuencia de ejecución.

**Dependencias:**  
Ninguna.

**Complejidad estimada:** Muy baja (agregar `clearTimeout` / `setTimeout` alrededor de la llamada existente)  
**Impacto en rendimiento:** Alto (elimina 80-95% de renders de búsqueda)  
**Impacto en UX:** Positivo (búsqueda percibida como más fluida)  
**Impacto en mantenimiento:** Ninguno

---

### BT-006
**ID:** BT-006  
**Prioridad:** 🟠 ALTO  
**Módulo:** Gerencia y Finanzas  
**Archivo:** `Codigos Velo/pagina-gerencia.js`, `Codigos Velo/pagina-finanzas.js`  
**Categoría:** Conectividad (funciones stub conectando a backend)  
**Fase origen:** Auditoría maestra (BCK-003, BCK-004)

**Descripción:**  
Las funciones `enviarDatosGerencia()` y `enviarDatosFinanzas()` en los archivos Velo de página actualmente llaman a funciones locales stub en lugar de las funciones reales de `backend/datos.jsw`. Las funciones reales ya existen (`fetchDatosGerencia()`, `fetchDatosFinanzas()`) pero no están importadas ni conectadas. Gerencia y Finanzas trabajan con datos vacíos o simulados.

**Beneficio esperado:**  
Gerencia y Finanzas muestran datos reales del CMS. Es la corrección de conectividad más impactante para el negocio después de Vendedores.

**Riesgo de no hacerlo:**  
Los paneles de Gerencia y Finanzas no sirven de nada sin datos reales. El pipeline de ventas en Gerencia siempre muestra $0.

**Riesgo de implementarlo:**  
Medio — verificar que las firmas de las funciones de backend coincidan con lo que los HTML esperan recibir. Si hay discrepancias en la estructura del payload, los renders HTML fallaran silenciosamente.

**Dependencias:**  
Ninguna técnica directa. Programado para Fase 4.

**Complejidad estimada:** Baja-Media (2 archivos, importar y conectar funciones ya existentes)  
**Impacto en rendimiento:** Positivo (datos reales en lugar de simulados no agrega overhead significativo)  
**Impacto en UX:** Crítico para el negocio (Gerencia ve pipeline real, Finanzas ve clientes reales)  
**Impacto en mantenimiento:** Positivo

---

### BT-007
**ID:** BT-007  
**Prioridad:** 🟠 ALTO  
**Módulo:** Vendedores  
**Archivo:** `HTML/pagina-panel-vendedores.html`  
**Categoría:** Arquitectura (monkey-patch de función)  
**Fase origen:** Auditoría de renders

**Descripción:**  
Al final del script de `pagina-panel-vendedores.html`, `renderTabla` es sobreescrita silenciosamente con un wrapper que agrega lógica de temperatura: `const _orig = renderTabla; renderTabla = function(){ _orig(); ...temperatura... }`. Si el código extra lanza un error, TODAS las llamadas a `renderTabla()` fallan silenciosamente en adelante. Si el wrapper se aplica antes de que `renderTabla` esté declarada, `_orig` captura `undefined`.

**Beneficio esperado:**  
Eliminar punto frágil de falla silenciosa. Mover la lógica de temperatura directamente dentro de `renderTabla` como código explícito.

**Riesgo de no hacerlo:**  
Debugging muy difícil cuando algo falle — el error aparecerá en el wrapper, no en la función original, y la causa raíz no será obvia.

**Riesgo de implementarlo:**  
Bajo — refactorización localizada dentro de 1 archivo HTML.

**Dependencias:**  
Ninguna.

**Complejidad estimada:** Baja  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Ninguno visible  
**Impacto en mantenimiento:** Muy positivo

---

### BT-008
**ID:** BT-008  
**Prioridad:** 🟠 ALTO  
**Módulo:** Gerencia / Finanzas  
**Archivo:** `Codigos Velo/pagina-gerencia.js`, `Codigos Velo/pagina-finanzas.js`  
**Categoría:** Conectividad (datos reales de pipeline)  
**Fase origen:** Screenshots usuario (pipeline siempre en $0)

**Descripción:**  
El panel de Gerencia muestra el pipeline de ventas siempre en $0 porque `enviarDatosGerencia()` no está conectado al backend real. Las tarjetas del pipeline en el HTML reciben un objeto vacío y renderizan ceros. Relacionado con BT-006 pero específicamente el pipeline visual de ventas.

**Beneficio esperado:**  
El gerente puede ver el pipeline real de ventas, oportunidades activas y proyección de ingresos.

**Riesgo de no hacerlo:**  
El panel de Gerencia es inutilizable para toma de decisiones. La razón principal de existencia del panel (visibilidad gerencial) no se cumple.

**Riesgo de implementarlo:**  
Ver BT-006.

**Dependencias:**  
BT-006 (son el mismo cambio de conectividad, desglosados por claridad).

**Complejidad estimada:** Baja-Media  
**Impacto en rendimiento:** Positivo  
**Impacto en UX:** Crítico  
**Impacto en mantenimiento:** Positivo

---

### BT-009
**ID:** BT-009  
**Prioridad:** 🟡 MEDIO  
**Módulo:** CMS / Usuarios  
**Archivo:** Colección `Usuarios` en Wix CMS  
**Categoría:** Datos (inconsistencia de casing en campo rol)  
**Fase origen:** Auditoría maestra

**Descripción:**  
La colección `Usuarios` tiene inconsistencia en el campo `rol`: los registros 1-5 tienen valor `vendedor` (minúsculas) y los registros 6-10 tienen `Vendedor` (TitleCase). El código de `obtenerPerfil()` en `backend-permisos.js` hace comparaciones de rol con strings exactos, lo que puede causar que un vendedor con `rol='vendedor'` no pase verificaciones que esperan `rol='Vendedor'`.

**Beneficio esperado:**  
Consistencia de datos. Eliminación de bugs intermitentes dependientes de qué registro específico tiene el usuario logueado.

**Riesgo de no hacerlo:**  
Bugs difíciles de reproducir — dependen de qué registro específico tiene cada usuario. Podría causar que algunos vendedores no puedan avanzar estados correctamente (BT-001 relacionado).

**Riesgo de implementarlo:**  
Bajo (corrección en CMS directamente), pero requiere que el usuario confirme el campo exacto antes de tocar datos.

**Dependencias:**  
Requiere confirmación del usuario sobre el nombre exacto del campo en el CMS antes de cualquier cambio de código. Programado para Fase 5.

**Complejidad estimada:** Muy baja (corrección en CMS + case-insensitive en código)  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Positivo (elimina acceso inconsistente por rol)  
**Impacto en mantenimiento:** Positivo

---

### BT-010
**ID:** BT-010  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Vendedores  
**Archivo:** `HTML/pagina-panel-vendedores.html`  
**Categoría:** Rendimiento (renderDashboardRico doble)  
**Fase origen:** Auditoría de renders

**Descripción:**  
`renderDashboardRico()` es llamada dos veces durante cada `renderTodo()` cuando la vista activa es 'dashboard': una vez desde `renderStats()` y otra vez condicionalmente al final de `renderTodo()`. Ambas llamadas usan los mismos datos y producen el mismo resultado.

**Beneficio esperado:**  
Reducir en ~30% el tiempo de `renderTodo()` en vista dashboard. Eliminar doble renderizado del componente más pesado del panel.

**Riesgo de no hacerlo:**  
Degradación gradual conforme se agregan más KPIs y gráficas al dashboard.

**Riesgo de implementarlo:**  
Bajo — eliminar la segunda llamada condicional al final de `renderTodo()` y dejar solo la que viene de `renderStats()`.

**Dependencias:**  
Ninguna.

**Complejidad estimada:** Muy baja (eliminar 1 bloque condicional)  
**Impacto en rendimiento:** Medio  
**Impacto en UX:** Ligero (elimina doble parpadeo en vista dashboard)  
**Impacto en mantenimiento:** Positivo

---

### BT-011
**ID:** BT-011  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Gerencia  
**Archivo:** `HTML/pagina-gerencia.html`  
**Categoría:** Rendimiento (renderPipelineStrip doble)  
**Fase origen:** Auditoría de renders

**Descripción:**  
`renderPipelineStrip()` puede ser llamada 2 veces en secuencia rápida cuando ocurre un avance a `venta_cerrada` (que emite tanto `wecars-estado-update` como `wecars-venta-cerrada`). Ambos eventos están mapeados a `renderPipelineStrip()` en el BC handler de Gerencia.

**Beneficio esperado:**  
Eliminar flash visual del pipeline strip al cerrar ventas. Prevenir render con datos intermedios.

**Riesgo de no hacerlo:**  
Flash visual en el panel de Gerencia exactamente cuando se cierra una venta — el momento de mayor visibilidad para el gerente.

**Riesgo de implementarlo:**  
Bajo — un `cancelAnimationFrame`/`requestAnimationFrame` guard localizado.

**Dependencias:**  
Ninguna.

**Complejidad estimada:** Muy baja  
**Impacto en rendimiento:** Bajo  
**Impacto en UX:** Medio (elimina flash en momento clave)  
**Impacto en mantenimiento:** Positivo

---

### BT-012
**ID:** BT-012  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Administración  
**Archivo:** `HTML/pagina-administracion.html`  
**Categoría:** Rendimiento (renderDashboard en acción de tarea)  
**Fase origen:** Auditoría de renders

**Descripción:**  
Cuando el Admin mueve una tarea en el kanban, se llama `renderDashboard()` completo aunque los KPIs financieros (ventas, inventario, comisiones) no cambiaron. Solo `renderPendientes()` sería suficiente.

**Beneficio esperado:**  
Reducir trabajo del browser en acciones frecuentes (mover tareas en kanban).

**Riesgo de no hacerlo:**  
Degradación acumulativa conforme el Admin use el kanban. Cada movimiento de tarea reconstruye todo el dashboard innecesariamente.

**Riesgo de implementarlo:**  
Bajo — verificar que el dashboard no incluye contadores de tareas. Si los incluye, este cambio no aplica.

**Dependencias:**  
Requiere revisar el contenido exacto de `renderDashboard()` para confirmar que no hay contadores de tareas.

**Complejidad estimada:** Baja  
**Impacto en rendimiento:** Medio  
**Impacto en UX:** Positivo  
**Impacto en mantenimiento:** Positivo

---

### BT-013
**ID:** BT-013  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Finanzas  
**Archivo:** `HTML/pagina-finanzas.html`  
**Categoría:** Rendimiento (renderResumen innecesario en estados no financieros)  
**Fase origen:** Auditoría de renders

**Descripción:**  
El BC handler de `wecars-estado-update` en Finanzas llama `renderResumen()` para TODOS los avances de estado, incluyendo los que no tienen impacto financiero (ej: `nuevo` → `contactado`, `contactado` → `cotizacion`). Solo estados como `en_finanzas`, `pago_confirmado`, `facturado`, `venta_cerrada` realmente impactan los KPIs financieros.

**Beneficio esperado:**  
Reducir renders de `renderResumen()` en ~70% del tráfico BC. Con 40 vendedores activos, el impacto es significativo.

**Riesgo de no hacerlo:**  
Escalabilidad degradada con equipo grande. Finanzas reconstruye su dashboard financiero decenas de veces por hora sin razón.

**Riesgo de implementarlo:**  
Bajo — filtrar por `msg.nuevoEstado` antes de llamar `renderResumen()`.

**Dependencias:**  
Requiere conocer la lista completa de estados financieramente relevantes del flujo.

**Complejidad estimada:** Muy baja  
**Impacto en rendimiento:** Alto con equipo grande  
**Impacto en UX:** Ninguno visible  
**Impacto en mantenimiento:** Positivo

---

### BT-014
**ID:** BT-014  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Vendedores  
**Archivo:** `HTML/pagina-panel-vendedores.html`  
**Categoría:** Mantenibilidad (foto stub sin implementar)  
**Fase origen:** Auditoría maestra (VEL-004)

**Descripción:**  
Existe un stub de función para subida de foto de perfil del vendedor que nunca fue implementado. El botón está presente en la UI pero no hace nada funcional.

**Beneficio esperado:**  
Claridad — o se implementa la función o se elimina el botón de la UI para no confundir al usuario.

**Riesgo de no hacerlo:**  
El vendedor puede encontrar un botón que no funciona, generando confusión o reportes de bugs.

**Riesgo de implementarlo:**  
Medio — requiere integrar con Wix Media Manager para subida de archivos.

**Dependencias:**  
Ninguna técnica. Decisión de producto: ¿se quiere la funcionalidad de foto?

**Complejidad estimada:** Media (integración con Wix Media Manager)  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Positivo si se implementa, confuso si queda el botón sin función  
**Impacto en mantenimiento:** Negativo (stub pendiente)

---

### BT-015
**ID:** BT-015  
**Prioridad:** 🟡 MEDIO  
**Módulo:** CMS  
**Archivo:** Colecciones `Creditos` y `CreditApplications`  
**Categoría:** Arquitectura (colecciones duplicadas)  
**Fase origen:** Auditoría maestra (VEL-021)

**Descripción:**  
Existen dos colecciones en el CMS que aparentemente almacenan información de créditos: `Creditos` y `CreditApplications`. No está claro cuál es la canónica. El código de algunos paneles usa una y otros usan la otra, o ambas.

**Beneficio esperado:**  
Eliminar duplicidad. Una sola fuente de verdad para datos de crédito.

**Riesgo de no hacerlo:**  
Datos de crédito inconsistentes entre paneles. Posibles duplicaciones de registros o pérdida de información al escribir en la colección "equivocada".

**Riesgo de implementarlo:**  
Alto — requiere migración de datos y actualización de código en múltiples paneles. Hacer al final del proyecto.

**Dependencias:**  
Requiere auditoría específica de ambas colecciones y todos sus usos en el código antes de tomar cualquier decisión.

**Complejidad estimada:** Alta  
**Impacto en rendimiento:** Positivo (menos consultas)  
**Impacto en UX:** Ninguno visible si se hace correctamente  
**Impacto en mantenimiento:** Muy positivo a largo plazo

---

### BT-016
**ID:** BT-016  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Vendedores  
**Archivo:** `HTML/pagina-panel-vendedores.html`  
**Categoría:** Conectividad (gamificación sin respuesta confirmada)  
**Fase origen:** Auditoría de renders

**Descripción:**  
`renderGamificacion()` envía `wecars-gm-guardar` al Velo para persistir datos de gamificación. El Velo procesa y responde con `wecars-gm-guardado`. Sin embargo, el HTML no tiene ningún handler para `wecars-gm-guardado` — la respuesta de confirmación se pierde silenciosamente. El vendedor no recibe confirmación visual de que sus datos fueron guardados.

**Beneficio esperado:**  
Confirmación visual al vendedor de que su gamificación fue guardada. Posibilidad de mostrar error si el guardado falla.

**Riesgo de no hacerlo:**  
El vendedor no sabe si su gamificación se guardó correctamente. Si hay un error en el backend, pasa desapercibido.

**Riesgo de implementarlo:**  
Bajo — agregar un handler para `wecars-gm-guardado` en el HTML.

**Dependencias:**  
Ninguna.

**Complejidad estimada:** Muy baja  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Positivo (confirmación o error visible)  
**Impacto en mantenimiento:** Positivo

---

### BT-017
**ID:** BT-017  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Todos (backend)  
**Archivo:** `Codigos Velo/backend-datos.js`  
**Categoría:** Backend (errores silenciosos en safeQuery)  
**Fase origen:** Auditoría maestra (VEL-016)

**Descripción:**  
La función `safeQuery()` en `backend-datos.js` captura todos los errores con `.catch(() => ({ items: [] }))`, devolviendo un array vacío en caso de error. Ningún error de consulta al CMS llega al código que llama a la función — simplemente recibe datos vacíos sin saber por qué.

**Beneficio esperado:**  
Visibilidad de errores reales de consulta. Distinción entre "no hay datos" y "falló la consulta".

**Riesgo de no hacerlo:**  
Debugging muy difícil cuando un panel muestra datos vacíos — no hay forma de saber si el CMS está vacío o si la consulta falló.

**Riesgo de implementarlo:**  
Bajo — agregar logging de errores antes de retornar `{ items: [] }`. No cambiar el comportamiento de retorno.

**Dependencias:**  
Ninguna.

**Complejidad estimada:** Muy baja  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Ninguno visible  
**Impacto en mantenimiento:** Muy positivo

---

### BT-018
**ID:** BT-018  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Todos  
**Archivo:** Múltiples archivos HTML  
**Categoría:** Backend / Debugging (console.log de producción)  
**Fase origen:** Auditoría maestra (VEL-013, VEL-024)

**Descripción:**  
Los archivos HTML tienen múltiples `console.log` y `console.debug` de desarrollo activos en producción. Algunos revelan datos de usuarios (nombres, emails, estados). En navegadores con DevTools abiertos, cualquier persona puede ver esta información.

**Beneficio esperado:**  
Eliminar exposición de datos de usuarios en consola. Reducir ruido en debugging real.

**Riesgo de no hacerlo:**  
Exposición de información sensible de clientes y vendedores. No cumple con buenas prácticas de privacidad.

**Riesgo de implementarlo:**  
Muy bajo — eliminación de líneas de log, sin impacto en lógica.

**Dependencias:**  
Ninguna. Hacer al final (Fase 11) para no interferir con debugging durante el desarrollo.

**Complejidad estimada:** Baja (búsqueda y reemplazo en 4 archivos HTML)  
**Impacto en rendimiento:** Marginal positivo  
**Impacto en UX:** Ninguno  
**Impacto en mantenimiento:** Positivo

---

### BT-019
**ID:** BT-019  
**Prioridad:** 🟢 BAJO  
**Módulo:** Todos  
**Archivo:** Todos los archivos Velo de página  
**Categoría:** Mantenibilidad (patrón de mostrarVista)  
**Fase origen:** Auditoría de renders

**Descripción:**  
Finanzas implementa `mostrarVista()` con un mapa de funciones `{ resumen: fn, clientes: fn }[v]?.()` — el patrón más limpio y extensible. Los otros 3 paneles usan cadenas de `if/else`. Unificar el patrón en los 4 paneles haría el código más consistente y fácil de mantener.

**Beneficio esperado:**  
Consistencia de código. Más fácil agregar nuevas vistas en cualquier panel.

**Riesgo de no hacerlo:**  
Ninguno inmediato. Es puramente mantenibilidad.

**Riesgo de implementarlo:**  
Bajo — refactorización de `mostrarVista()` en 3 archivos HTML.

**Dependencias:**  
Ninguna. Hacer al final del proyecto.

**Complejidad estimada:** Baja  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Ninguno  
**Impacto en mantenimiento:** Positivo

---

### BT-020
**ID:** BT-020  
**Prioridad:** 🟢 BAJO  
**Módulo:** Vendedores  
**Archivo:** `HTML/pagina-panel-vendedores.html`  
**Categoría:** UX (venta_cerrada recarga total)  
**Fase origen:** Auditoría de renders

**Descripción:**  
Cuando se cierra una venta, el flujo ejecuta 3 renders en el panel del vendedor: ① `_mostrarTab("historial")`, ② `renderTabla()` por BC update, ③ `renderTodo()` completo por recarga de datos. El tercero es el más costoso y puede causar que el modal de expediente se cierre o se resetee inesperadamente si el vendedor tenía algo abierto.

**Beneficio esperado:**  
Experiencia más fluida al cerrar la venta más importante del flujo. El modal permanece abierto mostrando el estado final.

**Riesgo de no hacerlo:**  
El vendedor puede perder el contexto del modal al cerrar una venta.

**Riesgo de implementarlo:**  
Medio — requiere cambiar la lógica de `wecars-venta-cerrada` para hacer actualización quirúrgica en lugar de recarga total.

**Dependencias:**  
BT-003 (el triple init debe estar resuelto primero para no confundir la causa del problema).

**Complejidad estimada:** Media  
**Impacto en rendimiento:** Medio  
**Impacto en UX:** Alto (momento más importante del flujo del vendedor)  
**Impacto en mantenimiento:** Positivo

---

### BT-021
**ID:** BT-021  
**Prioridad:** 🟢 BAJO  
**Módulo:** Todos  
**Archivo:** Todos los HTML  
**Categoría:** Rendimiento (actualización diferencial de listas)  
**Fase origen:** Auditoría de renders

**Descripción:**  
`renderTabla()`, `renderClientes()`, `renderInventario()` reconstruyen todo el DOM aunque solo cambió 1 registro. Una estrategia de reconciliación (buscar elemento DOM por `data-id`, actualizar solo sus campos) reduciría el trabajo del browser de O(N) a O(1) para actualizaciones unitarias vía BC.

**Beneficio esperado:**  
Eliminación de parpadeo en listas grandes. Con 40+ vendedores activos, el impacto es significativo a escala.

**Riesgo de no hacerlo:**  
Degradación progresiva conforme crece el número de clientes activos en el sistema.

**Riesgo de implementarlo:**  
Alto — requiere que todas las filas/tarjetas tengan `data-id` consistente y que las funciones de render sean refactorizadas para soportar actualización diferencial.

**Dependencias:**  
Todo lo demás debe estar estable primero. Hacer solo si el sistema tiene performance issues reales en producción.

**Complejidad estimada:** Alta  
**Impacto en rendimiento:** Alto a escala  
**Impacto en UX:** Positivo  
**Impacto en mantenimiento:** Complejo

---

### BT-022
**ID:** BT-022  
**Prioridad:** 🟢 BAJO  
**Módulo:** Admin  
**Archivo:** `HTML/pagina-administracion.html`, `Codigos Velo/pagina-administracion.js`  
**Categoría:** Arquitectura (round-trip CMS en BC update)  
**Fase origen:** Auditoría de renders

**Descripción:**  
El BC handler de Admin para `wecars-estado-update` realiza un round-trip completo al CMS (emit → Velo consulta → postMessage de vuelta → render) en lugar de actualizar el estado en la memoria local y renderizar directamente. Agrega ~200ms de latencia por evento.

**Beneficio esperado:**  
Reducir latencia de actualización en Admin de ~200ms a <10ms. Actualización visual inmediata al avanzar estados.

**Riesgo de no hacerlo:**  
El administrador ve un retraso visible de ~200ms en cada actualización de estado que le llega. Con mucho tráfico, puede acumularse.

**Riesgo de implementarlo:**  
Medio — la actualización local en memoria puede quedar desincronizada si el CMS rechaza la operación, aunque `avanzarEstado()` siempre responde antes de emitir el BC.

**Dependencias:**  
Ninguna técnica.

**Complejidad estimada:** Media  
**Impacto en rendimiento:** Medio  
**Impacto en UX:** Ligero positivo  
**Impacto en mantenimiento:** Negativo (mayor complejidad de sincronización)

---

---

### BT-023
**ID:** BT-023  
**Prioridad:** 🟠 ALTO  
**Módulo:** Administración  
**Archivo:** `Codigos Velo/pagina-administracion.js`  
**Categoría:** Funcionalidad incompleta  
**Clasificación de stub:** Funcionalidad incompleta (no deshabilitada intencionalmente — falta conectar)  
**Fase origen:** Fase 3 — investigación previa (2026-08-01)

**Descripción:**  
La función `subirFotoCarroBackend()` en `pagina-administracion.js` (línea 26) es un stub que siempre retorna `{ok: false, error: 'Subida de fotos no disponible'}`. Existe un backend completo en `backend-media.js` (`subirFotoCarroBackend` exportado), pero la página nunca lo importa. La funcionalidad de subir fotos de carros desde el panel de Admin vía base64 está completamente desactivada.

**Causa raíz encontrada durante investigación:**  
El stub no es una desactivación intencional documentada — es una conexión pendiente. Sin embargo, activar el import del backend NO es suficiente porque existe un segundo problema (BT-024): el código Velo que maneja la respuesta del backend asume que `subirFotoCarroBackend()` retorna una URL string, pero el backend retorna un objeto `{ok, wixUrl, url}`.

**Beneficio esperado:**  
El administrador puede subir fotos de carros desde el panel HTML embed.

**Riesgo de no hacerlo:**  
La subida de fotos de carros desde el panel Admin no funciona en absoluto. El admin debe usar otro medio para agregar fotos.

**Riesgo de implementarlo:**  
Medio — requiere corregir simultáneamente BT-024 (tipo de retorno). No activar sin resolver BT-024 primero.

**Dependencias:**  
BT-024 (bug de tipo de retorno debe corregirse al mismo tiempo). BT-025 (investigar si la native button route es la solución alternativa). Requiere aprobación explícita del usuario.

**Complejidad estimada:** Media (1 import + corrección de manejo de retorno)  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Alto (activa funcionalidad completamente rota)  
**Impacto en mantenimiento:** Positivo

---

### BT-024
**ID:** BT-024  
**Prioridad:** 🟠 ALTO  
**Módulo:** Administración  
**Archivo:** `Codigos Velo/pagina-administracion.js` líneas 202-212  
**Categoría:** Bug — tipo de retorno incorrecto  
**Clasificación de stub:** Error de implementación (código que asume tipo incorrecto)  
**Fase origen:** Fase 3 — investigación previa (2026-08-01)

**Descripción:**  
El handler de `wecars-foto-subir` en `pagina-administracion.js` llama `subirFotoCarroBackend()` y asume que retorna una URL string directa: `.then((url) => fotos.push(url))`. Pero el backend exportado retorna un objeto `{ok: boolean, wixUrl: string, url: string}`. Si se activara el import sin corregir este handler, `fotos.push(url)` agregaría el objeto completo al array de fotos del carro en lugar de la URL, corrompiendo los datos de `Cars.fotos`.

**Causa raíz:**  
Discrepancia entre la firma de retorno del backend (`{ok, wixUrl, url}`) y lo que el código Velo de página espera (string directo).

**Beneficio esperado:**  
Corrección de bug latente que se activaría silenciosamente si BT-023 se implementa sin esto.

**Riesgo de no hacerlo:**  
Si BT-023 se implementa sin corregir este bug, los registros de `Cars.fotos` quedarán con objetos en lugar de URLs — datos corruptos en el CMS.

**Riesgo de implementarlo:**  
Bajo — corrección puntual en 2 líneas del handler. La fix correcta es `.then((r) => { if (!r.ok) throw new Error(r.error); fotos.push(r.url); })`.

**Dependencias:**  
Debe implementarse junto con BT-023, no por separado.

**Complejidad estimada:** Muy baja (2 líneas)  
**Impacto en rendimiento:** Ninguno  
**Impacto en UX:** Ninguno visible (previene corrupción silenciosa)  
**Impacto en mantenimiento:** Muy positivo

---

### BT-025
**ID:** BT-025  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Administración  
**Archivo:** `Codigos Velo/pagina-administracion.js` líneas 33-60  
**Categoría:** Route muerta — native upload button  
**Clasificación de stub:** Funcionalidad incompleta (route alternativa sin conectar)  
**Fase origen:** Fase 3 — investigación previa (2026-08-01)

**Descripción:**  
Existe una segunda ruta de subida de fotos en `pagina-administracion.js` usando el botón nativo de Wix `#uploadFotoBtn`. Esta ruta usa `$w(UPLOAD_ID).startUpload()` — el método oficial de Wix que no requiere base64 ni backend custom. Sin embargo, la route está muerta porque: (1) el botón se oculta al inicio (`$w(UPLOAD_ID).hide()`) y nunca se vuelve a mostrar, y (2) `_fotoContext` se inicializa en `null` y nunca se asigna — por lo que el handler `.onChange()` siempre ejecuta `if (!_fotoContext) return` sin hacer nada.

**Contexto adicional:**  
Si esta ruta nativa funcionara, sería preferible a la ruta base64 + backend custom (BT-023/024) porque: usa la API oficial de Wix, no requiere convertir a base64, no tiene límite de 6MB impuesto por FileReader, y no necesita el backend `media.jsw`. Puede ser que esta sea la ruta "correcta" y la ruta base64 fue el primer intento que quedó sin eliminar.

**Beneficio esperado:**  
Claridad sobre qué ruta de subida de fotos debe estar activa. Posible simplificación eliminando la ruta base64 + backend si la ruta nativa es suficiente.

**Riesgo de no hacerlo:**  
Dos rutas incompletas en paralelo — ninguna funciona. Confusión futura de mantenimiento.

**Riesgo de implementarlo:**  
Bajo-medio — requiere identificar desde qué mensaje HTML se debe mostrar `#uploadFotoBtn` y cómo se debe pasar `carroId` para setear `_fotoContext`.

**Dependencias:**  
Decisión sobre BT-023: si se activa la ruta nativa, posiblemente BT-023 y BT-024 no sean necesarios.

**Complejidad estimada:** Baja  
**Impacto en rendimiento:** Positivo (nativo > base64)  
**Impacto en UX:** Alto (activa funcionalidad completamente rota)  
**Impacto en mantenimiento:** Positivo si se elimina la ruta base64

---

## HISTORIAL DE CAMBIOS DEL BACKLOG

| Fecha | Acción | Items afectados |
|-------|--------|-----------------|
| 2026-07-31 | Creación inicial | BT-001 a BT-022 (de auditorías maestra y de renders) |
| 2026-08-01 | Fase 3 — hallazgos de investigación Admin foto upload | BT-023, BT-024, BT-025 agregados |
| 2026-08-01 | Nota: media.jsw ya existía — Fase 3 cambió de "crear archivo" a "conectar stubs" | — |

---

## NOTAS DE FASES

**Fase 3 — cambio vs. plan original:**  
- Plan original: "Crear `media.jsw` con `resolveDocumentUrl`"
- Realidad encontrada: `backend-media.js` ya existía con las 3 funciones completas
- Problema real 1 (Vendedores): stub local `resolveDocumentUrl` en `pagina-panel-vendedores.js` → **RESUELTO** (Fase 3a — import conectado)
- Problema real 2 (Admin): stub `subirFotoCarroBackend` en `pagina-administracion.js` → **PENDIENTE** — investigación completa, esperando decisión del usuario sobre qué ruta activar (BT-023/024/025)

---

---

### BT-027
**ID:** BT-027  
**Prioridad:** 🔴 CRÍTICO  
**Módulo:** Todos los paneles  
**Archivo:** `backend-flujo.js` + los 4 paneles HTML  
**Categoría:** Arquitectura — concurrencia  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** Los 4 paneles pueden emitir `wecars-estado-avanzar` sobre el mismo cliente simultáneamente. El backend usa patrón `wixData.get() + wixData.update()` sin validar `_updatedDate`. El segundo write en el tiempo gana y borra silenciosamente el primero sin notificar al panel que perdió.

**Beneficio esperado:** Eliminar posibilidad de corrupción silenciosa de estados de expediente cuando dos roles avanzan al mismo cliente al mismo tiempo.  
**Riesgo de no hacerlo:** Pérdida de movimientos en el historial. Estados contradictorios persistidos en base de datos sin log.  
**Riesgo de implementarlo:** Cambio en backend-flujo.js afecta a los 4 paneles simultáneamente.  
**Dependencias:** Ninguna previa. Puede hacerse de forma aislada en el backend.  
**Complejidad estimada:** Media — requiere agregar campo `_updatedDate` como control y manejar respuesta de conflicto en los 4 paneles.  
**Solución propuesta:** Optimistic locking: el panel envía `_updatedDate` actual junto con `wecars-estado-avanzar`. Backend valida antes de escribir. Si difiere, responde `{ok:false, error:'conflict', estadoActual:{...}}`.

---

### BT-028
**ID:** BT-028  
**Prioridad:** 🔴 CRÍTICO  
**Módulo:** Finanzas  
**Archivo:** `HTML/pagina-finanzas.html` líneas 2531–2532  
**Categoría:** Bug — campo paralelo desincronizado  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** Finanzas actualiza `ClientRecords.estatusFinanciero` con valores propios (`'En proceso'`, `'Facturado'`, `'Entregado'`) independientemente de `estatusExpediente`. Este campo es invisible para los demás paneles. Un cliente puede tener `estatusExpediente='en_finanzas'` y `estatusFinanciero='Facturado'` al mismo tiempo — estados contradictorios persistidos.

**Beneficio esperado:** Una sola fuente de verdad por cliente. Fin de estados contradictorios entre paneles.  
**Riesgo de no hacerlo:** Gerencia y Vendedores ven un estado del cliente que Finanzas ya considera avanzado. Reportes y KPIs inconsistentes.  
**Riesgo de implementarlo:** Finanzas usa `estatusF` para sus propios filtros (línea 2491). Requiere migrar la vista de clientes de Finanzas a usar `estatusExpediente` como fuente.  
**Dependencias:** BT-034 (resolverEstadoCliente compartido) — sin eso, Finanzas no puede derivar el estado correcto.  
**Complejidad estimada:** Alta — cambio de paradigma en el panel de Finanzas.

---

### BT-029
**ID:** BT-029  
**Prioridad:** 🟠 ALTO  
**Módulo:** Gerencia / Admin / Finanzas  
**Archivo:** `gerencia.min.html:6252`, `administracion.html:5932`, `finanzas.html:3572`  
**Categoría:** Arquitectura — duplicación  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** El objeto `EF` (12 claves: `estatusExpediente → {label, color, bg}`) está copiado literalmente en 3 archivos. Cualquier nueva etapa del FLUJO o cambio de color requiere editar los 3. Un olvido produce badges en gris genérico en ese panel.

**Beneficio esperado:** Una sola edición para cambiar un color o agregar una etapa. Consistencia visual garantizada en los 4 paneles.  
**Solución propuesta:** Extraer a `wecars-core.js` cargado como `<script>` antes del script principal de cada HTML.  
**Dependencias:** BT-038 (infraestructura shared JS).  
**Complejidad estimada:** Baja una vez que exista el archivo compartido.

---

### BT-030
**ID:** BT-030  
**Prioridad:** 🟠 ALTO  
**Módulo:** Gerencia / Admin / Finanzas  
**Archivo:** `gerencia.min.html:6558`, `administracion.html:5943`, `finanzas.html:3583`  
**Categoría:** Arquitectura — duplicación función crítica  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** La función `_rA()` (render del panel de acciones del expediente — botones de transición de estado por rol) está copiada verbatim en 3 paneles. Es la función más sensible del sistema: gestiona permisos y emite `wecars-estado-avanzar`. Un bug corregido en Gerencia no llega a Admin ni Finanzas.

**Dependencias:** BT-029 (EF compartido), BT-034 (resolverEstadoCliente compartido).  
**Complejidad estimada:** Media.

---

### BT-031
**ID:** BT-031  
**Prioridad:** 🟠 ALTO  
**Módulo:** Todos  
**Archivo:** `vendedores.html:7446`, `gerencia.min.html:2511`, `administracion.html:5031`, `finanzas.html:2542`  
**Categoría:** Arquitectura — duplicación constante  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** El mapa de estados de crédito (10 claves) existe en 4 versiones con 4 nombres distintos: `CR_ESTADOS`, `_GE_CR_ESTADOS`, `AD_CR_ESTADOS`, y `estatusLabel()`. Mismas keys, mismos colores.

**Solución propuesta:** Una sola constante `WC.CR_ESTADOS` en `wecars-core.js`.

---

### BT-032
**ID:** BT-032  
**Prioridad:** 🟠 ALTO  
**Módulo:** Vendedores / Gerencia  
**Archivo:** `vendedores.html:7278`, `gerencia.min.html:2912`  
**Categoría:** Bug — lógica de terminales inconsistente  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** Existen 3 variantes incompatibles de `esGanado()`/`esPerdido()`: exportadas en Gerencia (verifican `estatusExpediente`), inline en Vendedores (verifican solo `c.estatus` legacy), y fallback en Gerencia que también verifica solo `c.estatus`. Un cliente con `estatusExpediente='venta_cerrada'` y `estatus='En proceso'` es "no ganado" para Vendedores.

---

### BT-033
**ID:** BT-033  
**Prioridad:** 🟠 ALTO  
**Módulo:** Vendedores  
**Archivo:** `HTML/pagina-panel-vendedores.html:7205–8248`  
**Categoría:** Bug — fuente de datos incorrecta para KPIs  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** El kanban, gráficas y filtros de Vendedores leen `c.estatus` (campo legacy: `'Ganado'`, `'Perdido'`, `'En proceso'`) como fuente primaria. El FLUJO canónico usa `c.estatusExpediente`. Un cliente en `estatusExpediente='venta_cerrada'` con `estatus='En proceso'` aparece como activo en el pipeline.

---

### BT-034
**ID:** BT-034  
**Prioridad:** 🟠 ALTO  
**Módulo:** Todos  
**Archivo:** `gerencia.min.html:7792` (única copia actual)  
**Categoría:** Arquitectura — core no compartido  
**Origen:** Auditoría transversal 2026-08-25  
**Fase destino:** Fase C

**Descripción:** `resolverEstadoCliente(cliente, credito, citas, facturas)` — única función canónica de resolución de estado con 14 etapas, precedencia documentada, semáforo, y siguiente acción — solo existe en Gerencia. Vendedores, Admin y Finanzas usan heurísticas locales inconsistentes.

**Solución propuesta (Opción A):** El Velo page code incluye `_estado: resolverEstadoCliente(c, cr, citas, [])` al enviar datos de clientes a cada panel. Los paneles consumen `c._estado` sin recalcular.  
**Solución propuesta (Opción B):** `resolverEstadoCliente` como función pura en `wecars-core.js` cargado en cada HTML.

---

### BT-035
**ID:** BT-035  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Vendedores / Gerencia  
**Archivo:** `vendedores.html:7176,8206`, `gerencia.min.html:7927`  
**Categoría:** Inconsistencia — decisión de negocio pendiente  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** Vendedores alerta "urgente" a **3 días** sin actividad. Gerencia marca "estancado" a **7 días**. El mismo cliente puede ser rojo para el vendedor y verde para gerencia. Requiere definir cuál es el umbral canónico del negocio.

**Acción requerida:** Rodrigo define el umbral oficial. Luego se estandariza en constante compartida.

---

### BT-036
**ID:** BT-036  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Vendedores / Gerencia  
**Archivo:** `vendedores.html:6910`, `gerencia.min.html:2445`  
**Categoría:** Duplicación  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** `ETAPAS_PIPELINE` (7 etapas de Oportunidades), `ETAPA_LEGACY_MAP` (8 aliases) y `normalizarEtapa()` copiadas idénticas en 2 paneles.

---

### BT-037
**ID:** BT-037  
**Prioridad:** 🟡 MEDIO  
**Módulo:** Todos  
**Archivo:** Todos los paneles HTML  
**Categoría:** Seguridad  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** Todos los `window.parent.postMessage({...}, '*')` usan wildcard como targetOrigin. En producción Wix Studio los iframes están en el mismo dominio (riesgo actual bajo), pero cualquier widget de terceros en la página podría escuchar mensajes con datos de clientes.

**Solución:** Reemplazar `'*'` por la URL del sitio en producción. Requiere conocer el dominio exacto de Wix.

---

### BT-038
**ID:** BT-038  
**Prioridad:** 🟢 BAJO  
**Módulo:** Todos  
**Archivo:** Los 4 paneles HTML  
**Categoría:** Duplicación  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** Funciones de sidebar (logout, resize, `enviarAltura()`) replicadas en los 4 paneles con variaciones menores.

---

### BT-039
**ID:** BT-039  
**Prioridad:** 🟢 BAJO  
**Módulo:** Todos  
**Categoría:** Duplicación  
**Origen:** Auditoría transversal 2026-08-25

**Descripción:** `ESTATUS_LIST = ['Nuevo','Contactado','En proceso','Ganado','Perdido']` como constante en Vendedores y Gerencia. Admin y Finanzas lo tienen como `<option>` hardcodeado en HTML.

---

## ELEMENTOS COMPLETADOS

*(Ninguno aún — elementos de Backlog, no fases)*
