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

        // ORDEN DE COLUMNAS: Artículo | Stock | Categoría | Acciones | Ubicación | Estado | Tipo
        filas += '<tr>' +
            // 1. Artículo
            '<td><div class="item-celda">' +
            '<div class="item-icono-placeholder" aria-hidden="true">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M9 7V5a3 3 0 016 0v2"></path></svg>' +
            '</div>' +
            '<div class="item-nombre">' +
            '<span class="nombre">' + item.articulo + '</span>' +
            '<span class="id">ID ' + item.id + '</span>' +
            '</div>' +
            '</div></td>' +
            
            // 2. Stock (SOLO VISUALIZACIÓN)
            '<td><span class="stock">' + stock + '</span></td>' +

            // 3. Categoría
            '<td><span class="badge-categoria">' + categoria + '</span></td>' +
            
            // 4. Acciones
            '<td><div class="acciones-celda">' +
            '<button class="btn-accion" type="button" aria-label="Ver detalle" title="Detalle">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
            '</button>' +
            '<button class="btn-accion btn-entrada" type="button" data-id="' + item.id + '" data-articulo="' + escaparHtml(item.articulo) + '" aria-label="Registrar entrada" title="Entrada">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>' +
            '</button>' +
            '</div></td>' +
            
            // 5. Ubicación
            '<td>—</td>' +
            
            // 6. Estado
            '<td><span class="badge-estado ' + estadoClase + '">' + estadoTexto + '</span></td>' +
            
            // 7. Tipo
            '<td>—</td>' +
            '</tr>';
    });

    contenedor.innerHTML = '<div class="tabla-inventario-wrapper"><table class="tabla-inventario"><thead><tr>' +
        '<th>Artículo</th><th>Stock</th><th>Categoría</th><th>Acciones</th><th>Ubicación</th><th>Estado</th><th>Tipo</th>' +
        '</tr></thead><tbody>' + filas + '</tbody></table></div>';
}// Render — data table de Inventario General
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

        // ORDEN DE COLUMNAS: Artículo | Stock | Categoría | Acciones | Ubicación | Estado | Tipo
        filas += '<tr>' +
            // 1. Artículo
            '<td><div class="item-celda">' +
            '<div class="item-icono-placeholder" aria-hidden="true">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M9 7V5a3 3 0 016 0v2"></path></svg>' +
            '</div>' +
            '<div class="item-nombre">' +
            '<span class="nombre">' + item.articulo + '</span>' +
            '<span class="id">ID ' + item.id + '</span>' +
            '</div>' +
            '</div></td>' +
            
            // 2. Stock (EDITABLE)
            '<td><div class="stock-editable">' +
            '<span class="stock">' + item.stockIni + '</span>' +
            '<button class="btn-accion btn-editar-stock" type="button" onclick="iniciarEdicionStock(event, ' + item.id + ', ' + stock + ')" title="Editar stock">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>' +
            '</button>' +
            '</div></td>' +

            // 3. Categoría
            '<td><span class="badge-categoria">' + categoria + '</span></td>' +
            
            // 4. Acciones
            '<td><div class="acciones-celda">' +
            '<button class="btn-accion" type="button" aria-label="Ver detalle" title="Detalle">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>' +
            '</button>' +
            '<button class="btn-accion" type="button" aria-label="Registrar salida" title="Salida">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"></path></svg>' +
            '</button>' +
            '</div></td>' +
            
            // 5. Ubicación
            '<td>—</td>' +
            
            // 6. Estado
            '<td><span class="badge-estado ' + estadoClase + '">' + estadoTexto + '</span></td>' +
            
            // 7. Tipo
            '<td>—</td>' +
            '</tr>';
    });

    contenedor.innerHTML = '<div class="tabla-inventario-wrapper"><table class="tabla-inventario"><thead><tr>' +
        '<th>Artículo</th><th>Stock</th><th>Categoría</th><th>Acciones</th><th>Ubicación</th><th>Estado</th><th>Tipo</th>' +
        '</tr></thead><tbody>' + filas + '</tbody></table></div>';
}

// ==========================
// EDICIÓN DE STOCK (PRIORIDAD 2)
// ==========================
function iniciarEdicionStock(event, id, stockActual) {
    event.stopPropagation(); 
    
    const td = event.target.closest('td');
    const contenedorStock = td.querySelector('.stock-editable');
    
    contenedorStock.innerHTML = `
        <input type="number" class="stock-input" id="inputStock_${id}" value="${stockActual}" min="0">
        <button class="btn-stock-accion btn-stock-guardar" onclick="guardarStock(event, ${id})" title="Guardar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>
        </button>
        <button class="btn-stock-accion" onclick="cancelarEdicionStock(event, ${id}, ${stockActual})" title="Cancelar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
    `;

    const input = document.getElementById(`inputStock_${id}`);
    if(input) input.focus();
}

async function guardarStock(event, id) {
    event.stopPropagation();
    const input = document.getElementById(`inputStock_${id}`);
    const nuevoStock = parseFloat(input.value);

    if (isNaN(nuevoStock) || nuevoStock < 0) {
        alert("Ingresa un stock válido");
        return;
    }

    const btn = event.target.closest('button');
    btn.disabled = true;

    try {
        // 1. Guardamos en Sheets (No leemos respuesta, pero no falla)
        await articulosService.actualizarStock(id, nuevoStock);

        // 2. VOLVEMOS A LLAMAR A LA API PARA LEER LOS DATOS REALES DE SHEETS
        await cargarArticulos(); 

        console.log("✅ Stock actualizado y tabla refrescada con datos de Sheets.");

    } catch (error) {
        console.error("Error al guardar stock:", error);
        alert("Hubo un error al guardar");
    } finally {
        btn.disabled = false;
    }
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