console.log("SCRIPT CARGADO");

async function cargarArticulos() {
    console.log("Entró a cargarArticulos");

    try {

        console.log(CONFIG.API.BASE_URL);

        const datos = await articulosService.obtenerArticulos();

        console.table(datos.slice(0,5));
        console.log(datos[0]);
        alert(JSON.stringify(datos[0], null, 2));

    } catch (error) {

        console.error(error);

    }
}

cargarArticulos();