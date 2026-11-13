// ============================================================
// INVENTARIO PRO — LÓGICA PRINCIPAL
// ============================================================
// ÍNDICE DE CONTENIDO:
// 00. TOAST — Notificaciones flotantes
// 01. ESTADO GLOBAL Y UTILIDADES
// 02. NAVEGACIÓN ENTRE PÁGINAS
// 03. CARGA DE ARTÍCULOS
// 04. RENDERIZADO DE INVENTARIO
// 05. UTILIDADES DE BÚSQUEDA, FILTROS Y PRESENTACIÓN
// 06. SELECT DE CATEGORÍAS
// 07. BUSCADORES CON DROPDOWN
// 08. VISTA PREVIA DEL ARTÍCULO
// 09. REGISTRO DE ENTRADAS
// 10. REGISTRO DE SALIDAS
// 11. ÚLTIMAS ENTRADAS Y SALIDAS
// 12. MOVIMIENTOS
// 13. MENÚ LATERAL COLAPSABLE
// 14. DIRECCIONES OFICIALES
// 15. REGISTRAR RELEVAMIENTO
// 16. DIRECCIONES — Ranking y detalle
// 17. DASHBOARD
// 18. PEDIDOS — Gestión y acciones
// 19. PEDIDOS — Pestañas, seguimiento y carrito
// 20. CARTEL DE ACCIÓN
// 21. MODAL NUEVO ARTÍCULO
// 22. ELIMINAR ARTÍCULO
// 23. TEMA CLARO / OSCURO
// 24. INICIALIZACIÓN
// ============================================================

// ============================================================
// INVENTARIO PRO — LÓGICA PRINCIPAL
// ============================================================

// ============================================================
// 0. TOAST - Notificación flotante
// ============================================================
function mostrarToast(mensaje, tipo = 'exito') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const mensajeEl = toast.querySelector('.toast-mensaje');
    const iconoEl = toast.querySelector('.toast-icono');
    if (!mensajeEl || !iconoEl) return;
    mensajeEl.textContent = mensaje;
    iconoEl.textContent = tipo === 'error' ? '✕' : '✓';

    toast.classList.toggle('toast-error', tipo === 'error');
    toast.classList.add('visible');

    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// ============================================================
// 1. ESTADO GLOBAL + UTILIDADES
// ============================================================
let articulos = [];
let filtroActivo = "todos";
let movimientos = [];
let modoCreacionArticulo = null;

// Array global para almacenar instancias de Dropdown y limpiarlas al navegar
let dropdownInstances = [];

function escapeHtml(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[caracter]));
}

function obtenerFechaLocal() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

// ============================================================
// 2. NAVEGACIÓN ENTRE PÁGINAS
// ============================================================
function navegarAPagina(nombre) {
    document.querySelectorAll('.pagina').forEach(p => p.classList.remove('activa'));
    const target = document.getElementById('pagina-' + nombre);
    if (target) target.classList.add('activa');
    document.querySelectorAll('.sidebar-link').forEach(e => e.classList.remove('is-active'));
    const activo = document.querySelector(`.sidebar-link[data-page="${nombre}"]`);
    if (activo) activo.classList.add('is-active');

    // Inicializar buscadores según la página (anti-doble-init dentro de cada función)
    if (nombre === 'entradas') {
        configurarBuscadorDropdown('inputArticulo', 'articuloId', 'listaArticulosCustom', 'vistaPreviaContenido');
    }
    if (nombre === 'salidas') {
        configurarBuscadorDropdown('inputArticuloSalida', 'articuloIdSalida', 'listaArticulosCustomSalida', 'vistaPreviaContenidoSalida');
        configurarBuscadorDestinos();
    }
    if (nombre === 'pedidos') {
        cambiarTabPedidos('seguimiento');
        cargarPedidos();
        configurarBuscadorArticulosPedido();
        configurarBuscadorDireccionesPedido();
    }
    if (nombre === 'relevamiento') {
        configurarBuscadorDropdownRelevamiento();
    }

    if (nombre === 'inventario') cargarArticulos();
    if (nombre === 'movimientos') cargarMovimientos();
    if (nombre === 'direcciones') cargarDirecciones();
    if (nombre === 'dashboard') cargarDashboard();
    if (nombre === 'calle3') {
        cargarArticulosCalle3();
        configurarBuscadorCalle3();
    }

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (window.matchMedia("(max-width: 768px)").matches) {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    }
}

function configurarNavegacion() {
    document.querySelectorAll('.sidebar-link').forEach(e => {
        e.addEventListener('click', function(ev) {
            ev.preventDefault();
            const page = this.dataset.page;
            if (page) navegarAPagina(page);
        });
    });
    const hash = window.location.hash.replace('#', '');
    if (hash) navegarAPagina(hash);
}

// Navegar a inventario filtrando solo stock crítico (desde Dashboard)
function irAStockCritico() {
    navegarAPagina('inventario');
    filtroActivo = 'criticos';
    const select = document.getElementById('selectUbicacion');
    if (select) select.value = 'criticos';
    renderizarArticulos(aplicarFiltro(articulos));
}

// ============================================================
// 3. CARGA DE ARTÍCULOS
// ============================================================
async function cargarArticulos() {
    try {
        const datos = await articulosService.obtenerArticulos();
        articulos = Array.isArray(datos) ? datos : [];
        renderizarArticulos(aplicarFiltro(articulos));
        renderizarSelectCategorias();
        return articulos;
    } catch (error) {
        console.error("Error cargando artículos:", error);
        const contenedor = document.getElementById("contenedorInventario");
        if (contenedor) {
            contenedor.innerHTML = `<p class="placeholder">Error al cargar inventario: ${escapeHtml(error.message)}</p>`;
        }
        return [];
    }
}

// Cargar artículos del Depósito Calle 3
async function cargarArticulosCalle3() {
    try {
        const datos = await articulosService.obtenerArticulos();
        articulos = Array.isArray(datos) ? datos : [];
        const filtrados = articulos.filter(item => String(item.ubicacion || '').trim() === 'Calle 3');
        renderizarArticulosCalle3(filtrados);
        return filtrados;
    } catch (error) {
        console.error("Error cargando artículos Calle 3:", error);
        const contenedor = document.getElementById("contenedorCalle3");
        if (contenedor) {
            contenedor.innerHTML = `<p class="placeholder">Error al cargar Depósito Calle 3: ${escapeHtml(error.message)}</p>`;
        }
        return [];
    }
}

function renderizarArticulosCalle3(datos) {
    const contenedor = document.getElementById("contenedorCalle3");
    if (!contenedor) return;

    if (!datos || datos.length === 0) {
        contenedor.innerHTML = `<p class="placeholder">No hay artículos en el Depósito Calle 3.</p>`;
        return;
    }

    let filas = "";
    datos.forEach(item => {
        const stock = obtenerStock(item);
        const estadoClase = stock > 0 ? "badge-disponible" : "badge-sin-stock";
        const estadoTexto = stock > 0 ? "Disponible" : "Sin stock";
        const celdaArticulo = obtenerCeldaArticuloHTML(item);

        filas += `
            <tr>
                <td>${celdaArticulo}</td>
                <td><span class="stock-numero">${stock}</span></td>
                <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>
                <td><span class="badge-categoria">${escapeHtml(item.categoriaID || '—')}</span></td>
                <td class="td-centrado">
                    <div class="acciones-wrapper">
                        <button class="btn-mas-acciones" type="button" onclick="toggleMenuAcciones(this)">⋮</button>
                        <div class="menu-acciones-dropdown">
                            <button type="button" data-action="historial" data-id="${item.id}">👁️ Ver Historial</button>
                            <button type="button" data-action="relevamiento" data-id="${item.id}">✏️ Relevar Stock</button>
                            <button type="button" data-action="editar" data-id="${item.id}">📷 Editar / Foto</button>
                            <button type="button" class="btn-eliminar" data-action="eliminar" data-id="${item.id}">🗑️ Eliminar</button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    contenedor.innerHTML = `
        <div class="inventario-tabla-wrapper">
            <table class="inventario-tabla">
                <thead>
                    <tr>
                        <th>Artículo</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Categoría</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;

    contenedor.querySelectorAll('.menu-acciones-dropdown button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const accion = this.dataset.action;
            const id = this.dataset.id;
            document.querySelectorAll('.menu-acciones-dropdown').forEach(m => m.classList.remove('visible'));

            if (accion === 'relevamiento') irARelevamientoConArticulo(id);
            else if (accion === 'editar') abrirModalEditarArticulo(id);
            else if (accion === 'historial') abrirModalHistorial(id);
            else if (accion === 'eliminar') eliminarArticulo(id);
        });
    });
}

// ============================================================
// 4. RENDERIZADO DE TARJETAS DE INVENTARIO (Nuevo diseño)
// ============================================================
function renderizarArticulos(datos) {
    const contenedor = document.getElementById("contenedorInventario");
    if (!contenedor) return;

    // Filtro: el inventario general NO muestra los de Calle 3
    datos = datos.filter(item => String(item.ubicacion || '').trim() !== 'Calle 3');

    if (!datos || datos.length === 0) {
        contenedor.innerHTML = `<p class="placeholder">No se encontraron artículos que coincidan con la búsqueda.</p>`;
        return;
    }

    let tarjetas = "";
    datos.forEach(item => {
        const stock = obtenerStock(item);
        let estadoClase = "badge-disponible";
        let estadoTexto = "Disponible";
        if (stock === 0) {
            estadoClase = "badge-sin-stock";
            estadoTexto = "Sin Stock";
        } else if (item.stockCritico > 0 && stock <= item.stockCritico) {
            estadoClase = "badge-critico";
            estadoTexto = "Crítico";
        }

        // Imagen/emoji del artículo
        const imgData = (item.imagen || '').trim();
        let contenidoVisual = '';

        function esUrlImagenSegura(url) {
            return url.startsWith('https://') || url.startsWith('http://') || url.startsWith('data:image/');
        }

        if (imgData.startsWith('img/')) {
            const urlGitHub = `https://raw.githubusercontent.com/comprassuministros2-ship-it/InventarioPro/main/${imgData}?v=${new Date().getTime()}`;
            if (esUrlImagenSegura(urlGitHub)) {
                contenidoVisual = `<img src="${escapeHtml(urlGitHub)}" alt="" style="width: 100%; height: 100%; object-fit: cover;">`;
            }
        } else if (esUrlImagenSegura(imgData)) {
            contenidoVisual = `<img src="${escapeHtml(imgData)}" alt="" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.style.background='transparent';">`;
        } else if (imgData !== '') {
            contenidoVisual = `<span class="emoji-articulo" style="font-size: 2rem;">${escapeHtml(imgData)}</span>`;
        } else {
            contenidoVisual = `<span class="emoji-articulo" style="font-size: 2rem;">📦</span>`;
        }

        tarjetas += `
            <article class="inventario-card" data-id="${item.id}">
                <!-- Parte superior (siempre visible) -->
                <div class="inventario-card-header">
                    <div class="inventario-card-top-row">
                        <div class="inventario-card-image">${contenidoVisual}</div>
                        <div class="inventario-card-info">
                            <span class="inventario-card-name">${escapeHtml(item.articulo)}</span>
                            <span class="inventario-card-category">${escapeHtml(item.categoriaID || '—')}</span>
                        </div>
                        <button type="button" class="inventario-card-expand-btn" aria-label="Expandir tarjeta" aria-expanded="false">▼</button>
                    </div>
                    <div class="inventario-card-stock-row">
                        <div class="inventario-card-stock">
                            <span class="inventario-card-stock-value">${stock}</span>
                            <span class="inventario-card-stock-unit">unidades</span>
                        </div>
                        <span class="inventario-card-badge badge ${estadoClase}">${estadoTexto}</span>
                    </div>
                </div>

                <!-- Parte inferior (expansible) -->
                <div class="inventario-card-body">
                    <div class="inventario-card-body-inner">
                        <div class="inventario-card-movimientos">
                            <span class="inventario-card-movimientos-icon">⏱️</span>
                            <span>Sin movimientos recientes</span>
                        </div>
                        <div class="inventario-card-actions">
                            <button type="button" class="inventario-card-action-btn" data-action="editar" data-id="${item.id}" title="Editar artículo">✏️</button>
                            <button type="button" class="inventario-card-action-btn" data-action="relevamiento" data-id="${item.id}" title="Relevar stock">📋</button>
                            <button type="button" class="inventario-card-action-btn" data-action="historial" data-id="${item.id}" title="Ver historial">👁️</button>
                            <button type="button" class="inventario-card-action-btn" data-action="eliminar" data-id="${item.id}" title="Eliminar artículo">🗑️</button>
                        </div>
                    </div>
                </div>
            </article>
        `;
    });

    contenedor.innerHTML = `<div class="inventario-cards-grid">${tarjetas}</div>`;

    // Event listeners para expandir/colapsar tarjetas
    contenedor.querySelectorAll('.inventario-card-expand-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.inventario-card');
            const isExpanded = card.classList.toggle('expanded');
            this.setAttribute('aria-expanded', isExpanded);
            this.textContent = isExpanded ? '▲' : '▼';
        });
    });

    // Event listeners para botones de acción
    contenedor.querySelectorAll('.inventario-card-action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const accion = this.dataset.action;
            const id = this.dataset.id;

            if (accion === 'relevamiento') irARelevamientoConArticulo(id);
            else if (accion === 'editar') abrirModalEditarArticulo(id);
            else if (accion === 'historial') abrirModalDetalleArticulo(id);
            else if (accion === 'eliminar') eliminarArticulo(id);
        });
    });

    // Event listener para abrir modal de detalle al clickear la tarjeta (excluye botones y flechita)
    contenedor.querySelectorAll('.inventario-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // No abrir modal si el clic fue en un botón o en la flechita de expandir
            if (e.target.closest('button')) return;
            const id = this.dataset.id;
            if (id) abrirModalDetalleArticulo(id);
        });
    });
}

function obtenerCeldaArticuloHTML(articulo) {
    const imgData = (articulo.imagen || '').trim();
    let contenidoVisual = '';

    // Validar que la URL de imagen sea segura (http/https/data:image) para prevenir XSS
    function esUrlImagenSegura(url) {
        return url.startsWith('https://') || url.startsWith('http://') || url.startsWith('data:image/');
    }

    if (imgData.startsWith('img/')) {
        const urlGitHub = `https://raw.githubusercontent.com/comprassuministros2-ship-it/InventarioPro/main/${imgData}?v=${new Date().getTime()}`;
        if (esUrlImagenSegura(urlGitHub)) {
            contenidoVisual = `<img src="${escapeHtml(urlGitHub)}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
        }
    } else if (esUrlImagenSegura(imgData)) {
        contenidoVisual = `<img src="${escapeHtml(imgData)}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.parentElement.style.background='transparent';">`;
    } else if (imgData !== '') {
        contenidoVisual = `<span class="emoji-articulo">${escapeHtml(imgData)}</span>`;
    }

    const obs = articulo.observaciones || '';
    const alertaHTML = obs.includes('⚠️') ? `<span title="${escapeHtml(obs)}" style="margin-left: 8px; font-size: 1.1rem; cursor: help; color: #dc2626;">⚠️</span>` : '';

    return `
        <div class="articulo-celda">
            <div class="articulo-imagen">${contenidoVisual}</div>
            <div class="articulo-info"><span class="articulo-nombre">${escapeHtml(articulo.articulo)} ${alertaHTML}</span></div>
        </div>
    `;
}

// ============================================================
// 5. UTILIDADES DE BÚSQUEDA Y FILTROS
// ============================================================
function normalizarTexto(valor) {
    return (valor ?? "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function filtrarArticulos(termino) {
    const terminoNormalizado = normalizarTexto(termino);
    if (!terminoNormalizado) return articulos;
    return articulos.filter(item => {
        const idCoincideExacto = normalizarTexto(item.id) === terminoNormalizado;
        const camposParciales = [item.articulo, item.categoriaID, item.patrimonio];
        const coincideParcial = camposParciales.some(campo => normalizarTexto(campo).includes(terminoNormalizado));
        return idCoincideExacto || coincideParcial;
    });
}

function obtenerStock(item) {
    const valor = item?.stockIni;
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
    const stock = Number.parseFloat(String(valor ?? "").trim().replace(",", "."));
    return Number.isFinite(stock) ? stock : 0;
}

function obtenerMultiplicadorUnidades(item) {
    const valor = Number.parseInt(item?.multiplicadorUnidades ?? item?.multiplicador, 10);
    return Number.isFinite(valor) && valor > 0 ? valor : 1;
}

function obtenerNombrePresentacion(item) {
    return String(item?.unidadMedida || 'Caja').trim() || 'Caja';
}

function formatearUnidades(cantidad) {
    return Number(cantidad || 0).toLocaleString('es-AR');
}

function actualizarCalculoEntrada() {
    const id = document.getElementById('articuloId')?.value;
    const articulo = articulos.find(item => String(item.id) === String(id));
    const multiplicador = obtenerMultiplicadorUnidades(articulo);
    const presentacion = obtenerNombrePresentacion(articulo);
    const packs = Math.max(0, Number.parseInt(document.getElementById('cantidadPacksEntrada')?.value, 10) || 0);
    const sueltas = Math.max(0, Number.parseInt(document.getElementById('cantidadSueltasEntrada')?.value, 10) || 0);
    const total = packs * multiplicador + sueltas;
    const stockActual = obtenerStock(articulo);

    const cantidad = document.getElementById('cantidad');
    const totalEl = document.getElementById('textoCalculoEntrada');
    const stockEl = document.getElementById('textoStockFuturoEntrada');
    if (cantidad) cantidad.value = String(total);

    if (totalEl) {
        const unidadesLabel = total === 1 ? 'unidad' : 'unidades';
        if (multiplicador > 1) {
            const presentacionBase = presentacion.toLowerCase();
            const presentacionLabel = packs === 1 ? presentacionBase : `${presentacionBase}s`;
            const sueltasLabel = sueltas === 1 ? 'suelta' : 'sueltas';
            totalEl.innerHTML = `
                ${formatearUnidades(packs)} ${escapeHtml(presentacionLabel)} × ${formatearUnidades(multiplicador)} + ${formatearUnidades(sueltas)} ${sueltasLabel} =<br>
                <span class="numero-grande">${formatearUnidades(total)}</span> ${unidadesLabel}
            `;
        } else {
            totalEl.innerHTML = `<span class="numero-grande">${formatearUnidades(total)}</span> ${unidadesLabel}`;
        }
    }

    if (stockEl) {
        let texto = `Stock: ${formatearUnidades(stockActual)} → ${formatearUnidades(stockActual + total)}`;
        if (multiplicador > 1) {
            const cajasEquivalentes = Math.floor(stockActual / multiplicador);
            const sueltasEquivalentes = stockActual - (cajasEquivalentes * multiplicador);
            const presentacionBase = presentacion.toLowerCase();
            const presentacionLabel = cajasEquivalentes === 1 ? presentacionBase : `${presentacionBase}s`;
            const sueltasLabel = sueltasEquivalentes === 1 ? 'suelta' : 'sueltas';
            texto += ` (hoy equivale a ${formatearUnidades(cajasEquivalentes)} ${presentacionLabel} y ${formatearUnidades(sueltasEquivalentes)} ${sueltasLabel})`;
        }
        stockEl.textContent = texto;
    }
}

function actualizarPresentacionEntrada(articulo) {
    const multiplicador = obtenerMultiplicadorUnidades(articulo);
    const presentacion = obtenerNombrePresentacion(articulo);
    const aviso = document.getElementById('avisoPresentacionEntrada');
    const texto = document.getElementById('textoPresentacionEntrada');
    const contenedorPacks = document.getElementById('contenedorPacksEntrada');
    const etiquetaPacks = document.getElementById('labelPacksEntrada');
    const grilla = document.getElementById('cantidadEntradaGrid');
    const packs = document.getElementById('cantidadPacksEntrada');

    if (!articulo || multiplicador === 1) {
        if (aviso) aviso.hidden = true;
        if (contenedorPacks) contenedorPacks.hidden = true;
        if (grilla) grilla.classList.add('unidad-simple');
        if (packs) packs.value = '0';
    } else {
        if (aviso) aviso.hidden = false;
        if (texto) texto.textContent = `${presentacion} de ${formatearUnidades(multiplicador)} unidades`;
        if (contenedorPacks) contenedorPacks.hidden = false;
        if (etiquetaPacks) etiquetaPacks.textContent = `${presentacion.toUpperCase()}S (×${formatearUnidades(multiplicador)})`;
        if (grilla) grilla.classList.remove('unidad-simple');
    }

    actualizarCalculoEntrada();
}

function actualizarPresentacionSalida(articulo) {
    const multiplicador = obtenerMultiplicadorUnidades(articulo);
    const aviso = document.getElementById('avisoPresentacionSalida');
    const texto = document.getElementById('textoStockActualSalida');
    const select = document.getElementById('selectTipoSalida');
    const optPack = document.getElementById('optPackSalida');

    if (!articulo || multiplicador === 1) {
        if (aviso) aviso.hidden = true;
        if (select) {
            select.style.display = 'none';
            select.value = 'unidad';
        }
        return;
    }

    const stock = obtenerStock(articulo);
    const equivalencia = stock / multiplicador;
    const presentacion = obtenerNombrePresentacion(articulo);
    if (texto) {
        texto.textContent = `${formatearUnidades(stock)} unidades (equivale a ${formatearUnidades(equivalencia)} ${presentacion}${equivalencia === 1 ? '' : 's'})`;
    }
    if (aviso) aviso.hidden = false;
    
    if (select) {
        select.style.display = 'block';
        if (optPack) {
            optPack.textContent = `${presentacion}s (x${multiplicador})`;
        }
    }
}

function sincronizarCantidadSalida() {
    const input = document.getElementById('cantidadUnidadesSalida');
    const hidden = document.getElementById('cantidadSalida');
    if (input && hidden) hidden.value = input.value;
}

function restablecerCantidadEntrada() {
    const packs = document.getElementById('cantidadPacksEntrada');
    const sueltas = document.getElementById('cantidadSueltasEntrada');
    const cantidad = document.getElementById('cantidad');
    const aviso = document.getElementById('avisoPresentacionEntrada');
    const contenedorPacks = document.getElementById('contenedorPacksEntrada');
    const grilla = document.getElementById('cantidadEntradaGrid');
    if (packs) packs.value = '0';
    if (sueltas) sueltas.value = '0';
    if (cantidad) cantidad.value = '0';
    if (aviso) aviso.hidden = true;
    if (contenedorPacks) contenedorPacks.hidden = true;
    if (grilla) grilla.classList.add('unidad-simple');
    actualizarCalculoEntrada();
}

function restablecerCantidadSalida() {
    const cantidad = document.getElementById('cantidadUnidadesSalida');
    const hidden = document.getElementById('cantidadSalida');
    const aviso = document.getElementById('avisoPresentacionSalida');
    const select = document.getElementById('selectTipoSalida');
    if (cantidad) cantidad.value = '1';
    if (hidden) hidden.value = '1';
    if (aviso) aviso.hidden = true;
    if (select) {
        select.style.display = 'none';
        select.value = 'unidad';
    }
}

function aplicarFiltro(datos) {
    if (!Array.isArray(datos)) return [];
    return datos.filter(item => {
        const stock = obtenerStock(item);
        if (filtroActivo === "disponibles") return stock > 0;
        if (filtroActivo === "stock-bajo") return stock >= 1 && stock <= 5;
        if (filtroActivo === "sin-stock") return stock === 0;
        if (filtroActivo === "criticos") return stock === 0 || (item.stockCritico > 0 && stock <= item.stockCritico);
        if (filtroActivo === "todos" || !filtroActivo) return true;
        const categoriaItem = normalizarTexto(item.categoriaID);
        const categoriaFiltro = normalizarTexto(filtroActivo);
        return categoriaItem === categoriaFiltro || categoriaItem.includes(categoriaFiltro) || categoriaFiltro.includes(categoriaItem);
    });
}

function configurarBuscador() {
    const input = document.getElementById("inputBusqueda");
    if (!input) return;
    let timeoutBusqueda = null;
    input.addEventListener("input", () => {
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(() => {
            const valor = input.value;
            const resultados = aplicarFiltro(filtrarArticulos(valor));
            renderizarArticulos(resultados);
        }, 300);
    });
}

function configurarBuscadorCalle3() {
    const input = document.getElementById("inputBusquedaCalle3");
    if (!input) return;
    let timeoutBusqueda = null;
    input.addEventListener("input", () => {
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(() => {
            const termino = input.value;
            const terminoNormalizado = normalizarTexto(termino);
            let filtrados = articulos.filter(item => String(item.ubicacion || '').trim() === 'Calle 3');
            if (terminoNormalizado) {
                filtrados = filtrados.filter(item => {
                    const idCoincideExacto = normalizarTexto(item.id) === terminoNormalizado;
                    const camposParciales = [item.articulo, item.categoriaID, item.patrimonio];
                    const coincideParcial = camposParciales.some(campo => normalizarTexto(campo).includes(terminoNormalizado));
                    return idCoincideExacto || coincideParcial;
                });
            }
            renderizarArticulosCalle3(filtrados);
        }, 300);
    });
}

// ============================================================
// 6. SELECT DE CATEGORÍAS
// ============================================================
function renderizarSelectCategorias() {
    const select = document.getElementById('selectUbicacion');
    if (!select) return;

    const valorActual = select.value || 'todos';
    select.innerHTML = '<option value="todos">Todas las categorías</option>' +
        '<option value="criticos">⚠️ Solo Stock Crítico</option>';

    const categorias = new Set();
    articulos.forEach(item => {
        if (item.categoriaID && item.categoriaID.trim() !== '') {
            categorias.add(item.categoriaID.trim());
        }
    });

    Array.from(categorias).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });

    if (Array.from(select.options).some(o => o.value === valorActual)) {
        select.value = valorActual;
    }

    if (!select.dataset.listener) {
        select.addEventListener('change', () => {
            filtroActivo = select.value;
            const resultados = aplicarFiltro(articulos);
            renderizarArticulos(resultados);
        });
        select.dataset.listener = 'true';
    }
}

// ============================================================
// 7. BUSCADORES CON DROPDOWN — Componente Unificado
// ============================================================
/**
 * Dropdown - Componente unificado para buscadores con lista desplegable
 * Reemplaza las 5 implementaciones duplicadas anteriores
 */
class Dropdown {
    constructor(options) {
        this.input = options.input;
        this.dropdown = options.dropdown;
        this.hidden = options.hidden || null;
        this.dataSource = options.dataSource;
        this.filter = options.filter || this.defaultFilter;
        this.renderItem = options.renderItem;
        this.onSelect = options.onSelect;
        this.onClose = options.onClose || (() => {});
        this.maxResults = options.maxResults || 0;
        this.allowFreeText = options.allowFreeText || false;
        this.freeTextLabel = options.freeTextLabel || 'Usar: <strong>${value}</strong> <span class="id-articulo">(texto libre)</span>';
        this.keyboardNav = options.keyboardNav !== false;
        this.clickOutsideSelector = options.clickOutsideSelector || '.buscador-articulo-group';
        this.minChars = options.minChars || 1;
        this.debounceMs = options.debounceMs || 0;

        this.selectedIndex = -1;
        this.debounceTimer = null;
        this.abortController = null;
        this.isOpen = false;

        // Guardar referencias a handlers para poder removerlos en destroy()
        this._handlers = {
            focus: null,
            input: null,
            keydownNav: null,
            keydownEscape: null,
            clickOutside: null
        };

        this.init();
    }

    defaultFilter(items, termino) {
        // 1. Normalizar el término de búsqueda (quitar tildes, minúsculas)
        // 2. Convertir guiones o barras en espacios para unificar
        const terminoLimpio = normalizarTexto(termino).replace(/[-_/]/g, ' ');
        if (!terminoLimpio) return [];

        // Separar la búsqueda en palabras (ej: "coca cola" -> ["coca", "cola"])
        const palabras = terminoLimpio.split(/\s+/).filter(p => p.length > 0);

        return items.filter(item => {
            // Preparar el texto del artículo y la categoría de la misma forma
            const textoArticulo = normalizarTexto(item.articulo || item.nombre || '').replace(/[-_/]/g, ' ');
            const textoCategoria = normalizarTexto(item.categoriaID || '').replace(/[-_/]/g, ' ');
            const textoCompleto = textoArticulo + ' ' + textoCategoria;

            // Devolver true solo si TODAS las palabras buscadas están presentes
            return palabras.every(palabra => textoCompleto.includes(palabra));
        });
    }

    init() {
        if (!this.input || !this.dropdown) return;

        // Focus event - show dropdown if there's content
        this._handlers.focus = () => {
            const valor = this.input.value.trim();
            if (valor.length >= this.minChars) {
                this.filtrar(valor);
            }
        };
        this.input.addEventListener('focus', this._handlers.focus);

        // Input event with optional debounce
        this._handlers.input = (e) => {
            const valor = e.target.value.trim();

            if (this.hidden) {
                this.hidden.value = valor;
            }

            if (this.debounceMs > 0) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.filtrar(valor);
                }, this.debounceMs);
            } else {
                this.filtrar(valor);
            }
        };
        this.input.addEventListener('input', this._handlers.input);

        // Keyboard navigation
        if (this.keyboardNav) {
            this._handlers.keydownNav = (e) => this.handleKeydown(e);
            this.input.addEventListener('keydown', this._handlers.keydownNav);
        }

        // Click outside to close
        this._handlers.clickOutside = (e) => {
            if (!e.target.closest(this.clickOutsideSelector)) {
                this.close();
            }
        };
        document.addEventListener('click', this._handlers.clickOutside);

        // Escape key to close
        this._handlers.keydownEscape = (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        };
        this.input.addEventListener('keydown', this._handlers.keydownEscape);
    }

    filtrar(texto) {
        if (texto.length < this.minChars) {
            this.close();
            return;
        }

        // Cancel any pending async operation
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        const items = typeof this.dataSource === 'function'
            ? this.dataSource()
            : this.dataSource;

        let resultados = this.filter(items, texto);

        if (this.maxResults > 0) {
            resultados = resultados.slice(0, this.maxResults);
        }

        this.render(resultados, texto);
    }

    render(resultados, textoOriginal) {
        this.dropdown.innerHTML = '';
        this.selectedIndex = -1;

        if (resultados.length === 0) {
            if (this.allowFreeText && textoOriginal.length >= this.minChars) {
                this.addFreeTextOption(textoOriginal);
            } else {
                this.addNoResultsItem();
            }
            this.open();
            return;
        }

        resultados.forEach((item, index) => {
            const li = document.createElement('li');
            li.innerHTML = this.renderItem(item);
            li.dataset.index = index;
            li.dataset.id = item.id || '';
            li.addEventListener('click', () => this.selectItem(item));
            this.dropdown.appendChild(li);
        });

        if (this.allowFreeText && textoOriginal.length >= this.minChars) {
            this.addFreeTextOption(textoOriginal);
        }

        this.open();
    }

    addNoResultsItem() {
        const li = document.createElement('li');
        li.textContent = 'No se encontraron resultados';
        li.style.color = 'var(--text-muted)';
        li.style.fontStyle = 'italic';
        li.style.cursor = 'default';
        this.dropdown.appendChild(li);
    }

    addFreeTextOption(valor) {
        const li = document.createElement('li');
        li.innerHTML = this.freeTextLabel.replace('${value}', escapeHtml(valor));
        li.addEventListener('click', () => {
            if (this.hidden) this.hidden.value = valor;
            this.close();
            this.onSelect({ freeText: true, value: valor }, this.input, this.hidden, this.dropdown);
        });
        this.dropdown.appendChild(li);
    }

    selectItem(item) {
        this.input.value = item.articulo || item.nombre || '';
        if (this.hidden) this.hidden.value = item.id || '';
        this.close();
        this.onSelect(item, this.input, this.hidden, this.dropdown);
    }

    handleKeydown(e) {
        const items = this.dropdown.querySelectorAll('li');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % items.length;
            this.updateSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
            this.updateSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                items[this.selectedIndex].click();
            }
        }
    }

    updateSelection(items) {
        items.forEach((li, i) => li.classList.toggle('seleccionado', i === this.selectedIndex));
    }

    open() {
        this.dropdown.classList.add('visible');
        this.isOpen = true;
    }

    close() {
        this.dropdown.classList.remove('visible');
        this.isOpen = false;
        this.selectedIndex = -1;
        this.onClose();
    }

    destroy() {
        // Limpiar timeout de debounce
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;

        // Cancelar cualquier operación async pendiente
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        // Remover event listeners del input
        if (this.input) {
            if (this._handlers.focus) this.input.removeEventListener('focus', this._handlers.focus);
            if (this._handlers.input) this.input.removeEventListener('input', this._handlers.input);
            if (this._handlers.keydownNav) this.input.removeEventListener('keydown', this._handlers.keydownNav);
            if (this._handlers.keydownEscape) this.input.removeEventListener('keydown', this._handlers.keydownEscape);
        }

        // Remover event listener global de click outside
        if (this._handlers.clickOutside) {
            document.removeEventListener('click', this._handlers.clickOutside);
        }

        // Limpiar referencias
        this._handlers = {
            focus: null,
            input: null,
            keydownNav: null,
            keydownEscape: null,
            clickOutside: null
        };
    }
}

// Función helper para mantener compatibilidad
function configurarBuscadorDropdown(inputId, hiddenId, dropdownId, previewId) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !hidden || !dropdown) return;

    // Anti-doble init: si ya está inicializado, no hacer nada
    if (input.dataset.dropdownInit === 'true') return;
    input.dataset.dropdownInit = 'true';

    const instance = new Dropdown({
        input,
        dropdown,
        hidden,
        dataSource: () => articulos,
        minChars: 1,
        debounceMs: 150,
        keyboardNav: true,
        clickOutsideSelector: '.buscador-articulo-group',
        renderItem: (item) => `${escapeHtml(item.articulo)}`,
        onSelect: (item) => {
            if (item.freeText) return;
            input.value = item.articulo;
            hidden.value = item.id;
            if (previewId) mostrarVistaPrevia(item.id, previewId);
        }
    });
    dropdownInstances.push(instance);
}

function configurarBuscadorDropdownRelevamiento() {
    const input = document.getElementById('inputArticuloRelevamiento');
    const hidden = document.getElementById('articuloIdRelevamiento');
    const dropdown = document.getElementById('listaArticulosCustomRelevamiento');
    if (!input || !hidden || !dropdown) return;

    // Anti-doble init
    if (input.dataset.dropdownInit === 'true') return;
    input.dataset.dropdownInit = 'true';

    const instance = new Dropdown({
        input,
        dropdown,
        hidden,
        dataSource: () => articulos,
        minChars: 1,
        debounceMs: 150,
        keyboardNav: true,
        clickOutsideSelector: '.buscador-articulo-group',
        renderItem: (item) => `${escapeHtml(item.articulo)}`,
        onSelect: (item) => {
            if (item.freeText) return;
            input.value = item.articulo;
            hidden.value = item.id;
            mostrarStockSistemaRelevamiento(item.id);
        },
        onClose: () => {
            if (!hidden.value) {
                document.getElementById('stockSistema').value = '—';
                document.getElementById('diferencia').value = '—';
                document.getElementById('vistaPreviaContenidoRelevamiento').innerHTML = '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
            }
        }
    });
    dropdownInstances.push(instance);
}

// ============================================================
// 8. VISTA PREVIA DEL ARTÍCULO
// ============================================================
function mostrarVistaPrevia(id, contenedorId) {
    const item = articulos.find(a => String(a.id) === String(id));
    if (!item) return;
    const stock = obtenerStock(item);
    let estadoClase = 'badge-disponible';
    let estadoTexto = 'Disponible';
    if (stock === 0) { estadoClase = 'badge-sin-stock'; estadoTexto = 'Sin stock'; }
    else if (stock <= 5) { estadoClase = 'badge-critico'; estadoTexto = 'Crítico'; }
    else if (stock <= 10) { estadoClase = 'badge-bajo'; estadoTexto = 'Bajo'; }

    const multiplicador = obtenerMultiplicadorUnidades(item);
    const presentacion = obtenerNombrePresentacion(item);
    const presentacionHTML = multiplicador > 1
        ? `<div style="margin-top: 15px; font-size: 0.85rem; color: var(--text-muted);">Presentación: ${escapeHtml(presentacion)} de ${formatearUnidades(multiplicador)}</div>`
        : '';

    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    contenedor.innerHTML = `
        <div class="articulo-preview">
            <div class="nombre">${escapeHtml(item.articulo)}</div>
            <div class="stock-grande">${stock}</div>
            <div style="color: var(--text-muted);">unidades actuales</div>
            <div class="detalle">
                <span class="badge ${estadoClase}">${estadoTexto}</span>
                ${item.stockMin ? `<span style="color:var(--text-muted);font-size:0.85rem;">Mínimo: ${item.stockMin}</span>` : ''}
            </div>
            ${presentacionHTML}
        </div>
    `;
}

// ============================================================
// 9. REGISTRO DE ENTRADAS
// ============================================================
async function registrarEntrada(e) {
    e.preventDefault();
    const id = document.getElementById("articuloId").value;
    actualizarCalculoEntrada();
    const cantidad = Number.parseInt(document.getElementById("cantidad").value, 10);
    
    const proveedor = document.getElementById("proveedor").value.trim();
    const factura = document.getElementById("factura").value.trim();
    const tipoCompra = document.getElementById("tipoCompra").value.trim();
    const observaciones = document.getElementById("observaciones").value.trim();
    const fecha = document.getElementById("fechaEntrada").value || obtenerFechaLocal();

    if (!id) { mostrarToast('Seleccioná un artículo', 'error'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { mostrarToast('Cantidad inválida', 'error'); return; }

    const hayDatosFaltantes = !proveedor || !factura || !tipoCompra;

    const btn = document.getElementById('btnRegistrar');
    btn.disabled = true;
    btn.textContent = 'Registrando...';
    try {
        const payload = {
            accion: 'registrarEntrada',
            id: id,
            cantidad: cantidad,
            proveedor: proveedor || 'S/D',
            ordenCompra: factura || 'S/D',
            tipoCompra: tipoCompra || 'S/D',
            observacion: observaciones,
            fecha: fecha,
            incompleto: hayDatosFaltantes
        };
        
        const resultado = await apiService.post(payload);
        if (resultado && resultado.exito === false) throw new Error(resultado.error || 'Error desconocido');

        const articuloSel = articulos.find(a => String(a.id) === String(id));
        const nombreArticulo = articuloSel ? articuloSel.articulo : ('ID ' + id);
        
        mostrarCartel('⬆️', 'ENTRADA REGISTRADA', `${nombreArticulo} · +${cantidad} unidades`, 'entrada');

        document.getElementById('formEntrada').reset();
        document.getElementById('articuloId').value = '';
        document.getElementById('vistaPreviaContenido').innerHTML = '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
        document.getElementById('registradoPor').value = 'Samuel Steves';
        restablecerCantidadEntrada();
        await cargarArticulos();
        await cargarUltimasEntradas();
        movimientos = [];
    } catch (error) {
        mostrarToast(`Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar entrada';
    }
}

// ============================================================
// 10. REGISTRO DE SALIDAS
// ============================================================
async function registrarSalida(e) {
    e.preventDefault();
    const id = document.getElementById("articuloIdSalida").value;
    
    const inputCantidad = document.getElementById("cantidadUnidadesSalida");
    const selectTipo = document.getElementById("selectTipoSalida");
    const cantIngresada = Number.parseInt(inputCantidad.value, 10);
    const tipoSeleccionado = selectTipo ? selectTipo.value : 'unidad';
    
    if (!validarDestinoSalida()) {
        mostrarToast('Ingresá el destino o dirección', 'error');
        return;
    }
    
    const destino = document.getElementById("destinoSalida").value.trim();
    const factura = document.getElementById("facturaSalida").value.trim();
    let observaciones = document.getElementById("observacionesSalida").value.trim();
    const fecha = document.getElementById("fechaSalida").value;

    if (!id) { mostrarToast('Seleccioná un artículo', 'error'); return; }
    if (isNaN(cantIngresada) || cantIngresada <= 0) { mostrarToast('Cantidad inválida', 'error'); return; }

    const articuloSel = articulos.find(a => String(a.id) === String(id));
    const multiplicador = obtenerMultiplicadorUnidades(articuloSel);
    const nombreArticulo = articuloSel ? articuloSel.articulo : ('ID ' + id);
    
    let cantidadUnidadesReales = cantIngresada;
    if (tipoSeleccionado === 'pack' && multiplicador > 1) {
        cantidadUnidadesReales = cantIngresada * multiplicador;
        const textoPack = `[Salida: ${cantIngresada} ${obtenerNombrePresentacion(articuloSel)}(s)]`;
        observaciones = observaciones ? `${textoPack} ${observaciones}` : textoPack;
    }

    // Validación de stock en frontend antes de enviar al backend
    const stockActual = obtenerStock(articuloSel);
    if (cantidadUnidadesReales > stockActual) {
        mostrarToast(`Stock insuficiente: ${stockActual} unidades disponibles, ${cantidadUnidadesReales} solicitadas`, 'error');
        return;
    }

    const btn = document.getElementById('btnRegistrarSalida');
    btn.disabled = true;
    btn.textContent = 'Registrando...';
    try {
        const payload = {
            accion: 'registrarSalida',
            id: id,
            cantidad: cantidadUnidadesReales,
            destino: destino,
            factura: factura,
            observacion: observaciones,
            fecha: fecha
        };
        const resultado = await apiService.post(payload);
        
        if (resultado && resultado.exito === false) {
            if (resultado.error && resultado.error.toLowerCase().includes('stock insuficiente')) {
                mostrarToast(resultado.error, 'error');
            } else {
                throw new Error(resultado.error || 'Error desconocido');
            }
            return;
        }

        mostrarCartel('⬇️', 'SALIDA REGISTRADA', `${nombreArticulo} · -${cantidadUnidadesReales} unidades`, 'salida');

        document.getElementById('formSalida').reset();
        document.getElementById('articuloIdSalida').value = '';
        document.getElementById('vistaPreviaContenidoSalida').innerHTML = '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
        document.getElementById('registradoPorSalida').value = 'Samuel Steves';
        
        restablecerCantidadSalida();
        await cargarArticulos();
        await cargarUltimasSalidas();
        movimientos = [];
    } catch (error) {
        mostrarToast(`Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar salida';
    }
}

// ============================================================
// 11. ÚLTIMAS ENTRADAS Y SALIDAS
// ============================================================
async function cargarUltimasEntradas() {
    const contenedor = document.getElementById('ultimasEntradasContenido');
    if (!contenedor) return;
    try {
        const resultado = await apiService.post({ accion: 'ultimasEntradas', cantidad: 5 });
        if (resultado && resultado.exito === false) throw new Error(resultado.error);
        const datos = Array.isArray(resultado) ? resultado : [];
        if (datos.length === 0) {
            contenedor.innerHTML = '<p class="placeholder">Sin movimientos recientes</p>';
            return;
        }
        let html = '<ul class="lista-entradas">';
        datos.forEach(mov => {
            const fecha = mov.fecha ? new Date(mov.fecha).toLocaleDateString('es-AR') : '';
            const proveedor = mov.proveedor || '—';
            const orden = mov.orden || '';
            const cantidad = mov.cantidad || 0;
            const nombre = mov.nombre || mov.articulo || `ID ${mov.id}`;
            html += `
                <li>
                    <div class="item-nombre">${escapeHtml(nombre)}</div>
                    <div class="item-detalle">${fecha} · ${escapeHtml(proveedor)} ${orden ? '· '+escapeHtml(orden) : ''}</div>
                    <div class="item-cantidad">+${cantidad}</div>
                </li>
            `;
        });
        html += '</ul>';
        contenedor.innerHTML = html;
    } catch (error) {
        console.error('Error cargando últimas entradas:', error);
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${escapeHtml(error.message)}</p>`;
    }
}

async function cargarUltimasSalidas() {
    const contenedor = document.getElementById('ultimasSalidasContenido');
    if (!contenedor) return;
    try {
        const resultado = await apiService.post({ accion: 'ultimasSalidas', cantidad: 5 });
        if (resultado && resultado.exito === false) throw new Error(resultado.error);
        const datos = Array.isArray(resultado) ? resultado : [];
        if (datos.length === 0) {
            contenedor.innerHTML = '<p class="placeholder">Sin movimientos recientes</p>';
            return;
        }
        let html = '<ul class="lista-salidas">';
        datos.forEach(mov => {
            const fecha = mov.fecha ? new Date(mov.fecha).toLocaleDateString('es-AR') : '';
            const destino = mov.destino || '—';
            const factura = mov.factura || '';
            const cantidad = mov.cantidad || 0;
            const nombre = mov.nombre || mov.articulo || `ID ${mov.id}`;
            html += `
                <li>
                    <div class="item-nombre">${escapeHtml(nombre)}</div>
                    <div class="item-detalle">${fecha} · ${escapeHtml(destino)} ${factura ? '· '+escapeHtml(factura) : ''}</div>
                    <div class="item-cantidad" style="color: #dc2626;">-${cantidad}</div>
                </li>
            `;
        });
        html += '</ul>';
        contenedor.innerHTML = html;
    } catch (error) {
        console.error('Error cargando últimas salidas:', error);
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${escapeHtml(error.message)}</p>`;
    }
}

// ============================================================
// 12. MOVIMIENTOS
// ============================================================
const MOV_POR_LOTE = 100;
let movimientosFiltrados = [];
let movimientosVisibles = 0;

async function cargarMovimientos() {
    const contenedor = document.getElementById('contenedorMovimientos');
    if (!contenedor) return;

    if (movimientos.length > 0) {
        renderizarMovimientos(movimientos);
        return;
    }

    contenedor.innerHTML = '<p class="placeholder">Cargando movimientos...</p>';

    try {
        const resultado = await apiService.post({ accion: 'listarMovimientos' });
        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error al obtener movimientos');
        }
        movimientos = Array.isArray(resultado) ? resultado : [];

        prepararTimestampsMovimientos(movimientos);

        renderizarMovimientos(movimientos);
    } catch (error) {
        console.error('Error cargando movimientos:', error);
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${escapeHtml(error.message)}</p>`;
    }
}

function prepararTimestampsMovimientos(datos) {
    datos.forEach(m => {
        m._ts = m.fecha ? new Date(m.fecha).getTime() : 0;
    });
}

function renderizarMovimientos(datos) {
    const contenedor = document.getElementById('contenedorMovimientos');
    if (!contenedor) return;

    const texto = (document.getElementById('inputBusquedaMov')?.value || '').trim().toLowerCase();
    const tipo = document.getElementById('selectTipoMov')?.value || 'todos';

    let filtrados = datos;

    if (tipo !== 'todos') {
        filtrados = filtrados.filter(m => m.tipo === tipo);
    }

    if (texto) {
        const t = normalizarTexto(texto);
        filtrados = filtrados.filter(m => {
            const campos = [
                m.nombre,
                m.proveedor,
                m.destino,
                m.observacion,
                m.ordenCompra,
                m.factura
            ].filter(Boolean);
            return campos.some(c => normalizarTexto(c).includes(t));
        });
    }

    filtrados = [...filtrados].sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0));

    if (filtrados.length === 0) {
        movimientosFiltrados = [];
        movimientosVisibles = 0;
        contenedor.innerHTML = '<p class="placeholder">No hay movimientos para mostrar.</p>';
        return;
    }

    movimientosFiltrados = filtrados;
    movimientosVisibles = Math.min(MOV_POR_LOTE, filtrados.length);

    const filas = generarFilasMovimientos(filtrados.slice(0, movimientosVisibles));
    const hayMas = filtrados.length > movimientosVisibles;

    contenedor.innerHTML = `
        <p class="placeholder" style="margin: 0.5rem 0;">Mostrando ${movimientosVisibles} de ${filtrados.length} movimientos</p>
        <div class="inventario-tabla-wrapper">
            <table class="inventario-tabla">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Artículo</th>
                        <th>Cantidad</th>
                        <th>Origen / Destino</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
        ${hayMas ? `
        <div style="text-align: center; margin: 1rem 0;">
            <button class="btn-exportar" id="btnVerMasMov" type="button">Ver más (${filtrados.length - movimientosVisibles} restantes)</button>
        </div>` : ''}
    `;

    const btnVerMas = document.getElementById('btnVerMasMov');
    if (btnVerMas) {
        btnVerMas.addEventListener('click', verMasMovimientos);
    }
}

function generarFilasMovimientos(datos) {
    let filas = '';
    datos.forEach(m => {
        const fecha = m.fecha ? new Date(m.fecha).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) : '—';

        const esEntrada = m.tipo === 'Entrada';
        const tipoClase = esEntrada ? 'badge-disponible' : 'badge-sin-stock';
        const tipoTexto = m.tipo || '—';

        const origenDestino = esEntrada
            ? (m.proveedor || '—')
            : (m.destino || m.proveedor || '—');

        const nota = m.ordenCompra || m.factura || '—';
        const detalle = m.observacion || '—';

        let cantTexto = '';
        let cantColor = '#dc2626';

        if (m.tipo === 'Entrada') {
            cantTexto = `+${m.cantidad}`;
            cantColor = '#16a34a';
        } else if (m.tipo === 'Salida') {
            cantTexto = `-${m.cantidad}`;
            cantColor = '#dc2626';
        } else if (m.tipo === 'Relevamiento') {
            const dif = Number(m.cantidad) || 0;
            cantTexto = dif > 0 ? `+${dif}` : `${dif}`;
            cantColor = dif > 0 ? '#16a34a' : '#dc2626';
        } else {
            cantTexto = String(m.cantidad);
        }

        filas += `
            <tr>
                <td>${fecha}</td>
                <td><span class="badge ${tipoClase}">${tipoTexto}</span></td>
                <td><strong>${escapeHtml(m.nombre || m.idArticulo || '—')}</strong></td>
                <td style="font-weight:700;color:${cantColor};">${cantTexto}</td>
                <td>${escapeHtml(origenDestino)}</td>
                <td>${escapeHtml(nota)}${detalle !== '—' ? ' · ' + escapeHtml(detalle) : ''}</td>
            </tr>
        `;
    });
    return filas;
}

function verMasMovimientos() {
    const contenedor = document.getElementById('contenedorMovimientos');
    if (!contenedor) return;

    const total = movimientosFiltrados.length;

    const nuevos = movimientosFiltrados.slice(movimientosVisibles, movimientosVisibles + MOV_POR_LOTE);
    if (nuevos.length === 0) return;

    const tbody = contenedor.querySelector('.inventario-tabla tbody');
    if (!tbody) return;

    tbody.insertAdjacentHTML('beforeend', generarFilasMovimientos(nuevos));
    movimientosVisibles += nuevos.length;

    const contador = contenedor.querySelector('.placeholder');
    if (contador) contador.textContent = `Mostrando ${movimientosVisibles} de ${total} movimientos`;

    const btn = document.getElementById('btnVerMasMov');
    if (btn) {
        if (movimientosVisibles >= total) {
            btn.closest('div').remove();
        } else {
            btn.textContent = `Ver más (${total - movimientosVisibles} restantes)`;
        }
    }
}

function configurarMovimientos() {
    const inputBusqueda = document.getElementById('inputBusquedaMov');
    const selectTipo = document.getElementById('selectTipoMov');
    const btnActualizar = document.getElementById('btnActualizarMov');

    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', () => {
            clearTimeout(window._movBusquedaTimeout);
            window._movBusquedaTimeout = setTimeout(() => {
                renderizarMovimientos(movimientos);
            }, 300);
        });
    }
    if (selectTipo) {
        selectTipo.addEventListener('change', () => renderizarMovimientos(movimientos));
    }
    if (btnActualizar) {
        btnActualizar.addEventListener('click', () => {
            movimientos = [];
            cargarMovimientos();
        });
    }
}
// ============================================================
// 13. MENÚ LATERAL COLAPSABLE
// ============================================================
function configurarMenu() {
    const btnMenu = document.getElementById('btnMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const layout = document.querySelector('.app-layout');
    if (!btnMenu || !sidebar) return;
    function toggleMenu() {
        if (window.matchMedia("(max-width: 768px)").matches) {
            sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show');
        } else {
            sidebar.classList.toggle('collapsed');
            if (layout) layout.classList.toggle('sidebar-collapsed');
        }
    }
    btnMenu.addEventListener('click', toggleMenu);
    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }
}

// ============================================================
// 14. DIRECCIONES OFICIALES
// ============================================================
let direccionesOficiales = [];

async function cargarDireccionesOficiales() {
    try {
        const resultado = await apiService.post({ accion: 'listarDirecciones' });
        if (resultado && resultado.exito === false) throw new Error(resultado.error);
        direccionesOficiales = Array.isArray(resultado) ? resultado : [];
    } catch (error) {
        console.error('Error cargando direcciones oficiales:', error);
        direccionesOficiales = [];
    }
    configurarBuscadorDestinos();
}

function configurarBuscadorDestinos() {
    const input = document.getElementById('inputDestinoSalida');
    const hidden = document.getElementById('destinoSalida');
    const dropdown = document.getElementById('listaDestinosCustom');
    if (!input || !hidden || !dropdown) return;

    // Anti-doble init
    if (input.dataset.dropdownInit === 'true') return;
    input.dataset.dropdownInit = 'true';

    const instance = new Dropdown({
        input,
        dropdown,
        hidden,
        dataSource: () => direccionesOficiales || [],
        minChars: 1,
        debounceMs: 150,
        keyboardNav: false,
        clickOutsideSelector: '.destino-input-wrapper',
        allowFreeText: true,
        maxResults: 0,
        renderItem: (dir) => `${escapeHtml(dir.nombre)} <span class="id-articulo">${escapeHtml(dir.tipo || '')}</span>`,
        freeTextLabel: `Usar: <strong>\${value}</strong> <span class="id-articulo">(texto libre)</span>`,
        filter: (items, termino) => {
            const terminoNorm = normalizarTexto(termino);
            if (!terminoNorm) return [];
            const palabras = terminoNorm.split(/\s+/).filter(p => p.length > 0);
            return items.filter(item => {
                const textoCompleto = normalizarTexto((item.nombre || '') + ' ' + (item.tipo || '')).replace(/[-_/]/g, ' ');
                return palabras.every(palabra => textoCompleto.includes(palabra));
            });
        },
        onSelect: (item) => {
            if (item.freeText) {
                hidden.value = item.value;
                return;
            }
            input.value = item.nombre;
            hidden.value = item.nombre;
        }
    });
    dropdownInstances.push(instance);
}

function validarDestinoSalida() {
    const hidden = document.getElementById('destinoSalida');
    const input = document.getElementById('inputDestinoSalida');
    if (!hidden || !input) return false;
    const valor = (hidden.value || input.value || '').trim();
    return valor.length > 0;
}

function configurarModalDireccion() {
    const btnAbrir = document.getElementById('btnAgregarDireccion');
    const modal = document.getElementById('modalNuevaDireccion');
    const btnCerrar = document.getElementById('cerrarModalDireccion');
    const btnCancelar = document.getElementById('cancelarModalDireccion');
    const btnGuardar = document.getElementById('guardarModalDireccion');
    const errorEl = document.getElementById('modalDireccionError');
    if (!btnAbrir || !modal) return;

    function abrir() {
        if (errorEl) errorEl.textContent = '';
        modal.style.display = 'flex';
        const nombre = document.getElementById('nuevaDireccionNombre');
        if (nombre) nombre.focus();
    }
    function cerrar() {
        modal.style.display = 'none';
    }

    btnAbrir.addEventListener('click', abrir);
    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrar);

    if (btnGuardar) {
        btnGuardar.addEventListener('click', async function() {
            const nombre = document.getElementById('nuevaDireccionNombre').value.trim();
            const tipo = document.getElementById('nuevaDireccionTipo').value;
            const superior = document.getElementById('nuevaDireccionSuperior').value.trim();

            if (!nombre) {
                if (errorEl) errorEl.textContent = 'El nombre es obligatorio';
                return;
            }

            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';
            try {
                const resultado = await apiService.post({
                    accion: 'guardarDireccion',
                    nombre: nombre,
                    tipo: tipo,
                    dependenciaSuperior: superior
                });
                if (resultado && resultado.exito === false) {
                    throw new Error(resultado.error || 'Error al guardar');
                }
                mostrarToast('Dirección guardada correctamente', 'exito');
                cerrar();
                document.getElementById('nuevaDireccionNombre').value = '';
                document.getElementById('nuevaDireccionSuperior').value = '';
                await cargarDireccionesOficiales();

                const input = document.getElementById('inputDestinoSalida');
                const hidden = document.getElementById('destinoSalida');
                if (input) input.value = nombre;
                if (hidden) hidden.value = nombre;
            } catch (error) {
                if (errorEl) errorEl.textContent = error.message;
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Guardar dirección';
            }
        });
    }
}

// ============================================================
// 15. REGISTRAR RELEVAMIENTO
// ============================================================
async function registrarRelevamiento(e) {
    e.preventDefault();

    const id = document.getElementById("articuloIdRelevamiento").value;
    const stockReal = parseFloat(document.getElementById("stockReal").value);
    const observaciones = document.getElementById("observacionesRelevamiento").value.trim();
    const fecha = obtenerFechaLocal();

    if (!id) { mostrarToast('Seleccioná un artículo', 'error'); return; }
    if (isNaN(stockReal) || stockReal < 0) { mostrarToast('El stock real debe ser un número mayor o igual a 0', 'error'); return; }

    const btn = document.getElementById('btnRegistrarRelevamiento');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    try {
        const payload = {
            accion: 'registrarRelevamiento',
            id: id,
            stockReal: stockReal,
            observacion: observaciones,
            fecha: fecha
        };

        const resultado = await apiService.post(payload);

        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error desconocido');
        }

        const dif = resultado.diferencia || 0;
        if (dif === 0) {
            mostrarToast('El stock ya estaba correcto. Sin cambios.', 'exito');
        } else {
            const signo = dif > 0 ? '+' : '';
            const articuloSel = articulos.find(a => String(a.id) === String(id));
            const nombreArticulo = articuloSel ? articuloSel.articulo : ('ID ' + id);
            mostrarCartel('📋', 'RELEVAMIENTO REGISTRADO',
                `${nombreArticulo} · ajuste ${signo}${dif}`, 'relevamiento');
        }

        document.getElementById('formRelevamiento').reset();
        document.getElementById('articuloIdRelevamiento').value = '';
        document.getElementById('stockSistema').value = '—';
        document.getElementById('diferencia').value = '—';
        document.getElementById('registradoPorRelevamiento').value = 'Samuel Steves';
        document.getElementById('vistaPreviaContenidoRelevamiento').innerHTML =
            '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';

        await cargarArticulos();
        movimientos = [];

    } catch (error) {
        mostrarToast(`Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar relevamiento';
    }
}

function actualizarDiferencia() {
    const stockSistemaInput = document.getElementById('stockSistema');
    const stockRealInput = document.getElementById('stockReal');
    const diferenciaInput = document.getElementById('diferencia');
    if (!stockSistemaInput || !stockRealInput || !diferenciaInput) return;

    const sistema = parseFloat(stockSistemaInput.value);
    const real = parseFloat(stockRealInput.value);

    if (isNaN(sistema) || isNaN(real)) {
        diferenciaInput.value = '—';
        diferenciaInput.style.color = 'var(--text-muted)';
        return;
    }

    const dif = real - sistema;
    const signo = dif > 0 ? '+' : '';

    diferenciaInput.value = `${signo}${dif}`;

    if (dif > 0) {
        diferenciaInput.style.color = '#16a34a';
    } else if (dif < 0) {
        diferenciaInput.style.color = '#dc2626';
    } else {
        diferenciaInput.style.color = 'var(--text-muted)';
    }
}

function mostrarStockSistemaRelevamiento(id) {
    const item = articulos.find(a => String(a.id) === String(id));
    if (!item) return;

    const stock = obtenerStock(item);
    const input = document.getElementById('stockSistema');
    if (input) input.value = stock;

    mostrarVistaPrevia(id, 'vistaPreviaContenidoRelevamiento');
    actualizarDiferencia();
}

function irARelevamientoConArticulo(id) {
    navegarAPagina('relevamiento');

    setTimeout(() => {
        const item = articulos.find(a => String(a.id) === String(id));
        if (!item) return;

        const input = document.getElementById('inputArticuloRelevamiento');
        const hidden = document.getElementById('articuloIdRelevamiento');
        // ✅ Sin (ID X)
        if (input) input.value = item.articulo;
        if (hidden) hidden.value = item.id;

        mostrarStockSistemaRelevamiento(item.id);

        const stockReal = document.getElementById('stockReal');
        if (stockReal) {
            stockReal.focus();
            stockReal.value = '';
        }
    }, 100);
}

// ============================================================
// 16. DIRECCIONES - Ranking y detalle
// ============================================================
async function cargarDirecciones() {
    const contenedor = document.getElementById('contenedorRankingDirecciones');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="placeholder">Cargando ranking...</p>';

    let direccionesReales = [];

    try {
        const resultado = await apiService.post({ accion: 'estadisticasDirecciones' });

        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error al obtener direcciones');
        }

        direccionesReales = Array.isArray(resultado) ? resultado : [];

    } catch (error) {
        console.error('Error cargando direcciones:', error);
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${escapeHtml(error.message)}</p>`;
        return;
    }

    if (direccionesReales.length === 0) {
        contenedor.innerHTML = '<p class="placeholder">Todavía no hay salidas registradas con direcciones oficiales.</p>';
        return;
    }

    const maxTotal = Math.max(...direccionesReales.map(d => d.total));

    let filas = '';
    direccionesReales.slice(0, 10).forEach((dir, index) => {
        const porcentaje = maxTotal > 0 ? (dir.total / maxTotal) * 100 : 0;
        filas += `
            <tr data-direccion="${escapeHtml(dir.direccion)}">
                <td><span class="ranking-numero">${index + 1}</span></td>
                <td><strong>${escapeHtml(dir.direccion)}</strong></td>
                <td>
                    <div class="ranking-barra-wrapper">
                        <div class="ranking-barra">
                            <div class="ranking-barra-relleno" style="width: ${porcentaje}%"></div>
                        </div>
                        <span class="ranking-valor">${dir.total}</span>
                    </div>
                </td>
            </tr>
        `;
    });

    contenedor.innerHTML = `
        <table class="ranking-tabla">
            <thead>
                <tr>
                    <th style="width: 60px;">#</th>
                    <th>Dirección</th>
                    <th>Unidades recibidas</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>
    `;

    const primeraFila = contenedor.querySelector('tbody tr');
    if (primeraFila) primeraFila.classList.add('activo');

    contenedor.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', function() {
            const nombre = this.dataset.direccion;
            const dir = direccionesReales.find(d => d.direccion === nombre);
            if (!dir) return;

            contenedor.querySelectorAll('tbody tr').forEach(r => r.classList.remove('activo'));
            this.classList.add('activo');

            mostrarDetalleDireccion({
                nombre: dir.direccion,
                total: dir.total,
                articulos: dir.articulos
            });
        });
    });

    const primera = direccionesReales[0];
    mostrarDetalleDireccion({
        nombre: primera.direccion,
        total: primera.total,
        articulos: primera.articulos
    });

    const fechaEl = document.getElementById('fechaActualDirecciones');
    if (fechaEl) {
        fechaEl.textContent = new Date().toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
        });
    }
}

function mostrarDetalleDireccion({ nombre, total, articulos }) {
    const contenedor = document.getElementById('contenedorDetalleDirecciones');
    if (!contenedor) return;

    let filasArticulos = '';
    (articulos || []).forEach(a => {
        filasArticulos += `
            <tr>
                <td><strong>${escapeHtml(a.articulo)}</strong></td>
                <td><span class="badge-categoria">${escapeHtml(a.categoria || '—')}</span></td>
                <td style="font-weight: 700; color: #16a34a;">+${a.cantidad}</td>
            </tr>
        `;
    });

    if (!articulos || articulos.length === 0) {
        filasArticulos = `<tr><td colspan="3"><p class="placeholder">Sin artículos registrados.</p></td></tr>`;
    }

    contenedor.innerHTML = `
        <div class="detalle-direccion">
            <h3 class="detalle-direccion-nombre">${escapeHtml(nombre)}</h3>
            <p class="detalle-direccion-total">
                Total: <strong>${total}</strong> unidades recibidas
            </p>
            <div class="inventario-tabla-wrapper">
                <table class="inventario-tabla">
                    <thead>
                        <tr>
                            <th>Artículo</th>
                            <th>Categoría</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>${filasArticulos}</tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================================
// 17. DASHBOARD
// ============================================================
async function cargarDashboard() {
    const contenedor = document.getElementById('pagina-dashboard');
    if (!contenedor) return;

    const fechaEl = document.getElementById('fechaActualDashboard');
    if (fechaEl) {
        fechaEl.textContent = new Date().toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    let datos;
    try {
        datos = await apiService.post({ accion: 'estadisticasDashboard' });

        if (datos && datos.exito === false) {
            throw new Error(datos.error || 'Error al obtener estadísticas');
        }
    } catch (error) {
        console.error('Error cargando Dashboard:', error);
        mostrarToast('Error al cargar el Dashboard', 'error');
        return;
    }

    if (!datos) return;

    document.getElementById('dashTotalArticulos').textContent = datos.totalArticulos || 0;
    document.getElementById('dashCategorias').textContent =
        `${datos.categorias || 0} categorías · ${(datos.unidadesTotales || 0).toLocaleString('es-AR')} ud. totales`;

    document.getElementById('dashCriticos').textContent = datos.criticos || 0;

    document.getElementById('dashEntradasMes').textContent = (datos.entradasMes || 0).toLocaleString('es-AR');
    document.getElementById('dashSalidasMes').textContent = (datos.salidasMes || 0).toLocaleString('es-AR');

    renderizarDashUltimosMovimientos(datos.entradasHoy || []);
    renderizarDashArticulosCriticos(datos.top5Criticos || []);
    renderizarDashSalidasConRemito(datos.salidasConRemito || []);
}

function renderizarDashUltimosMovimientos(entradas) {
    const contenedor = document.getElementById('dashUltimosMovimientos');
    if (!contenedor) return;

    if (entradas.length === 0) {
        contenedor.innerHTML = '<p class="placeholder">No hay entradas registradas hoy.</p>';
        return;
    }

    let html = '<ul class="dash-mov-lista">';
    entradas.forEach(e => {
        html += `
            <li>
                <div class="dash-mov-icono entrada">⬆️</div>
                <div class="dash-mov-info">
                    <div class="dash-mov-nombre">${escapeHtml(e.articulo)}</div>
                    <div class="dash-mov-detalle">${escapeHtml(e.proveedor || '—')}</div>
                </div>
                <div class="dash-mov-cantidad entrada">+${e.cantidad}</div>
            </li>
        `;
    });
    html += '</ul>';
    contenedor.innerHTML = html;
}

function renderizarDashArticulosCriticos(criticos) {
    const contenedor = document.getElementById('dashArticulosCriticos');
    if (!contenedor) return;

    if (criticos.length === 0) {
        contenedor.innerHTML = '<p class="placeholder">No hay artículos críticos.</p>';
        return;
    }

    let html = '<ul class="dash-critico-lista">';
    criticos.forEach(c => {
        const badgeClase = c.stock === 0 ? 'sin-stock' : 'critico';
        const badgeTexto = c.stock === 0 ? 'Sin stock' : `Crítico (${c.stock})`;

        html += `
            <li>
                <div class="dash-critico-nombre">${escapeHtml(c.articulo)}</div>
                <div class="dash-critico-badge ${badgeClase}">${badgeTexto}</div>
            </li>
        `;
    });
    html += '</ul>';
    contenedor.innerHTML = html;
}

function renderizarDashSalidasConRemito(salidas) {
    const contenedor = document.getElementById('dashSalidasConRemito');
    if (!contenedor) return;

    if (salidas.length === 0) {
        contenedor.innerHTML = '<p class="placeholder">No hay salidas con remito registradas.</p>';
        return;
    }

    let filas = '';
    salidas.forEach(s => {
        const fecha = s.fecha ? new Date(s.fecha).toLocaleDateString('es-AR') : '—';
        filas += `
            <tr>
                <td>${fecha}</td>
                <td><strong>${escapeHtml(s.articulo)}</strong></td>
                <td>${escapeHtml(s.destino || '—')}</td>
                <td><span class="badge-categoria">${escapeHtml(s.remito)}</span></td>
                <td style="font-weight: 700; color: #dc2626;">-${s.cantidad}</td>
            </tr>
        `;
    });

    contenedor.innerHTML = `
        <div style="overflow-x: auto;">
            <table class="dash-remito-tabla">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Artículo</th>
                        <th>Destino</th>
                        <th>N° Remito</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

function configurarDashboard() {
    document.querySelectorAll('.dashboard-btn-accion').forEach(btn => btn.addEventListener('click', function() {
        const destino = this.dataset.nav;
        if (!destino) return;
        navegarAPagina(destino);
        if (destino === 'pedidos') cambiarTabPedidos('nuevo');
    }));
}

// ============================================================
// 18. PEDIDOS — Frontend real
// ============================================================
let carritoPedido = [];
let pedidoSeleccionado = null;
let pedidosCache = [];
let modoEdicionPedido = null;

async function cargarPedidos() {
    const fechaEl = document.getElementById('fechaActualPedidos');
    if (fechaEl) {
        fechaEl.textContent = new Date().toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
        });
    }
    await cargarListaPedidos();
    renderizarCarrito();
}

async function cargarListaPedidos() {
    const contenedor = document.getElementById('listaPedidosRecientes');
    if (contenedor) contenedor.innerHTML = '<p class="placeholder">Cargando pedidos...</p>';

    try {
        const r = await apiService.post({ accion: 'listarPedidos' });
        if (!r || r.exito === false) throw new Error(r?.error || 'Error al listar');
        pedidosCache = r.pedidos || [];
    } catch (e) {
        console.error('Error cargando pedidos:', e);
        if (contenedor) contenedor.innerHTML = `<p class="placeholder">⚠️ Error: ${escapeHtml(e.message)}</p>`;
        return;
    }

    renderizarListaPedidos();
}

function renderizarListaPedidos() {
    const contenedor = document.getElementById('listaPedidosRecientes');
    if (!contenedor) return;
    const filtrados = [...pedidosCache].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    if (filtrados.length === 0) {
        contenedor.innerHTML = '<p class="placeholder">Todavía no hay pedidos registrados.</p>';
    } else {
        contenedor.innerHTML = filtrados.slice(0, 8).map(p => {
            const fecha = p.fecha ? new Date(p.fecha) : null;
            const fechaTxt = fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-AR') : '—';
            const estadoClase = normalizarTexto(p.estado || '').replace(/\s+/g, '-');
            return `<article class="pedido-card ${String(pedidoSeleccionado) === String(p.id) ? 'activo' : ''}" data-id="${escapeHtml(p.id)}" tabindex="0" role="button" aria-label="Ver pedido de ${escapeHtml(p.direccion || 'dirección sin nombre')}"><span class="pedido-card-id">#${escapeHtml(p.id)}</span><strong class="pedido-card-titulo">${escapeHtml(p.direccion || 'Sin dirección')}</strong><span class="pedido-card-subtitulo">Solicitado por ${escapeHtml(p.director || '—')}</span><span class="pedido-card-meta">${fechaTxt} · ${Number(p.totalUnidades) || 0} ud.</span><div class="pedido-card-footer"><span class="badge-estado ${estadoClase}">${escapeHtml(p.estado || 'Sin estado')}</span></div></article>`;
        }).join('');
        contenedor.querySelectorAll('.pedido-card').forEach(card => {
            const seleccionar = () => { pedidoSeleccionado = card.dataset.id; renderizarListaPedidos(); renderizarDetallePedido(); };
            card.addEventListener('click', seleccionar);
            card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seleccionar(); } });
        });
    }
    renderizarResumenSeguimiento();
    renderizarHojaSeguimiento();
}

function renderizarDetallePedido() {
    const contenedor = document.getElementById('detallePedido');
    const seccion = document.getElementById('detallePedidoSeccion');
    if (!contenedor) return;
    
    if (!pedidoSeleccionado) { 
        if (seccion) seccion.hidden = true; 
        contenedor.innerHTML = '<p class="placeholder">Seleccioná un pedido para ver el detalle.</p>'; 
        return; 
    }
    
    const p = pedidosCache.find(x => String(x.id) === String(pedidoSeleccionado));
    if (!p) { if (seccion) seccion.hidden = true; return; }
    if (seccion) seccion.hidden = false;
    
    const filas = (p.items || []).map(it => `
        <tr>
            <td>${escapeHtml(it.articuloNombre)}</td>
            <td><span class="badge-categoria">ID ${escapeHtml(it.articuloId)}</span></td>
            <td style="font-weight:700;">${Number(it.cantidad) || 0}</td>
        </tr>
    `).join('') || '<tr><td colspan="3"><p class="placeholder">Sin artículos.</p></td></tr>';
    
    const esPendiente = p.estado === 'Pendiente';
    
    const fechaTxt = p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }) : '—';
    
    const estadoClase = normalizarTexto(p.estado || '').replace(/\s+/g, '-');
    
    contenedor.innerHTML = `
        <div class="detalle-pedido-card">
            
            <div class="detalle-pedido-grid">
                <div class="detalle-pedido-item">
                    <span class="detalle-pedido-label">Pedido</span>
                    <span class="detalle-pedido-valor">#${escapeHtml(p.id)}</span>
                </div>
                <div class="detalle-pedido-item">
                    <span class="detalle-pedido-label">Dirección</span>
                    <span class="detalle-pedido-valor">${escapeHtml(p.direccion)}</span>
                </div>
                <div class="detalle-pedido-item">
                    <span class="detalle-pedido-label">Solicitado por</span>
                    <span class="detalle-pedido-valor">${escapeHtml(p.director || '—')}</span>
                </div>
                <div class="detalle-pedido-item">
                    <span class="detalle-pedido-label">Referencia</span>
                    <span class="detalle-pedido-valor">${escapeHtml(p.referencia || '—')}</span>
                </div>
                <div class="detalle-pedido-item">
                    <span class="detalle-pedido-label">Fecha</span>
                    <span class="detalle-pedido-valor fecha">${fechaTxt}</span>
                </div>
                <div class="detalle-pedido-item">
                    <span class="detalle-pedido-label">Estado</span>
                    <div><span class="badge-estado ${estadoClase}">${escapeHtml(p.estado)}</span></div>
                </div>
            </div>

            <div class="detalle-pedido-acciones">
                ${esPendiente ? `
                    <button class="btn-detalle editar" data-accion="editar">✏️ Editar</button>
                    <button class="btn-detalle cancelar" data-accion="cancelar">🗑️ Cancelar</button>
                    <button class="btn-detalle primario" data-accion="confirmar">✅ Confirmar pedido</button>
                ` : `
                    <button class="btn-detalle primario" data-accion="pdf">📄 Descargar PDF</button>
                `}
            </div>
        </div>
        
        <div class="inventario-tabla-wrapper" style="margin-top: 0;">
            <table class="inventario-tabla">
                <thead><tr><th>Artículo</th><th>ID</th><th>Cantidad</th></tr></thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
    
    contenedor.querySelectorAll('[data-accion]').forEach(btn => btn.addEventListener('click', () => manejarAccionPedido(btn.dataset.accion, p)));
}

async function manejarAccionPedido(accion, pedido) {
    if (accion === 'editar') {
        modoEdicionPedido = pedido.id;
        cambiarTabPedidos('nuevo');
        document.getElementById('directorPedido').value = pedido.director || '';
        document.getElementById('referenciaPedido').value = pedido.referencia || '';
        document.getElementById('inputDireccionPedido').value = pedido.direccion || '';
        document.getElementById('direccionPedido').value = pedido.direccion || '';
        carritoPedido = (pedido.items || []).map(it => ({
            id: it.articuloId,
            nombre: it.articuloNombre,
            categoria: it.categoria,
            cantidad: it.cantidad
        }));
        document.getElementById('btnConfirmarPedido').textContent = 'Guardar cambios';
        renderizarCarrito();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarToast('Editando pedido #' + pedido.id, 'exito');
        return;
    }

    if (accion === 'cancelar') {
        if (!confirm('¿Cancelar el pedido #' + pedido.id + '?')) return;
        try {
            const r = await apiService.post({ accion: 'cancelarPedido', id: pedido.id });
            if (!r || r.exito === false) throw new Error(r?.error || 'Error');

            mostrarCartel('🗑️', 'PEDIDO CANCELADO',
                `#${pedido.id} · ${pedido.direccion || ''}`, 'pedido-cancel');

            pedidoSeleccionado = null;
            await cargarListaPedidos();
            renderizarDetallePedido();
        } catch (e) {
            mostrarToast('Error: ' + e.message, 'error');
        }
        return;
    }

    if (accion === 'confirmar') {
        if (!confirm('¿Confirmar pedido #' + pedido.id + '?\n\nSe descontará stock y se generará el remito.')) return;
        try {
            const r = await apiService.post({ accion: 'confirmarPedido', id: pedido.id });
            if (!r || r.exito === false) throw new Error(r?.error || 'Error');

            // ✅ Verificamos si falló el PDF
            const pdfFallo = typeof r.pdfUrl === 'string' && r.pdfUrl.startsWith('ERROR_PDF');

            if (pdfFallo) {
                const detalleError = (r.pdfUrl || '').replace('ERROR_PDF:', '').trim() || 'error desconocido';
                mostrarCartel('⚠️', 'PEDIDO CONFIRMADO', `Stock descontado · Falló el PDF (${r.nroRemito})`, 'pedido-cancel');
                mostrarToast('Stock descontado, pero falló el remito: ' + detalleError, 'error');
            } else {
                mostrarCartel('✅', 'PEDIDO CONFIRMADO', `Remito ${r.nroRemito} generado`, 'pedido-ok');
            }

            await cargarListaPedidos();
            await cargarArticulos();
            renderizarDetallePedido();
        } catch (e) {
            mostrarToast('Error: ' + e.message, 'error');
        }
        return;
    }

    if (accion === 'pdf') {
        if (pedido.pdfRemito && pedido.pdfRemito.startsWith('http')) {
            window.open(pedido.pdfRemito, '_blank');
        } else {
            mostrarToast('PDF no disponible', 'error');
        }
    }
}

// ✅ CARRITO REPARADO: Se restauró el botón de Unidades/Cajas y el input de cantidad
function renderizarCarrito() {
    const contenedor = document.getElementById('carritoPedido');
    const totalEl = document.getElementById('carritoTotal');
    if (!contenedor) return;

    if (carritoPedido.length === 0) {
        contenedor.innerHTML = '<p class="placeholder">El carrito está vacío. Buscá un artículo arriba para agregarlo.</p>';
        if (totalEl) totalEl.textContent = '0';
        return;
    }

    contenedor.innerHTML = carritoPedido.map((it, idx) => {
        const articulo = articulos.find(a => String(a.id) === String(it.id));
        const imgData = (articulo?.imagen || '').trim();

        let imgHTML = '📦';
        if (imgData.startsWith('img/')) {
            imgHTML = `<img src="https://raw.githubusercontent.com/comprassuministros2-ship-it/InventarioPro/main/${imgData}?v=${new Date().getTime()}" alt="" style="width: 24px; height: 24px; object-fit: cover; border-radius: 4px;">`;
        } else if (imgData !== '') {
            imgHTML = escapeHtml(imgData);
        }

        const stock = articulo ? obtenerStock(articulo) : '—';
        const multiplicador = obtenerMultiplicadorUnidades(articulo);
        const nombrePresentacion = obtenerNombrePresentacion(articulo);
        const tipoActual = it.tipo || 'unidad';
        const cantMostrar = it.cantidad || 1;

        let selectorTipoHTML = '';
        if (multiplicador > 1) {
            const nombrePack = escapeHtml(nombrePresentacion.toUpperCase() + 'S');
            selectorTipoHTML = `
                <div style="display: inline-flex; gap: 4px; margin-left: 10px; vertical-align: middle;">
                    <button type="button" class="btn-tipo-cantidad ${tipoActual === 'unidad' ? 'activo' : ''}" data-tipo-idx="${idx}" data-tipo-val="unidad" style="padding: 2px 8px; font-size: 0.7rem; border-radius: 4px; border: 1px solid var(--border); background: ${tipoActual === 'unidad' ? 'var(--accent)' : 'var(--bg-card)'}; color: ${tipoActual === 'unidad' ? '#fff' : 'var(--text-muted)'}; cursor: pointer; font-weight: 600;">UNIDADES</button>
                    <button type="button" class="btn-tipo-cantidad ${tipoActual === 'pack' ? 'activo' : ''}" data-tipo-idx="${idx}" data-tipo-val="pack" style="padding: 2px 8px; font-size: 0.7rem; border-radius: 4px; border: 1px solid var(--border); background: ${tipoActual === 'pack' ? 'var(--accent)' : 'var(--bg-card)'}; color: ${tipoActual === 'pack' ? '#fff' : 'var(--text-muted)'}; cursor: pointer; font-weight: 600;">${nombrePack} (x${multiplicador})</button>
                </div>`;
        }

        let equivalenciaHTML = '';
        if (tipoActual === 'pack' && multiplicador > 1) {
            const totalUnidades = cantMostrar * multiplicador;
            equivalenciaHTML = `<span class="carrito-item-stock" style="color: #16a34a; font-weight: 600; font-size: 0.85rem;">👉 Son ${totalUnidades} unidades en total</span>`;
        } else {
            equivalenciaHTML = `<span class="carrito-item-stock">Stock: ${stock}</span>`;
        }

        return `
            <div class="carrito-item" style="align-items: flex-start;">
                <span class="carrito-item-emoji" aria-hidden="true" style="margin-top: 5px;">${imgHTML}</span>
                <div style="flex: 1;">
                    <span class="carrito-item-nombre" style="display: block; margin-bottom: 4px;">${escapeHtml(it.nombre)}</span>
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
                        ${selectorTipoHTML}
                        ${equivalenciaHTML}
                    </div>
                </div>
                <div class="carrito-stepper" style="margin-top: 5px;">
                    <button type="button" class="carrito-btn-stepper" data-step="menos" data-idx="${idx}">−</button>
                    <input type="number" class="carrito-input-cantidad" data-idx="${idx}" value="${cantMostrar}" min="1" style="width: 50px; text-align: center; padding: 4px; border: 1px solid var(--border); border-radius: 4px; font-size: 0.9rem;">
                    <button type="button" class="carrito-btn-stepper" data-step="mas" data-idx="${idx}">+</button>
                </div>
                <button type="button" class="carrito-btn-quitar" data-quitar="${idx}" title="Quitar artículo" style="margin-top: 5px;">✕</button>
            </div>`;
    }).join('');

    actualizarTotalCarrito();

    contenedor.querySelectorAll('.carrito-btn-stepper').forEach(btn => btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        if (btn.dataset.step === 'mas') incrementarCantidadCarrito(idx);
        else decrementarCantidadCarrito(idx);
    }));

    contenedor.querySelectorAll('.carrito-input-cantidad').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = Number(e.target.dataset.idx);
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 1) val = 1;
            carritoPedido[idx].cantidad = val;
            renderizarCarrito();
        });
    });

    contenedor.querySelectorAll('.btn-tipo-cantidad').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.tipoIdx);
            const nuevoTipo = btn.dataset.tipoVal;
            if (carritoPedido[idx]) {
                if (carritoPedido[idx].tipo !== nuevoTipo) {
                    carritoPedido[idx].tipo = nuevoTipo;
                    carritoPedido[idx].cantidad = 1; 
                }
                renderizarCarrito();
            }
        });
    });

    contenedor.querySelectorAll('[data-quitar]').forEach(btn => btn.addEventListener('click', () => {
        carritoPedido.splice(Number(btn.dataset.quitar), 1);
        renderizarCarrito();
    }));
}

function configurarPedidos() {
    document.querySelectorAll('[data-tab-pedidos]').forEach(btn => btn.addEventListener('click', () => cambiarTabPedidos(btn.dataset.tabPedidos)));
    document.querySelectorAll('[data-filtro-fecha]').forEach(btn => btn.addEventListener('click', () => { filtroFechaSeguimiento = btn.dataset.filtroFecha; document.querySelectorAll('[data-filtro-fecha]').forEach(chip => chip.classList.toggle('activo', chip === btn)); renderizarHojaSeguimiento(); }));
    document.querySelectorAll('[data-filtro-estado]').forEach(btn => btn.addEventListener('click', () => { filtroEstadoSeguimiento = filtroEstadoSeguimiento === btn.dataset.filtroEstado ? 'todos' : btn.dataset.filtroEstado; document.querySelectorAll('[data-filtro-estado]').forEach(chip => chip.classList.toggle('activo', chip.dataset.filtroEstado === filtroEstadoSeguimiento)); renderizarHojaSeguimiento(); }));
    const inputBusqueda = document.getElementById('inputBusquedaPedidos');
    if (inputBusqueda) {
        let timeoutBusqueda = null;
        inputBusqueda.addEventListener('input', () => {
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(() => {
                filtroBusquedaPedidos = inputBusqueda.value.trim();
                renderizarHojaSeguimiento();
            }, 300);
        });
    }
    const form = document.getElementById('formPedido');
    if (form) form.addEventListener('submit', manejarSubmitPedido);
    configurarBuscadorArticulosPedido();
    configurarBuscadorDireccionesPedido();
    cambiarTabPedidos('seguimiento');
    cargarPedidos();
}

async function manejarSubmitPedido(e) {
    e.preventDefault();

    const direccion = document.getElementById('direccionPedido')?.value
        || document.getElementById('inputDireccionPedido')?.value?.trim();
    const director = document.getElementById('directorPedido')?.value?.trim() || '';
    const referencia = document.getElementById('referenciaPedido')?.value?.trim() || '';

    if (!direccion) {
        mostrarToast('Seleccioná una dirección', 'error');
        return;
    }

    if (!Array.isArray(carritoPedido) || carritoPedido.length === 0) {
        mostrarToast('El carrito está vacío', 'error');
        return;
    }

    const btn = document.getElementById('btnConfirmarPedido');
    const txtOriginal = btn?.textContent || 'Confirmar pedido';

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
    }

    try {
        const items = carritoPedido.map(it => {
            const articulo = articulos.find(a => String(a.id) === String(it.id));
            const multiplicador = obtenerMultiplicadorUnidades(articulo);
            const cantidadPresentacion = Math.max(1, Number(it.cantidad) || 1);
            const tipo = it.tipo || 'unidad';
            const esPack = tipo === 'pack' && multiplicador > 1;
            const unidadesTotales = esPack
                ? cantidadPresentacion * multiplicador
                : cantidadPresentacion;

            const presentacion = obtenerNombrePresentacion(articulo);
            const textoCantidad = esPack
                ? `${cantidadPresentacion} ${presentacion}${cantidadPresentacion === 1 ? '' : 's'} (${unidadesTotales} unidades)`
                : `${unidadesTotales} ${unidadesTotales === 1 ? 'unidad' : 'unidades'}`;

            return {
                id: it.id,
                nombre: it.nombre,
                categoria: it.categoria,
                cantidad: unidadesTotales,
                textoCantidad: textoCantidad
            };
        });

        const payload = {
            direccion,
            director,
            referencia,
            items
        };

        const resultado = modoEdicionPedido
            ? await apiService.post({
                accion: 'editarPedido',
                id: modoEdicionPedido,
                ...payload
            })
            : await apiService.post({
                accion: 'crearPedido',
                ...payload
            });

        if (!resultado || resultado.exito === false) {
            throw new Error(resultado?.error || 'No se pudo guardar el pedido');
        }

        const estabaEditando = Boolean(modoEdicionPedido);
        mostrarToast(estabaEditando ? 'Pedido actualizado' : 'Pedido creado', 'exito');

        carritoPedido = [];
        modoEdicionPedido = null;

        document.getElementById('formPedido')?.reset();

        const direccionPedido = document.getElementById('direccionPedido');
        const directorPedido = document.getElementById('directorPedido');
        const referenciaPedido = document.getElementById('referenciaPedido');

        if (direccionPedido) direccionPedido.value = '';
        if (directorPedido) directorPedido.value = '';
        if (referenciaPedido) referenciaPedido.value = '';

        if (btn) btn.textContent = 'Confirmar pedido';
        renderizarCarrito();
        await cargarListaPedidos();
    } catch (err) {
        mostrarToast('Error: ' + (err?.message || 'No se pudo guardar el pedido'), 'error');
        if (btn) btn.textContent = txtOriginal;
    } finally {
        if (btn) {
            btn.disabled = false;
            if (modoEdicionPedido === null) btn.textContent = 'Confirmar pedido';
        }
    }
}

function configurarBuscadorArticulosPedido() {
    const input = document.getElementById('inputArticuloPedido');
    const dropdown = document.getElementById('listaArticulosPedido');
    if (!input || !dropdown) return;

    // Anti-doble init
    if (input.dataset.dropdownInit === 'true') return;
    input.dataset.dropdownInit = 'true';

    const instance = new Dropdown({
        input,
        dropdown,
        hidden: null,
        dataSource: () => articulos,
        minChars: 1,
        debounceMs: 150,
        keyboardNav: true,
        clickOutsideSelector: '.carrito-section, .buscador-articulo-group',
        maxResults: 10,
        renderItem: (item) => {
            const stock = obtenerStock ? obtenerStock(item) : '—';
            return `${escapeHtml(item.articulo)} <span class="id-articulo">Stock ${stock}</span>`;
        },
        onSelect: (item) => {
            if (item.freeText) return;
            agregarAlCarrito(item);
            input.value = '';
        }
    });
    dropdownInstances.push(instance);
}

function agregarAlCarrito(item) {
    const existente = carritoPedido.find(x => String(x.id) === String(item.id));
    if (existente) {
        existente.cantidad += 1;
    } else {
        const multiplicador = obtenerMultiplicadorUnidades(item);
        carritoPedido.push({
            id: item.id,
            nombre: item.articulo,
            categoria: item.categoriaID || '',
            cantidad: 1,
            tipo: 'unidad'
        });
    }
    renderizarCarrito();
}

function configurarBuscadorDireccionesPedido() {
    const input = document.getElementById('inputDireccionPedido');
    const hidden = document.getElementById('direccionPedido');
    const dropdown = document.getElementById('listaDireccionesPedido');
    if (!input || !hidden || !dropdown) return;

    // Anti-doble init
    if (input.dataset.dropdownInit === 'true') return;
    input.dataset.dropdownInit = 'true';

    const instance = new Dropdown({
        input,
        dropdown,
        hidden,
        dataSource: () => direccionesOficiales || [],
        minChars: 1,
        debounceMs: 150,
        keyboardNav: false,
        clickOutsideSelector: '#inputDireccionPedido',
        allowFreeText: true,
        maxResults: 10,
        renderItem: (dir) => `${escapeHtml(dir.nombre)} <span class="id-articulo">${escapeHtml(dir.tipo || '')}</span>`,
        freeTextLabel: `Usar: <strong>\${value}</strong> <span class="id-articulo">(texto libre)</span>`,
        filter: (items, termino) => {
            const terminoNorm = normalizarTexto(termino);
            if (!terminoNorm) return [];
            const palabras = terminoNorm.split(/\s+/).filter(p => p.length > 0);
            return items.filter(item => {
                const textoCompleto = normalizarTexto((item.nombre || '') + ' ' + (item.tipo || '')).replace(/[-_/]/g, ' ');
                return palabras.every(palabra => textoCompleto.includes(palabra));
            });
        },
        onSelect: (item) => {
            if (item.freeText) {
                hidden.value = item.value;
                // Buscar director en caché para texto libre también
                const dirLibre = item.value.trim();
                if (dirLibre) autocompletarDirectorPorDireccion(dirLibre);
                return;
            }
            input.value = item.nombre;
            hidden.value = item.nombre;
            // Autocompletar director basado en historial de pedidos
            autocompletarDirectorPorDireccion(item.nombre);
        }
    });
    dropdownInstances.push(instance);
}

// Busca en pedidosCache el último director que pidió en esa dirección y lo pone en #directorPedido
function autocompletarDirectorPorDireccion(direccion) {
    if (!direccion) return;
    const directorInput = document.getElementById('directorPedido');
    if (!directorInput) return;

    // Buscar el pedido más reciente con esa misma dirección
    const pedidoConDireccion = [...pedidosCache]
        .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
        .find(p => p.direccion && normalizarTexto(p.direccion) === normalizarTexto(direccion));

    if (pedidoConDireccion && pedidoConDireccion.director) {
        directorInput.value = pedidoConDireccion.director;
    } else {
        // Si no hay historial, dejar vacío para que el operario lo escriba
        directorInput.value = '';
    }
}

// ============================================================
// 19. PEDIDOS — Pestañas, seguimiento y cantidades del carrito
// ============================================================
let filtroFechaSeguimiento = 'hoy';
let filtroEstadoSeguimiento = 'todos';
let filtroBusquedaPedidos = '';

function filtrarPedidosPorBusqueda(pedidos, termino) {
    const lista = Array.isArray(pedidos) ? pedidos : [];
    const terminoNormalizado = normalizarTexto(termino);
    if (!terminoNormalizado) return lista;
    return lista.filter(p => {
        const nota = normalizarTexto(p.nota || `#${p.id}`);
        const direccion = normalizarTexto(p.direccion || '');
        return nota.includes(terminoNormalizado) || direccion.includes(terminoNormalizado);
    });
}

function cambiarTabPedidos(tab) {
    const seleccionado = tab === 'nuevo' ? 'nuevo' : 'seguimiento';
    document.querySelectorAll('[data-tab-pedidos]').forEach(btn => {
        const activo = btn.dataset.tabPedidos === seleccionado;
        btn.classList.toggle('activo', activo);
        btn.setAttribute('aria-selected', String(activo));
    });
    const nuevo = document.getElementById('pedidosTabNuevo');
    const seguimiento = document.getElementById('pedidosTabSeguimiento');
    if (nuevo) nuevo.hidden = seleccionado !== 'nuevo';
    if (seguimiento) seguimiento.hidden = seleccionado !== 'seguimiento';
}

function actualizarTotalCarrito() {
    const total = document.getElementById('carritoTotal');
    if (!total) return;

    let totalUnidades = 0;

    carritoPedido.forEach(item => {
        const articulo = articulos.find(a => String(a.id) === String(item.id));
        const multiplicador = obtenerMultiplicadorUnidades(articulo);
        const cant = Number(item.cantidad) || 0;

        if ((item.tipo || 'unidad') === 'pack' && multiplicador > 1) {
            totalUnidades += cant * multiplicador;
        } else {
            totalUnidades += cant;
        }
    });

    total.textContent = totalUnidades;
}

function incrementarCantidadCarrito(idx) {
    if (!carritoPedido[idx]) return;
    carritoPedido[idx].cantidad = (Number(carritoPedido[idx].cantidad) || 0) + 1;
    renderizarCarrito();
}

function decrementarCantidadCarrito(idx) {
    if (!carritoPedido[idx]) return;
    carritoPedido[idx].cantidad = Math.max(1, (Number(carritoPedido[idx].cantidad) || 1) - 1);
    renderizarCarrito();
}

function fechaLocalPedido(pedido) {
    if (!pedido || !pedido.fecha) return null;
    const fecha = new Date(pedido.fecha);
    if (Number.isNaN(fecha.getTime())) return null;
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function inicioDiaPedido(fecha = new Date()) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

// ✅ RESTAURADO: Pendientes siempre visibles como "hoy"
function filtrarPedidosPorFecha(pedidos, filtro) {
    const lista = Array.isArray(pedidos) ? pedidos : [];
    if (filtro === 'todos') return lista;
    const hoy = inicioDiaPedido();
    if (filtro === 'hoy') {
        return lista.filter(p => {
            if (p.estado === 'Pendiente') return true;
            const fecha = fechaLocalPedido(p);
            return fecha && fecha.getTime() === hoy.getTime();
        });
    }
    if (filtro === 'semana') {
        const lunes = new Date(hoy);
        lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
        return lista.filter(p => {
            if (p.estado === 'Pendiente') return true;
            const fecha = fechaLocalPedido(p);
            return fecha && fecha >= lunes && fecha <= hoy;
        });
    }
    return lista;
}

function filtrarPedidosPorEstado(pedidos, estado) {
    const lista = Array.isArray(pedidos) ? pedidos : [];
    return !estado || estado === 'todos' ? lista : lista.filter(p => p.estado === estado);
}

function calcularContadoresEstado(pedidos) {
    const lista = Array.isArray(pedidos) ? pedidos : [];
    const hoy = filtrarPedidosPorFecha(lista, 'hoy');
    const pendientesHoy = hoy.filter(p => p.estado === 'Pendiente');
    return {
        pendientes: lista.filter(p => p.estado === 'Pendiente').length,
        pendientesHoy: pendientesHoy.length,
        unidadesPendientesHoy: pendientesHoy.reduce((total, p) => total + (Number(p.totalUnidades) || (p.items || []).reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0)), 0),
        confirmadosHoy: hoy.filter(p => p.estado === 'Confirmado').length
    };
}

// ✅ RESTAURADO: Pendientes se agrupan bajo HOY
function agruparPedidosPorDia(pedidos) {
    const grupos = new Map();
    const hoy = inicioDiaPedido();
    [...(Array.isArray(pedidos) ? pedidos : [])].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)).forEach(p => {
        const fecha = (p.estado === 'Pendiente') ? hoy : fechaLocalPedido(p);
        if (!fecha) return;
        const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        if (!grupos.has(clave)) grupos.set(clave, { fecha, pedidos: [] });
        grupos.get(clave).pedidos.push(p);
    });
    return [...grupos.values()];
}

function formatearFechaDia(fecha) {
    const dia = inicioDiaPedido(fecha);
    const hoy = inicioDiaPedido();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const fechaTxt = dia.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    if (dia.getTime() === hoy.getTime()) return `HOY · ${fechaTxt}`;
    if (dia.getTime() === ayer.getTime()) return `AYER · ${fechaTxt}`;
    return `${dia.toLocaleDateString('es-AR', { weekday: 'long' }).toUpperCase()} · ${fechaTxt}`;
}

function renderizarResumenSeguimiento() {
    const datos = calcularContadoresEstado(pedidosCache);
    const asignaciones = {
        pedidosPendientesHoy: datos.pendientesHoy,
        pedidosUnidadesHoy: datos.unidadesPendientesHoy,
        pedidosConfirmadosHoy: datos.confirmadosHoy,
        contadorPendientes: datos.pendientes,
        contadorConfirmadosHoy: datos.confirmadosHoy
    };
    Object.entries(asignaciones).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });
}

function renderizarHojaSeguimiento() {
    const contenedor = document.getElementById('contenedorHojaSeguimiento');
    if (!contenedor) return;
    renderizarResumenSeguimiento();
    const porFecha = filtrarPedidosPorFecha(pedidosCache, filtroFechaSeguimiento);
    const porEstado = filtrarPedidosPorEstado(porFecha, filtroEstadoSeguimiento);
    const filtrados = filtrarPedidosPorBusqueda(porEstado, filtroBusquedaPedidos);
    if (filtrados.length === 0) {
        contenedor.innerHTML = '<div class="estadistica-seccion"><p class="placeholder">No hay pedidos para los filtros seleccionados.</p></div>';
        return;
    }

    contenedor.innerHTML = agruparPedidosPorDia(filtrados).map(grupo => `
        <section class="pedidos-grupo-dia">
            <h2 class="pedidos-grupo-titulo">${escapeHtml(formatearFechaDia(grupo.fecha))}</h2>
            <table class="pedidos-tabla-seguimiento">
                <thead><tr><th>FECHA</th><th>DIRECCIÓN</th><th>SOLICITANTE</th><th>ITEMS</th><th>UNIDADES</th><th>ESTADO</th><th>ACCIONES</th></tr></thead>
                <tbody>${grupo.pedidos.map(p => {
                    const fecha = p.fecha ? new Date(p.fecha) : null;
                    const hora = fecha && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '—';
                    const items = (p.items || []).map(item => `${escapeHtml(item.articuloNombre || 'Artículo')} (${Number(item.cantidad) || 0})`).join(', ') || 'Sin artículos';
                    const unidades = Number(p.totalUnidades) || (p.items || []).reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);
                    const estadoClase = normalizarTexto(p.estado || '').replace(/\s+/g, '-');
                    const acciones = p.estado === 'Pendiente'
                        ? `<button type="button" class="pedidos-acciones-icono" data-pedido-accion="ver" data-pedido-id="${escapeHtml(p.id)}" aria-label="Ver detalle">👁️</button><button type="button" class="pedidos-acciones-icono" data-pedido-accion="confirmar" data-pedido-id="${escapeHtml(p.id)}" aria-label="Confirmar pedido">✅</button>`
                        : `<button type="button" class="pedidos-acciones-icono" data-pedido-accion="ver" data-pedido-id="${escapeHtml(p.id)}" aria-label="Ver detalle">👁️</button><button type="button" class="pedidos-acciones-icono" data-pedido-accion="pdf" data-pedido-id="${escapeHtml(p.id)}" aria-label="Abrir remito PDF">🖨️</button>`;
                    return `<tr><td><span class="pedidos-fecha-hora">${escapeHtml(hora)}</span></td><td><strong class="pedidos-direccion">${escapeHtml(p.direccion || 'Sin dirección')}</strong><span class="pedidos-codigo">${escapeHtml(p.nota || `#${p.id}`)}</span></td><td>${escapeHtml(p.director || '—')}</td><td><span class="pedidos-items-resumen">${items}</span></td><td><strong class="pedidos-unidades">${unidades}</strong><span class="pedidos-unidades-label">ud.</span></td><td><span class="badge-estado ${estadoClase}">${escapeHtml(p.estado || 'Sin estado')}</span></td><td><div class="pedidos-acciones">${acciones}</div></td></tr>`;
                }).join('')}</tbody>
            </table>
        </section>
    `).join('');

    contenedor.querySelectorAll('[data-pedido-accion]').forEach(btn => btn.addEventListener('click', () => {
        const pedido = pedidosCache.find(p => String(p.id) === String(btn.dataset.pedidoId));
        if (!pedido) return;
        if (btn.dataset.pedidoAccion === 'ver') {
            pedidoSeleccionado = pedido.id;
            renderizarListaPedidos();
            renderizarDetallePedido();
            document.getElementById('detallePedidoSeccion')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else manejarAccionPedido(btn.dataset.pedidoAccion, pedido);
    }));
}

// ============================================================
// 20. CARTEL DE ACCIÓN
// ============================================================
function mostrarCartel(icono, titulo, subtitulo, tipo = 'exito') {
    const cartel = document.getElementById('cartelAccion');
    if (!cartel) return;

    const iconoEl = document.getElementById('cartelIcono');
    const tituloEl = document.getElementById('cartelTitulo');
    const subEl = document.getElementById('cartelSubtitulo');
    if (!iconoEl || !tituloEl || !subEl) return;

    iconoEl.textContent = icono;
    tituloEl.textContent = titulo;
    subEl.textContent = subtitulo || '';
    subEl.style.display = subtitulo ? '' : 'none';

    cartel.classList.remove(
        'tipo-entrada', 'tipo-salida', 'tipo-relevamiento',
        'tipo-pedido-ok', 'tipo-pedido-cancel'
    );
    if (tipo && tipo !== 'exito') {
        cartel.classList.add('tipo-' + tipo);
    }

    cartel.classList.remove('visible');
    void cartel.offsetWidth;
    cartel.classList.add('visible');

    clearTimeout(window._cartelTimeout);
    window._cartelTimeout = setTimeout(() => {
        cartel.classList.remove('visible');
    }, 2500);
}

// ============================================================
// 21. MODAL NUEVO ARTÍCULO
// ============================================================
function abrirModalArticulo(origen = null) {
    modoCreacionArticulo = origen;
    const modal = document.getElementById('modalNuevoArticulo');
    if (!modal) return;

    document.getElementById('nuevoArtNombre').value = '';
    document.getElementById('nuevoArtCategoria').value = '';
    document.getElementById('nuevoArtImagen').value = '📦';
    document.getElementById('nuevoArtUnidad').value = 'Unidad';
    document.getElementById('nuevoArtMultiplicador').value = 1;
    document.getElementById('nuevoArtCantidad').value = 1;
    document.getElementById('nuevoArtStockMin').value = 0;
    document.getElementById('nuevoArtStockCritico').value = 0;
    document.getElementById('nuevoArtObservaciones').value = '';
    document.getElementById('nuevoArtError').textContent = '';

    const esModoEntrada = origen && origen.origen === 'entrada';

    const aviso = document.getElementById('nuevoArtAvisoEntrada');
    aviso.style.display = esModoEntrada ? 'block' : 'none';

    const bloqueCant = document.getElementById('nuevoArtBloqueCantidad');
    if (bloqueCant) {
        bloqueCant.style.display = esModoEntrada ? 'block' : 'none';
    }

    if (esModoEntrada && origen.nombreSugerido) {
        document.getElementById('nuevoArtNombre').value = origen.nombreSugerido;
    }

    const datalist = document.getElementById('listaCategorias');
    datalist.innerHTML = '';
    const cats = new Set();
    articulos.forEach(a => {
        if (a.categoriaID && a.categoriaID.trim()) cats.add(a.categoriaID.trim());
    });
    Array.from(cats).sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        datalist.appendChild(opt);
    });

    document.getElementById('guardarModalArticulo').textContent =
        esModoEntrada ? 'Crear y registrar entrada' : 'Crear artículo';

    actualizarEquivalenciaArticulo();
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('nuevoArtNombre').focus(), 100);
}

function actualizarEquivalenciaArticulo() {
    const unidad = document.getElementById('nuevoArtUnidad').value;
    const mult = parseInt(document.getElementById('nuevoArtMultiplicador').value) || 1;
    const label = document.getElementById('nuevoArtEquivalencia');
    if (mult > 1) {
        label.textContent = `1 ${unidad} = ${mult} unidades`;
    } else {
        label.textContent = `1 ${unidad} = 1 unidad`;
    }

    const cantUnidad = document.getElementById('nuevoArtCantidadUnidad');
    if (cantUnidad) {
        cantUnidad.textContent = mult > 1 ? unidad.toLowerCase() + 's' : 'unidades';
    }

    actualizarTotalIngreso();
}

function actualizarTotalIngreso() {
    const mult = parseInt(document.getElementById('nuevoArtMultiplicador').value) || 1;
    const cantInput = document.getElementById('nuevoArtCantidad');
    const cant = parseInt(cantInput?.value) || 1;
    const total = cant * mult;

    const caja = document.getElementById('nuevoArtTotalCaja');
    if (!caja) return;

    if (mult > 1) {
        caja.innerHTML = `<strong>📦 Ingresarán ${total.toLocaleString('es-AR')} unidades</strong> (${cant} × ${mult})`;
    } else {
        caja.innerHTML = `<strong>📦 Ingresarán ${total.toLocaleString('es-AR')} unidades</strong>`;
    }
}

function cerrarModalArticulo() {
    document.getElementById('modalNuevoArticulo').style.display = 'none';
    modoCreacionArticulo = null;
}

async function guardarNuevoArticulo() {
    const nombre = document.getElementById('nuevoArtNombre').value.trim();
    const categoria = document.getElementById('nuevoArtCategoria').value.trim();
    const imagen = document.getElementById('nuevoArtImagen').value.trim() || '📦';
    const unidadMedida = document.getElementById('nuevoArtUnidad').value;
    const multiplicador = parseInt(document.getElementById('nuevoArtMultiplicador').value) || 1;
    const stockMin = parseInt(document.getElementById('nuevoArtStockMin').value) || 0;
    const stockCritico = parseInt(document.getElementById('nuevoArtStockCritico').value) || 0;
    const observaciones = document.getElementById('nuevoArtObservaciones').value.trim();
    const errorEl = document.getElementById('nuevoArtError');

    if (!nombre) { errorEl.textContent = 'El nombre es obligatorio'; return; }
    if (!categoria) { errorEl.textContent = 'La categoría es obligatoria'; return; }
    if (multiplicador < 1) { errorEl.textContent = 'El multiplicador debe ser ≥ 1'; return; }

    const datos = {
        nombre, categoria, imagen, observaciones,
        unidadMedida, multiplicador,
        stockMin, stockCritico,
        capacidadMax: 0
    };

    const esModoEntrada = modoCreacionArticulo && modoCreacionArticulo.origen === 'entrada';
    if (esModoEntrada) {
        const cantidadModal = parseInt(document.getElementById('nuevoArtCantidad').value) || 1;
        datos.entrada = {
            cantidad: cantidadModal,
            proveedor: '',
            factura: '',
            observacionEntrada: '',
            fecha: ''
        };
    }

    const btn = document.getElementById('guardarModalArticulo');
    const txtOrig = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    errorEl.textContent = '';

    try {
        const r = await apiService.post({ accion: 'crearArticulo', datos });
        if (!r || r.exito === false) throw new Error(r?.error || 'Error al crear el artículo');

        const stockFinal = (typeof r.stockIni === 'number') ? r.stockIni : 0;

        mostrarCartel('📦', 'ARTÍCULO CREADO',
            `${nombre} · stock ${stockFinal} unidades`, 'exito');

        cerrarModalArticulo();

        await cargarArticulos();

        if (esModoEntrada) {
            document.getElementById('formEntrada').reset();
            document.getElementById('articuloId').value = '';
            document.getElementById('vistaPreviaContenido').innerHTML =
                '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
            document.getElementById('registradoPor').value = 'Samuel Steves';
            await cargarUltimasEntradas();
            movimientos = [];
        }

    } catch (err) {
        errorEl.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = txtOrig;
    }
}

function configurarModalArticulo() {
    document.getElementById('nuevoArtUnidad')?.addEventListener('change', actualizarEquivalenciaArticulo);
    document.getElementById('nuevoArtMultiplicador')?.addEventListener('input', actualizarEquivalenciaArticulo);
    document.getElementById('nuevoArtCantidad')?.addEventListener('input', actualizarTotalIngreso);
    document.getElementById('cerrarModalArticulo')?.addEventListener('click', cerrarModalArticulo);
    document.getElementById('cancelarModalArticulo')?.addEventListener('click', cerrarModalArticulo);
    document.getElementById('guardarModalArticulo')?.addEventListener('click', guardarNuevoArticulo);

    document.querySelector('.btn-nuevo')?.addEventListener('click', () => abrirModalArticulo());
}

// ============================================================
// 22. ELIMINAR ARTÍCULO
// ============================================================
async function eliminarArticulo(id) {
    const item = articulos.find(a => String(a.id) === String(id));
    if (!item) return;

    const nombre = item.articulo || `ID ${id}`;
    const stock = obtenerStock(item);

    let mensaje = `¿Eliminar el artículo?\n\n"${nombre}"\n\nStock actual: ${stock} unidades\n\nEsta acción no se puede deshacer.`;

    if (stock > 0) {
        mensaje += `\n\n⚠️ El artículo todavía tiene stock. Si lo eliminás, perdés el registro del stock actual.`;
    }

    if (!confirm(mensaje)) return;

    try {
        const r = await apiService.post({ accion: 'eliminarArticulo', id: id });
        if (!r || r.exito === false) throw new Error(r?.error || 'Error al eliminar');

        mostrarCartel('🗑️', 'ARTÍCULO ELIMINADO', nombre, 'pedido-cancel');

        await cargarArticulos();
        movimientos = [];

    } catch (e) {
        mostrarToast('Error: ' + e.message, 'error');
    }
}

// ============================================================
// 23. TEMA CLARO / OSCURO
// ============================================================
function aplicarTema(tema) {
    const html = document.documentElement;
    html.setAttribute('data-theme', tema);
    try { localStorage.setItem('inventario-tema', tema); } catch (e) {}
    actualizarBotonTema(tema);
}

function actualizarBotonTema(tema) {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    btn.textContent = tema === 'dark' ? 'Modo claro' : 'Modo oscuro';
}

function inicializarTema() {
    let tema = 'light';
    try {
        const guardado = localStorage.getItem('inventario-tema');
        if (guardado === 'dark' || guardado === 'light') {
            tema = guardado;
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            tema = 'dark';
        }
    } catch (e) {}

    aplicarTema(tema);

    const btn = document.querySelector('.theme-toggle');
    if (btn) {
        btn.addEventListener('click', () => {
            const actual = document.documentElement.getAttribute('data-theme');
            aplicarTema(actual === 'dark' ? 'light' : 'dark');
        });
    }
}

// ============================================================
// 24. REPORTES - FILTROS Y ACCIONES (FASE 2)
// ============================================================
// Variable global para guardar el último reporte generado y exportarlo a CSV
let ultimoReporteGenerado = [];

function inicializarFiltrosReportes() {
    // Poblar select de Categoría con categorías únicas de los artículos
    const selectCategoria = document.getElementById('reporteCategoria');
    if (selectCategoria) {
        const categorias = [...new Set(articulos.map(a => a.categoriaID).filter(Boolean))].sort();
        selectCategoria.innerHTML = '<option value="">Todas las categorías</option>' +
            categorias.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    }

    // Poblar select de Dirección con nombres de direcciones oficiales
    const selectDireccion = document.getElementById('reporteDireccion');
    if (selectDireccion) {
        const direcciones = (direccionesOficiales || []).map(d => d.nombre).filter(Boolean).sort();
        selectDireccion.innerHTML = '<option value="">Todas las direcciones</option>' +
            direcciones.map(dir => `<option value="${escapeHtml(dir)}">${escapeHtml(dir)}</option>`).join('');
    }

    // Fechas por defecto: desde = 1er día del mes actual, hasta = hoy
    const hoy = obtenerFechaLocal(); // YYYY-MM-DD
    const primerDiaMes = hoy.slice(0, 8) + '01'; // YYYY-MM-01

    const inputDesde = document.getElementById('reporteFechaDesde');
    const inputHasta = document.getElementById('reporteFechaHasta');
    if (inputDesde && !inputDesde.value) inputDesde.value = primerDiaMes;
    if (inputHasta && !inputHasta.value) inputHasta.value = hoy;
}

// Listener para botón "Generar Reporte"
function configurarBtnGenerarReporte() {
    const btn = document.getElementById('btnGenerarReporte');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        // Validación de entrada (defense-in-depth)
        const fechaDesdeRaw = document.getElementById('reporteFechaDesde')?.value || '';
        const fechaHastaRaw = document.getElementById('reporteFechaHasta')?.value || '';
        const categoriaRaw = document.getElementById('reporteCategoria')?.value || '';
        const direccionRaw = document.getElementById('reporteDireccion')?.value || '';

        // Validar formato fecha YYYY-MM-DD
        const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
        const fechaDesde = fechaRegex.test(fechaDesdeRaw) ? fechaDesdeRaw : '';
        const fechaHasta = fechaRegex.test(fechaHastaRaw) ? fechaHastaRaw : '';

        // Validar categoría contra valores conocidos
        const categoriasValidas = new Set(articulos.map(a => a.categoriaID).filter(Boolean));
        const categoria = categoriasValidas.has(categoriaRaw) ? categoriaRaw : '';

        // Validar dirección contra direcciones oficiales
        const direccionesValidas = new Set((direccionesOficiales || []).map(d => d.nombre).filter(Boolean));
        const direccion = direccionesValidas.has(direccionRaw) ? direccionRaw : '';

        const contenedor = document.getElementById('contenedorResultadosReportes');
        if (!contenedor) return;

        // Asegurar que los movimientos estén cargados
        if (!movimientos || movimientos.length === 0) {
            contenedor.innerHTML = '<div class="placeholder" style="padding: 2rem; text-align: center;">Cargando movimientos...</div>';
            await cargarMovimientos();
        }

        // Filtrar movimientos
        let filtrados = [...movimientos];

        // Filtro por fecha desde
        if (fechaDesde) {
            filtrados = filtrados.filter(m => m.fecha && m.fecha >= fechaDesde);
        }

        // Filtro por fecha hasta
        if (fechaHasta) {
            filtrados = filtrados.filter(m => m.fecha && m.fecha <= fechaHasta + 'T23:59:59');
        }

        // Filtro por categoría (buscar ID de artículos que tengan esa categoría)
        if (categoria) {
            const idsCategoria = articulos
                .filter(a => a.categoriaID === categoria)
                .map(a => String(a.id));
            filtrados = filtrados.filter(m => idsCategoria.includes(String(m.idArticulo)));
        }

        // Filtro por dirección (buscar en destino o proveedor)
        if (direccion) {
            const dirNorm = normalizarTexto(direccion);
            filtrados = filtrados.filter(m => {
                const destino = normalizarTexto(m.destino || '');
                const proveedor = normalizarTexto(m.proveedor || '');
                return destino.includes(dirNorm) || proveedor.includes(dirNorm);
            });
        }

        // Ordenar por fecha descendente
        filtrados.sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0));

        // Guardar para exportación
        ultimoReporteGenerado = filtrados;

        // Renderizar tabla
        if (filtrados.length === 0) {
            contenedor.innerHTML = '<div class="placeholder" style="padding: 3rem; text-align: center;">No se encontraron movimientos con los filtros seleccionados.</div>';
            return;
        }

        let filas = '';
        filtrados.forEach(m => {
            const fecha = m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR') : '—';
            const articulo = m.nombre || `ID ${m.idArticulo || '—'}`;
            const tipo = m.tipo || '—';
            const cantidad = Number(m.cantidad) || 0;
            const esEntrada = tipo === 'Entrada';
            const cantTexto = esEntrada ? `+${cantidad}` : `-${cantidad}`;
            const cantColor = esEntrada ? '#16a34a' : '#dc2626';
            const origenDestino = esEntrada ? (m.proveedor || '—') : (m.destino || m.proveedor || '—');

            filas += `
                <tr>
                    <td>${escapeHtml(fecha)}</td>
                    <td>${escapeHtml(articulo)}</td>
                    <td><span class="badge ${esEntrada ? 'badge-disponible' : 'badge-sin-stock'}">${escapeHtml(tipo)}</span></td>
                    <td style="font-weight:700; color:${cantColor};">${escapeHtml(cantTexto)}</td>
                    <td>${escapeHtml(origenDestino)}</td>
                </tr>
            `;
        });

        contenedor.innerHTML = `
            <p class="placeholder" style="margin: 0.5rem 0;">${filtrados.length} movimiento${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}</p>
            <div class="inventario-tabla-wrapper">
                <table class="inventario-tabla">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Artículo</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Destino / Proveedor</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        `;
    });
}

// Listener para botón "Exportar a Excel"
function configurarBtnExportarExcel() {
    const btn = document.getElementById('btnExportarExcel');
    if (!btn) return;

    btn.addEventListener('click', () => {
        if (!ultimoReporteGenerado || ultimoReporteGenerado.length === 0) {
            mostrarToast('Generá un reporte primero', 'error');
            return;
        }

        // Encabezados CSV con separador punto y coma
        const headers = ['Fecha', 'Artículo', 'Tipo', 'Cantidad', 'Destino / Proveedor'];

        const rows = ultimoReporteGenerado.map(m => {
            const fecha = m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR') : '—';
            const articulo = m.nombre || `ID ${m.idArticulo || '—'}`;
            const tipo = m.tipo || '—';
            const cantidad = Number(m.cantidad) || 0;
            const esEntrada = tipo === 'Entrada';
            const cantTexto = esEntrada ? `+${cantidad}` : `-${cantidad}`;
            const origenDestino = esEntrada ? (m.proveedor || '—') : (m.destino || m.proveedor || '—');

            // Escapar comillas dobles Y neutralizar prefijos de fórmula (= + - @) para prevenir CSV Injection
            const escapeCsv = (val) => {
                let str = String(val).replace(/"/g, '""');
                // Prefijar con comilla simple para forzar interpretación como texto en Excel/Sheets
                if (/^[=+\-@]/.test(str)) str = "'" + str;
                return `"${str}"`;
            };
            return [fecha, articulo, tipo, cantTexto, origenDestino].map(v => escapeCsv(v)).join(';');
        });

        // BOM UTF-8 (﻿) para que Excel lea tildes y ñ correctamente
        const csvContent = '﻿' + headers.join(';') + '\n' + rows.join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Reporte_Inventario.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        mostrarToast('Reporte exportado a CSV', 'exito');
    });
}

// ============================================================
// 25. INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    inicializarTema();

    configurarNavegacion();
    configurarMenu();
    configurarBuscador();
    configurarMovimientos();
    configurarModalDireccion();
    configurarModalArticulo();
    inicializarDragAndDropImagen();

    configurarBuscadorDropdown(
        'inputArticulo', 'articuloId',
        'listaArticulosCustom', 'vistaPreviaContenido'
    );
    configurarBuscadorDropdown(
        'inputArticuloSalida', 'articuloIdSalida',
        'listaArticulosCustomSalida', 'vistaPreviaContenidoSalida'
    );
    configurarBuscadorDropdownRelevamiento();

    cargarDashboard();
    configurarDashboard();
    configurarPedidos();

    await cargarDireccionesOficiales();

    const formEntrada = document.getElementById('formEntrada');
    if (formEntrada) formEntrada.addEventListener('submit', registrarEntrada);

    const formSalida = document.getElementById('formSalida');
    if (formSalida) formSalida.addEventListener('submit', registrarSalida);

    const cantidadPacksEntrada = document.getElementById('cantidadPacksEntrada');
    const cantidadSueltasEntrada = document.getElementById('cantidadSueltasEntrada');
    const cantidadUnidadesSalida = document.getElementById('cantidadUnidadesSalida');
    if (cantidadPacksEntrada) cantidadPacksEntrada.addEventListener('input', actualizarCalculoEntrada);
    if (cantidadSueltasEntrada) cantidadSueltasEntrada.addEventListener('input', actualizarCalculoEntrada);
    if (cantidadUnidadesSalida) cantidadUnidadesSalida.addEventListener('input', sincronizarCantidadSalida);
    restablecerCantidadEntrada();
    restablecerCantidadSalida();

    const formRelevamiento = document.getElementById('formRelevamiento');
    if (formRelevamiento) formRelevamiento.addEventListener('submit', registrarRelevamiento);

    const stockRealInput = document.getElementById('stockReal');
    if (stockRealInput) stockRealInput.addEventListener('input', actualizarDiferencia);

    const fechaEntrada = document.getElementById('fechaEntrada');
    if (fechaEntrada) fechaEntrada.value = obtenerFechaLocal();
    const fechaSalida = document.getElementById('fechaSalida');
    if (fechaSalida) fechaSalida.value = obtenerFechaLocal();

    const f1 = document.getElementById('fechaActual');
    if (f1) f1.textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    const f2 = document.getElementById('fechaActualSalidas');
    if (f2) f2.textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    const f3 = document.getElementById('fechaActualRelevamiento');
    if (f3) f3.textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    await cargarArticulos();

    // Inicializar filtros de reportes (requiere articulos y direccionesOficiales cargados)
    inicializarFiltrosReportes();
    configurarBtnGenerarReporte();
    configurarBtnExportarExcel();

    await cargarUltimasEntradas();
    await cargarUltimasSalidas();

    const hash = window.location.hash.replace('#', '');
    if (hash === 'direcciones') cargarDirecciones();
    if (hash === 'dashboard') cargarDashboard();
});

// ============================================================
// 25. EDITAR ARTÍCULO Y SUBIR FOTO
// ============================================================
function toggleMenuAcciones(btn) {
    const dropdown = btn.nextElementSibling;
    document.querySelectorAll('.menu-acciones-dropdown').forEach(m => { if (m !== dropdown) m.classList.remove('visible'); });
    dropdown.classList.toggle('visible');
}
document.addEventListener('click', (e) => {
    if (!e.target.closest('.acciones-wrapper')) {
        document.querySelectorAll('.menu-acciones-dropdown').forEach(m => m.classList.remove('visible'));
    }
});

function abrirModalEditarArticulo(id) {
    const art = articulos.find(a => String(a.id) === String(id));
    if (!art) return;

    document.getElementById('editArtId').value = art.id;
    document.getElementById('editArtNombre').value = art.articulo || '';
    document.getElementById('editArtCategoria').value = art.categoriaID || '';
    document.getElementById('editArtUnidad').value = art.unidadMedida || 'Unidad';
    document.getElementById('editArtMultiplicador').value = art.multiplicadorUnidades || 1;
    document.getElementById('editArtStockMin').value = art.stockMin || 0;
    document.getElementById('editArtObservaciones').value = art.observaciones || '';
    document.getElementById('editArtUbicacion').value = art.ubicacion || '';
    document.getElementById('editArtError').textContent = '';
    document.getElementById('editArtImagenFile').value = '';

    const preview = document.getElementById('editArtImagenPreview');
    const imgData = (art.imagen || '').trim();

    // Validar que la URL de imagen sea segura (http/https/data:image) para prevenir XSS
    function esUrlImagenSegura(url) {
        return url.startsWith('https://') || url.startsWith('http://') || url.startsWith('data:image/');
    }

    // Mostrar estado de carga inicial
    preview.innerHTML = `<span class="foto-loading" aria-hidden="true">⏳ Cargando imagen...</span>`;

    if (imgData.startsWith('img/')) {
        // URL limpia SIN parámetro ?v= para aprovechar caché del navegador
        const urlGitHub = `https://raw.githubusercontent.com/comprassuministros2-ship-it/InventarioPro/main/${imgData}`;
        if (esUrlImagenSegura(urlGitHub)) {
            const img = new Image();
            img.onload = function() {
                // Solo mostramos la imagen cuando terminó de cargar
                preview.innerHTML = `<img src="${escapeHtml(urlGitHub)}" style="width:100%; height:100%; object-fit:cover;">`;
            };
            img.onerror = function() {
                // Fallback si falla la carga
                preview.textContent = '📦';
            };
            img.src = urlGitHub;
        } else {
            preview.textContent = '📦';
        }
    } else if (esUrlImagenSegura(imgData)) {
        const img = new Image();
        img.onload = function() {
            preview.innerHTML = `<img src="${escapeHtml(imgData)}" style="width:100%; height:100%; object-fit:cover;">`;
        };
        img.onerror = function() {
            preview.textContent = '📦';
        };
        img.src = imgData;
    } else if (imgData !== '') {
        preview.textContent = escapeHtml(imgData);
    } else {
        preview.textContent = '📦';
    }
    document.getElementById('modalEditarArticulo').style.display = 'flex';
}

// ============================================================
// 25b. MODAL DETALLE ARTÍCULO
// ============================================================
function abrirModalDetalleArticulo(id) {
    const art = articulos.find(a => String(a.id) === String(id));
    if (!art) return;

    const stock = obtenerStock(art);
    let estadoClase = 'badge-disponible';
    let estadoTexto = 'Disponible';
    if (stock === 0) { estadoClase = 'badge-sin-stock'; estadoTexto = 'Sin Stock'; }
    else if (art.stockCritico > 0 && stock <= art.stockCritico) { estadoClase = 'badge-critico'; estadoTexto = 'Crítico'; }

    document.getElementById('detalleArtTitulo').textContent = `${escapeHtml(art.articulo)} (ID: ${escapeHtml(art.id)})`;
    document.getElementById('detalleArtStock').textContent = stock;
    document.getElementById('detalleArtBadge').textContent = estadoTexto;
    document.getElementById('detalleArtBadge').className = `badge ${estadoClase}`;
    document.getElementById('detalleArtCategoria').textContent = escapeHtml(art.categoriaID || '—');
    document.getElementById('detalleArtUnidad').textContent = escapeHtml(art.unidadMedida || 'Unidad');
    document.getElementById('detalleArtStockMin').textContent = art.stockMin || 0;

    // Cargar movimientos
    cargarMovimientosDetalleArticulo(id);

    document.getElementById('modalDetalleArticulo').style.display = 'flex';
}

function cerrarModalDetalleArticulo() {
    document.getElementById('modalDetalleArticulo').style.display = 'none';
}

async function cargarMovimientosDetalleArticulo(id) {
    const contenedor = document.getElementById('detalleArtMovimientos');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="placeholder">Cargando movimientos...</p>';

    try {
        const resultado = await apiService.post({ accion: 'listarMovimientos', idArticulo: id });
        if (resultado && resultado.exito === false) throw new Error(resultado.error || 'Error al obtener movimientos');
        const datos = Array.isArray(resultado) ? resultado : [];

        if (datos.length === 0) {
            contenedor.innerHTML = '<p class="placeholder">Sin movimientos registrados</p>';
            return;
        }

        // Ordenar por fecha descendente
        datos.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

        let html = '<ul class="lista-movimientos-detalle">';
        datos.forEach(m => {
            const fecha = m.fecha ? new Date(m.fecha).toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }) : '—';

            const esEntrada = m.tipo === 'Entrada';
            const tipoClase = esEntrada ? 'badge-disponible' : 'badge-sin-stock';
            const tipoTexto = m.tipo || '—';

            const origenDestino = esEntrada
                ? (m.proveedor || '—')
                : (m.destino || m.proveedor || '—');

            let cantTexto = '';
            let cantColor = '#dc2626';

            if (m.tipo === 'Entrada') {
                cantTexto = `+${m.cantidad}`;
                cantColor = '#16a34a';
            } else if (m.tipo === 'Salida') {
                cantTexto = `-${m.cantidad}`;
                cantColor = '#dc2626';
            } else if (m.tipo === 'Relevamiento') {
                const dif = Number(m.cantidad) || 0;
                cantTexto = dif > 0 ? `+${dif}` : `${dif}`;
                cantColor = dif > 0 ? '#16a34a' : '#dc2626';
            } else {
                cantTexto = String(m.cantidad);
            }

            html += `
                <li>
                    <div class="mov-detalle-header">
                        <span class="mov-detalle-fecha">${fecha}</span>
                        <span class="badge ${tipoClase}">${tipoTexto}</span>
                    </div>
                    <div class="mov-detalle-body">
                        <span class="mov-detalle-origen">${escapeHtml(origenDestino)}</span>
                        <span class="mov-detalle-cantidad" style="color: ${cantColor}; font-weight: 700;">${cantTexto} uds</span>
                    </div>
                    ${m.observacion ? `<div class="mov-detalle-obs">${escapeHtml(m.observacion)}</div>` : ''}
                </li>
            `;
        });
        html += '</ul>';
        contenedor.innerHTML = html;
    } catch (error) {
        console.error('Error cargando movimientos del artículo:', error);
        contenedor.innerHTML = `<p class="placeholder">Error al cargar: ${escapeHtml(error.message)}</p>`;
    }
}

async function guardarEdicionArticulo() {
    const id = document.getElementById('editArtId').value;
    const nombre = document.getElementById('editArtNombre').value.trim();
    const categoria = document.getElementById('editArtCategoria').value.trim();
    const unidadMedida = document.getElementById('editArtUnidad').value;
    const multiplicador = parseInt(document.getElementById('editArtMultiplicador').value) || 1;
    const stockMin = parseInt(document.getElementById('editArtStockMin').value) || 0;
    const observaciones = document.getElementById('editArtObservaciones').value.trim();
    const fileInput = document.getElementById('editArtImagenFile');
    const errorEl = document.getElementById('editArtError');
    const btn = document.getElementById('btnGuardarEdicionArticulo');

    if (!nombre || !categoria) { errorEl.textContent = 'Nombre y categoría son obligatorios'; return; }
    btn.disabled = true; btn.textContent = 'Guardando...'; errorEl.textContent = '';

    let base64Image = null;
    if (fileInput.files && fileInput.files[0]) {
        try {
            base64Image = await procesarYReducirImagen(fileInput.files[0]);
        } catch (e) {
            errorEl.textContent = 'Error al procesar la imagen';
            btn.disabled = false; btn.textContent = 'Guardar cambios'; return;
        }
    }

    const ubicacion = document.getElementById('editArtUbicacion').value;
    const datos = { id, nombre, categoria, unidadMedida, multiplicador, stockMin, observaciones, imagenBase64: base64Image, ubicacion };

    try {
        const r = await apiService.post({ accion: 'editarArticulo', datos });
        if (!r || r.exito === false) throw new Error(r?.error || 'Error al editar');
        mostrarToast('Artículo actualizado', 'exito');
        document.getElementById('modalEditarArticulo').style.display = 'none';
        await cargarArticulos();
    } catch (err) {
        errorEl.textContent = err.message;
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar cambios';
    }
}

function procesarYReducirImagen(file) {
    if (!file.type.startsWith('image/')) return Promise.reject(new Error('Solo se permiten imágenes'));
    if (file.size > 5 * 1024 * 1024) return Promise.reject(new Error('Máximo 5MB.'));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width; let height = img.height;
                const maxAncho = 800;
                if (width > maxAncho) { height = Math.round((height * maxAncho) / width); width = maxAncho; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => reject(new Error('Archivo no válido'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsDataURL(file);
    });
}

function inicializarDragAndDropImagen() {
    const dropZone = document.getElementById('editArtImagenPreview');
    const fileInput = document.getElementById('editArtImagenFile');
    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => { dropZone.style.borderColor = 'var(--accent)'; dropZone.style.backgroundColor = 'var(--accent-soft)'; }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => { dropZone.style.borderColor = 'var(--border)'; dropZone.style.backgroundColor = 'var(--bg-hover)'; }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            if (!files[0].type.startsWith('image/')) { mostrarToast('Solo se permiten imágenes', 'error'); return; }
            if (files[0].size > 5 * 1024 * 1024) { mostrarToast('El archivo supera los 5MB', 'error'); return; }
            fileInput.files = files;
            actualizarPreviewImagen(files[0], dropZone);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            if (!e.target.files[0].type.startsWith('image/')) { mostrarToast('Solo se permiten imágenes', 'error'); e.target.value=''; return; }
            if (e.target.files[0].size > 5 * 1024 * 1024) { mostrarToast('El archivo supera los 5MB', 'error'); e.target.value=''; return; }
            actualizarPreviewImagen(e.target.files[0], dropZone);
        }
    });

    function actualizarPreviewImagen(file, contenedor) {
        const reader = new FileReader();
        reader.onload = function(e) {
            contenedor.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:8px; pointer-events:none;">`;
        };
        reader.readAsDataURL(file);
    }
}
