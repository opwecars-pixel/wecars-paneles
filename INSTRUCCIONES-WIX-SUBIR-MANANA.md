# Instrucciones — Subir a Wix mañana

## 1. Subir los 4 paneles HTML (iframes)
Wix Studio → Editor → Media Manager → "Mis archivos" → subir:
- `HTML/pagina-finanzas.html`
- `HTML/pagina-administracion.html`
- `HTML/pagina-gerencia.min.html`
- `HTML/pagina-panel-vendedores.html`

Después de subir, copia la URL de cada archivo y actualiza el `src` del componente HtmlComponent en cada página Wix correspondiente.

---

## 2. Subir los archivos Velo (backend + páginas)

### Backend (carpeta `backend/` en Velo)
Sube/reemplaza cada archivo con su contenido de `Codigos Velo/backend/`:
- `backend-leads.js` → renombrar a `leads.jsw` en Velo
- `backend-notificaciones.js` → renombrar a `notificaciones.jsw`
- `backend-clientes.js` → `clientes.jsw`
- `backend-datos.js` → `datos.jsw`
- `backend-flujo.js` → `flujo.jsw`
- `backend-finanzas.js` → `finanzas.jsw`
- `backend-actividades.js` → `actividades.jsw`
- `backend-permisos.js` → `permisos.jsw`
- `backend-siteConfig.js` → `siteConfig.jsw`
- `backend-recordatorios.js` → `recordatorios.jsw`
- `http-functions.js` → `http-functions.js` (sin cambio)
- `jobs.config` en `Codigos Velo/config/` → `jobs.config` en Velo

### Páginas públicas (`paginas-publicas/`)
Cada archivo va en el editor de Velo de la página correspondiente:
- `pagina-contacto.js` → página `/contacto`
- `pagina-inventario.js` → página `/inventario`
- `pagina-inicio.js` → página `/`
- `pagina-detalle.js` → página `/detalle/{slug}`
- `pagina-consignas.js` → página `/consigna`
- `pagina-garantias.js` → página `/garantias`
- `pagina-verifica-tu-auto.js` → página `/verifica-tu-auto`
- `pagina-confirmacion.js` → página `/confirmacion`
- `pagina-entrar.js` → página `/entrar`

### Páginas de paneles ERP (`paginas-paneles/`)
- `pagina-administracion.js` → página `/panel-administracion`
- `pagina-finanzas.js` → página `/panel-finanzas`
- `pagina-gerencia.js` → página `/panel-gerencia`
- `pagina-panel-vendedores.js` → página `/panel-vendedores`

---

## 3. Configurar el Triggered Email (UNA SOLA VEZ)

Este es el paso más importante para que lleguen las notificaciones de leads.

1. Ve a **Wix Dashboard** → **Automatizaciones** → **Correos disparados** (Triggered Emails)
2. Clic en **"Crear correo"** → tipo **Personalizado**
3. Ponle asunto: `Nueva notificación — weCars Bajío`
4. En el cuerpo agrega ESTOS 3 campos dinámicos exactamente así:
   - `{{titulo}}` — el título del aviso
   - `{{mensaje}}` — el detalle del lead/aviso
   - `{{link}}` — el enlace al panel
5. Guarda el correo
6. Copia el **Email ID** que aparece (algo como `4c8cb294-xxxx-xxxx`)
7. Abre `Codigos Velo/backend/backend-notificaciones.js` (o directamente en Velo)
8. Reemplaza el valor de `TRIGGERED_EMAIL_ID` con tu nuevo ID

> **El ID actual ya está configurado:** `4c8cb294-f452-4e76-8a7a-65419ec14a21`
> Si el correo ya existe en tu cuenta con ese ID, no necesitas hacer nada.

---

## 4. Verificar que lleguen notificaciones

Después de publicar, prueba enviando un formulario de contacto en el sitio.
Deberías recibir un correo en `rodrigocastillo.9718@gmail.com` con:
- 👤 Nombre del cliente
- 📱 Teléfono
- 🚘 Interés / auto
- 📍 Origen (qué página llenó)

Si no llega, revisa:
- Wix Dashboard → **Actividad del sitio** → logs de backend
- Que el Triggered Email esté publicado (no en borrador)
- Que el ID en `TRIGGERED_EMAIL_ID` sea correcto

---

## 5. Colecciones CMS — campos a agregar si no existen

### ALeads
| Campo | Tipo | Valor |
|-------|------|-------|
| `tipo` | Texto | lead / consigna / credito / prueba_manejo |
| `resumen` | Texto largo | — |
| `estatusLead` | Texto | nuevo / asignado / contactado / cerrado |
| `vendedorAsignado` | Texto | email del vendedor |
| `vendedorNombre` | Texto | — |
| `fechaAsignacion` | Fecha | — |
| `clienteId` | Texto | referencia al ClientRecord |
| `pagina` | Texto | dónde llegó el lead |

### ClientRecords
| Campo | Tipo |
|-------|------|
| `departamentoActual` | Texto |
| `responsableComercial` | Texto |
| `responsableNombre` | Texto |
| `estatusExpediente` | Texto |
| `vendedorAsignado` | Texto |
| `vendedorNombre` | Texto |
| `vehiculoInteres` | Texto |
| `ultimaActividad` | Fecha |
| `leadId` | Texto |

---

## 6. Resumen de qué hace cada notificación

| Evento | Quién recibe |
|--------|-------------|
| Lead nuevo (cualquier formulario) | Rodrigo + todos los vendedores + gerencia |
| Consigna nueva | Rodrigo + todos los vendedores |
| Auto vendido / apartado | Rodrigo + gerencia |
| Factura de salida subida | Rodrigo + finanzas |
| Empleado nuevo dado de alta | Rodrigo + administración |
| Clientes sin actividad +24h | Cada vendedor con su lista |
| Reporte semanal (lunes) | Rodrigo + gerencia |
