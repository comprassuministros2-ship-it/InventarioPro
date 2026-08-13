
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
// Render
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

    const textoSeguro = valor => {
        const texto = valor === null || valor === undefined || valor === ""
            ? "—"
            : String(valor);

        return texto
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    let filas = "";

    datos.forEach(item => {
        filas += `
            <tr>
                <td>
                    <div class="item-celda">
                        <span class="item-icono-placeholder" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2">
                                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
                                <path d="M3.3 7L12 12l8.7-5"></path>
                                <path d="M12 22V12"></path>
                            </svg>
                        </span>

                        <div class="item-nombre">
                            <span class="nombre">${textoSeguro(item.articulo)}</span>
                            <span class="id">ID: ${textoSeguro(item.id)}</span>
                        </div>
                    </div>
                </td>

                <td>
                    <span class="categoria-badge">
                        ${textoSeguro(item.categoriaID)}
                    </span>
                </td>

                <td>—</td>

                <td>${textoSeguro(item.stockIni)}</td>

                <td>
                    <span class="estado-stock">—</span>
                </td>

                <td>—</td>

                <td>
                    <span class="acciones-articulo">—</span>
                </td>
            </tr>
        `;
    });

    contenedor.innerHTML = `
        <div class="tabla-inventario-wrapper">
            <table class="tabla-inventario">
                <thead>
                   <tr>
    <th>Artículo</th>
    <th>Stock</th>
    <th>Categoría</th>
    <th>Estado</th>
    <th>Ubicación</th>
    <th>Acciones</th>
    <th>Tipo</th>
</tr>
                </thead>

                <tbody>
                    ${filas}
                </tbody>
            </table>
        </div>
    `;
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
        const campos = [
            item.articulo,
            item.id,
            item.categoriaID,
            item.patrimonio
        ];

        return campos.some(campo =>
            normalizarTexto(campo).includes(terminoNormalizado)
        );
    });
}

// ==========================
// Filtros de stock
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

    if (filtroActivo === "todos") {
        return datos;
    }

    const filtroNormalizado = normalizarTexto(filtroActivo)
        .replace(/[-_]+/g, " ");

    return datos.filter(item => {
        const categoriaNormalizada = normalizarTexto(item.categoriaID)
            .replace(/[-_]+/g, " ");

        return categoriaNormalizada === filtroNormalizado;
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
    const botonTodos = document.querySelector(".filtro-todos");
    const selectCategoria = document.getElementById("selectCategoria");
    const input = document.getElementById("inputBusqueda");

    if (!botonTodos || !selectCategoria) return;

    function actualizarVista() {
        const valor = input ? input.value : "";
        const resultados = aplicarFiltro(filtrarArticulos(valor));

        renderizarArticulos(resultados);
        actualizarInfoResultados(resultados.length, valor);
    }

    botonTodos.addEventListener("click", () => {
        filtroActivo = "todos";

        botonTodos.classList.add("is-active");
        selectCategoria.value = "";

        actualizarVista();
    });

    selectCategoria.addEventListener("change", () => {
        filtroActivo = selectCategoria.value || "todos";

        botonTodos.classList.toggle(
            "is-active",
            filtroActivo === "todos"
        );

        actualizarVista();
    });
}

// ==========================
// Inicialización
// ==========================
document.addEventListener("DOMContentLoaded", configurarBuscador);
document.addEventListener("DOMContentLoaded", configurarFiltros);

cargarArticulos();