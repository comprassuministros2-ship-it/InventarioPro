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
    const mensajeEl = toast.querySelector('.toast-mensaje');
    const iconoEl = toast.querySelector('.toast-icono');
    if (!mensajeEl || !iconoEl) return;
    mensajeEl.textContent = mensaje;
    iconoEl.textContent = tipo === 'error' ? '✕' : '✓';

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
                <td><span class="badge-categoria">${escapeHtml(item.categoriaID || '—')}</span></td>
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
    // Validar y tomar el destino (buscador + texto libre)
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
// 12. MOVIMIENTOS - Carga con caché y render por lotes
// ============================================================
// OPTIMIZACIÓN DE RENDIMIENTO (100% frontend, sin cambios de API):
//   a) CACHÉ EN MEMORIA: si `movimientos` ya tiene datos, se renderiza
//      al instante sin volver a pedir al backend. La invalidación usa
//      el mecanismo que ya existía: `movimientos = []` después de
//      registrar un movimiento, y el botón 🔄 Actualizar.
//   b) RENDER POR LOTES: se muestran de a MOV_POR_LOTE filas y un
//      botón "Ver más" agrega el siguiente lote sin re-render total.
//   c) TIMESTAMP PRECOMPUTADO: cada movimiento guarda `_ts` una sola
//      vez al llegar del backend (el orden por fecha deja de crear
//      objetos Date en cada comparación).
//   d) DEBOUNCE EN BÚSQUEDA: evita re-renderizar en cada tecla.
// ============================================================

// Cantidad de filas por lote (cambiar a 200 acá si se prefiere)
const MOV_POR_LOTE = 100;

// Copia filtrada + ordenada del último render (para el botón "Ver más")
let movimientosFiltrados = [];

// Cantidad de filas mostradas actualmente
let movimientosVisibles = 0;

/**
 * ------------------------------------------------------------
 * Cargar movimientos (con caché)
 * ------------------------------------------------------------
 * Si hay datos en memoria, renderiza directo (instantáneo).
 * Solo hace fetch la primera vez, después de un registro
 * (que limpia `movimientos`) o al presionar Actualizar.
 * ------------------------------------------------------------
 */
async function cargarMovimientos() {
    const contenedor = document.getElementById('contenedorMovimientos');
    if (!contenedor) return;

    // CACHÉ: datos ya en memoria → render al instante, sin fetch
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

        // Precomputar timestamps una sola vez (acelera el orden posterior)
        prepararTimestampsMovimientos(movimientos);

        renderizarMovimientos(movimientos);
    } catch (error) {
        console.error('Error cargando movimientos:', error);
        contenedor.innerHTML = `<p class="placeholder">⚠️ Error al cargar: ${error.message}</p>`;
    }
}

/**
 * ------------------------------------------------------------
 * Precomputar timestamp de cada movimiento (una sola vez)
 * ------------------------------------------------------------
 * Guarda `_ts` (milisegundos) para que el orden por fecha no
 * tenga que crear objetos Date en cada comparación del sort.
 * ------------------------------------------------------------
 */
function prepararTimestampsMovimientos(datos) {
    datos.forEach(m => {
        m._ts = m.fecha ? new Date(m.fecha).getTime() : 0;
    });
}

/**
 * ------------------------------------------------------------
 * Renderizar movimientos (filtros + orden + primer lote)
 * ------------------------------------------------------------
 * Filtra y ordena TODO en memoria (rápido), pero solo renderiza
 * el primer lote de MOV_POR_LOTE filas. Si hay más, agrega el
 * contador y el botón "Ver más".
 * ------------------------------------------------------------
 */
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
    // (usa `_ts` precomputado para no parsear fechas por comparación)
    filtrados = [...filtrados].sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0));

    if (filtrados.length === 0) {
        movimientosFiltrados = [];
        movimientosVisibles = 0;
        contenedor.innerHTML = '<p class="placeholder">No hay movimientos para mostrar.</p>';
        return;
    }

    // Guardar para el botón "Ver más" y calcular el primer lote
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

    // Listener del botón "Ver más" (solo si existe)
    const btnVerMas = document.getElementById('btnVerMasMov');
    if (btnVerMas) {
        btnVerMas.addEventListener('click', verMasMovimientos);
    }
}

/**
 * ------------------------------------------------------------
 * Generar HTML de filas de movimientos
 * ------------------------------------------------------------
 * Extraído de renderizarMovimientos para reutilizarlo tanto en
 * el render inicial como al agregar el siguiente lote.
 * La lógica de cada fila es idéntica a la original (incluye el
 * manejo de signo para Entrada / Salida / Relevamiento).
 * ------------------------------------------------------------
 */
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
                <td><strong>${escapeHtml(m.nombre || m.idArticulo || '—')}</strong></td>
                <td style="font-weight:700;color:${cantColor};">${cantTexto}</td>
                <td>${escapeHtml(origenDestino)}</td>
                <td>${escapeHtml(nota)}${detalle !== '—' ? ' · ' + escapeHtml(detalle) : ''}</td>
            </tr>
        `;
    });
    return filas;
}

/**
 * ------------------------------------------------------------
 * "Ver más": agrega el siguiente lote al final de la tabla
 * ------------------------------------------------------------
 * No re-renderiza la tabla completa: solo agrega filas al tbody
 * existente (insertAdjacentHTML, mucho más barato) y actualiza
 * el contador y el botón.
 * ------------------------------------------------------------
 */
function verMasMovimientos() {
    const contenedor = document.getElementById('contenedorMovimientos');
    if (!contenedor) return;

    const total = movimientosFiltrados.length;

    // Siguiente lote de filas
    const nuevos = movimientosFiltrados.slice(movimientosVisibles, movimientosVisibles + MOV_POR_LOTE);
    if (nuevos.length === 0) return;

    const tbody = contenedor.querySelector('.inventario-tabla tbody');
    if (!tbody) return;

    // Agregar las filas nuevas al final de la tabla existente
    tbody.insertAdjacentHTML('beforeend', generarFilasMovimientos(nuevos));
    movimientosVisibles += nuevos.length;

    // Actualizar el contador
    const contador = contenedor.querySelector('.placeholder');
    if (contador) contador.textContent = `Mostrando ${movimientosVisibles} de ${total} movimientos`;

    // Actualizar o quitar el botón "Ver más"
    const btn = document.getElementById('btnVerMasMov');
    if (btn) {
        if (movimientosVisibles >= total) {
            btn.closest('div').remove();
        } else {
            btn.textContent = `Ver más (${total - movimientosVisibles} restantes)`;
        }
    }
}

/**
 * ------------------------------------------------------------
 * Configurar listeners de la página Movimientos
 * ------------------------------------------------------------
 * La búsqueda usa debounce de 300ms: el re-render solo se
 * dispara cuando el usuario deja de escribir, no en cada tecla.
 * ------------------------------------------------------------
 */
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
}// ============================================================
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
// 16. DIRECCIONES - Ranking y detalle (datos reales)
// ============================================================

/**
 * ------------------------------------------------------------
 * Cargar Direcciones (datos reales desde el backend)
 * ------------------------------------------------------------
 */
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

    // Listener: al hacer clic en una fila, mostrar el detalle
    contenedor.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', function() {
            const nombre = this.dataset.direccion;
            const dir = direccionesReales.find(d => d.direccion === nombre);
            if (!dir) return;

            // Marcar fila activa
            contenedor.querySelectorAll('tbody tr').forEach(r => r.classList.remove('activo'));
            this.classList.add('activo');

            // Mostrar detalle (adaptar el formato que espera mostrarDetalleDireccion)
            mostrarDetalleDireccion({
                nombre: dir.direccion,
                total: dir.total,
                articulos: dir.articulos
            });
        });
    });

    // Mostrar el detalle de la primera dirección por defecto
    const primera = direccionesReales[0];
    if (primera) {
        // Marcar la primera fila como activa
        const primeraFila = contenedor.querySelector('tbody tr');
        if (primeraFila) primeraFila.classList.add('activo');

        mostrarDetalleDireccion({
            nombre: primera.direccion,
            total: primera.total,
            articulos: primera.articulos
        });
    }

    // Fecha
    const fechaEl = document.getElementById('fechaActualDirecciones');
    if (fechaEl) {
        fechaEl.textContent = new Date().toLocaleDateString('es-AR', {
            weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
        });
    }
}
/**
 * ------------------------------------------------------------
 * Mostrar el detalle de una dirección (artículos entregados)
 * ------------------------------------------------------------
 * Recibe: { nombre, total, articulos: [{articulo, categoria, cantidad}] }
 * ------------------------------------------------------------
 */
function mostrarDetalleDireccion(dir) {
    const contenedor = document.getElementById('contenedorDetalleDirecciones');
    if (!contenedor || !dir) return;

    // Si no hay artículos, mostrar mensaje
    if (!dir.articulos || dir.articulos.length === 0) {
        contenedor.innerHTML = '<p class="placeholder">Esta dirección no tiene artículos entregados.</p>';
        return;
    }

    let filas = '';
    dir.articulos.forEach(a => {
        filas += `
            <tr>
                <td><strong>${escapeHtml(a.articulo)}</strong></td>
                <td><span class="badge-categoria">${escapeHtml(a.categoria)}</span></td>
                <td style="font-weight: 700; color: var(--accent);">${a.cantidad}</td>
            </tr>
        `;
    });

    contenedor.innerHTML = `
        <div class="detalle-direccion">
            <div class="detalle-direccion-header activo">
                <div class="detalle-direccion-nombre">
                    <span class="detalle-direccion-flecha">▶</span>
                    ${escapeHtml(dir.nombre)}
                </div>
                <div class="detalle-direccion-total">
                    ${dir.total} unidades entregadas
                </div>
            </div>
            <div class="detalle-direccion-body visible">
                <table class="detalle-articulo-tabla">
                    <thead>
                        <tr>
                            <th>Artículo</th>
                            <th>Categoría</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        </div>
    `;
}
// ============================================================
// 17. SALIDAS - Buscador de direcciones + modal nueva dirección
// ============================================================

// Estado global
let direccionesOficiales = [];

/**
 * ------------------------------------------------------------
 * Cargar la lista de direcciones oficiales desde el backend
 * ------------------------------------------------------------
 */
async function cargarDireccionesOficiales() {
    try {
        const resultado = await apiService.post({ accion: 'listarDirecciones' });
        if (resultado && resultado.exito === false) {
            throw new Error(resultado.error || 'Error al listar direcciones');
        }
        direccionesOficiales = Array.isArray(resultado) ? resultado : [];
    } catch (error) {
        console.error('Error cargando direcciones:', error);
        direccionesOficiales = [];
    }
}

/**
 * ------------------------------------------------------------
 * Configurar el buscador de destino para el formulario de Salidas
 * ------------------------------------------------------------
 */
function configurarBuscadorDestino() {
    const input = document.getElementById('inputDestinoSalida');
    const hidden = document.getElementById('destinoSalida');
    const dropdown = document.getElementById('listaDestinosCustom');
    if (!input || !hidden || !dropdown) return;

    // Al hacer foco: mostrar todas las direcciones
    input.addEventListener('focus', function() {
        filtrarDirecciones(this.value.trim());
        dropdown.classList.add('visible');
    });

    // Al escribir: filtrar
    input.addEventListener('input', function() {
        const valor = this.value.trim();
        filtrarDirecciones(valor);
        dropdown.classList.add('visible');
        // Al cambiar el texto, limpiar el hidden (por si era una selección previa)
        hidden.value = '';
    });

    // Cerrar al hacer clic afuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.destino-wrapper')) {
            dropdown.classList.remove('visible');
        }
    });

    // Navegación con teclado
    let selectedIndex = -1;
    input.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('li');
        if (items.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % items.length;
            items.forEach((li, i) => li.classList.toggle('seleccionado', i === selectedIndex));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + items.length) % items.length;
            items.forEach((li, i) => li.classList.toggle('seleccionado', i === selectedIndex));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) items[selectedIndex].click();
        }
    });
}

/**
 * ------------------------------------------------------------
 * Filtrar direcciones y mostrar en el dropdown
 * ------------------------------------------------------------
 */
function filtrarDirecciones(texto) {
    const dropdown = document.getElementById('listaDestinosCustom');
    if (!dropdown) return;

    const termino = normalizarTexto(texto);

    const resultados = direccionesOficiales.filter(dir => {
        if (!termino) return true;
        const campos = [dir.nombre, dir.tipo, dir.dependenciaSuperior].filter(Boolean);
        return campos.some(c => normalizarTexto(c).includes(termino));
    });

    dropdown.innerHTML = '';

    if (resultados.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No se encontraron direcciones. Usá "+ Nueva" para agregar una.';
        li.style.color = 'var(--text-muted)';
        li.style.fontStyle = 'italic';
        li.style.cursor = 'default';
        dropdown.appendChild(li);
        dropdown.classList.add('visible');
        return;
    }

    resultados.forEach(dir => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${dir.nombre}
            <span class="id-articulo">${dir.tipo || ''}</span>
        `;
        li.dataset.nombre = dir.nombre;
        li.addEventListener('click', function() {
            inputDestinoSeleccionado(dir.nombre);
        });
        dropdown.appendChild(li);
    });

    dropdown.classList.add('visible');
}

/**
 * ------------------------------------------------------------
 * Al elegir una dirección del dropdown
 * ------------------------------------------------------------
 */
function inputDestinoSeleccionado(nombre) {
    const input = document.getElementById('inputDestinoSalida');
    const hidden = document.getElementById('destinoSalida');
    const dropdown = document.getElementById('listaDestinosCustom');

    if (input) input.value = nombre;
    if (hidden) hidden.value = nombre;
    if (dropdown) dropdown.classList.remove('visible');
}

/**
 * ------------------------------------------------------------
 * Configurar el modal "Agregar nueva dirección"
 * ------------------------------------------------------------
 */
function configurarModalNuevaDireccion() {
    const btnAbrir = document.getElementById('btnAgregarDireccion');
    const modal = document.getElementById('modalNuevaDireccion');
    const btnCerrar = document.getElementById('cerrarModalDireccion');
    const btnCancelar = document.getElementById('cancelarModalDireccion');
    const btnGuardar = document.getElementById('guardarModalDireccion');

    if (!btnAbrir || !modal) return;

    // Abrir modal
    btnAbrir.addEventListener('click', () => {
        document.getElementById('nuevaDireccionNombre').value = '';
        document.getElementById('nuevaDireccionTipo').value = 'Dirección';
        document.getElementById('nuevaDireccionSuperior').value = '';
        document.getElementById('modalDireccionError').textContent = '';
        modal.style.display = 'flex';
        setTimeout(() => document.getElementById('nuevaDireccionNombre').focus(), 100);
    });

    // Cerrar modal
    const cerrar = () => { modal.style.display = 'none'; };
    btnCerrar.addEventListener('click', cerrar);
    btnCancelar.addEventListener('click', cerrar);

    // Cerrar al hacer clic afuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrar();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') cerrar();
    });

    // Guardar dirección
    btnGuardar.addEventListener('click', async () => {
        const nombre = document.getElementById('nuevaDireccionNombre').value.trim();
        const tipo = document.getElementById('nuevaDireccionTipo').value;
        const dependenciaSuperior = document.getElementById('nuevaDireccionSuperior').value.trim();
        const errorEl = document.getElementById('modalDireccionError');

        if (!nombre) {
            errorEl.textContent = 'El nombre es obligatorio';
            return;
        }

        btnGuardar.disabled = true;
        btnGuardar.textContent = 'Guardando...';
        errorEl.textContent = '';

        try {
            const resultado = await apiService.post({
                accion: 'guardarDireccion',
                nombre: nombre,
                tipo: tipo,
                dependenciaSuperior: dependenciaSuperior
            });

            if (resultado && resultado.exito === false) {
                throw new Error(resultado.error || 'Error al guardar');
            }

            // Recargar lista de direcciones
            await cargarDireccionesOficiales();

            // Seleccionar automáticamente la nueva
            inputDestinoSeleccionado(nombre);

            // Cerrar modal
            cerrar();

            // Toast
            mostrarToast(`Dirección "${nombre}" agregada`, 'exito');

        } catch (error) {
            errorEl.textContent = error.message;
        } finally {
            btnGuardar.disabled = false;
            btnGuardar.textContent = 'Guardar dirección';
        }
    });
}

/**
 * ------------------------------------------------------------
 * Validar al enviar el formulario de Salida
 * ------------------------------------------------------------
 * Si el usuario escribió algo pero no lo seleccionó del dropdown,
 * igual lo usamos (escribir libre).
 */
function validarDestinoSalida() {
    const input = document.getElementById('inputDestinoSalida');
    const hidden = document.getElementById('destinoSalida');

    if (!input || !hidden) return true;

    const valor = input.value.trim();
    if (!valor) return false;

    // Si el hidden no tiene valor, usar el texto libre del input
    if (!hidden.value) {
        hidden.value = valor;
    }

    return true;
}

// ============================================================
// 14. INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    configurarNavegacion();
    configurarMenu();

    // Cerrar menús desplegables al hacer clic afuera (listener único)
    document.addEventListener('click', function() {
        document.querySelectorAll('.menu-desplegable').forEach(m => m.classList.remove('visible'));
    });

    const fechaEntrada = document.getElementById('fechaEntrada');
    if (fechaEntrada) fechaEntrada.value = obtenerFechaLocal();
    const fechaSalida = document.getElementById('fechaSalida');
    if (fechaSalida) fechaSalida.value = obtenerFechaLocal();

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

    // Cargar direcciones oficiales para el buscador de Salidas
    cargarDireccionesOficiales();

    // Configurar el buscador de destino y el modal
    configurarBuscadorDestino();
    configurarModalNuevaDireccion();

    const formEntrada = document.getElementById('formEntrada');
    if (formEntrada) formEntrada.addEventListener('submit', registrarEntrada);
    const formSalida = document.getElementById('formSalida');
    if (formSalida) formSalida.addEventListener('submit', registrarSalida);

    cargarUltimasEntradas();
    cargarUltimasSalidas();

    // Cargar Direcciones (maqueta con datos de ejemplo)
    cargarDirecciones();

    console.log('✅ InventarioPro - Aplicación inicializada.');
});
