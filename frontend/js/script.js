const url = "https://script.google.com/macros/s/AKfycbxC-ACNG6NxUBx_U1bM1M1HS2gs91TSCNc5jZmFR9LvKxR_xdK96ExkzvxJNM3i0Y2hNg/exec";

fetch(url)
    .then(res => res.json())
    .then(datos => {
        console.log(datos);

        let html = "";

        datos.forEach(item => {
            // ¡Fijate que acá dice "imagenes/" antes del nombre!
            html += `
            <div class="tarjeta">
                <img src="https://ui-avatars.com/api/?name=${item.articulo}&background=random&color=fff&bold=true&size=128" alt="${item.articulo}">
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

        document.getElementById("contenedor").innerHTML = html;
    })
    .catch(err => console.error("Error en la API:", err));