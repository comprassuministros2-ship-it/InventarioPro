/**
 * ============================================================
 * INVENTARIO PRO - SCRIPT PRINCIPAL
 * Maneja: Navegación, Renderizado, Búsqueda, Filtros y Entradas
 * ============================================================
 */

// ============================================================
// 1. ESTADO GLOBAL
// ============================================================
let articulos = [];
let filtroActivo = "todos";

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
    if (nombre === 'inventario') cargarArticulos();
    // Cerrar menú en móvil
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

// ============================================================
// 3. CARGA DE ARTÍCULOS
// ============================================================
async function cargarArticulos() {
    try {
        const datos = await articulosService.obtenerArticulos();
        articulos = Array.isArray(datos) ? datos : [];
        renderizarArticulos(aplicarFiltro(articulos));
        renderizarFiltrosCategorias();
        return articulos;
    } catch (error) {
        console.error("Error cargando artículos:", error);
        const contenedor = document.getElementById("contenedorInventario");
        if (contenedor) {
            contenedor.innerHTML = `<p class="placeholder">Error al cargar inventario: ${error.message}</p>`;
        }
        return [];
    }
}

// ============================================================
// 4. RENDERIZADO DE TABLA DE INVENTARIO
// ============================================================
function renderizarArticulos(datos) {
    const contenedor = document.getElementById("contenedorInventario");
    if (!contenedor) return;
    if (!datos || datos.length === 0) {
        contenedor.innerHTML = `<p class="placeholder">No se encontraron artículos que coincidan con la búsqueda.</p>`;
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
                <td><span class="badge-categoria">${item.categoriaID || '—'}</span></td>
                <td class="td-centrado">—</td>
                <td><span class="stock-numero">${stock}</span></td>
                <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>
                <td class="td-centrado">—</td>
                <td>
                    <div class="acciones-celda">
                        <button class="btn-accion" type="button" aria-label="Ver detalle" title="Detalle">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="btn-accion" type="button" aria-label="Registrar salida" title="Salida">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 5l7 7-7 7"></path>
                            </svg>
                        </button>
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
                        <th>Categoría</th>
                        <th>Ubicación</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Tipo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

function obtenerCeldaArticuloHTML(articulo) {
    const tieneImagen = articulo.imagen && articulo.imagen.trim() !== '';
    const imgHTML = tieneImagen
        ? `<img src="${articulo.imagen}" alt="${articulo.articulo}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
        : '';
    const placeholderHTML = `<span class="articulo-imagen-placeholder" ${tieneImagen ? 'style="display:none;"' : ''}>📦</span>`;
    return `
        <div class="articulo-celda">
            <div class="articulo-imagen">
                ${imgHTML}
                ${placeholderHTML}
            </div>
            <div class="articulo-info">
                <span class="articulo-nombre">${articulo.articulo}</span>
                <span class="articulo-meta">ID ${articulo.id}</span>
            </div>
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

function aplicarFiltro(datos) {
    if (!Array.isArray(datos)) return [];
    return datos.filter(item => {
        const stock = obtenerStock(item);
        if (filtroActivo === "disponibles") return stock > 0;
        if (filtroActivo === "stock-bajo") return stock >= 1 && stock <= 5;
        if (filtroActivo === "sin-stock") return stock === 0;
        if (filtroActivo === "todos" || !filtroActivo) return true;
        const categoriaItem = normalizarTexto(item.categoriaID);
        const categoriaFiltro = normalizarTexto(filtroActivo);
        return categoriaItem === categoriaFiltro || categoriaItem.includes(categoriaFiltro) || categoriaFiltro.includes(categoriaItem);
    });
}

function configurarBuscador() {
    const input = document.getElementById("inputBusqueda");
    if (!input) return;
    input.addEventListener("input", () => {
        const valor = input.value;
        const resultados = aplicarFiltro(filtrarArticulos(valor));
        renderizarArticulos(resultados);
    });
}

// ============================================================
// 6. FILTROS DE CATEGORÍAS CON CONTADOR
// ============================================================
function renderizarFiltrosCategorias() {
    const contenedor = document.getElementById('filtrosCategorias');
    if (!contenedor) return;
    if (!articulos.length) { contenedor.innerHTML = ''; return; }
    const conteo = {};
    articulos.forEach(item => {
        const cat = item.categoriaID || 'Sin categoría';
        conteo[cat] = (conteo[cat] || 0) + 1;
    });
    let html = `<button class="chip-categoria active" data-cat="todos">Todos <span class="contador">${articulos.length}</span></button>`;
    for (const [cat, num] of Object.entries(conteo)) {
        html += `<button class="chip-categoria" data-cat="${cat}">${cat} <span class="contador">${num}</span></button>`;
    }
    contenedor.innerHTML = html;
    contenedor.querySelectorAll('.chip-categoria').forEach(chip => {
        chip.addEventListener('click', () => {
            const cat = chip.dataset.cat;
            filtroActivo = cat;
            contenedor.querySelectorAll('.chip-categoria').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const resultados = aplicarFiltro(articulos);
            renderizarArticulos(resultados);
        });
    });
}

// ============================================================
// 7. BUSCADOR DE ENTRADAS CON DROPDOWN PERSONALIZADO
// ============================================================
function configurarBuscadorEntradas() {
    const inputArticulo = document.getElementById("inputArticulo");
    const hiddenId = document.getElementById("articuloId");
    const dropdown = document.getElementById("listaArticulosCustom");

    if (!inputArticulo || !hiddenId || !dropdown) return;

    inputArticulo.addEventListener("focus", function() {
        if (this.value.trim().length >= 1) {
            filtrarDropdown(this.value.trim());
        }
    });

    inputArticulo.addEventListener("input", function() {
        const valor = this.value.trim();
        if (valor.length >= 1) {
            filtrarDropdown(valor);
            dropdown.classList.add("visible");
        } else {
            dropdown.classList.remove("visible");
            hiddenId.value = "";
            document.getElementById('vistaPreviaContenido').innerHTML =
                '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
        }
    });

    document.addEventListener("click", function(e) {
        if (!e.target.closest(".buscador-articulo-group")) {
            dropdown.classList.remove("visible");
        }
    });

    function filtrarDropdown(texto) {
        const termino = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const resultados = articulos.filter(item =>
            item.articulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(termino) ||
            String(item.id).includes(termino)
        );
        dropdown.innerHTML = "";
        if (resultados.length === 0) {
            const li = document.createElement("li");
            li.textContent = "No se encontraron artículos";
            li.style.color = "var(--text-muted)";
            li.style.fontStyle = "italic";
            li.style.cursor = "default";
            dropdown.appendChild(li);
            dropdown.classList.add("visible");
            return;
        }
        resultados.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `${item.articulo} <span class="id-articulo">ID ${item.id}</span>`;
            li.dataset.id = item.id;
            li.addEventListener("click", function() {
                inputArticulo.value = `${item.articulo} (ID ${item.id})`;
                hiddenId.value = item.id;
                dropdown.classList.remove("visible");
                mostrarVistaPrevia(item.id);
            });
            dropdown.appendChild(li);
        });
        dropdown.classList.add("visible");
    }

    let selectedIndex = -1;
    inputArticulo.addEventListener("keydown", function(e) {
        const items = dropdown.querySelectorAll("li");
        if (items.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            items.forEach((li, i) => li.classList.toggle("seleccionado", i === selectedIndex));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            items.forEach((li, i) => li.classList.toggle("seleccionado", i === selectedIndex));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                items[selectedIndex].click();
            }
        }
    });

    cargarArticulosParaBuscador();
}

// ============================================================
// 8. CARGA DE ARTÍCULOS PARA EL BUSCADOR (dropdown)
// ============================================================
async function cargarArticulosParaBuscador() {
    try {
        const datos = await articulosService.obtenerArticulos();
        articulos = Array.isArray(datos) ? datos : [];
    } catch (e) {
        console.error('Error cargando artículos para buscador:', e);
    }
}

// ============================================================
// 9. VISTA PREVIA DEL ARTÍCULO
// ============================================================
function mostrarVistaPrevia(id) {
    const item = articulos.find(a => String(a.id) === String(id));
    if (!item) return;
    const stock = obtenerStock(item);
    let estadoClase = 'badge-disponible';
    let estadoTexto = 'Disponible';
    if (stock === 0) { estadoClase = 'badge-sin-stock'; estadoTexto = 'Sin stock'; }
    else if (stock <= 5) { estadoClase = 'badge-critico'; estadoTexto = 'Crítico'; }
    else if (stock <= 10) { estadoClase = 'badge-bajo'; estadoTexto = 'Bajo'; }
    document.getElementById('vistaPreviaContenido').innerHTML = `
        <div class="articulo-preview">
            <div class="nombre">${item.articulo}</div>
            <div class="stock-grande">${stock}</div>
            <div style="color: var(--text-muted);">unidades actuales</div>
            <div class="detalle">
                <span class="badge ${estadoClase}">${estadoTexto}</span>
                ${item.stockMin ? `<span style="color:var(--text-muted);font-size:0.85rem;">Mínimo: ${item.stockMin}</span>` : ''}
            </div>
        </div>
    `;
}

// ============================================================
// 10. REGISTRAR ENTRADA
// ============================================================
async function registrarEntrada(e) {
    e.preventDefault();
    const id = document.getElementById("articuloId").value;
    const cantidad = parseInt(document.getElementById("cantidad").value);
    const proveedor = document.getElementById("proveedor").value.trim();
    const factura = document.getElementById("factura").value.trim();
    const observaciones = document.getElementById("observaciones").value.trim();
    const fecha = document.getElementById("fechaEntrada").value;

    if (!id) { alert('❌ Seleccioná un artículo'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { alert('❌ Cantidad inválida'); return; }
    if (!proveedor) { alert('❌ Ingresá el proveedor'); return; }

    const btn = document.getElementById('btnRegistrar');
    btn.disabled = true;
    btn.textContent = 'Registrando...';
    try {
        const payload = {
            accion: 'entrada',
            id: id,
            cantidad: cantidad,
            proveedor: proveedor,
            ordenCompra: factura,
            tipoCompra: '',
            observacion: observaciones,
            fecha: fecha
        };
        const resultado = await apiService.post(payload);
        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error desconocido');
        }
        alert('✅ Entrada registrada correctamente');
        document.getElementById('formEntrada').reset();
        document.getElementById('articuloId').value = '';
        document.getElementById('vistaPreviaContenido').innerHTML =
            '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
        document.getElementById('registradoPor').value = 'Samuel Steves';
        await cargarArticulosParaBuscador();
        await cargarArticulos();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrar entrada';
    }
}

// ============================================================
// 11. ÚLTIMAS ENTRADAS (SOLO UNA VEZ, CON MENSAJE CORRECTO)
// ============================================================
async function cargarUltimasEntradas() {
    const contenedor = document.getElementById('ultimasEntradasContenido');
    if (!contenedor) return;

    try {
        const payload = { accion: 'ultimasEntradas', cantidad: 5 };
        const resultado = await apiService.post(payload);

        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error al obtener últimas entradas');
        }

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
            const nombre = mov.articulo || `ID ${mov.id}`;

            html += `
                <li>
                    <div class="item-nombre">${nombre}</div>
                    <div class="item-detalle">${fecha} · ${proveedor} ${orden ? '· '+orden : ''}</div>
                    <div class="item-cantidad">+${cantidad}</div>
                </li>
            `;
        });
        html += '</ul>';
        contenedor.innerHTML = html;

    } catch (error) {
        console.error('Error cargando últimas entradas:', error);
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${error.message}</p>`;
    }
}

// ============================================================
// 12. MENÚ LATERAL COLAPSABLE
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
// 13. INICIALIZACIÓN (SOLO UNA VEZ)
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    configurarNavegacion();
    configurarMenu();

    const fechaInput = document.getElementById('fechaEntrada');
    if (fechaInput) fechaInput.value = new Date().toISOString().split('T')[0];

    const fechaEl = document.getElementById('fechaActual');
    if (fechaEl) {
        const ahora = new Date();
        fechaEl.textContent = ahora.toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
        });
    }

    cargarArticulos();
    cargarArticulosParaBuscador();
    configurarBuscadorEntradas();
    configurarBuscador();

    const formEntrada = document.getElementById('formEntrada');
    if (formEntrada) formEntrada.addEventListener('submit', registrarEntrada);

    cargarUltimasEntradas();

    console.log('✅ InventarioPro - Aplicación inicializada.');
});