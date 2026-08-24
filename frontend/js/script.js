// ==========================
// Estado en memoria
// ==========================
let articulos = [];
let filtroActivo = "todos";

// ==========================
// Frases del placeholder animado
// ==========================
const FRASES_PLACEHOLDER = [
    "Buscar por nombre...",
    "Buscar por ID...",
    "Buscar por categoría...",
    "Buscar por patrimonio..."
];

let placeholderTimeoutId = null;
let animacionPlaceholderActiva = false;

// ==========================
// Carga de artículos
// ==========================
async function cargarArticulos() {
    try {
        const datos = await articulosService.obtenerArticulos();

        articulos = Array.isArray(datos) ? datos : [];

        renderizarArticulos(aplicarFiltro(articulos));
    } catch (error) {
        console.error("Error cargando artículos:", error);
    }
}

// ==========================
// Render — data table de Inventario General
// ==========================
function renderizarArticulos(datos) {
    const contenedor = document.getElementById("contenedor");

    if (!contenedor) return;

    if (!datos || datos.length === 0) {
        contenedor.innerHTML = `
            <p class="sin-resultados">
                No se encontraron artículos que coincidan con la búsqueda.
            </p>
        `;
        return;
    }

    let filas = "";

    datos.forEach(function (item) {
        var categoria = item.categoriaID ? item.categoriaID : "-";
        var stock = obtenerStock(item);
        var estadoTexto = stock > 0 ? "Disponible" : "Sin stock";
        var estadoClase = stock > 0 ? "badge-disponible" : "badge-sin-stock";

        filas += '<tr>' +
            '<td><div class="item-celda">' +
            '<div class="item-icono-placeholder" aria-hidden="true">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M9 7V5a3 3 0 016 0v2"></path></svg>' +
            '</div>' +
            '<div class="item-nombre">' +
            '<span class="nombre">' + item.articulo + '</span>' +
            '<span class="id">ID ' + item.id + '</span>' +
            '</div>' +
            '</div></td>' +
            '<td><span class="badge-categoria">' + categoria + '</span></td>' +
            '<td>—</td>' +
            '<td><span class="stock">' + item.stockIni + '</span></td>' +
            '<td><span class="badge-estado ' + estadoClase + '">' + estadoTexto + '</span></td>' +
            '<td>—</td>' +
            '<td><div class="acciones-celda">' +
            '<button class="btn-accion" type="button" aria-label="Ver detalle" title="Detalle">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
            '</button>' +
            '<button class="btn-accion" type="button" aria-label="Registrar salida" title="Salida">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"></path></svg>' +
            '</button>' +
            '</div></td>' +
            '</tr>';
    });

    contenedor.innerHTML = '<div class="tabla-inventario-wrapper"><table class="tabla-inventario"><thead><tr>' +
        '<th>Artículo</th><th>Categoría</th><th>Ubicación</th><th>Stock</th><th>Estado</th><th>Tipo</th><th>Acciones</th>' +
        '</tr></thead><tbody>' + filas + '</tbody></table></div>';
}

// ==========================
// Utilidades de búsqueda
// ==========================
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

    if (!terminoNormalizado) {
        return articulos;
    }

    return articulos.filter(item => {
        const idCoincideExacto = normalizarTexto(item.id) === terminoNormalizado;

        const camposParciales = [item.articulo, item.categoriaID, item.patrimonio];
        const coincideParcial = camposParciales.some(campo =>
            normalizarTexto(campo).includes(terminoNormalizado)
        );

        return idCoincideExacto || coincideParcial;
    });
}

// ==========================
// Filtros de stock y categoría
// ==========================
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
    if (!Array.isArray(datos)) {
        return [];
    }

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

        const categoriaItem = normalizarTexto(item.categoriaID);
        const categoriaFiltro = normalizarTexto(filtroActivo);

        return categoriaItem === categoriaFiltro ||
            categoriaItem.includes(categoriaFiltro) ||
            categoriaFiltro.includes(categoriaItem);
    });
}

function actualizarInfoResultados(cantidad, termino) {
    const infoEl = document.getElementById("buscadorInfo");

    if (!infoEl) return;

    if (!termino) {
        infoEl.textContent = "";
        return;
    }

    if (cantidad === 0) {
        infoEl.textContent =
            "No se encontraron artículos que coincidan con la búsqueda.";
        return;
    }

    infoEl.textContent =
        `${cantidad} resultado${cantidad === 1 ? "" : "s"} encontrado${cantidad === 1 ? "" : "s"}`;
}

// ==========================
// Placeholder animado
// ==========================
function iniciarPlaceholderAnimado(input) {
    if (!input) return;

    const prefiereReducirMovimiento =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefiereReducirMovimiento) {
        input.placeholder = FRASES_PLACEHOLDER[0];
        return;
    }

    animacionPlaceholderActiva = true;

    let fraseIndex = 0;
    let charIndex = 0;
    let borrando = false;

    function tick() {
        if (!animacionPlaceholderActiva) return;

        const fraseActual = FRASES_PLACEHOLDER[fraseIndex];

        if (!borrando) {
            charIndex++;
            input.placeholder = fraseActual.substring(0, charIndex);

            if (charIndex === fraseActual.length) {
                borrando = true;
                placeholderTimeoutId = setTimeout(tick, 1300);
                return;
            }
        } else {
            charIndex--;
            input.placeholder = fraseActual.substring(0, charIndex);

            if (charIndex === 0) {
                borrando = false;
                fraseIndex = (fraseIndex + 1) % FRASES_PLACEHOLDER.length;
            }
        }

        placeholderTimeoutId = setTimeout(tick, borrando ? 35 : 65);
    }

    tick();
}

function detenerPlaceholderAnimado() {
    animacionPlaceholderActiva = false;
    clearTimeout(placeholderTimeoutId);
}

function reanudarPlaceholderAnimado(input) {
    if (animacionPlaceholderActiva) return;

    iniciarPlaceholderAnimado(input);
}

// ==========================
// Buscador
// ==========================
function configurarBuscador() {
    const input = document.getElementById("inputBusqueda");

    if (!input) {
        console.warn("No se encontró el campo de búsqueda (#inputBusqueda).");
        return;
    }

    iniciarPlaceholderAnimado(input);

    input.addEventListener("input", () => {
        const valor = input.value;

        if (valor.length > 0) {
            detenerPlaceholderAnimado();
        } else {
            reanudarPlaceholderAnimado(input);
        }

        const resultados = aplicarFiltro(filtrarArticulos(valor));

        renderizarArticulos(resultados);
        actualizarInfoResultados(resultados.length, valor);
    });
}

// ==========================
// Configuración de filtros
// ==========================
function configurarFiltros() {
    const chips = document.querySelectorAll(".chip");
    const input = document.getElementById("inputBusqueda");

    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            const nuevoFiltro = chip.dataset.filtro;

            if (!nuevoFiltro) return;

            filtroActivo = nuevoFiltro;

            chips.forEach(item => {
                item.classList.remove("is-active");
            });

            chip.classList.add("is-active");

            const valor = input ? input.value : "";
            const resultados = aplicarFiltro(filtrarArticulos(valor));

            renderizarArticulos(resultados);
            actualizarInfoResultados(resultados.length, valor);
        });
    });
}

// ==========================
// Inicialización
// ==========================
document.addEventListener("DOMContentLoaded", configurarBuscador);
document.addEventListener("DOMContentLoaded", configurarFiltros);

cargarArticulos();