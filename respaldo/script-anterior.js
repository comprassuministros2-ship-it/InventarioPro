// ==========================
// Estado en memoria
// ==========================
let articulos = [];

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
        renderizarArticulos(articulos);
    } catch (error) {
        console.error("Error cargando artículos:", error);
    }
}

// ==========================
// Render (con mensaje de "sin resultados")
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
        const campos = [item.articulo, item.id, item.categoriaID, item.patrimonio];
        return campos.some(campo => normalizarTexto(campo).includes(terminoNormalizado));
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
        infoEl.textContent = "No se encontraron artículos que coincidan con la búsqueda.";
        return;
    }

    infoEl.textContent = `${cantidad} resultado${cantidad === 1 ? "" : "s"} encontrado${cantidad === 1 ? "" : "s"}`;
}

// ==========================
// Placeholder animado (escritura automática)
// ==========================
function iniciarPlaceholderAnimado(input) {
    if (!input) return;

    const prefiereReducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

        const resultados = filtrarArticulos(valor);
        renderizarArticulos(resultados);
        actualizarInfoResultados(resultados.length, valor);
    });
}

// ==========================
// Inicialización
// ==========================
document.addEventListener("DOMContentLoaded", configurarBuscador);

cargarArticulos();