# INFORME DE TRANSFERENCIA DE MANDO
## InventarioPro V4 — Sistema de Gestión de Stock y Pedidos

**Fecha:** 24 de noviembre de 2026  
**Versión:** 1.0  
**Preparado por:** Equipo de Desarrollo  
**Para:** Gerencia / Nuevo Responsable Técnico  

---

## 1. RESUMEN EJECUTIVO

| Ítem | Detalle |
|------|---------|
| **Producto** | InventarioPro V4 — SPA de inventario, movimientos, pedidos y reportes |
| **Estado actual** | ✅ **En producción** — Funcionando en GitHub Pages |
| **URL Producción** | `https://comprassuministros2.github.io/InventarioPro/` |
| **Backend** | Google Apps Script (script.google.com → proyecto "InventarioPro") |
| **Base de datos** | Google Sheets (1 planilla, 4 pestañas) |
| **Stack** | Vanilla JS (HTML/CSS/JS puro) — **Sin framework, sin build, sin dependencias npm** |
| **Despliegue** | `git push origin main` → GitHub Pages auto-deploy |
| **Autenticación** | ❌ **Ninguna** — Acceso público total (riesgo conocido) |

> **⚠️ PUNTO CRÍTICO:** El backend (`codigo.gs`) **NO está en este repositorio**. Vive en Google Apps Script (script.google.com) — **sí tiene versionado nativo** (historial de versiones en la nube), pero **no hay visibilidad, PRs ni auditoría desde GitHub**. Cualquier cambio se hace en el editor de Google y se publica como nueva versión de la Web App.

---

## 2. ARQUITECTURA COMPLETA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            USUARIO FINAL                                      │
│                         (Navegador - Cualquier dispositivo)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼ HTTPS
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GITHUB PAGES (Frontend Estático)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ index.html   │  │ css/style.css│  │ js/script.js │  │ js/services/ │    │
│  │ (1085 líneas)│  │ (4000+ líneas)│ │ (3700+ líneas)│ │ ApiService,  │    │
│  │ 10 páginas   │  │ CSS Variables│  │ Lógica total │  │ ArticulosSvc │    │
│  │ 4 modales    │  │ Responsive   │  │ Monolito     │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                  │                                           │
│                    js/Config.js  │  (API_URL + GITHUB_TOKEN público)        │
└──────────────────────────────────│──────────────────────────────────────────┘
                                   │ POST JSON {accion: "..."}
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOOGLE APPS SCRIPT (Backend)                               │
│  script.google.com → Proyecto "InventarioPro" → codigo.gs                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ doPost(e) → Router por e.parameter.accion                           │   │
│  │  • listarArticulos / crearArticulo / actualizarArticulo / eliminar  │   │
│  │  • registrarEntrada / registrarSalida / registrarRelevamiento       │   │
│  │  • listarMovimientos (con filtros)                                  │   │
│  │  • listarDirecciones / agregarDireccion                             │   │
│  │  • listarPedidos / obtenerDetallePedido / confirmarPedido (PDF)     │   │
│  │  • estadisticasDashboard                                            │   │
│  │  • subirImagenAGitHub (PUT a GitHub API)                            │   │
│  │  • Triggers programados (bot diario)                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GOOGLE SHEETS (Base de Datos)                           │
│  Una planilla con 4 pestañas:                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ API_Prueba  │  │ Movimientos │  │ Pedidos     │  │ Direcciones     │   │
│  │ (Artículos) │  │ (Entradas/  │  │ + Detalle   │  │ (Jerarquía:     │   │
│  │  ID, Nombre,│  │ Salidas/    │  │ _Pedido     │  │  Depósito >     │   │
│  │  Categoría, │  │ Relevamientos)             │  │  Sector >       │   │
│  │  Stock,     │  │ Fecha, Tipo,│  │ Nº, Fecha,  │  │  Pasillo >      │   │
│  │  Ubicación, │  │ Artículo,   │  │ Estado,     │  │  Estante)       │   │
│  │  Foto, etc. │  │ Cantidad,   │  │ Director,   │  │  + director     │   │
│  └─────────────┘  │ Destino, Obs│  │ Items[]     │  │  por nivel      │   │
│                   └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (Imágenes)
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GITHUB REPO (img/ - Raw URLs)                             │
│  https://raw.githubusercontent.com/comprassuministros2/InventarioPro/main/  │
│  img/articulo_<ID>.jpg                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (PDFs)
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOOGLE DRIVE (Remitos PDF)                                │
│  Generados por Apps Script al confirmar pedido                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ESTRUCTURA DE ARCHIVOS DEL REPOSITORIO

```
InventarioPro/
├── index.html                    # TODO el HTML (1085 líneas)
│   ├── 10 <div class="pagina" data-page="...">:
│   │   ├── dashboard          → KPIs, críticos, últimos movimientos, remitos
│   │   ├── inventario         → Cards grid (General + Depósito Calle 3 tabs)
│   │   ├── entradas           → Form packs + sueltas
│   │   ├── salidas            → Form con destino + packs/unidades
│   │   ├── relevamiento       → Ajuste stock físico vs sistema
│   │   ├── movimientos        → Tabla paginada + filtros + búsqueda por ID
│   │   ├── direcciones        → Ranking top 10 + acordeón detalle
│   │   ├── pedidos            → Master-Detail (Hoja Seguimiento + Detalle)
│   │   ├── reportes           → Filtros fecha/categoría/dirección + export
│   │   └── configuracion      → ⚠️ VACÍA (placeholder)
│   ├── 4 Modales:
│   │   ├── modalNuevoArticulo
│   │   ├── modalEditarArticulo
│   │   ├── modalDetalleArticulo
│   │   └── modalNuevaDireccion
│   ├── Sidebar (nav), Topbar, Toasts, Action Banner, Overlay
│   └── CSP: script-src 'self' 'unsafe-inline' (relajada)
│
├── css/
│   └── style.css                 # 4000+ líneas
│       ├── CSS Variables (tema claro/oscuro)
│       ├── Grid + Flexbox layout
│       ├── Componentes: cards, tablas, modales, forms, botones
│       ├── Responsive: @media (max-width: 768px) móvil-first
│       └── Print styles para remitos
│
├── js/
│   ├── Config.js                 # API_URL, GITHUB_TOKEN (PÚBLICO)
│   ├── theme-init.js             # Tema antes del paint (evita FOUC)
│   ├── script.js                 # ⚠️ 3700+ LÍNEAS — MONOLITO PRINCIPAL
│   │   ├── Sección 1: Estado global (articulos, direcciones, carrito, hojaSeguimientoData)
│   │   ├── Sección 2: Navegación (navegarAPagina, sidebar sync)
│   │   ├── Sección 3: Carga inicial (cargarTodo, articulos, direcciones)
│   │   ├── Sección 4: Inventario (renderizarInventario, cards, filtros)
│   │   ├── Sección 5: Entradas (registrarEntrada, validaciones)
│   │   ├── Sección 6: Salidas (registrarSalida, packs/unidades, destino)
│   │   ├── Sección 7: Relevamiento (registrarRelevamiento)
│   │   ├── Sección 8: Movimientos (cargarMovimientos, paginación, filtros)
│   │   ├── Sección 9: Direcciones (cargarDirecciones, ranking, acordeón)
│   │   ├── Sección 10: Dashboard (KPIs, críticos, remitos)
│   │   ├── Sección 11: Pedidos - Nuevo (carrito, tipos, packs/unidades)
│   │   ├── Sección 12: Pedidos - Seguimiento (master-detail, filtros)
│   │   ├── Sección 13: Pedidos - Acciones (ver, editar, cancelar, confirmar→PDF)
│   │   ├── Sección 14: Auto-aprendizaje solicitante (autocompletarDirectorPorDireccion)
│   │   ├── Sección 15: Artículos CRUD (crear, editar, eliminar, foto)
│   │   ├── Sección 16: Exportar CSV (Inventario General + Calle 3)
│   │   ├── Sección 17: Reportes (filtros + export Excel/CSV)
│   │   ├── Sección 18: Tema (aplicarTema, localStorage)
│   │   ├── Sección 19: Modales (abrir/cerrar genérico + específicos)
│   │   ├── Sección 20: Atajos teclado (Esc, N, etc.)
│   │   ├── Sección 21: Utilidades (formato fecha, números, toast, debounce)
│   │   └── TOC en líneas 4-30 (índice de secciones)
│   ├── sidebar.js                # Hamburger + overlay (TODAS las pantallas)
│   └── services/
│       ├── ApiService.js         # fetch wrapper: post(), timeout, abort, error handling
│       └── ArticulosService.js   # obtenerTodos(), crear(), actualizar(), eliminar()
│
├── appscript/                    # ⚠️ SOLO REFERENCIA — NO ES EL BACKEND REAL
│   ├── Code.gs                   # doGet() legacy
│   └── ArticulosService.gs       # obtenerArticulos() ejemplo
│
├── img/                          # Fotos artículos (servidas via raw.githubusercontent.com)
│   └── articulo_<ID>.jpg
│
├── docs/
│   ├── INFORME_ESTADO_2026-11-22.md    # Informe técnico detallado
│   ├── INFORME_TRANSFERENCIA_MANDO.md  # ESTE ARCHIVO
│   ├── Arquitectura.md                 # Vacío
│   └── Roadmap.md                      # Vacío
│
├── InventarioPro.docx            # ⚠️ BASURA — Borrar
├── assets/                       # ⚠️ VACÍA — Borrar
├── components/                   # ⚠️ VACÍA — Borrar
├── pages/                        # ⚠️ VACÍA — Borrar
├── laboratorio/                  # ⚠️ VACÍA — Borrar
├── backend/                      # ⚠️ VACÍA — Borrar
└── database/                     # ⚠️ VACÍA — Borrar
```

---

## 4. FUNCIONALIDADES DETALLADAS (QUÉ FUNCIONA HOY)

| Módulo | Funcionalidad | Archivo/Función clave | Estado |
|--------|---------------|----------------------|--------|
| **Navegación** | SPA 10 páginas, sidebar responsive, atajos teclado | `script.js:navegarAPagina()`, `sidebar.js` | ✅ |
| **Inventario General** | Cards expandibles con foto, stock, ubicación, acciones | `script.js:renderizarInventario()` | ✅ |
| **Depósito Calle 3** | Filtro visual (NO borra del array global `articulos`) | `script.js:cargarArticulosCalle3()` | ✅ |
| **Entradas** | Packs + sueltas, cálculo automático total, validación stock | `script.js:registrarEntrada()` | ✅ |
| **Salidas** | Validación stock, selector destino (direcciones), packs/unidades | `script.js:registrarSalida()` | ✅ |
| **Relevamiento** | Ajuste stock físico vs sistema, registra diferencia | `script.js:registrarRelevamiento()` | ✅ |
| **Movimientos** | Tabla paginada (lotes 100), filtros texto/tipo, **búsqueda por ID** | `script.js:cargarMovimientos()`, `renderizarMovimientos()` | ✅ |
| **Historial Artículo** | "Ver historial completo" pre-filtra Movimientos por ID | `script.js:abrirModalDetalleArticulo()` | ✅ (nuevo) |
| **Direcciones** | Ranking top 10 + acordeón detalle con movimientos | `script.js:cargarDirecciones()` | ✅ |
| **Dashboard** | KPIs, últimos 5 movimientos, artículos críticos, remitos recientes | `script.js:cargarDashboard()` | ✅ |
| **Pedidos - Nuevo** | Carrito con packs/unidades, tipos (interno/externo), director auto | `script.js:renderizarCarrito()`, `autocompletarDirectorPorDireccion()` | ✅ |
| **Pedidos - Seguimiento** | Master-Detail sticky, filtros fecha/estado/búsqueda, paginación | `script.js:renderizarHojaSeguimiento()` | ✅ |
| **Pedidos - Acciones** | Ver, Editar, Cancelar, Confirmar → genera PDF en Drive | `script.js:manejarAccionPedido()` | ✅ |
| **Auto-aprendizaje** | Al elegir dirección → autocompleta director desde historial | `script.js:autocompletarDirectorPorDireccion()` | ✅ |
| **Artículos CRUD** | Crear/Editar/Eliminar con foto, validaciones, drag&drop imagen | `script.js:abrirModalArticulo()`, `guardarNuevoArticulo()` | ✅ |
| **Exportar CSV** | Inventario General y Depósito Calle 3 | `script.js:exportarInventarioCSV()` | ✅ |
| **Reportes** | Filtros fecha/categoría/dirección + export Excel/CSV | `script.js:inicializarFiltrosReportes()` | ✅ |
| **Tema** | Claro/Oscuro persistido en localStorage | `script.js:aplicarTema()`, `theme-init.js` | ✅ |

---

## 5. FUNCIONALIDADES INCOMPLETAS / BUGS CONOCIDOS

| # | Qué falta / Bug | Archivo/Lugar | Impacto Usuario | Esfuerzo | Prioridad |
|---|-----------------|---------------|-----------------|----------|-----------|
| 1 | **Configuración** (página vacía) | `index.html:#pagina-configuracion` | No se cambian parámetros desde UI | Bajo | Media |
| 2 | **Validación duplicados** al crear artículo | `script.js:guardarNuevoArticulo()` | Artículos repetidos sin aviso | Bajo | Alta |
| 3 | **Paginación real Movimientos** (solo "Ver más" 100) | `script.js:MOV_POR_LOTE=100` | Lento con 5000+ registros | Medio | Alta |
| 4 | **Subida imágenes sin progreso visual** | `script.js:inicializarDragAndDropImagen()` | Usuario no sabe si sube | Bajo | Media |
| 5 | **Manejo errores red** (toast genérico) | `services/ApiService.js:69` | "Error desconocido" sin detalle | Medio | Alta |
| 6 | **Código duplicado** render cards | `_renderInventarioCards()` vs `obtenerCeldaArticuloHTML()` | Mantenimiento doble | Medio | Media |
| 7 | **Dead code** `configurarMenu()` | `script.js:1525` | Confunde lectura | Bajo | Baja |

---

## 6. DEUDA TÉCNICA Y RIESGOS CRÍTICOS

| Riesgo | Qué es | Impacto Real | Mitigación Requerida |
|--------|--------|--------------|---------------------|
| 🔴 **Backend fuera del repo** | `codigo.gs` solo en script.google.com (no en GitHub) | **ALTO** — Apps Script sí tiene versionado nativo, pero **no hay visibilidad desde GitHub**: no hay PRs, no hay diff, no hay auditoría en el repo. Un cambio malo se revierte en GAS, pero el equipo no lo ve. | **Backup periódico**: Copiar `codigo.gs` a `docs/backup_codigo_YYYY-MM-DD.gs.txt` tras cada deploy importante. Documentar proceso deploy en `appscript/README.md`. |
| 🔴 **Monolito `script.js`** | 3700+ líneas en 1 archivo | Cambiar algo rompe otra cosa. PRs imposibles de revisar. Onboarding lento. | Modularizar en `js/modules/` (inventario, pedidos, movimientos, modales, utils). 4-6 hs. |
| 🔴 **Sin tests** | Ni unitarios, ni e2e, ni smoke | Cualquier refactor/deploy es "a ciegas". | Playwright/Cypress: flujos críticos (entrada, salida, pedido, relevamiento). 2-3 días. |
| 🟠 **Secretos en repo** | `Config.js` expone URL Apps Script + GitHub Token | Cualquiera puede spamear API, subir/borrar imágenes. | Mover a `config.json` (gitignore) o migrar a Netlify/Vercel con env vars. |
| 🟠 **CSP relajada** | `script-src 'unsafe-inline'` en `index.html:9` | Vector XSS si hay inyección. | Eliminar inline scripts, usar nonces, o mover a archivos .js. |
| 🟠 **Auth pública** | Sin login, sin roles, usuario hardcodeado "Samuel Steves" | Cualquiera con link ve/modifica stock. Sin trazabilidad. | Auth básica (Apps Script user/pass) o Google OAuth. Decisión de gerencia. |
| 🟡 **Imágenes en GitHub Raw** | Dependencia de raw.githubusercontent.com | Si GitHub cae/cambia política → se rompen fotos. | Migrar a Drive/S3/Cloudinary/CDN propio. |
| 🟡 **Backup planilla** | No existe backup automático | Borrado accidental/corrupción = pérdida total. | Trigger diario Apps Script → copiar a Drive/otra hoja. |
| 🟡 **Un solo usuario** | "Samuel Steves" hardcodeado en 4 formularios | No hay auditoría de quién hizo qué. | Requiere auth previo. Agregar campo `usuario` a movimientos. |

---

## 7. HISTORIAL RECIENTE (ÚLTIMOS 10 COMMITS)

| Commit | Fecha | Autor | Resumen |
|--------|-------|-------|---------|
| `fac460c` | 22/11 11:54 | comprassuministros2 | **feat(movimientos)**: búsqueda incluye idArticulo + "Ver historial completo" pre-filtra por artículo |
| `9c9bda9` | 22/11 11:06 | comprassuministros2 | **fix(config)**: URL Apps Script corregida al endpoint correcto con filtro de movimientos |
| `d886957` | 20/11 15:24 | comprassuministros2 | **feat**: Auto-aprendizaje del Solicitante en Pedidos |
| `677e147` | — | — | Foto actualizada artículo ID 345 |
| `9e5e993` | — | — | Foto actualizada artículo ID 323 |
| `6f458e5` | — | — | **fix(image)**: límite 500px, calidad JPEG 0.5 |
| `244c20e` | — | — | **style(sidebar)**: optimizar espacio + hover visual |
| `86b68e4` | — | — | **fix(nav)**: cerrar sidebar en TODAS pantallas al navegar |
| `811ae04` | — | — | **Sidebar**: copyright footer, flex-grow, padding, hover desktop ≥1024px |
| `53a5f90` | — | — | Foto actualizada artículo ID 344 |

---

## 8. INFRAESTRUCTURA REAL: CARPETAS Y BACKEND

### 8.1 Estructura de Carpetas (GitHub — Frontend)
El frontend está alojado en GitHub Pages. La estructura productiva es:

| Carpeta/Archivo | Propósito |
|-----------------|-----------|
| `index.html` | Estructura principal (SPA): 10 páginas, 4 modales, sidebar, topbar, toasts |
| `css/style.css` | Estilos globales, CSS Variables (tema claro/oscuro), responsive ≤768px |
| `js/script.js` | Lógica de UI y renderizado (monolito 3700+ líneas — en proceso de modularización) |
| `js/services/ApiService.js` | Cliente HTTP: `post()`, timeout, abort, manejo de errores |
| `js/services/ArticulosService.js` | Capa de dominio: CRUD artículos, validaciones de negocio |
| `js/Config.js` | Configuración runtime: `API_URL` (Apps Script), `GITHUB_TOKEN` (subida imágenes) |
| `js/theme-init.js` | Inicialización temprana del tema (evita FOUC) |
| `js/sidebar.js` | Hamburger menu + overlay (funciona en TODAS las pantallas) |
| `img/` | Imágenes de artículos (servidas via `raw.githubusercontent.com`) |
| `docs/` | Documentación técnica, manuales, informes de estado |
| `appscript/` | **Solo referencia/ejemplos** — NO es el backend real (ver 8.2) |

> **Nota:** Carpetas `assets/`, `components/`, `pages/`, `laboratorio/`, `backend/`, `database/` y archivo `InventarioPro.docx` son **basura residual** — deben borrarse.

---

### 8.2 El Backend Real (`codigo.gs` en Google Apps Script)
El archivo `codigo.gs` **NO está en este repositorio** y **no va a estar**. Vive exclusivamente en **Google Apps Script** (script.google.com → proyecto "InventarioPro"), asociado a la planilla de cálculo maestra.

| Aspecto | Detalle |
|---------|---------|
| **Ubicación** | https://script.google.com → "InventarioPro" → Editor → `codigo.gs` |
| **Versionado** | **Sí, nativo** — Apps Script guarda historial de versiones (Archivo → Historial de versiones). Cada deploy crea una versión inmutable. |
| **NO en GitHub** | GAS no permite conexión directa Git/GitHub para archivos `.gs`. El código vive y se ejecuta en la nube. |
| **Cómo se actualiza** | 1. Abrir script.google.com → proyecto "InventarioPro"  <br>2. Editar `codigo.gs` en el editor web  <br>3. `Ctrl+S` (guarda)  <br>4. **Implementar → Gestionar implementaciones** → Editar → **Nueva versión** → Desplegar |
| **Cómo respaldarlo (recomendado)** | Periódicamente (ej: cada deploy importante), copiar el contenido completo de `codigo.gs` a un archivo de texto en el repo: `docs/backup_codigo_YYYY-MM-DD.gs.txt`. Así hay historial consultable desde GitHub sin duplicar la fuente de verdad. |
| **Rollback** | En Apps Script: Implementar → Gestionar implementaciones → Seleccionar versión anterior → Guardar. Inmediato. |

---

### 8.3 ¿Por qué no se versiona el backend en GitHub?
Porque **Google Apps Script es un servicio serverless gestionado**. Los archivos `.gs` no son archivos locales que se sincronicen; son recursos en la nube que se editan en el navegador y se ejecutan en la infraestructura de Google. No hay `git push` posible — el "deploy" es crear una **Nueva Versión** en la consola de Implementaciones.

> **Conclusión:** El riesgo no es "falta de versionado" (Apps Script lo tiene), sino **falta de visibilidad desde GitHub** (no hay PRs, no hay diff en PR, no hay auditoría en el repo). La mitigación es el backup periódico en `docs/`.

---

## 9. COMANDOS OPERATIVOS (DÍA A DÍA)

| Tarea | Comando / Acción |
|-------|------------------|
| **Ver en local** | Abrir `index.html` directo en navegador **O** `npx serve .` |
| **Deploy producción** | `git add . && git commit -m "mensaje" && git push origin main` |
| **Ver backend** | Abrir https://script.google.com → Proyecto "InventarioPro" → `codigo.gs` |
| **Test API en consola** | `apiService.post({accion:"listarArticulos"}).then(console.table)` |
| **Ver estado global** | En consola: `window.articulos`, `window.direcciones`, `window.carritoPedido` |
| **Forzar re-render** | `navegarAPagina('inventario')` tras mutaciones de datos |
| **Cambiar tema** | Click 🌙/☀️ en topbar → persiste en `localStorage.inventario-tema` |

---

## 10. ACCESOS Y CREDENCIALES (PARA EL NUEVO RESPONSABLE)

| Servicio | Acceso | Notas |
|----------|--------|-------|
| **GitHub Repo** | `https://github.com/comprassuministros2/InventarioPro` | Push a `main` = deploy automático |
| **GitHub Pages** | `https://comprassuministros2.github.io/InventarioPro/` | URL producción |
| **Google Apps Script** | https://script.google.com → "InventarioPro" | **Backend real** — `codigo.gs` |
| **Google Sheets (DB)** | Link en Apps Script → "Hoja de cálculo adjunta" | 4 pestañas: API_Prueba, Movimientos, Pedidos, Direcciones |
| **Google Drive (PDFs)** | Drive del owner → Carpeta "InventarioPro_Remitos" | Remitos generados al confirmar pedido |

> **⚠️ IMPORTANTE:** No hay gestor de secretos. La URL del Apps Script y el GitHub Token están en `js/Config.js` (público). Quien tenga acceso al repo ve el endpoint.

---

## 11. PLAN DE ACCIÓN RECOMENDADO (PRÓXIMAS 2 SEMANAS)

### Semana 1 — Estabilización Crítica

| Día | Acción | Responsable | Entregable |
|-----|--------|-------------|------------|
| 1 | **Backup backend** — Copiar `codigo.gs` actual a `docs/backup_codigo_2026-11-24.gs.txt` + crear `appscript/README.md` con proceso deploy | Dev | Backup en docs + README deploy backend |
| 2 | **Limpiar repo** — Borrar `InventarioPro.docx`, `assets/`, `components/`, `pages/`, `laboratorio/`, `backend/`, `database/` | Dev | Repo limpio, solo archivos necesarios |
| 3 | **Validar duplicados** — Check nombre+categoría antes de POST en `guardarNuevoArticulo()` | Dev | Toast "Ya existe" + prevención |
| 4 | **Config.json** — Mover `API_URL` y `GITHUB_TOKEN` a `config.json` (gitignore) + loader en `Config.js` | Dev | Secretos fuera del repo |
| 5 | **Smoke test manual** — Checklist: cargar artículos, navegar 10 páginas, abrir/cerrar 4 modales, entrada/salida/pedido/relevamiento | Dev + QA | Checklist firmado |

### Semana 2 — Fundamentos

| Día | Acción | Responsable | Entregable |
|-----|--------|-------------|------------|
| 6-7 | **Modularizar `script.js`** — Separar en `js/modules/{inventario,pedidos,movimientos,modales,utils,dashboard,direcciones,reportes}.js` + `main.js` entry point | Dev | Estructura modular, imports en `index.html` |
| 8-9 | **Tests e2e Playwright** — Flujos: login (si hay), entrada, salida, pedido completo, relevamiento, export CSV | Dev | `tests/` + CI GitHub Actions |
| 10 | **Paginación real Movimientos** — Offset/cursor en backend + UI paginador | Dev + Backend | Tabla escalable |
| 11 | **Backup automático** — Trigger diario Apps Script: copiar planilla a Drive/hoja backup | Owner (configura trigger) | Backup diario verificado |
| 12 | **Documentación deploy backend** — README en `appscript/` con pasos: copiar código, deploy, setear trigger, permisos | Dev | `appscript/README.md` |

---

## 12. DECISIONES PENDIENTES (REQUIEREN GERENCIA)

| # | Decisión | Opciones | Recomendación | Impacto |
|---|----------|----------|---------------|---------|
| 1 | **Autenticación** | A) Nada (actual) B) User/pass simple en Apps Script C) Google OAuth (@dominio) | **B mínimo** — Rápido, frena acceso público | Seguridad, Auditoría |
| 2 | **Backup diario** | A) Trigger Apps Script → Drive B) Script externo → S3 C) Manual | **A** — Nativo, gratis, confiable | Recuperación desastres |
| 3 | **Auditoría (quién hizo qué)** | A) Requiere auth previo B) Campo opcional "operador" C) No hacer | **A** — Si hay auth, agregar `usuario` a cada movimiento | Trazabilidad |
| 4 | **Imágenes** | A) GitHub Raw (actual) B) Google Drive (Apps Script) C) S3/Cloudinary/CDN | **C** — Profesional, escalable, CDN real | Disponibilidad, performance |
| 5 | **Multi-depósito real** | A) Hardcodeado (Central/Calle 3) B) Dinámico desde Direcciones C) No tocar | **B** — Usar jerarquía Direcciones existente | Escalabilidad |
| 6 | **Reportes avanzados** | A) Tabla + CSV (actual) B) Gráficos Chart.js C) Excel real (SheetJS) D) Email programado | **B + C** — Valor percibido alto, esfuerzo medio | Valor negocio |
| 7 | **Mantener vanilla JS vs Framework** | A) Seguir vanilla + modularizar B) Migrar a React/Vue/Svelte | **A** — Costo migrar >> beneficio. Modularizar basta. | Deuda técnica, hiring |

---

## 13. CONTACTOS Y ESCALAMIENTO

| Rol | Nombre | Contacto | Responsabilidad |
|-----|--------|----------|-----------------|
| **Owner / Product Owner** | — | — | Decisiones de negocio, accesos Google, prioridades |
| **Tech Lead / Dev Actual** | — | — | Código, arquitectura, deploy, incidencias |
| **Backend (Apps Script)** | — | script.google.com | `codigo.gs`, triggers, planilla, PDFs, GitHub PUT |
| **Infra GitHub** | — | github.com/comprassuministros2 | Repo, Pages, secrets, Actions |

---

## 14. CHECKLIST DE ENTREGA (FIRMA)

- [ ] Repo clonado y funcionando en local (`npx serve .`)
- [ ] Acceso a script.google.com proyecto "InventarioPro" verificado
- [ ] Acceso a Google Sheets (DB) verificado
- [ ] Acceso a Google Drive (PDFs) verificado
- [ ] `docs/backup_codigo_YYYY-MM-DD.gs.txt` creado + `appscript/README.md` con proceso deploy (CRÍTICO)
- [ ] Repo limpio (carpetas basura borradas)
- [ ] `config.json` creado y `Config.js` actualizado (secretos fuera)
- [ ] Validación duplicados implementada
- [ ] Smoke test pasado (10 páginas, 4 modales, 4 flujos CRUD)
- [ ] Documentación deploy backend en `appscript/README.md`
- [ ] Decisiones pendientes (auth, backup, imágenes) documentadas y aprobadas

---

**Firma Responsable Saliente:** _________________________ **Fecha:** ___________

**Firma Responsable Entrante:** _________________________ **Fecha:** ___________

**Aprobación Gerencia:** _________________________ **Fecha:** ___________

---

*Documento generado automáticamente tras análisis de código, git history y arquitectura. Versión 1.0 — 24/11/2026*