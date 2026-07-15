/**
 * Devuelve todos los artículos desde la hoja
 * "Articulos Stock General"
 */
function obtenerArticulos() {

  const hoja = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("API_Prueba")

  const datos = hoja.getDataRange().getValues();

  let resultado = [];

  for (let i = 1; i < datos.length; i++) {

    resultado.push({

      id: datos[i][0],

      articulo: datos[i][1],

      stockInicial: datos[i][2],

      categoriaId: datos[i][3],

      imagen: datos[i][4],

      observaciones: datos[i][5],

      patrimonio: datos[i][6],

      unidadMedida: datos[i][7],

      multiplicadorUnidades: datos[i][8],

      capacidadMax: datos[i][9]

    });

  }

  return resultado;

}