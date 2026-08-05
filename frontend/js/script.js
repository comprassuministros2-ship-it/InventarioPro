async function cargarArticulos() {

    try {

        const datos = await articulosService.obtenerArticulos();

        renderizarArticulos(datos);

    } catch (error) {

        console.error("Error cargando artículos:", error);

    }

}

function renderizarArticulos(datos) {

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
                    Stock: ${item.stockInicial}
                </div>

                <p>
                    Categoría: ${item.categoriaId}
                </p>

            </div>

        </div>
        `;

    });

    document.getElementById("contenedor").innerHTML = html;

}

cargarArticulos();