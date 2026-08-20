function doGet() {

  const resultado = obtenerArticulos();

  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);

}

/**
 * Punto de entrada para escritura (POST)
 */
function doPost(e) {

  const body = JSON.parse(e.postData.contents);

  let resultado;

  switch (body.accion) {

    case "actualizarStock":
      resultado = actualizarStock(body.id, body.stock);
      break;

    default:
      resultado = { exito: false, error: "Acción no reconocida" };

  }

  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);

}

/**
 * Actualiza el stock de un artículo puntual buscándolo por ID
 */
function actualizarStock(id, nuevoStock) {

  const hoja = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("API_Prueba");

  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {

    if (datos[i][0] == id) {

      // Columna C = stockInicial (índice 2 en el array, columna 3 en la hoja)
      hoja.getRange(i + 1, 3).setValue(nuevoStock);

      return { exito: true, id: id, nuevoStock: nuevoStock };

    }

  }

  return { exito: false, error: "Artículo no encontrado" };

}