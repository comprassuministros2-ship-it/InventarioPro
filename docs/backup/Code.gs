function doGet() {

  const resultado = obtenerArticulos();

  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);

}