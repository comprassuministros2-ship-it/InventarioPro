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

    let html = "";

    datos.forEach(item => {
        html += `
        <div class="tarjeta">
            <img
                src="https://ui-avatars.com/api/?name=${item.articulo}&background=random&color=fff&bold=true&size=128"
                alt="${item.articulo}"
            >

            <div class="info">
                <h2>${item.articulo}</h2>

                <div class="stock">
                    Stock: ${item.stockIni}
                </div>

                <p>
                    Categoría: ${item.categoriaID}
                </p>
            </div>
        </div>
        `;
    });

    contenedor.innerHTML = html;
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

        return true;
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