/**
 * ============================================================
 * INVENTARIO PRO - SCRIPT PRINCIPAL
 * ============================================================
 */

// ============================================================
// 0. TOAST - Notificación flotante (FUNCIÓN GLOBAL)
// ============================================================
// Se usa desde cualquier acción de la app:
//   mostrarToast('Mensaje de éxito')            → verde
//   mostrarToast('Mensaje de error', 'error')   → rojo
// Debe estar FUERA del DOMContentLoaded para ser accesible
// desde cualquier función.
function mostrarToast(mensaje, tipo = 'exito') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // Actualizar mensaje e ícono
    toast.querySelector('.toast-mensaje').textContent = mensaje;
    toast.querySelector('.toast-icono').textContent = tipo === 'error' ? '✕' : '✓';

    // Cambiar estilo según tipo
    toast.classList.toggle('toast-error', tipo === 'error');

    // Mostrar
    toast.classList.add('visible');

    // Ocultar después de 3 segundos
    // (el timeout se guarda en window para que toasts seguidos
    // no se superpongan: se reinicia el contador)
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

// ============================================================
// 1. ESTADO GLOBAL
// ============================================================
let articulos = [];
let filtroActivo = "todos";
let movimientos = [];

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
    if (nombre === 'movimientos') cargarMovimientos();

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
                <td><span class="badge-categoria">${item.categoriaID || '—'}</span></td>
                <td class="td-centrado">—</td>
                <td class="td-centrado">—</td>
                <td>
                    <div class="acciones-celda">
                        <button class="btn-accion btn-menu" type="button" data-id="${item.id}" aria-label="Opciones" title="Opciones">
                            ➡️
                        </button>
                        <div class="menu-desplegable" data-id="${item.id}">
                            <button class="menu-item" data-action="detalles" data-id="${item.id}">
                                <span class="menu-item-icono">👁️</span>
                                <span class="menu-item-texto">Detalles</span>
                            </button>
                            <button class="menu-item" data-action="relevamiento" data-id="${item.id}">
                                <span class="menu-item-icono">✏️</span>
                                <span class="menu-item-texto">Relevamiento</span>
                            </button>
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
                        <th>Ubicación</th>
                        <th>Tipo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;

    // Listener para los botones de menú
    contenedor.querySelectorAll('.btn-menu').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const menu = contenedor.querySelector(`.menu-desplegable[data-id="${id}"]`);

            // Cerrar todos los demás menús
            contenedor.querySelectorAll('.menu-desplegable').forEach(m => {
                if (m !== menu) m.classList.remove('visible');
            });

            // Toggle este menú
            menu.classList.toggle('visible');
        });
    });

    // Listener para las opciones del menú
    contenedor.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const accion = this.dataset.action;
            const id = this.dataset.id;

            // Cerrar el menú
            contenedor.querySelectorAll('.menu-desplegable').forEach(m => m.classList.remove('visible'));

            // Ejecutar la acción
            if (accion === 'relevamiento') {
                irARelevamientoConArticulo(id);
            } else if (accion === 'detalles') {
                mostrarToast('Próximamente: página de detalles', 'exito');
            }
        });
    });

    // Cerrar menú al hacer clic afuera
    document.addEventListener('click', function() {
        document.querySelectorAll('.menu-desplegable').forEach(m => m.classList.remove('visible'));
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
                <span class="articulo-nombre">${articulo.articulo}</span>
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
            li.innerHTML = `${item.articulo} <span class="id-articulo">ID ${item.id}</span>`;
            li.dataset.id = item.id;
            li.addEventListener("click", function() {
                input.value = `${item.articulo} (ID ${item.id})`;
                hidden.value = item.id;
                dropdown.classList.remove("visible");
                mostrarVistaPrevia(item.id, previewId);
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

/**
 * ------------------------------------------------------------
 * Buscador específico para Relevamiento
 * ------------------------------------------------------------
 * Igual al buscador genérico, pero al seleccionar un artículo:
 * - Muestra el stock del sistema en el input readonly.
 * - Muestra la vista previa del artículo.
 * - Recalcula la diferencia.
 * ------------------------------------------------------------
 */
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
            li.innerHTML = `${item.articulo} <span class="id-articulo">ID ${item.id}</span>`;
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

    // Navegación con teclado
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
// 9. REGISTRAR ENTRADA
// ============================================================
async function registrarEntrada(e) {
    e.preventDefault();
    const id = document.getElementById("articuloId").value;
    const cantidad = parseInt(document.getElementById("cantidad").value);
    const proveedor = document.getElementById("proveedor").value.trim();
    const factura = document.getElementById("factura").value.trim();
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
            tipoCompra: '',
            observacion: observaciones,
            fecha: fecha
        };
        const resultado = await apiService.post(payload);
        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error desconocido');
        }
        mostrarToast('Entrada registrada correctamente', 'exito');
        document.getElementById('formEntrada').reset();
        document.getElementById('articuloId').value = '';
        document.getElementById('vistaPreviaContenido').innerHTML =
            '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
        document.getElementById('registradoPor').value = 'Samuel Steves';
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
    const cantidad = parseInt(document.getElementById("cantidadSalida").value);
    const destino = document.getElementById("destinoSalida").value.trim();
    const factura = document.getElementById("facturaSalida").value.trim();
    const observaciones = document.getElementById("observacionesSalida").value.trim();
    const fecha = document.getElementById("fechaSalida").value;

    if (!id) { mostrarToast('Seleccioná un artículo', 'error'); return; }
    if (isNaN(cantidad) || cantidad <= 0) { mostrarToast('Cantidad inválida', 'error'); return; }
    if (!destino) { mostrarToast('Ingresá el destino o dirección', 'error'); return; }

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
        mostrarToast('Salida registrada correctamente', 'exito');
        document.getElementById('formSalida').reset();
        document.getElementById('articuloIdSalida').value = '';
        document.getElementById('vistaPreviaContenidoSalida').innerHTML =
            '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';
        document.getElementById('registradoPorSalida').value = 'Samuel Steves';
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
                    <div class="item-nombre">${nombre}</div>
                    <div class="item-detalle">${fecha} · ${destino} ${factura ? '· '+factura : ''}</div>
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
// 12. MOVIMIENTOS - Carga y filtros
// ============================================================
async function cargarMovimientos() {
    const contenedor = document.getElementById('contenedorMovimientos');
    if (!contenedor) return;

    contenedor.innerHTML = '<p class="placeholder">Cargando movimientos...</p>';

    try {
        const resultado = await apiService.post({ accion: 'listarMovimientos' });
        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error al obtener movimientos');
        }
        movimientos = Array.isArray(resultado) ? resultado : [];
        renderizarMovimientos(movimientos);
    } catch (error) {
        console.error('Error cargando movimientos:', error);
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${error.message}</p>`;
    }
}

function renderizarMovimientos(datos) {
    const contenedor = document.getElementById('contenedorMovimientos');
    if (!contenedor) return;

    // Aplicar filtros
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

    // Ordenar del más reciente al más viejo
    filtrados.sort((a, b) => {
        const fa = a.fecha ? new Date(a.fecha) : new Date(0);
        const fb = b.fecha ? new Date(b.fecha) : new Date(0);
        return fb - fa;
    });

    if (filtrados.length === 0) {
        contenedor.innerHTML = '<p class="placeholder">No hay movimientos para mostrar.</p>';
        return;
    }

    let filas = '';
    filtrados.forEach(m => {
        const fecha = m.fecha ? new Date(m.fecha).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }) : '—';

        const esEntrada = m.tipo === 'Entrada';
        const tipoClase = esEntrada ? 'badge-disponible' : 'badge-sin-stock';
        const tipoTexto = m.tipo || '—';

        // Origen/Destino según tipo
        const origenDestino = esEntrada
            ? (m.proveedor || '—')
            : (m.destino || m.proveedor || '—');

        // Número de nota/factura/orden
        const nota = m.ordenCompra || m.factura || '—';

        // Detalle: observación
        const detalle = m.observacion || '—';

        // Cantidad con signo (según tipo)
        let cantTexto = '';
        let cantColor = '#dc2626';

        if (m.tipo === 'Entrada') {
            cantTexto = `+${m.cantidad}`;
            cantColor = '#16a34a';
        } else if (m.tipo === 'Salida') {
            cantTexto = `-${m.cantidad}`;
            cantColor = '#dc2626';
        } else if (m.tipo === 'Relevamiento') {
            // El relevamiento ya viene con signo (positivo o negativo)
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
                <td><strong>${m.nombre || m.idArticulo || '—'}</strong></td>
                <td style="font-weight:700;color:${cantColor};">${cantTexto}</td>
                <td>${origenDestino}</td>
                <td>${nota}${detalle !== '—' ? ' · ' + detalle : ''}</td>
            </tr>
        `;
    });

    contenedor.innerHTML = `
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
    `;
}

function configurarMovimientos() {
    const inputBusqueda = document.getElementById('inputBusquedaMov');
    const selectTipo = document.getElementById('selectTipoMov');
    const btnActualizar = document.getElementById('btnActualizarMov');

    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', () => renderizarMovimientos(movimientos));
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
// 15. REGISTRAR RELEVAMIENTO
// ============================================================
async function registrarRelevamiento(e) {
    e.preventDefault();

    const id = document.getElementById("articuloIdRelevamiento").value;
    const stockReal = parseFloat(document.getElementById("stockReal").value);
    const observaciones = document.getElementById("observacionesRelevamiento").value.trim();
    const fecha = new Date().toISOString().split('T')[0];

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

        // Toast según diferencia
        const dif = resultado.diferencia || 0;
        if (dif === 0) {
            mostrarToast('El stock ya estaba correcto. Sin cambios.', 'exito');
        } else {
            const signo = dif > 0 ? '+' : '';
            mostrarToast(`Relevamiento registrado. Ajuste: ${signo}${dif}`, 'exito');
        }

        // Resetear formulario
        document.getElementById('formRelevamiento').reset();
        document.getElementById('articuloIdRelevamiento').value = '';
        document.getElementById('stockSistema').value = '—';
        document.getElementById('diferencia').value = '—';
        document.getElementById('registradoPorRelevamiento').value = 'Samuel Steves';
        document.getElementById('vistaPreviaContenidoRelevamiento').innerHTML =
            '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';

        // Recargar artículos y limpiar caché de movimientos
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

/**
 * ------------------------------------------------------------
 * Calcular diferencia en vivo (mientras el usuario escribe)
 * ------------------------------------------------------------
 */
function actualizarDiferencia() {
    const stockSistemaInput = document.getElementById('stockSistema');
    const stockRealInput = document.getElementById('stockReal');
    const diferenciaInput = document.getElementById('diferencia');
    if (!stockSistemaInput || !stockRealInput || !diferenciaInput) return;

    const sistema = parseFloat(stockSistemaInput.value);
    const real = parseFloat(stockRealInput.value);

    // Si alguno no es número, mostrar "—"
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

/**
 * ------------------------------------------------------------
 * Mostrar stock del sistema al seleccionar un artículo
 * ------------------------------------------------------------
 */
function mostrarStockSistemaRelevamiento(id) {
    const item = articulos.find(a => String(a.id) === String(id));
    if (!item) return;

    const stock = obtenerStock(item);
    const input = document.getElementById('stockSistema');
    if (input) input.value = stock;

    // Vista previa
    mostrarVistaPrevia(id, 'vistaPreviaContenidoRelevamiento');

    // Recalcular diferencia (por si ya hay un valor escrito)
    actualizarDiferencia();
}

/**
 * ------------------------------------------------------------
 * Ir a Relevamiento con un artículo pre-seleccionado
 * ------------------------------------------------------------
 * Se llama desde el botón ✏️ de la tabla de Inventario General.
 * Navega a la página Relevamiento y pre-carga el artículo.
 * ------------------------------------------------------------
 */
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
// 14. INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    configurarNavegacion();
    configurarMenu();

    const fechaEntrada = document.getElementById('fechaEntrada');
    if (fechaEntrada) fechaEntrada.value = new Date().toISOString().split('T')[0];
    const fechaSalida = document.getElementById('fechaSalida');
    if (fechaSalida) fechaSalida.value = new Date().toISOString().split('T')[0];

    const fechaHoy = new Date().toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
    });
    const fechaEl = document.getElementById('fechaActual');
    if (fechaEl) fechaEl.textContent = fechaHoy;
    const fechaElSalida = document.getElementById('fechaActualSalidas');
    if (fechaElSalida) fechaElSalida.textContent = fechaHoy;

    cargarArticulos();

    configurarBuscadorDropdown('inputArticulo', 'articuloId', 'listaArticulosCustom', 'vistaPreviaContenido');
    configurarBuscadorDropdown('inputArticuloSalida', 'articuloIdSalida', 'listaArticulosCustomSalida', 'vistaPreviaContenidoSalida');

    // Buscador de artículos para Relevamiento
    configurarBuscadorDropdownRelevamiento();

    // Evento del formulario de Relevamiento
    const formRelevamiento = document.getElementById('formRelevamiento');
    if (formRelevamiento) formRelevamiento.addEventListener('submit', registrarRelevamiento);

    // Evento en vivo para calcular la diferencia
    const stockRealInput = document.getElementById('stockReal');
    if (stockRealInput) stockRealInput.addEventListener('input', actualizarDiferencia);

    // Fecha de relevamiento
    const fechaElRel = document.getElementById('fechaActualRelevamiento');
    if (fechaElRel) fechaElRel.textContent = fechaHoy;

    configurarBuscador();
    configurarMovimientos();

    const formEntrada = document.getElementById('formEntrada');
    if (formEntrada) formEntrada.addEventListener('submit', registrarEntrada);
    const formSalida = document.getElementById('formSalida');
    if (formSalida) formSalida.addEventListener('submit', registrarSalida);

    cargarUltimasEntradas();
    cargarUltimasSalidas();

    console.log('✅ InventarioPro - Aplicación inicializada.');
});