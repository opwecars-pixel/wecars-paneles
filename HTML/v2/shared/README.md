# weCars ERP v2 — Shared

Archivos base que **todos los paneles importan**. No edites lógica de negocio aquí.

## Archivos

| Archivo | Propósito |
|---|---|
| `wecars-tokens.css` | Variables CSS: colores, tipografía, espaciado, sombras |
| `wecars-messages.js` | Contratos postMessage iframe ↔ Velo (`WC.send`, `WC.on`) |
| `wecars-ui.js` | Componentes: `WCToast`, `WCConfirm`, `WCEmpty`, `WCSpinner`, `WCAvatar`, `WCBadge`, `WCFormat` |

## Cómo usar en un panel

```html
<link rel="stylesheet" href="../shared/wecars-tokens.css">
<script src="../shared/wecars-messages.js"></script>
<script src="../shared/wecars-ui.js"></script>
```

## Reglas

- **No agregar lógica de negocio aquí.** Solo UI genérica y contratos de mensajes.
- **No romper contratos existentes** en `wecars-messages.js` — agregar tipos nuevos al final.
- **Los tokens son la fuente de verdad.** Ningún panel define colores inline que ya existan como token.
