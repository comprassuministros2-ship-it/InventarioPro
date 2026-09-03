// ============================================================
// INVENTARIO PRO - SCRIPT PRINCIPAL
// Maneja: Navegación, Renderizado, Búsqueda, Filtros y Entradas
// ============================================================

// Estado global
let articulos = [];
let filtroActivo = "todos";

// ============================================================
// 1. NAVEGACIÓN ENTRE PÁGINAS (Entradas, Inventario, etc.)
// ============================================================
function navegarAPagina(nombre) {
    document.querySelectorAll('.pagina').forEach(p => p.classList.remove('activa'));

    const target = document.getElementById('pagina-' + nombre);
    if (target) target.classList.add('activa');

    document.querySelectorAll('.sidebar-link').forEach(e => e.classList.remove('is-active'));

    const activo = document.querySelector(`.sidebar-link[data-page="${nombre}"]`);
    if (activo) activo.classList.add('is-active');

    if (nombre === 'inventario') {
        cargarArticulos();
    }
}

function configurarNavegacion() {
    const enlaces = document.querySelectorAll('.sidebar-link');

    enlaces.forEach(e => {
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
// 2. CARGA DE ARTÍCULOS
// ============================================================
async function cargarArticulos() {
    try {
        const datos = await articulosService.obtenerArticulos();

        articulos = Array.isArray(datos) ? datos : [];

        renderizarArticulos(aplicarFiltro(articulos));

    } catch (error) {
        console.error("Error cargando artículos:", error);

        const contenedor = document.getElementById("contenedorInventario");

        if (contenedor) {
            contenedor.innerHTML =
                `<p class="placeholder">Error al cargar inventario: ${error.message}</p>`;
        }
    }
}

// ============================================================
// 3. RENDERIZADO DE LA TABLA DE INVENTARIO
// ============================================================
function renderizarArticulos(datos) {
    const contenedor = document.getElementById("contenedorInventario");

    if (!contenedor) return;

    if (!datos || datos.length === 0) {
        contenedor.innerHTML =
            `<p class="placeholder">No se encontraron artículos que coincidan con la búsqueda.</p>`;

        return;
    }

    let filas = "";

    datos.forEach(function(item) {

        const categoria = item.categoriaID ? item.categoriaID : "-";

        const stock = obtenerStock(item);

        const estadoTexto = stock > 0 ? "Disponible" : "Sin stock";

        const estadoClase =
            stock > 0
                ? "badge-disponible"
                : "badge-sin-stock";

        filas +=
            '<tr>' +

            '<td><div class="item-celda">' +

            '<div class="item-icono-placeholder" aria-hidden="true">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<rect x="3" y="7" width="18" height="13" rx="2"></rect>' +
            '<path d="M9 7V5a3 3 0 016 0v2"></path>' +
            '</svg>' +
            '</div>' +

            '<div class="item-nombre">' +

            '<span class="nombre">' +
            item.articulo +
            '</span>' +

            '<span class="id">ID ' +
            item.id +
            '</span>' +

            '</div>' +

            '</div></td>' +

            '<td><span class="badge-categoria">' +
            categoria +
            '</span></td>' +

            '<td class="td-centrado">—</td>' +

            '<td><span class="stock-numero">' +
            stock +
            '</span></td>' +

            '<td><span class="badge-estado ' +
            estadoClase +
            '">' +
            estadoTexto +
            '</span></td>' +

            '<td class="td-centrado">—</td>' +

            '<td><div class="acciones-celda">' +

            '<button class="btn-accion" type="button" aria-label="Ver detalle" title="Detalle">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>' +
            '<circle cx="12" cy="12" r="3"></circle>' +
            '</svg>' +
            '</button>' +

            '<button class="btn-accion" type="button" aria-label="Registrar salida" title="Salida">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M9 5l7 7-7 7"></path>' +
            '</svg>' +
            '</button>' +

            '</div></td>' +

            '</tr>';
    });

    contenedor.innerHTML =
        '<div class="inventario-tabla-wrapper">' +

        '<table class="inventario-tabla">' +

        '<thead>' +

        '<tr>' +
        '<th>Artículo</th>' +
        '<th>Categoría</th>' +
        '<th>Ubicación</th>' +
        '<th>Stock</th>' +
        '<th>Estado</th>' +
        '<th>Tipo</th>' +
        '<th>Acciones</th>' +
        '</tr>' +

        '</thead>' +

        '<tbody>' +
        filas +
        '</tbody>' +

        '</table>' +

        '</div>';
}

// ============================================================
// 4. UTILIDADES DE BÚSQUEDA Y FILTROS
// ============================================================
function normalizarTexto(valor) {
    return (valor ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function filtrarArticulos(termino) {
    const terminoNormalizado = normalizarTexto(termino);

    if (!terminoNormalizado) return articulos;

    return articulos.filter(item => {

        const idCoincideExacto =
            normalizarTexto(item.id) === terminoNormalizado;

        const camposParciales = [
            item.articulo,
            item.categoriaID,
            item.patrimonio
        ];

        const coincideParcial =
            camposParciales.some(campo =>
                normalizarTexto(campo).includes(terminoNormalizado)
            );

        return idCoincideExacto || coincideParcial;
    });
}

function obtenerStock(item) {
    const valor = item?.stockIni;

    if (typeof valor === "number") {
        return Number.isFinite(valor) ? valor : 0;
    }

    const stock = Number.parseFloat(
        String(valor ?? "").trim().replace(",", ".")
    );

    return Number.isFinite(stock) ? stock : 0;
}

function aplicarFiltro(datos) {
    if (!Array.isArray(datos)) return [];

    return datos.filter(item => {

        const stock = obtenerStock(item);

        if (filtroActivo === "disponibles") {
            return stock > 0;
        }

        if (filtroActivo === "stock-bajo") {
            return stock >= 1 && stock <= 5;
        }

        if (filtroActivo === "sin-stock") {
            return stock === 0;
        }

        if (filtroActivo === "todos" || !filtroActivo) {
            return true;
        }

        const categoriaItem =
            normalizarTexto(item.categoriaID);

        const categoriaFiltro =
            normalizarTexto(filtroActivo);

        return (
            categoriaItem === categoriaFiltro ||
            categoriaItem.includes(categoriaFiltro) ||
            categoriaFiltro.includes(categoriaItem)
        );
    });
}

function configurarBuscador() {
    const input = document.getElementById("inputBusqueda");

    if (!input) return;

    input.addEventListener("input", () => {

        const valor = input.value;

        const resultados =
            aplicarFiltro(filtrarArticulos(valor));

        renderizarArticulos(resultados);
    });
}

function configurarFiltros() {
    const chips = document.querySelectorAll(".chip");

    const input =
        document.getElementById("inputBusqueda");

    chips.forEach(chip => {

        chip.addEventListener("click", () => {

            const nuevoFiltro =
                chip.dataset.filtro;

            if (!nuevoFiltro) return;

            filtroActivo = nuevoFiltro;

            chips.forEach(item =>
                item.classList.remove("is-active")
            );

            chip.classList.add("is-active");

            const valor =
                input ? input.value : "";

            const resultados =
                aplicarFiltro(
                    filtrarArticulos(valor)
                );

            renderizarArticulos(resultados);
        });
    });
}

// ============================================================
// 5. LÓGICA DE ENTRADAS
// ============================================================
let idArticuloSeleccionado = null;

async function cargarArticulosParaBuscador() {

    try {

        const datos =
            await articulosService.obtenerArticulos();

        articulos =
            Array.isArray(datos) ? datos : [];

        const datalist =
            document.getElementById("listaArticulos");

        if (datalist) {

            datalist.innerHTML = '';

            articulos.forEach(item => {

                const opt =
                    document.createElement('option');

                opt.value =
                    `${item.articulo} (ID ${item.id})`;

                opt.dataset.id =
                    item.id;

                datalist.appendChild(opt);
            });
        }

    } catch (e) {

        console.error(
            'Error cargando artículos para buscador:',
            e
        );
    }
}

function configurarBuscadorEntradas() {

    const inputArticulo =
        document.getElementById("inputArticulo");

    const hiddenId =
        document.getElementById("articuloId");

    if (!inputArticulo || !hiddenId) return;

    inputArticulo.addEventListener("input", function() {

        const valor = this.value;

        const lista =
            document.getElementById("listaArticulos");

        const opcion =
            Array.from(lista.options)
                .find(o => o.value === valor);

        if (opcion) {

            hiddenId.value =
                opcion.dataset.id || '';

            mostrarVistaPrevia(
                opcion.dataset.id
            );

        } else {

            hiddenId.value = '';

            const coincidencia =
                articulos.find(item =>
                    item.articulo
                        .toLowerCase()
                        .includes(
                            valor.toLowerCase()
                        )
                );

            if (coincidencia) {

                mostrarVistaPrevia(
                    coincidencia.id
                );

            } else {

                document.getElementById(
                    'vistaPreviaContenido'
                ).innerHTML =
                    '<p class="placeholder">No se encontró el artículo</p>';
            }
        }
    });
}

function mostrarVistaPrevia(id) {

    const item =
        articulos.find(
            a => String(a.id) === String(id)
        );

    if (!item) return;

    const stock =
        obtenerStock(item);

    let estadoClase =
        'badge-disponible';

    let estadoTexto =
        'Disponible';

    if (stock === 0) {

        estadoClase =
            'badge-sin-stock';

        estadoTexto =
            'Sin stock';

    } else if (stock <= 5) {

        estadoClase =
            'badge-critico';

        estadoTexto =
            'Crítico';

    } else if (stock <= 10) {

        estadoClase =
            'badge-bajo';

        estadoTexto =
            'Bajo';
    }

    document.getElementById(
        'vistaPreviaContenido'
    ).innerHTML = `

        <div class="articulo-preview">

            <div class="nombre">
                ${item.articulo}
            </div>

            <div class="stock-grande">
                ${stock}
            </div>

            <div style="color: var(--text-muted);">
                unidades actuales
            </div>

            <div class="detalle">

                <span class="badge ${estadoClase}">
                    ${estadoTexto}
                </span>

                ${
                    item.stockMin
                        ? `<span style="color:var(--text-muted);font-size:0.85rem;">
                            Mínimo: ${item.stockMin}
                           </span>`
                        : ''
                }

            </div>

        </div>
    `;
}

async function registrarEntrada(e) {

    e.preventDefault();

    const id =
        document.getElementById(
            "articuloId"
        ).value;

    const cantidad =
        parseInt(
            document.getElementById(
                "cantidad"
            ).value
        );

    const proveedor =
        document.getElementById(
            "proveedor"
        ).value.trim();

    const factura =
        document.getElementById(
            "factura"
        ).value.trim();

    const observaciones =
        document.getElementById(
            "observaciones"
        ).value.trim();

    const fecha =
        document.getElementById(
            "fechaEntrada"
        ).value;

    if (!id) {
        alert('❌ Seleccioná un artículo');
        return;
    }

    if (isNaN(cantidad) || cantidad <= 0) {
        alert('❌ Cantidad inválida');
        return;
    }

    if (!proveedor) {
        alert('❌ Ingresá el proveedor');
        return;
    }

    const btn =
        document.getElementById(
            'btnRegistrar'
        );

    btn.disabled = true;
    btn.textContent =
        'Registrando...';

    try {

        const payload = {

            accion:
                'registrarEntrada',

            id:
                id,

            cantidad:
                cantidad,

            proveedor:
                proveedor,

            ordenCompra:
                factura,

            tipoCompra:
                '',

            observacion:
                observaciones,

            fecha:
                fecha
        };

        const resultado =
            await apiService.post(payload);

        if (
            resultado &&
            resultado.exito === false
        ) {
            throw new Error(
                resultado.error ||
                'Error desconocido'
            );
        }

        alert(
            '✅ Entrada registrada correctamente'
        );

        document.getElementById(
            'formEntrada'
        ).reset();

        document.getElementById(
            'articuloId'
        ).value = '';

        document.getElementById(
            'vistaPreviaContenido'
        ).innerHTML =
            '<p class="placeholder">Seleccioná un artículo para ver su stock actual</p>';

        document.getElementById(
            'registradoPor'
        ).value =
            'Juan Rodríguez';

        await cargarArticulosParaBuscador();

        if (
            document.getElementById(
                'pagina-inventario'
            ).classList.contains('activa')
        ) {
            cargarArticulos();
        }

    } catch (error) {

        alert(
            `❌ Error: ${error.message}`
        );

        console.error(error);

    } finally {

        btn.disabled = false;

        btn.textContent =
            'Registrar entrada';
    }
}

// ============================================================
// 6. INICIALIZACIÓN
// ============================================================
document.addEventListener(
    'DOMContentLoaded',
    function() {

        configurarNavegacion();

        configurarBuscador();

        configurarFiltros();

        cargarArticulos();

        cargarArticulosParaBuscador();

        configurarBuscadorEntradas();

        const formEntrada =
            document.getElementById(
                'formEntrada'
            );

        if (formEntrada) {

            formEntrada.addEventListener(
                'submit',
                registrarEntrada
            );
        }

        const fechaInput =
            document.getElementById(
                'fechaEntrada'
            );

        if (fechaInput) {

            fechaInput.value =
                new Date()
                    .toISOString()
                    .split('T')[0];
        }
    }
);

// ============================================================
// HELPER: celda "Artículo" con imagen o placeholder
// ============================================================
function obtenerCeldaArticuloHTML(articulo) {

    const tieneImagen =
        articulo.imagen &&
        articulo.imagen.trim() !== '';

    const imgHTML =
        tieneImagen
            ? `<img src="${articulo.imagen}"
                    alt="${articulo.articulo}"
                    loading="lazy"
                    onerror="this.style.display='none';
                    this.nextElementSibling.style.display='flex';">`
            : '';

    const placeholderHTML =
        `<span class="articulo-imagen-placeholder"
            ${tieneImagen ? 'style="display:none;"' : ''}>
            📦
        </span>`;

    return `
        <div class="articulo-celda">

            <div class="articulo-imagen">
                ${imgHTML}
                ${placeholderHTML}
            </div>

            <div class="articulo-info">
                <span class="articulo-nombre">
                    ${articulo.articulo}
                </span>
            </div>

        </div>
    `;
}// ============================================================
// MENÚ LATERAL COLAPSABLE (SOLO ICONOS)
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const btnMenu = document.getElementById('btnMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const layout = document.querySelector('.app-layout');

    if (!btnMenu || !sidebar) return;

    // Función para alternar el menú
    function toggleMenu() {
        if (window.matchMedia("(max-width: 768px)").matches) {
            // MODO MÓVIL: usar clase "open" (deslizar)
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        } else {
            // MODO PC: alternar clase "collapsed" (solo iconos)
            sidebar.classList.toggle('collapsed');
            layout.classList.toggle('sidebar-collapsed');
        }
    }

    // Evento de clic en el botón hamburguesa
    btnMenu.addEventListener('click', toggleMenu);

    // Cerrar menú si se hace clic en el overlay (solo móvil)
    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }

    // (Opcional) Si la pantalla es muy grande y quieres que arranque expandido, no hagas nada.
    // Si quieres que arranque colapsado, descomenta la siguiente línea:
    // if (!window.matchMedia("(max-width: 768px)").matches) {
    //     sidebar.classList.add('collapsed');
    //     layout.classList.add('sidebar-collapsed');
    // }
});// Generar chips de categorías con contador
function renderizarFiltrosCategorias() {
    const contenedor = document.getElementById('filtrosCategorias');
    if (!contenedor || !articulos.length) return;

    // Contar artículos por categoría
    const conteo = {};
    articulos.forEach(item => {
        const cat = item.categoriaID || 'Sin categoría';
        conteo[cat] = (conteo[cat] || 0) + 1;
    });

    // Crear chip "Todos"
    let html = `<button class="chip-categoria active" data-cat="todos">Todos <span class="contador">${articulos.length}</span></button>`;
    
    // Crear chips por categoría
    for (const [cat, num] of Object.entries(conteo)) {
        html += `<button class="chip-categoria" data-cat="${cat}">${cat} <span class="contador">${num}</span></button>`;
    }
    contenedor.innerHTML = html;

    // Eventos de clic
    contenedor.querySelectorAll('.chip-categoria').forEach(chip => {
        chip.addEventListener('click', () => {
            const cat = chip.dataset.cat;
            filtroActivo = cat; // Variable global que ya usas
            contenedor.querySelectorAll('.chip-categoria').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            aplicarFiltroYRender();
        });
    });
}

// Llamar a esta función después de cargar los artículos
function cargarInventarioCompleto() {
    cargarArticulos().then(() => {
        renderizarFiltrosCategorias();
        // Fecha actual
        const fechaEl = document.getElementById('fechaInventario');
        if (fechaEl) fechaEl.textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    });
}