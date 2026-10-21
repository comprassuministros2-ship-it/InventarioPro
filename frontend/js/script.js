// ============================================================
// 0. TOAST - Notificación flotante (FUNCIÓN GLOBAL)
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

function escapeHtml(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
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
    if (nombre === 'pedidos') {
        cambiarTabPedidos('seguimiento');
        cargarPedidos();
    }

    if (nombre === 'inventario') cargarArticulos();
    if (nombre === 'movimientos') cargarMovimientos();
    if (nombre === 'direcciones') cargarDirecciones();
    if (nombre === 'dashboard') cargarDashboard();

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
        renderizarSelectCategorias();
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
                <td><span class="stock-numero">${stock}</span></td>
                <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>
                <td><span class="badge-categoria">${escapeHtml(item.categoriaID || '—')}</span></td>
                <td class="td-centrado">—</td>
                <td class="td-centrado">—</td>
                <td>
                    <div class="acciones-celda" style="display: flex; gap: 0.4rem; justify-content: center;">
                        <button class="btn-accion" type="button" title="Detalles" data-action="detalles" data-id="${item.id}">
                            👁️
                        </button>
                        <button class="btn-accion" type="button" title="Relevamiento" data-action="relevamiento" data-id="${item.id}">
                            ✏️
                        </button>
                        <button class="btn-accion" type="button" title="Eliminar" data-action="eliminar" data-id="${item.id}">
                            🗑️
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
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Categoría</th>
                        <th>Ubicación</th>
                        <th>Tipo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;

    // Listener simplificado para los 3 botones directos (sin menú desplegable)
    contenedor.querySelectorAll('.btn-accion[data-action]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const accion = this.dataset.action;
            const id = this.dataset.id;

            if (accion === 'relevamiento') {
                irARelevamientoConArticulo(id);
            } else if (accion === 'detalles') {
                mostrarToast('Próximamente: página de detalles', 'exito');
            } else if (accion === 'eliminar') {
                eliminarArticulo(id);
            }
        });
    });
}

function obtenerCeldaArticuloHTML(articulo) {
    const emoji = (articulo.imagen || '').trim() || '📦';
    return `
        <div class="articulo-celda">
            <div class="articulo-imagen">
                <span class="emoji-articulo">${emoji}</span>
            </div>
            <div class="articulo-info">
                <span class="articulo-nombre">${escapeHtml(articulo.articulo)}</span>
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
    const packs = Math.max(0, Number.parseInt(document.getElementById('cantidadPacksEntrada')?.value, 10) || 0);
    const sueltas = Math.max(0, Number.parseInt(document.getElementById('cantidadSueltasEntrada')?.value, 10) || 0);
    const total = packs * multiplicador + sueltas;
    const stockActual = obtenerStock(articulo);

    const cantidad = document.getElementById('cantidad');
    const totalEl = document.getElementById('textoCalculoEntrada');
    const stockEl = document.getElementById('textoStockFuturoEntrada');
    if (cantidad) cantidad.value = String(total);
    if (totalEl) totalEl.textContent = `${formatearUnidades(total)} unidades`;
    if (stockEl) {
        stockEl.textContent = `Stock actual: ${formatearUnidades(stockActual)} → ${formatearUnidades(stockActual + total)}`;
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
    if (!articulo || multiplicador === 1) {
        if (aviso) aviso.hidden = true;
        return;
    }

    const stock = obtenerStock(articulo);
    const equivalencia = stock / multiplicador;
    const presentacion = obtenerNombrePresentacion(articulo);
    if (texto) {
        texto.textContent = `${formatearUnidades(stock)} unidades (equivale a ${formatearUnidades(equivalencia)} ${presentacion}${equivalencia === 1 ? '' : 's'})`;
    }
    if (aviso) aviso.hidden = false;
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
    if (cantidad) cantidad.value = '1';
    if (hidden) hidden.value = '1';
    if (aviso) aviso.hidden = true;
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

// ============================================================
// 6. SELECT DE CATEGORÍAS
// ============================================================
function renderizarSelectCategorias() {
    const select = document.getElementById('selectUbicacion');
    if (!select) return;

    const valorActual = select.value || 'todos';
    select.innerHTML = '<option value="todos">Todas las categorías</option>';

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
// 7. BUSCADOR GENÉRICO CON DROPDOWN
// ============================================================
function configurarBuscadorDropdown(inputId, hiddenId, dropdownId, previewId) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !hidden || !dropdown) return;

    input.addEventListener("focus", function() {
        if (this.value.trim().length >= 1) filtrar(this.value.trim());
    });

    input.addEventListener("input", function() {
        const valor = this.value.trim();
        if (valor.length >= 1) {
            filtrar(valor);
            dropdown.classList.add("visible");
        } else {
            dropdown.classList.remove("visible");
            hidden.value = "";
            const preview = document.getElementById(previewId);
            if (preview) preview.innerHTML = '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
            if (inputId === 'inputArticulo') restablecerCantidadEntrada();
            if (inputId === 'inputArticuloSalida') restablecerCantidadSalida();
        }
    });

    document.addEventListener("click", function(e) {
        if (!e.target.closest(".buscador-articulo-group")) {
            dropdown.classList.remove("visible");
        }
    });

    function filtrar(texto) {
        const termino = normalizarTexto(texto);
        const resultados = articulos.filter(item =>
            normalizarTexto(item.articulo).includes(termino) ||
            String(item.id).includes(termino)
        );
        dropdown.innerHTML = "";
        if (resultados.length === 0) {
            const li = document.createElement("li");
            li.innerHTML = `No se encontró "${escapeHtml(texto)}"`;
            li.style.color = "var(--text-muted)";
            li.style.fontStyle = "italic";
            li.style.cursor = "default";
            li.style.borderBottom = "1px solid var(--border)";
            dropdown.appendChild(li);

            if (inputId === 'inputArticulo') {
                const liCrear = document.createElement("li");
                liCrear.innerHTML = `➕ Crear "<strong>${escapeHtml(texto)}</strong>" ahora`;
                liCrear.style.color = "var(--accent)";
                liCrear.style.fontWeight = "600";
                liCrear.style.cursor = "pointer";
                liCrear.addEventListener("click", function() {
                    dropdown.classList.remove("visible");
                    abrirModalArticulo({
                        origen: 'entrada',
                        nombreSugerido: texto
                    });
                });
                dropdown.appendChild(liCrear);
            }

            dropdown.classList.add("visible");
            return;
        }
        resultados.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `${escapeHtml(item.articulo)} <span class="id-articulo">ID ${item.id}</span>`;
            li.dataset.id = item.id;
            li.addEventListener("click", function() {
                input.value = `${item.articulo} (ID ${item.id})`;
                hidden.value = item.id;
                dropdown.classList.remove("visible");
                mostrarVistaPrevia(item.id, previewId);
                if (inputId === 'inputArticulo') actualizarPresentacionEntrada(item);
                if (inputId === 'inputArticuloSalida') actualizarPresentacionSalida(item);
            });
            dropdown.appendChild(li);
        });
        dropdown.classList.add("visible");
    }

    let selectedIndex = -1;
    input.addEventListener("keydown", function(e) {
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
            if (selectedIndex >= 0 && items[selectedIndex]) items[selectedIndex].click();
        }
    });
}

function configurarBuscadorDropdownRelevamiento() {
    const input = document.getElementById('inputArticuloRelevamiento');
    const hidden = document.getElementById('articuloIdRelevamiento');
    const dropdown = document.getElementById('listaArticulosCustomRelevamiento');
    if (!input || !hidden || !dropdown) return;

    input.addEventListener("focus", function() {
        if (this.value.trim().length >= 1) filtrar(this.value.trim());
    });

    input.addEventListener("input", function() {
        const valor = this.value.trim();
        if (valor.length >= 1) {
            filtrar(valor);
            dropdown.classList.add("visible");
        } else {
            dropdown.classList.remove("visible");
            hidden.value = "";
            document.getElementById('stockSistema').value = '—';
            document.getElementById('diferencia').value = '—';
            document.getElementById('vistaPreviaContenidoRelevamiento').innerHTML =
                '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
        }
    });

    document.addEventListener("click", function(e) {
        if (!e.target.closest(".buscador-articulo-group")) {
            dropdown.classList.remove("visible");
        }
    });

    function filtrar(texto) {
        const termino = normalizarTexto(texto);
        const resultados = articulos.filter(item =>
            normalizarTexto(item.articulo).includes(termino) ||
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
            li.innerHTML = `${escapeHtml(item.articulo)} <span class="id-articulo">ID ${item.id}</span>`;
            li.dataset.id = item.id;
            li.addEventListener("click", function() {
                input.value = `${item.articulo} (ID ${item.id})`;
                hidden.value = item.id;
                dropdown.classList.remove("visible");
                mostrarStockSistemaRelevamiento(item.id);
            });
            dropdown.appendChild(li);
        });
        dropdown.classList.add("visible");
    }

    let selectedIndex = -1;
    input.addEventListener("keydown", function(e) {
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
            if (selectedIndex >= 0 && items[selectedIndex]) items[selectedIndex].click();
        }
    });
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
        </div>
    `;
}

// ============================================================
// 9. REGISTRAR ENTRADA
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
    const fecha = document.getElementById("fechaEntrada").value;

    if (!id) { mostrarToast('Seleccioná un artículo', 'error'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { mostrarToast('Cantidad inválida', 'error'); return; }
    if (!proveedor) { mostrarToast('Ingresá el proveedor', 'error'); return; }

    const btn = document.getElementById('btnRegistrar');
    btn.disabled = true;
    btn.textContent = 'Registrando...';
    try {
        const payload = {
            accion: 'registrarEntrada',
            id: id,
            cantidad: cantidad,
            proveedor: proveedor,
            ordenCompra: factura,
            tipoCompra: tipoCompra,
            observacion: observaciones,
            fecha: fecha
        };
        const resultado = await apiService.post(payload);
        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error desconocido');
        }

        const articuloSel = articulos.find(a => String(a.id) === String(id));
        const nombreArticulo = articuloSel ? articuloSel.articulo : ('ID ' + id);
        mostrarCartel('⬆️', 'ENTRADA REGISTRADA',
            `${nombreArticulo} · +${cantidad} unidades`, 'entrada');

        document.getElementById('formEntrada').reset();
        document.getElementById('articuloId').value = '';
        document.getElementById('vistaPreviaContenido').innerHTML =
            '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
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
// 10. REGISTRAR SALIDA
// ============================================================
async function registrarSalida(e) {
    e.preventDefault();
    const id = document.getElementById("articuloIdSalida").value;
    sincronizarCantidadSalida();
    const cantidad = Number.parseInt(document.getElementById("cantidadSalida").value, 10);
    if (!validarDestinoSalida()) {
        mostrarToast('Ingresá el destino o dirección', 'error');
        return;
    }
    const destino = document.getElementById("destinoSalida").value.trim();
    const factura = document.getElementById("facturaSalida").value.trim();
    const observaciones = document.getElementById("observacionesSalida").value.trim();
    const fecha = document.getElementById("fechaSalida").value;

    if (!id) { mostrarToast('Seleccioná un artículo', 'error'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { mostrarToast('Cantidad inválida', 'error'); return; }

    const btn = document.getElementById('btnRegistrarSalida');
    btn.disabled = true;
    btn.textContent = 'Registrando...';
    try {
        const payload = {
            accion: 'registrarSalida',
            id: id,
            cantidad: cantidad,
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

        const articuloSel = articulos.find(a => String(a.id) === String(id));
        const nombreArticulo = articuloSel ? articuloSel.articulo : ('ID ' + id);
        mostrarCartel('⬇️', 'SALIDA REGISTRADA',
            `${nombreArticulo} · -${cantidad} unidades`, 'salida');

        document.getElementById('formSalida').reset();
        document.getElementById('articuloIdSalida').value = '';
        document.getElementById('vistaPreviaContenidoSalida').innerHTML =
            '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
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
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${error.message}</p>`;
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
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${error.message}</p>`;
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
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${error.message}</p>`;
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

    if (input.dataset.listenerDestinos) return;
    input.dataset.listenerDestinos = 'true';

    input.addEventListener('input', function() {
        const valor = this.value.trim();
        hidden.value = valor;

        if (valor.length < 1) {
            dropdown.classList.remove('visible');
            return;
        }

        const termino = normalizarTexto(valor);
        const coincidencias = direccionesOficiales.filter(d =>
            normalizarTexto(d.nombre).includes(termino)
        );

        dropdown.innerHTML = '';

        if (coincidencias.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = `Usar: <strong>${escapeHtml(valor)}</strong> <span class="id-articulo">(texto libre)</span>`;
            li.addEventListener('click', function() {
                hidden.value = valor;
                dropdown.classList.remove('visible');
            });
            dropdown.appendChild(li);
        } else {
            coincidencias.forEach(dir => {
                const li = document.createElement('li');
                li.innerHTML = `${escapeHtml(dir.nombre)} <span class="id-articulo">${escapeHtml(dir.tipo || '')}</span>`;
                li.addEventListener('click', function() {
                    input.value = dir.nombre;
                    hidden.value = dir.nombre;
                    dropdown.classList.remove('visible');
                });
                dropdown.appendChild(li);
            });

            const liLibre = document.createElement('li');
            liLibre.innerHTML = `Usar: <strong>${escapeHtml(valor)}</strong> <span class="id-articulo">(texto libre)</span>`;
            liLibre.addEventListener('click', function() {
                hidden.value = valor;
                dropdown.classList.remove('visible');
            });
            dropdown.appendChild(liLibre);
        }

        dropdown.classList.add('visible');
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.destino-input-wrapper')) {
            dropdown.classList.remove('visible');
        }
    });
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
        if (input) input.value = `${item.articulo} (ID ${item.id})`;
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
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${error.message}</p>`;
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
    if (!pedidoSeleccionado) { if (seccion) seccion.hidden = true; contenedor.innerHTML = '<p class="placeholder">Seleccioná un pedido para ver el detalle.</p>'; return; }
    const p = pedidosCache.find(x => String(x.id) === String(pedidoSeleccionado));
    if (!p) { if (seccion) seccion.hidden = true; return; }
    if (seccion) seccion.hidden = false;
    const filas = (p.items || []).map(it => `<tr><td>${escapeHtml(it.articuloNombre)}</td><td><span class="badge-categoria">ID ${escapeHtml(it.articuloId)}</span></td><td style="font-weight:700;">${Number(it.cantidad) || 0}</td></tr>`).join('') || '<tr><td colspan="3"><p class="placeholder">Sin artículos.</p></td></tr>';
    const esPendiente = p.estado === 'Pendiente';
    const fechaTxt = p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR') : '—';
    const estadoClase = normalizarTexto(p.estado || '').replace(/\s+/g, '-');
    contenedor.innerHTML = `<div class="detalle-pedido-header"><div class="detalle-pedido-meta"><div><span class="label">Pedido</span><span class="valor">#${escapeHtml(p.id)}</span></div><div><span class="label">Dirección</span><span class="valor">${escapeHtml(p.direccion)}</span></div><div><span class="label">Solicitado por</span><span class="valor">${escapeHtml(p.director || '—')}</span></div><div><span class="label">Referencia</span><span class="valor">${escapeHtml(p.referencia || '—')}</span></div><div><span class="label">Fecha</span><span class="valor">${fechaTxt}</span></div><div><span class="label">Estado</span><span class="valor"><span class="badge-estado ${estadoClase}">${escapeHtml(p.estado)}</span></span></div></div><div class="detalle-pedido-acciones">${esPendiente ? '<button class="btn-accion-pedido" data-accion="editar">✏️ Editar</button><button class="btn-accion-pedido peligro" data-accion="cancelar">🗑️ Cancelar</button><button class="btn-accion-pedido primario" data-accion="confirmar">✅ Confirmar pedido</button>' : '<button class="btn-accion-pedido primario" data-accion="pdf">📄 Descargar PDF</button>'}</div></div><div class="inventario-tabla-wrapper"><table class="inventario-tabla"><thead><tr><th>Artículo</th><th>ID</th><th>Cantidad</th></tr></thead><tbody>${filas}</tbody></table></div>`;
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

            mostrarCartel('✅', 'PEDIDO CONFIRMADO',
                `Remito ${r.nroRemito} generado`, 'pedido-ok');

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

function renderizarCarrito() {
    const contenedor = document.getElementById('carritoPedido');
    const totalEl = document.getElementById('carritoTotal');
    if (!contenedor) return;
    if (carritoPedido.length === 0) { contenedor.innerHTML = '<p class="placeholder">El carrito está vacío. Buscá un artículo arriba para agregarlo.</p>'; if (totalEl) totalEl.textContent = '0'; return; }
    contenedor.innerHTML = carritoPedido.map((it, idx) => {
        const articulo = articulos.find(a => String(a.id) === String(it.id));
        const emoji = (articulo?.imagen || '').trim() || '📦';
        const stock = articulo ? obtenerStock(articulo) : '—';
        return `<div class="carrito-item"><span class="carrito-item-emoji" aria-hidden="true">${escapeHtml(emoji)}</span><div><span class="carrito-item-nombre">${escapeHtml(it.nombre)}</span><span class="carrito-item-stock">Stock: ${stock}</span></div><div class="carrito-stepper" aria-label="Cantidad de ${escapeHtml(it.nombre)}"><button type="button" class="carrito-btn-stepper" data-step="menos" data-idx="${idx}" aria-label="Restar una unidad">−</button><span class="carrito-cantidad-valor">${Number(it.cantidad) || 1}</span><button type="button" class="carrito-btn-stepper" data-step="mas" data-idx="${idx}" aria-label="Agregar una unidad">+</button></div><button type="button" class="carrito-btn-quitar" data-quitar="${idx}" title="Quitar artículo" aria-label="Quitar ${escapeHtml(it.nombre)}">✕</button></div>`;
    }).join('');
    actualizarTotalCarrito();
    contenedor.querySelectorAll('.carrito-btn-stepper').forEach(btn => btn.addEventListener('click', () => { const idx = Number(btn.dataset.idx); if (btn.dataset.step === 'mas') incrementarCantidadCarrito(idx); else decrementarCantidadCarrito(idx); }));
    contenedor.querySelectorAll('[data-quitar]').forEach(btn => btn.addEventListener('click', () => { carritoPedido.splice(Number(btn.dataset.quitar), 1); renderizarCarrito(); }));
}

function configurarPedidos() {
    document.querySelectorAll('[data-tab-pedidos]').forEach(btn => btn.addEventListener('click', () => cambiarTabPedidos(btn.dataset.tabPedidos)));
    document.querySelectorAll('[data-filtro-fecha]').forEach(btn => btn.addEventListener('click', () => { filtroFechaSeguimiento = btn.dataset.filtroFecha; document.querySelectorAll('[data-filtro-fecha]').forEach(chip => chip.classList.toggle('activo', chip === btn)); renderizarHojaSeguimiento(); }));
    document.querySelectorAll('[data-filtro-estado]').forEach(btn => btn.addEventListener('click', () => { filtroEstadoSeguimiento = filtroEstadoSeguimiento === btn.dataset.filtroEstado ? 'todos' : btn.dataset.filtroEstado; document.querySelectorAll('[data-filtro-estado]').forEach(chip => chip.classList.toggle('activo', chip.dataset.filtroEstado === filtroEstadoSeguimiento)); renderizarHojaSeguimiento(); }));
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

    if (!direccion) { mostrarToast('Seleccioná una dirección', 'error'); return; }
    if (carritoPedido.length === 0) { mostrarToast('El carrito está vacío', 'error'); return; }

    const btn = document.getElementById('btnConfirmarPedido');
    const txtOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const items = carritoPedido.map(it => ({
            id: it.id,
            nombre: it.nombre,
            categoria: it.categoria,
            cantidad: it.cantidad
        }));

        let r;
        if (modoEdicionPedido) {
            r = await apiService.post({
                accion: 'editarPedido',
                id: modoEdicionPedido,
                direccion, director, referencia, items
            });
        } else {
            r = await apiService.post({
                accion: 'crearPedido',
                direccion, director, referencia, items
            });
        }

        if (!r || r.exito === false) throw new Error(r?.error || 'Error');

        mostrarToast(modoEdicionPedido ? 'Pedido actualizado' : 'Pedido creado', 'exito');

        carritoPedido = [];
        modoEdicionPedido = null;
        document.getElementById('formPedido').reset();
        document.getElementById('direccionPedido').value = '';
        document.getElementById('directorPedido').value = '';
        document.getElementById('referenciaPedido').value = '';
        btn.textContent = 'Confirmar pedido';
        renderizarCarrito();

        await cargarListaPedidos();
    } catch (err) {
        mostrarToast('Error: ' + err.message, 'error');
        btn.textContent = txtOriginal;
    } finally {
        btn.disabled = false;
        if (modoEdicionPedido === null) btn.textContent = 'Confirmar pedido';
    }
}

function configurarBuscadorArticulosPedido() {
    const input = document.getElementById('inputArticuloPedido');
    const dropdown = document.getElementById('listaArticulosPedido');
    if (!input || !dropdown) return;

    input.addEventListener('focus', function() {
        if (this.value.trim().length >= 1) filtrar(this.value.trim());
    });

    input.addEventListener('input', function() {
        const val = this.value.trim();
        if (val.length >= 1) {
            filtrar(val);
            dropdown.classList.add('visible');
        } else {
            dropdown.classList.remove('visible');
        }
    });

    input.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('li');
        if (items.length === 0) return;

        let idx = Array.from(items).findIndex(li => li.classList.contains('seleccionado'));

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            idx = (idx + 1) % items.length;
            items.forEach((li, i) => li.classList.toggle('seleccionado', i === idx));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            idx = (idx - 1 + items.length) % items.length;
            items.forEach((li, i) => li.classList.toggle('seleccionado', i === idx));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (idx >= 0 && items[idx]) {
                items[idx].click();
            } else if (items.length > 0) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('visible');
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.carrito-section') &&
            !e.target.closest('.buscador-articulo-group')) {
            dropdown.classList.remove('visible');
        }
    });

    function filtrar(texto) {
        const termino = normalizarTexto(texto);
        const resultados = articulos.filter(item =>
            normalizarTexto(item.articulo).includes(termino) ||
            String(item.id).includes(termino)
        ).slice(0, 10);

        dropdown.innerHTML = '';

        if (resultados.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No se encontraron artículos';
            li.style.color = 'var(--text-muted)';
            li.style.fontStyle = 'italic';
            li.style.cursor = 'default';
            dropdown.appendChild(li);
            dropdown.classList.add('visible');
            return;
        }

        resultados.forEach(item => {
            const li = document.createElement('li');
            const stock = obtenerStock ? obtenerStock(item) : '—';
            li.innerHTML = `${escapeHtml(item.articulo)} <span class="id-articulo">ID ${escapeHtml(String(item.id))} · Stock ${stock}</span>`;
            li.addEventListener('click', function() {
                agregarAlCarrito(item);
                input.value = '';
                dropdown.classList.remove('visible');
            });
            dropdown.appendChild(li);
        });
        dropdown.classList.add('visible');
    }
}

function agregarAlCarrito(item) {
    const existente = carritoPedido.find(x => String(x.id) === String(item.id));
    if (existente) {
        existente.cantidad += 1;
    } else {
        carritoPedido.push({
            id: item.id,
            nombre: item.articulo,
            categoria: item.categoriaID || '',
            cantidad: 1
        });
    }
    renderizarCarrito();
}

function configurarBuscadorDireccionesPedido() {
    const input = document.getElementById('inputDireccionPedido');
    const hidden = document.getElementById('direccionPedido');
    const dropdown = document.getElementById('listaDireccionesPedido');
    if (!input || !hidden || !dropdown) return;

    input.addEventListener('input', function() {
        const val = this.value.trim();
        hidden.value = val;

        if (val.length < 1) {
            dropdown.classList.remove('visible');
            return;
        }

        const termino = normalizarTexto(val);
        const coincidencias = (direccionesOficiales || []).filter(d =>
            normalizarTexto(d.nombre).includes(termino)
        ).slice(0, 10);

        dropdown.innerHTML = '';

        if (coincidencias.length === 0) {
            const li = document.createElement('li');
            li.innerHTML = `Usar: <strong>${escapeHtml(val)}</strong> <span class="id-articulo">(texto libre)</span>`;
            li.addEventListener('click', function() {
                hidden.value = val;
                dropdown.classList.remove('visible');
            });
            dropdown.appendChild(li);
        } else {
            coincidencias.forEach(dir => {
                const li = document.createElement('li');
                li.innerHTML = `${escapeHtml(dir.nombre)} <span class="id-articulo">${escapeHtml(dir.tipo || '')}</span>`;
                li.addEventListener('click', function() {
                    input.value = dir.nombre;
                    hidden.value = dir.nombre;
                    dropdown.classList.remove('visible');
                });
                dropdown.appendChild(li);
            });
        }

        dropdown.classList.add('visible');
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('#inputDireccionPedido')?.parentElement) {
            dropdown.classList.remove('visible');
        }
    });
}

// ============================================================
// 19. PEDIDOS — Pestañas, seguimiento y cantidades del carrito
// ============================================================
let filtroFechaSeguimiento = 'hoy';
let filtroEstadoSeguimiento = 'todos';

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
    if (total) total.textContent = carritoPedido.reduce((suma, item) => suma + (Number(item.cantidad) || 0), 0);
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

function filtrarPedidosPorFecha(pedidos, filtro) {
    const lista = Array.isArray(pedidos) ? pedidos : [];
    if (filtro === 'todos') return lista;
    const hoy = inicioDiaPedido();
    if (filtro === 'hoy') return lista.filter(p => { const fecha = fechaLocalPedido(p); return fecha && fecha.getTime() === hoy.getTime(); });
    if (filtro === 'semana') {
        const lunes = new Date(hoy);
        lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
        return lista.filter(p => { const fecha = fechaLocalPedido(p); return fecha && fecha >= lunes && fecha <= hoy; });
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

function agruparPedidosPorDia(pedidos) {
    const grupos = new Map();
    [...(Array.isArray(pedidos) ? pedidos : [])].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0)).forEach(p => {
        const fecha = fechaLocalPedido(p);
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
    const filtrados = filtrarPedidosPorEstado(porFecha, filtroEstadoSeguimiento);
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
// 24. INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    inicializarTema();

    configurarNavegacion();
    configurarMenu();
    configurarBuscador();
    configurarMovimientos();
    configurarModalDireccion();
    configurarModalArticulo();

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
    await cargarUltimasEntradas();
    await cargarUltimasSalidas();

    const hash = window.location.hash.replace('#', '');
    if (hash === 'direcciones') cargarDirecciones();
    if (hash === 'dashboard') cargarDashboard();
});
