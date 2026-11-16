# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📦 Project Overview

**InventarioPro V4** — Inventory management SPA built with **Vanilla JavaScript** (HTML/CSS/JS only, no framework). Hosted on GitHub Pages. Backend is a **Google Apps Script** (not in this repo) using Google Sheets as database.

- **Frontend**: `index.html` (entire UI), `css/style.css`, `js/script.js` (main logic), `js/services/` (API layer)
- **Backend**: `codigo.gs` in Google Apps Script (script.google.com) — **NOT in this repository**
- **Images**: Stored in `img/` and served via GitHub Raw URLs
- **Deployment**: Push to `main` → GitHub Pages serves automatically

---

## 🛠️ Development Commands

This is a **zero-build** project. No `package.json`, no bundler, no transpiler.

| Task | Command |
|------|---------|
| **Run locally** | Open `index.html` directly in browser (or `npx serve .`) |
| **Deploy** | `git push origin main` (GitHub Pages auto-deploys) |
| **View backend** | Open script.google.com → project "InventarioPro" |
| **Test API** | Browser console: `apiService.post({accion:"listarArticulos"})` |

**No lint, no tests, no build step.** Edit files and refresh browser.

---

## 🏗️ Architecture (High Level)

```
┌─────────────────────────────────────────────────────────────┐
│                    index.html (SPA Shell)                    │
│  • All pages as <div class="pagina"> with data-page attr    │
│  • Sidebar, Topbar, Modals, Toasts, Action Banner           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      js/script.js                            │
│  • 3700+ lines, 25 sections with TOC comment block          │
│  • State: global `articulos`, `direcciones`, `carrito`      │
│  • Renderers: `renderizarInventario()`, `renderizarPedidos()`|
│  • Event delegation via `data-*` attributes                 │
│  • Keyboard shortcuts (Esc, N, etc.)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│  js/services/           │  │  css/style.css          │
│  ApiService.js          │  │  • CSS Variables theming│
│  ArticulosService.js    │  │  • Mobile ≤768px first  │
└─────────────────────────┘  │  • Grid + Flexbox       │
                             └─────────────────────────┘
                             
                    ┌─────────────────────────┐
                    ▼                         ▼
         ┌──────────────────┐       ┌──────────────────┐
         │  GOOGLE APPS     │       │  GOOGLE SHEETS   │
         │  SCRIPT (GS)     │◄─────►│  (Database)      │
         │  codigo.gs       │       │  Tabs:           │
         │  - doPost router │       │  • API_Prueba    │
         │  - PDF generator │       │  • Movimientos   │
         │  - GitHub PUT    │       │  • Pedidos       │
         │  - Scheduled bot │       │  • Detalle_Pedido│
         └──────────────────┘       └──────────────────┘
```

---

## 📁 Key Files to Know

| File | Purpose |
|------|---------|
| `index.html` | All markup: sidebar, 10 pages, 4 modals, overlay, toasts |
| `js/script.js` | Core logic: navigation, rendering, modals, cart, hotkeys |
| `js/services/ApiService.js` | `post({accion, ...})` wrapper with auth/error handling |
| `js/Config.js` | `API_URL`, `GITHUB_TOKEN` (public repo, token is fine) |
| `css/style.css` | 4000+ lines: theming, grid, cards, responsive ≤768px |
| `js/sidebar.js` | Mobile hamburger menu toggle (open/close/overlay) |

---

## ⚡ Frontend Patterns

### Page Navigation
```javascript
// In script.js
function navegarAPagina(pageName) {
    document.querySelectorAll('.pagina').forEach(p => p.classList.remove('activa'));
    document.getElementById(`pagina-${pageName}`).classList.add('activa');
    // + sidebar active state sync
}
```

### API Calls (always async)
```javascript
const data = await apiService.post({ accion: 'listarArticulos' });
// or
const data = await ArticulosService.obtenerTodos();
```

### Rendering
- **Inventario**: `renderizarInventario()` → `.inventario-cards-grid` (expandable cards)
- **Pedidos**: Master-Detail grid (`.hoja-seguimiento-grid`) + sticky detail panel
- **Tables**: Legacy `.inventario-tabla` still used in Movimientos/Direcciones

### Modals
All modals use `.modal-overlay` class. Open: `el.style.display = 'flex'` / Close: `el.style.display = 'none'`. Common IDs: `modalNuevoArticulo`, `modalEditarArticulo`, `modalDetalleArticulo`, `modalNuevaDireccion`.

### State
```javascript
let articulos = [];           // from API_Prueba sheet
let direcciones = [];         // from listarDirecciones
let carritoPedido = [];       // array of {id, nombre, cantidad, stock}
let hojaSeguimientoData = []; // master list for Pedidos
```

---

## 🔴 STRICT RULES (Read Before Editing)

### 1. NEVER TOUCH BACKEND
- **No `.gs` files in this repo** — backend lives in Google Apps Script
- If task needs DB/PDF/image upload changes → **give me the code block**, I'll paste in script.google.com
- Do not search for `codigo.gs` here — it doesn't exist

### 2. PROTECT HTML IDs
These IDs are referenced in `script.js` — **do not rename/remove**:
```
carritoPedido, detallePedido, editArtNombre, editArtCategoria,
editArtUnidad, editArtMultiplicador, editArtImagenFile,
inputBusqueda, inputArticulo, btnMenu, sidebarOverlay,
contenedorInventario, contenedorHojaSeguimiento, detallePedidoSeccion
```

### 3. CALLE 3 FILTER IS SACRED
- Articles with `ubicacion === 'Calle 3'` **must appear** in:
  - Inventario General (all cards)
  - Salidas search dropdown
  - Pedidos search dropdown
- Only visually filtered in **Depósito Calle 3** tab
- Do not splice/filter the global `articulos` array

### 4. EDIT WITH PROPER TOOLS
- Use `Edit` / `Write` tools — **no PowerShell `Get-Content`/`Set-Content`**
- Large files (`script.js`, `style.css`) → read in chunks with `offset`/`limit`

### 5. RESPONSIVE FIRST
- Breakpoint: **768px** (tablet/mobile)
- Test both: desktop (card grid) + iPhone 12 (hamburger menu, stacked buttons)
- CSS uses `@media (max-width: 768px)` consistently

### 6. ARCHITECT MODE FOR BIG CHANGES
Before refactoring cart, modal system, or grid layout:
1. Give me a 3-step plan
2. Wait for confirmation
3. Then implement

---

## 🔑 Common Tasks & Where to Look

| Task | Files to Edit |
|------|---------------|
| Add page/tab | `index.html` (new `.pagina`), `script.js` (`navegarAPagina` case) |
| New API action | `script.js` (call), tell me backend code for `codigo.gs` |
| Change card layout | `script.js` `renderizarInventario()`, `css/style.css` `.inventario-card` |
| Modify Pedidos grid | `index.html` `#pagina-pedidos`, `script.js` `renderizarHojaSeguimiento()` |
| New modal | `index.html` (markup), `script.js` (open/close functions) |
| Style tweak | `css/style.css` (search section by comment TOC) |
| Fix mobile layout | `@media (max-width: 768px)` sections in CSS |

---

## 🧪 Testing Checklist

Before finishing any visual/interactive change:
- [ ] Desktop Chrome: cards grid, modals, sidebar collapse
- [ ] Mobile ≤768px: hamburger opens/closes, buttons stack, forms fit
- [ ] Navigate all 10 pages via sidebar
- [ ] Open/close each modal (Nuevo Artículo, Editar, Detalle, Dirección)
- [ ] Keyboard: Esc closes modals/sidebar, N opens Nuevo Pedido
- [ ] Calle 3 articles visible in General + search dropdowns

---

## 📌 Backend Actions Reference (for API calls)

```javascript
// Read
apiService.post({ accion: 'listarArticulos' })
apiService.post({ accion: 'listarMovimientos', filtros: {...} })
apiService.post({ accion: 'listarDirecciones' })
apiService.post({ accion: 'listarPedidos', filtroFecha, filtroEstado })
apiService.post({ accion: 'estadisticasDashboard' })
apiService.post({ accion: 'obtenerDetallePedido', idPedido })

// Write
apiService.post({ accion: 'registrarEntrada', articuloId, cantidadPacks, cantidadSueltas, ... })
apiService.post({ accion: 'registrarSalida', articuloId, cantidad, destinoId, ... })
apiService.post({ accion: 'registrarRelevamiento', articuloId, stockReal, ... })
apiService.post({ accion: 'confirmarPedido', idPedido }) // generates PDF
apiService.post({ accion: 'crearArticulo', datos... })
apiService.post({ accion: 'actualizarArticulo', id, datos... })
apiService.post({ accion: 'eliminarArticulo', id })
apiService.post({ accion: 'agregarDireccion', nombre, tipo, superior })
```

---

## 💡 Tips

- **Debug API**: `apiService.post({accion:"listarArticulos"}).then(console.table)`
- **Global state**: `window.articulos` / `window.direcciones` available in console
- **Force re-render**: `navegarAPagina('inventario')` after data mutations
- **Theme toggle**: persisted in `localStorage.inventario-tema` ('light'/'dark')

---

*Last updated: 2026-11-16*