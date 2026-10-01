# ESTÁNDAR DE AUDITORÍA Y ARQUITECTURA DE PANELES — weCars Bajío

> Metodología oficial creada durante la auditoría del Panel de Gerencia (agosto 2026).
> Aplicar a todo panel nuevo o existente antes de implementar cualquier cambio.

---

## REGLA FUNDAMENTAL

> **Ningún elemento visual debe existir sin una razón funcional y una fuente de datos definida.**

Para cualquier componente se deben poder responder estas 12 preguntas:

1. ¿Qué información muestra?
2. ¿Por qué existe?
3. ¿Para quién es útil?
4. ¿Qué decisión permite tomar?
5. ¿De dónde salen los datos?
6. ¿Cuál es la colección CMS fuente?
7. ¿Qué campos utiliza?
8. ¿Qué transformación o cálculo se aplica?
9. ¿Qué ocurre si no existen datos?
10. ¿Existe otra fuente de verdad (duplicidad)?
11. ¿La información se actualiza correctamente?
12. ¿Es la mejor manera de visualizarla?

Si alguna no tiene respuesta clara → el componente no está terminado.

---

## PROCESO OFICIAL DE AUDITORÍA (11 pasos)

```
1. Inventario completo del panel
         ↓
2. Auditoría visual en vista previa (screenshots por sección)
         ↓
3. Auditoría de componentes (KPI, tabla, gráfica, card)
         ↓
4. Mapa de datos (componente → colección → campos)
         ↓
5. Auditoría de CMS y esquemas reales (no asumir field keys)
         ↓
6. Definición de fuentes de verdad por entidad
         ↓
7. Auditoría de Backend y consultas
         ↓
8. Detección de problemas: duplicidades, race conditions, límites, filtros
         ↓
9. Propuesta de arquitectura (antes de tocar código)
         ↓
10. Implementación
         ↓
11. Validación visual y funcional (screenshots post-implementación)
```

---

## PASO 1 — INVENTARIO DE SECCIONES

Para cada vista (`data-view` o sección navegable), documentar:

| Campo | Descripción |
|---|---|
| ID (`data-view`) | Identificador exacto en el DOM |
| Label de navegación | Texto que ve el usuario en el menú |
| Función render | `renderXxx()` que la dibuja |
| Fuente de datos | Variable global que consume |
| Estado visual | OK / Parcial / Vacío / Roto |
| Calidad del dato | Qué tan confiables son los datos |

---

## PASO 2 — AUDITORÍA VISUAL

Revisar CADA sección en el navegador (vista previa local + producción si es posible).

Preguntas durante la revisión visual:

- ¿Qué información aparece primero (above the fold)?
- ¿Qué información queda escondida / requiere scroll?
- ¿Qué elementos llaman demasiado la atención sin justificación?
- ¿Qué información importante NO se está mostrando?
- ¿Qué tablas están vacías o muestran datos incorrectos?
- ¿Qué componentes parecen desconectados del contexto?
- ¿Qué información parece redundante entre secciones?
- ¿Qué información debería consolidarse?

**Pregunta gerencial clave:** *Si fuera el usuario de este panel y abro esta sección durante 30 segundos, ¿qué decisiones puedo tomar con lo que veo?*

Si una sección no ayuda a tomar una decisión → cuestionar si debe existir, modificarse o eliminarse.

---

## PASO 3 — AUDITORÍA DE COMPONENTES

Para cada KPI, card, gráfica, tabla, filtro:

| Atributo | Pregunta |
|---|---|
| ¿Qué muestra? | Descripción exacta de la información |
| ¿Por qué es importante? | Decisión que habilita |
| ¿Fuente? | Colección CMS |
| ¿Campos? | Field keys exactos (no nombres asumidos) |
| ¿Lógica? | Filtros, sumas, agrupaciones, normalizaciones |
| ¿Estado vacío? | ¿Qué muestra cuando no hay datos? |
| ¿Actualización? | ¿Cada cuánto se actualiza? ¿Manual o automática? |
| ¿Redundancia? | ¿Existe este dato en otra sección del mismo panel? |

### Criterios por tipo de componente

**KPI (número único):**
- Debe responder UNA pregunta específica del negocio
- La fórmula de cálculo debe ser documentable en una línea
- Debe tener delta (comparación con período anterior) si el tiempo importa
- Estado vacío: mostrar 0 con contexto, no `—` sin explicación

**Gráfica:**
- ¿Qué pregunta responde?
- ¿Qué decisión permite tomar?
- ¿Qué datos necesita?
- ¿Esos datos existen actualmente?
- ¿La gráfica es el mejor formato para ese dato?
- NO agregar gráficas "porque quedan bien"

**Tabla:**
- Cada columna debe justificarse
- Columnas de acción (ver detalle, editar) solo si hay acción real disponible
- Paginación obligatoria si la colección puede tener >100 registros
- Ordenamiento por el campo más útil para el usuario del panel
- Estado vacío explícito con instrucción de acción

**Dashboard (vista principal):**
Debe responder inmediatamente:
1. ¿Cómo vamos? (ventas, leads, conversión, inventario, rendimiento)
2. ¿Qué necesita atención? (alertas, cuellos de botella, riesgos)
3. ¿Qué oportunidades tenemos? (tendencias positivas, clientes cerca del cierre)

---

## PASO 4 — MAPA DE DATOS

Estructura por componente:

```
COMPONENTE
    ↓
INFORMACIÓN QUE NECESITA
    ↓
COLECCIÓN CMS
    ↓
CAMPOS (field keys exactos)
    ↓
RELACIONES CON OTRAS COLECCIONES
    ↓
LÓGICA DE CÁLCULO
    ↓
RESULTADO VISUAL
```

---

## PASO 5 — AUDITORÍA DE ESQUEMAS CMS

**REGLA: Nunca asumir nombres de campos. Siempre verificar el field key exacto en el CMS de Wix Studio.**

Para cada colección usada por el panel:

| Atributo | Descripción |
|---|---|
| `Nombre colección` | ID exacto en Wix (ej. `ClientRecords`) |
| `Propósito` | ¿Qué entidad representa? |
| `Fuente de verdad` | ¿Es la fuente principal o una copia/derivada? |
| `Registros actuales` | Conteo real |
| `Límite de consulta` | ¿Cuántos trae el backend? ¿Hay paginación? |

Para cada campo de cada colección:

| field key | Tipo Wix | % con datos | Valores posibles | Uso en UI | Problema detectado |
|---|---|---|---|---|---|
| `nombre` | Text | 98% | string libre | Sí | Algunos vacíos |
| `estatusVenta` | Text | 100% | Disponible/Apartado/Vendido | Sí | OK |

---

## PASO 6 — DEFINICIÓN DE FUENTES DE VERDAD

Por cada entidad del negocio, definir UNA sola fuente de verdad:

| Entidad | Colección fuente | Campo clave | No confundir con |
|---|---|---|---|
| Cliente/Prospecto | `ClientRecords` | `_id` | `ALeads` (es pre-cliente) |
| Lead (forma pública) | `ALeads` | `_id` | — |
| Etapa del pipeline | `ClientRecords.estatusExpediente` | enum del FLUJO | `ClientRecords.estatus` (deprecado) |
| Valor del pipeline | `ClientRecords.presupuesto` | number | `Opportunities.valorEstimado` (vacía) |
| Venta cerrada | `Ventas` | `_id` | `ClientRecords.estatusExpediente='venta_cerrada'` (trigger) |
| Vehículo | `Cars` | `_id` | — |
| Vendedor asignado | `ClientRecords.vendedorAsignado` | email | `ALeads.vendedorAsignado` (sincronizado) |
| Actividad/Seguimiento | `Activities` | `_id` | — |
| Empleado/Vendedor | `Usuarios` | `email` | — |

**PRINCIPIO:** Una entidad = una colección fuente. Otras colecciones pueden tener referencias (field de texto con el ID) pero los datos maestros viven en UN lugar.

---

## PASO 7 — AUDITORÍA DE BACKEND Y CONSULTAS

Para cada consulta del backend, documentar:

```
fetchDatosGerencia() → ClientRecords
  .ascending('nombre')   ← ¿CORRECTO? Si queremos recientes primero, debe ser descending _createdDate
  .limit(500)            ← ¿SUFICIENTE? Si hay >500 clientes, se pierden los más allá del límite
  .find(SA)
```

Checklist por consulta:

- [ ] **Orden**: ¿La consulta retorna los datos en el orden más útil para el usuario?
- [ ] **Límite**: ¿El límite es adecuado? ¿Qué pasa con el registro N+1?
- [ ] **Paginación**: ¿Necesita paginación real? (usar cursores de Wix para colecciones grandes)
- [ ] **Filtros**: ¿Se filtran datos que deberían aparecer?
- [ ] **Datos dobles**: ¿Se consulta la misma colección dos veces en la misma carga?
- [ ] **suppressAuth**: ¿Está presente en TODAS las consultas del backend?
- [ ] **Error handling**: ¿Cada query tiene `.catch(() => ({ items: [] }))`?

---

## PASO 8 — DETECCIÓN DE PROBLEMAS ESTRUCTURALES

### Race Conditions
El panel de weCars usa dos cargas paralelas independientes:
1. `enviarDatosGerencia()` → mensaje `wecars-gerencia-datos`
2. `enviarLeadsGerencia()` → mensaje `wecars-leads`

**Regla:** Si una vista depende de datos de AMBAS cargas, su función render debe verificar que ambas hayan llegado antes de pintar. Implementar con un flag o re-llamar al render cuando llegue el segundo mensaje.

Patrón correcto:
```javascript
// En el handler de wecars-leads:
window._geLeadsLoaded = true;
if (vistaActiva === 'leads' || vistaActiva === 'rendimiento') {
  geRenderLeads(); // o renderRendimiento()
}
```

### Duplicidades de datos
- Buscar colecciones con datos solapados
- Verificar si dos campos representan el mismo concepto (`estatus` vs `estatusExpediente`)
- Identificar datos calculables que se almacenan vs datos que se calculan en runtime

### Datos hardcodeados/mock como fallback
- Identificar cualquier array hardcodeado como fallback cuando el CMS está vacío
- Documentar su existencia — NO eliminar sin reemplazar con manejo de estado vacío real

---

## PIPELINE — ARQUITECTURA ESTÁNDAR

### Nivel 1: Pipeline Individual (vista Vendedor)
```
Nuevo Lead → Contactado → En Negociación → Apartado → [Admin/Finanzas] → Cierre
```

Fuente de verdad: `ClientRecords.estatusExpediente` (valores definidos en `backend-flujo.js`)

### Nivel 2: Pipeline Consolidado (vista Gerencia)

La tabla de pipeline en Gerencia debe mostrar:

```
VENDEDOR     │ NUEVO │ CONTACTADO │ NEGOC. │ APART. │ FINANZAS │ CIERRE │ PIPELINE $
─────────────┼───────┼────────────┼────────┼────────┼──────────┼────────┼───────────
Vendedor A   │   X   │     X      │    X   │   X    │    X     │   X    │   $X
Vendedor B   │   X   │     X      │    X   │   X    │    X     │   X    │   $X
─────────────┼───────┼────────────┼────────┼────────┼──────────┼────────┼───────────
TOTAL        │   X   │     X      │    X   │   X    │    X     │   X    │   $X
```

Cada celda debe ser clickeable → abre lista de esos clientes específicos en esa etapa.

Alertas inline:
- Celda roja: leads detenidos en esa etapa > umbral de días
- Icono ⚠: vendedor sin actividad en 24h
- Contador de días detenido en tooltip

Fuente: `ClientRecords` agrupado por `vendedorAsignado` + `estatusExpediente`

**Etapas del FLUJO (fuente: `backend-flujo.js`):**
`nuevo_lead → contactado → en_negociacion → apartado → en_revision_admin → faltan_documentos → en_finanzas → en_tramite_credito → facturado → pago_confirmado → entrega_programada → entregado → venta_cerrada`

Cancelado es estado terminal. Solo Gerencia puede cancelar.

---

## INVENTARIO — MÓDULO DE GERENCIA

### Campo correcto en Wix CMS (Cars)

| Concepto | Field key correcto | Field key incorrecto (no usar) |
|---|---|---|
| Nombre completo | `title` | `nombre` |
| Marca | `brand` | `marca`, `make` |
| Estado de venta | `estatusVenta` | `estado`, `estatus` |
| Precio de venta | `precioVenta` | `precio` |
| Precio de compra | `costoAdquisicion` | `precioCompra`, `costo` |
| VIN | `vin` | — |
| Fecha de cierre | `fechaCierre` | — |

### Nivel 1: Operación (lista de vehículos)
Columnas: imagen, marca/modelo/año, precio, estado, días en inventario

### Nivel 2: Inteligencia (análisis gerencial)
Cada métrica debe responder una pregunta de negocio:

| Métrica | Pregunta | Fuente | Disponible |
|---|---|---|---|
| Valor total inventario | ¿Cuánto capital tenemos invertido? | `SUM(Cars.precioVenta)` donde disponible | Sí |
| Por marca | ¿Tenemos concentración de marca? | `GROUP BY Cars.brand` | Sí (field `brand`) |
| Antigüedad | ¿Qué autos llevan más tiempo sin venderse? | `hoy - Cars._createdDate` | Sí |
| Autos sin leads | ¿Qué autos no generan interés? | Cruce Cars._id ↔ ALeads | Requiere verificar field en ALeads |
| Leads por auto | ¿Cuál genera más demanda? | COUNT(ALeads donde carroId=auto._id) | Requiere verificar field `carroId` en ALeads |

---

## REGLAS DE SEGURIDAD (inamovibles)

1. **Identidad**: siempre desde `wixUsersBackend.currentUser.getEmail()` en backend, NUNCA del frontend
2. **Rol**: siempre desde `obtenerPerfil(email)` en backend, NUNCA del frontend
3. **suppressAuth**: `const SA = { suppressAuth: true }` en TODAS las operaciones wixData del backend
4. **Tokens**: solo en Wix Secrets Manager, nunca en CMS ni en frontend
5. **NO scraping, NO bots, NO browser automation**
6. **NO duplicar `obtenerPerfil()` — existe en `backend-permisos.js`**

---

## CRITERIO DE COMPLETITUD

Un panel está **terminado** cuando, señalando cualquier elemento de la pantalla, se puede responder:

- "Este número viene de la colección `X`, campo `Y`, filtrado por `Z`, calculado así: `[lógica]`"
- "Si no hay datos, muestra: `[estado vacío específico]`"
- "Se actualiza cuando: `[trigger]`"
- "Esta información es la fuente de verdad porque: `[razón]`"

---

## COLECCIONES DEL SISTEMA (IDs confirmados)

| Colección | ID Wix | Propósito | Fuente de verdad de |
|---|---|---|---|
| Clientes/Prospectos | `ClientRecords` | Registro principal de cada cliente | Cliente, pipeline, etapa, vendedor asignado |
| Leads de formulario | `ALeads` | Leads antes de convertir a cliente | Lead pre-conversión |
| Inventario | `Cars` | Vehículos en stock | Vehículo, precio, estado de venta |
| Empleados | `Usuarios` | Vendedores y personal | Perfil, rol, email |
| Actividades | `Activities` | Log de toda actividad del equipo | Historial comercial |
| Ventas | `Ventas` | Registro de venta cerrada | Venta, utilidad, comisión |
| Facturas | `Facturas` | Facturas emitidas | Factura |
| Créditos | `Creditos` | Solicitudes de crédito | Crédito vehicular |
| Historial | `Historial` | Audit trail de cambios de estado | Historial de expediente |
| Consignas | `Consignas` | Autos a consignar | Lead tipo consigna |
| Tareas | `Tasks` | Tareas del equipo | Tarea |
| Citas | `citas` | Agenda | Cita |
| Cierres | `CierreOperacion` | Cierres de rentabilidad | Cierre/rentabilidad |
| Oportunidades | `Opportunities` | **VACÍA — sin uso real activo** | Pendiente de definir |
| Verificaciones | `VerificaAuto` | Solicitudes de verificación vehicular | Lead tipo verificación |

### Colecciones a crear (pendientes)
- `Pagos` — pagos/abonos de clientes
- `Comisiones` — comisiones de vendedores

---

## HISTORIAL DE AUDITORÍAS

| Panel | Fecha | Status |
|---|---|---|
| Gerencia | 2026-08-26/27 | En proceso — auditoría completa, implementación pendiente |
| Administración | — | Pendiente |
| Finanzas | — | Pendiente |
| Vendedores | — | Pendiente |
