/**
 * ============================================================
 * INVENTARIO PRO - API (Backend)
 * VERSION: ESTABLE + LOCKSERVICE + 14 CAMPOS + PATRIMONIO/TALLE + DIRECTOR + FILTRO MOVIMIENTOS
 * MODIFICADO: Soporte formato_cantidad (columna H) para distinguir pedidos nuevos (unidades) vs históricos
 * NUEVO v2: Flujo Pedidos — Confirmar (solo guarda lista) → Entregar (descuenta stock + PDF con firmas)
 * ============================================================
 */

// ============================================================
// 01. DO GET
// ============================================================

function doGet(e) {
  if (e && e.parameter && e.parameter.imgId) {
    try {
      var fileId = e.parameter.imgId;
      DriveApp.getFileById(fileId);
      var redirectUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
      return HtmlService.createHtmlOutput(
        '<html><head><meta http-equiv="refresh" content="0; url=' + redirectUrl + '"></head><body>Redirigiendo...</body></html>'
      );
    } catch (err) {
      return ContentService.createTextOutput("Error: " + err.message);
    }
  }

  const resultado = obtenerArticulos();
  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 02. DO POST
// ============================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respuestaJSON({ exito: false, error: "No se recibió información" });
    }

    const body = JSON.parse(e.postData.contents);
    let resultado;

    switch (body.accion) {
      case "registrarEntrada":
        resultado = registrarEntrada(body.id, body.cantidad, body.proveedor || body.destino || "", body.ordenCompra || body.factura || "", body.tipoCompra || "", body.observacion || "", body.fecha || "", body.incompleto === true);
        break;

      case "registrarSalida":
        resultado = registrarSalida(body.id, body.cantidad, body.destino || body.proveedor || "", body.factura || body.ordenCompra || "", body.observacion || "", body.fecha || "");
        break;

      case "registrarRelevamiento":
        resultado = registrarRelevamiento(body.id, body.stockReal, body.observacion || "", body.fecha || "");
        break;

      case "listarMovimientos":
        resultado = listarMovimientos(body.idArticulo);
        break;

      case "ultimasEntradas":
        resultado = obtenerUltimasEntradas(body.cantidad || 5);
        break;

      case "ultimasSalidas":
        resultado = obtenerUltimasSalidas(body.cantidad || 5);
        break;

      case "estadisticasDirecciones":
        resultado = obtenerEstadisticasDirecciones();
        break;

      case "listarDirecciones":
        resultado = listarDirecciones();
        break;

      case "guardarDireccion":
        resultado = guardarDireccion(body.nombre || "", body.tipo || "", body.dependenciaSuperior || "");
        break;

      case "estadisticasDashboard":
        resultado = obtenerEstadisticasDashboard();
        break;

      case "listarPedidos":
        resultado = listarPedidos();
        break;

      case "crearPedido":
        resultado = crearPedido({
          direccion: body.direccion,
          director: body.director,
          nota: body.nota,
          referencia: body.referencia,
          items: body.items
        });
        break;

      case "editarPedido":
        resultado = editarPedido(body.id, {
          direccion: body.direccion,
          director: body.director,
          nota: body.nota,
          referencia: body.referencia,
          items: body.items
        });
        break;

      case "cancelarPedido":
        resultado = cancelarPedido(body.id);
        break;

      case "confirmarPedido":
        resultado = confirmarPedido(body.id);
        break;

      // ===== NUEVO: Entregar pedido (descuenta stock + PDF con firmas) =====
      case "generarRemitoEntrega":
        resultado = generarRemitoEntrega(body.id);
        break;

      case "crearArticulo":
        resultado = crearArticulo(body.datos || body);
        break;

      case "editarArticulo":
        resultado = editarArticulo(body.datos);
        break;

      case "eliminarArticulo":
        resultado = eliminarArticulo(body.id);
        break;

      default:
        resultado = { exito: false, error: "Acción no reconocida: " + body.accion };
    }

    return respuestaJSON(resultado);

  } catch (error) {
    return respuestaJSON({ exito: false, error: error.message });
  }
}

// ============================================================
// 03. CONSTANTES GLOBALES Y HELPERS
// ============================================================

const CARPETA_REMITOS_ID = "1suUVd-C4dAGv8tjAqsnltLubb5zr2qQP";
const ID_EXTERNO_SEGUIMIENTO = "1cW7v2PcFCW2N3yQv01poW7PPyqxYNCWAfbdCoNh4VUA";
const REPO_OWNER = "comprassuministros2-ship-it";
const REPO_NAME = "InventarioPro";

const GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN") || "";

function respuestaJSON(datos) {
  return ContentService
    .createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON);
}

function construirFecha(fecha) {
  const ahoraUTC = new Date();
  const ahoraARG = new Date(ahoraUTC.getTime() - (3 * 60 * 60 * 1000));

  if (!fecha) return ahoraARG;

  const partes = String(fecha).split("-");
  if (partes.length !== 3) return ahoraARG;

  return new Date(
    parseInt(partes[0], 10),
    parseInt(partes[1], 10) - 1,
    parseInt(partes[2], 10),
    ahoraARG.getHours(),
    ahoraARG.getMinutes(),
    ahoraARG.getSeconds()
  );
}

function escaparHTML(txt) {
  return String(txt || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "'");
}

function generarIDCorto() {
  return Utilities.getUuid().replace(/-/g, "").substring(0, 8);
}

function normalizarNombreDireccion(nombre) {
  let n = String(nombre || "").trim().toLowerCase();
  n = n.normalize("NFD").replace(/[̀-ͯ]/g, "");
  n = n.replace(/direcion/g, "direccion").replace(/\s+/g, " ");
  return n;
}

// ============================================================
// 04. ARTÍCULOS
// ============================================================

function obtenerArticulos() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "articulos_v1";
  const cached = cache.get(cacheKey);

  if (cached) return JSON.parse(cached);

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("API_Prueba");
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();

  const headersEsperados = [
    "ID", "Articulo", "stockIni", "CategoriaID", "Imagen",
    "Observaciones", "Patrimonio", "Unidad_Medida",
    "Multiplicador_Unidades", "Capacidad_Max",
    "stockMin", "stockCritico", "ubicacion", "Talle"
  ];
  const headersReales = datos[0] || [];
  const headersFaltantes = headersEsperados.filter((h, i) =>
    !headersReales[i] || headersReales[i].toString().trim().toLowerCase() !== h.toLowerCase()
  );
  if (headersFaltantes.length > 0) {
    console.warn("Headers no coinciden. Faltan/difieren: " + headersFaltantes.join(", "));
  }

  const resultado = [];

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (!fila[0] && !fila[1]) continue;

    resultado.push({
      id: fila[0],
      articulo: fila[1],
      stockIni: fila[2],
      categoriaID: fila[3],
      imagen: fila[4],
      observaciones: fila[5],
      patrimonio: fila[6],
      unidadMedida: fila[7],
      multiplicadorUnidades: fila[8],
      capacidadMax: fila[9],
      stockMin: fila[10],
      stockCritico: fila[11],
      ubicacion: fila[12],
      talle: fila[13]
    });
  }

  cache.put(cacheKey, JSON.stringify(resultado), 300);
  return resultado;
}

// ------------------------------------------------------------
// CREAR ARTÍCULO - CON LOCKSERVICE + PATRIMONIO/TALLE
// ------------------------------------------------------------

function crearArticulo(datos) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!datos || !datos.nombre || !datos.nombre.trim()) {
      return { exito: false, error: "El nombre es obligatorio" };
    }

    const nombre = datos.nombre.trim();
    const nombreNorm = normalizarNombreDireccion(nombre);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaArt = ss.getSheetByName("API_Prueba");

    if (!hojaArt) {
      return { exito: false, error: "No se encontró API_Prueba" };
    }

    const datosArt = hojaArt.getDataRange().getValues();
    let maxId = 0;

    for (let i = 1; i < datosArt.length; i++) {
      if (normalizarNombreDireccion(datosArt[i][1]) === nombreNorm) {
        return {
          exito: false,
          error: "Ya existe un artículo con ese nombre",
          idExistente: String(datosArt[i][0]).trim()
        };
      }

      const m = String(datosArt[i][0]).match(/\d+/);

      if (m) {
        const num = parseInt(m[0], 10);
        if (num > maxId) maxId = num;
      }
    }

    const nuevoID = maxId + 1;
    const multiplicador = Number(datos.multiplicador) || 1;
    const entrada = datos.entrada || null;

    let stockIni = 0;
    let cantidadMovimiento = 0;

    if (entrada && Number(entrada.cantidad) > 0) {
      cantidadMovimiento = Number(entrada.cantidad) * multiplicador;
      stockIni = cantidadMovimiento;
    }

    hojaArt.appendRow([
      nuevoID,
      nombre,
      stockIni,
      String(datos.categoria || "").trim(),
      String(datos.imagen || "📦").trim(),
      String(datos.observaciones || "").trim(),
      String(datos.patrimonio || "").trim(),
      String(datos.unidadMedida || "Unidad").trim(),
      multiplicador,
      Number(datos.capacidadMax) || 0,
      Number(datos.stockMin) || 0,
      Number(datos.stockCritico) || 0,
      String(datos.ubicacion || "").trim(),
      String(datos.talle || "").trim()
    ]);

    if (entrada && cantidadMovimiento > 0) {
      const hojaMov = ss.getSheetByName("Movimientos");

      if (hojaMov) {
        hojaMov.appendRow([
          construirFecha(entrada.fecha || ""),
          String(nuevoID),
          nombre,
          "Entrada",
          cantidadMovimiento,
          String(entrada.proveedor || "").trim(),
          String(entrada.factura || "").trim(),
          "",
          String(entrada.observacionEntrada || "").trim()
        ]);
      }
    }

    CacheService.getScriptCache().remove("articulos_v1");

    return {
      exito: true,
      id: nuevoID,
      nombre: nombre,
      stockIni: stockIni
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------
// EDITAR ARTÍCULO - CON LOCKSERVICE + CAMPOS CONDICIONALES
// ------------------------------------------------------------

function editarArticulo(datos) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!datos || !datos.id) {
      return { exito: false, error: "Falta ID del artículo" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("API_Prueba");

    if (!hoja) {
      return { exito: false, error: "No se encontró API_Prueba" };
    }

    const datosArt = hoja.getDataRange().getValues();
    let filaArt = -1;
    let imagenActual = "";

    for (let i = 1; i < datosArt.length; i++) {
      if (String(datosArt[i][0]).trim() === String(datos.id).trim()) {
        filaArt = i + 1;
        imagenActual = datosArt[i][4];
        break;
      }
    }

    if (filaArt === -1) {
      return { exito: false, error: "Artículo no encontrado" };
    }

    let imagenFinal = imagenActual;

    if (datos.imagenBase64 && datos.imagenBase64.startsWith("data:image")) {
      try {
        const PATH_FILE = "img/art_" + datos.id + ".jpg";
        const urlApi = "https://api.github.com/repos/" +
          REPO_OWNER + "/" + REPO_NAME + "/contents/" + PATH_FILE;

        const splitBase64 = datos.imagenBase64.split(",");

        if (splitBase64.length < 2) {
          throw new Error("imagenBase64 malformado (falta coma data:...)");
        }

        const bytes = Utilities.base64Decode(splitBase64[1]);

        const payload = {
          message: "Foto actualizada para el artículo ID " + datos.id,
          content: Utilities.base64Encode(bytes),
          branch: "main"
        };

        const getOptions = {
          method: "GET",
          headers: {
            Authorization: "token " + GITHUB_TOKEN,
            "User-Agent": "InventarioPro-App"
          },
          muteHttpExceptions: true
        };

        const checkExist = UrlFetchApp.fetch(urlApi, getOptions);

        if (checkExist.getResponseCode() === 200) {
          const fileData = JSON.parse(checkExist.getContentText());
          payload.sha = fileData.sha;
        }

        const postOptions = {
          method: "PUT",
          headers: {
            Authorization: "token " + GITHUB_TOKEN,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "InventarioPro-App"
          },
          contentType: "application/json",
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(urlApi, postOptions);

        if (response.getResponseCode() === 200 ||
            response.getResponseCode() === 201) {
          imagenFinal = PATH_FILE;
        } else {
          throw new Error(JSON.parse(response.getContentText()).message);
        }

      } catch (err) {
        return {
          exito: false,
          error: "Error guardando imagen en GitHub: " + err.message
        };
      }
    }

    hoja.getRange(filaArt, 2).setValue(datos.nombre);
    hoja.getRange(filaArt, 4).setValue(datos.categoria);
    hoja.getRange(filaArt, 5).setValue(imagenFinal);
    hoja.getRange(filaArt, 6).setValue(datos.observaciones);
    hoja.getRange(filaArt, 8).setValue(datos.unidadMedida);
    hoja.getRange(filaArt, 9).setValue(datos.multiplicador);
    hoja.getRange(filaArt, 11).setValue(datos.stockMin);

    if (datos.patrimonio !== undefined) {
      hoja.getRange(filaArt, 7).setValue(String(datos.patrimonio || "").trim());
    }
    if (datos.capacidadMax !== undefined) {
      hoja.getRange(filaArt, 10).setValue(Number(datos.capacidadMax) || 0);
    }
    if (datos.stockCritico !== undefined) {
      hoja.getRange(filaArt, 12).setValue(Number(datos.stockCritico) || 0);
    }
    if (datos.ubicacion !== undefined) {
      hoja.getRange(filaArt, 13).setValue(String(datos.ubicacion || "").trim());
    }
    if (datos.talle !== undefined) {
      hoja.getRange(filaArt, 14).setValue(String(datos.talle || "").trim());
    }

    CacheService.getScriptCache().remove("articulos_v1");

    return { exito: true, mensaje: "Artículo actualizado" };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------
// ELIMINAR ARTÍCULO - CON LOCKSERVICE
// ------------------------------------------------------------

function eliminarArticulo(id) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!id) return { exito: false, error: "Falta ID" };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaArt = ss.getSheetByName("API_Prueba");

    if (!hojaArt) {
      return { exito: false, error: "No se encontró API_Prueba" };
    }

    const datos = hojaArt.getDataRange().getValues();
    let fila = -1;
    let nombre = "";

    for (let i = 1; i < datos.length; i++) {
      if (String(datos[i][0]).trim() === String(id).trim()) {
        fila = i + 1;
        nombre = String(datos[i][1] || "").trim();
        break;
      }
    }

    if (fila === -1) {
      return {
        exito: false,
        error: "Artículo no encontrado con ID: " + id
      };
    }

    hojaArt.deleteRow(fila);
    CacheService.getScriptCache().remove("articulos_v1");

    return {
      exito: true,
      id: String(id),
      nombre: nombre,
      mensaje: "Artículo eliminado correctamente"
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// 05. MOVIMIENTOS DE STOCK
// ============================================================

function registrarEntrada(id, cantidad, proveedor, ordenCompra, tipoCompra, observacion, fecha, incompleto) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!id || !cantidad || cantidad <= 0) {
      return { exito: false, error: "ID o cantidad inválida" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaArt = ss.getSheetByName("API_Prueba");

    if (!hojaArt) {
      return { exito: false, error: "No se encontró API_Prueba" };
    }

    const datosArt = hojaArt.getDataRange().getValues();
    let filaArt = -1;
    let nombreArticulo = "";

    for (let i = 1; i < datosArt.length; i++) {
      if (String(datosArt[i][0]) === String(id)) {
        filaArt = i + 1;
        nombreArticulo = datosArt[i][1];
        break;
      }
    }

    if (filaArt === -1) {
      return {
        exito: false,
        error: "Artículo no encontrado con ID: " + id
      };
    }

    const stockActual = Number(hojaArt.getRange(filaArt, 3).getValue()) || 0;
    const stockNuevo = stockActual + Number(cantidad);

    hojaArt.getRange(filaArt, 3).setValue(stockNuevo);

    const hojaMov = ss.getSheetByName("Movimientos");

    if (!hojaMov) {
      return { exito: false, error: "No se encontró Movimientos" };
    }

    hojaMov.appendRow([
      construirFecha(fecha),
      String(id),
      nombreArticulo,
      "Entrada",
      Number(cantidad),
      proveedor || "",
      ordenCompra || "",
      tipoCompra || "",
      observacion || ""
    ]);

    if (incompleto === true) {
      var obsActual = String(datosArt[filaArt - 1][5] || "");

      if (obsActual.indexOf("⚠") === -1) {
        hojaArt.getRange(filaArt, 6).setValue(
          "⚠️ Faltan datos de entrada (Prov/Factura). " + obsActual
        );
      }
    }

    CacheService.getScriptCache().remove("articulos_v1");

    return {
      exito: true,
      mensaje: "Entrada registrada correctamente",
      stockNuevo: stockNuevo
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function registrarSalida(id, cantidad, destino, factura, observacion, fecha) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!id || !cantidad || cantidad <= 0) {
      return { exito: false, error: "ID o cantidad inválida" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaArt = ss.getSheetByName("API_Prueba");

    if (!hojaArt) {
      return { exito: false, error: "No se encontró API_Prueba" };
    }

    const datosArt = hojaArt.getDataRange().getValues();
    let filaArt = -1;
    let nombreArticulo = "";

    for (let i = 1; i < datosArt.length; i++) {
      if (String(datosArt[i][0]) === String(id)) {
        filaArt = i + 1;
        nombreArticulo = datosArt[i][1];
        break;
      }
    }

    if (filaArt === -1) {
      return {
        exito: false,
        error: "Artículo no encontrado con ID: " + id
      };
    }

    const stockActual = Number(hojaArt.getRange(filaArt, 3).getValue()) || 0;
    const cantidadNum = Number(cantidad) || 0;

    if (stockActual < cantidadNum) {
      return {
        exito: false,
        error: "Stock insuficiente. Stock actual: " + stockActual
      };
    }

    const stockNuevo = stockActual - cantidadNum;
    hojaArt.getRange(filaArt, 3).setValue(stockNuevo);

    const hojaMov = ss.getSheetByName("Movimientos");

    if (!hojaMov) {
      return { exito: false, error: "No se encontró Movimientos" };
    }

    hojaMov.appendRow([
      construirFecha(fecha),
      String(id),
      nombreArticulo,
      "Salida",
      cantidadNum,
      destino || "",
      factura || "",
      "",
      observacion || ""
    ]);

    CacheService.getScriptCache().remove("articulos_v1");

    return {
      exito: true,
      mensaje: "Salida registrada correctamente",
      stockNuevo: stockNuevo
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function registrarRelevamiento(id, stockReal, observacion, fecha) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!id || stockReal === undefined || stockReal === null || stockReal === "") {
      return {
        exito: false,
        error: "ID o stock real inválido"
      };
    }

    const stockRealNum = Number(stockReal);

    if (isNaN(stockRealNum) || stockRealNum < 0) {
      return {
        exito: false,
        error: "El stock real debe ser un número mayor o igual a 0"
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaArt = ss.getSheetByName("API_Prueba");

    if (!hojaArt) {
      return { exito: false, error: "No se encontró API_Prueba" };
    }

    const datosArt = hojaArt.getDataRange().getValues();
    let filaArt = -1;
    let nombreArticulo = "";
    let stockSistema = 0;
    let stockCritico = 0;

    for (let i = 1; i < datosArt.length; i++) {
      if (String(datosArt[i][0]) === String(id)) {
        filaArt = i + 1;
        nombreArticulo = datosArt[i][1];
        stockSistema = Number(datosArt[i][2]) || 0;
        stockCritico = Number(datosArt[i][11]) || 0;
        break;
      }
    }

    if (filaArt === -1) {
      return {
        exito: false,
        error: "Artículo no encontrado con ID: " + id
      };
    }

    const diferencia = stockRealNum - stockSistema;

    if (diferencia === 0) {
      return {
        exito: true,
        mensaje: "El stock ya estaba correcto. Sin cambios.",
        stockNuevo: stockSistema,
        diferencia: 0,
        stockCriticoAlerta: stockSistema <= stockCritico && stockCritico > 0
      };
    }

    const obsTrim = String(observacion || "").trim();
    if (!obsTrim) {
      return {
        exito: false,
        error: "La observación es obligatoria cuando hay diferencia de stock"
      };
    }

    hojaArt.getRange(filaArt, 3).setValue(stockRealNum);

    const hojaMov = ss.getSheetByName("Movimientos");

    if (!hojaMov) {
      return { exito: false, error: "No se encontró Movimientos" };
    }

    hojaMov.appendRow([
      construirFecha(fecha),
      String(id),
      nombreArticulo,
      "Relevamiento",
      diferencia,
      "Sistema: " + stockSistema + " → Real: " + stockRealNum,
      "",
      "",
      obsTrim
    ]);

    CacheService.getScriptCache().remove("articulos_v1");

    return {
      exito: true,
      mensaje: "Relevamiento registrado correctamente",
      stockAnterior: stockSistema,
      stockNuevo: stockRealNum,
      diferencia: diferencia,
      stockCriticoAlerta: stockRealNum <= stockCritico && stockCritico > 0
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// 06. HISTORIAL Y ÚLTIMOS MOVIMIENTOS
// ============================================================

function obtenerUltimasEntradas(cantidad) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Movimientos");
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();
  const ultimas = [];
  const limite = datos.length - 1;

  for (let i = limite; i >= 1 && ultimas.length < cantidad; i--) {
    if (datos[i][3] === "Entrada") {
      ultimas.push({
        fecha: datos[i][0],
        id: datos[i][1],
        nombre: datos[i][2],
        tipo: datos[i][3],
        cantidad: datos[i][4],
        proveedor: datos[i][5],
        orden: datos[i][6],
        observacion: datos[i][8]
      });
    }
  }

  return ultimas;
}

function obtenerUltimasSalidas(cantidad) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Movimientos");
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();
  const ultimas = [];
  const limite = datos.length - 1;

  for (let i = limite; i >= 1 && ultimas.length < cantidad; i--) {
    if (datos[i][3] === "Salida") {
      ultimas.push({
        fecha: datos[i][0],
        id: datos[i][1],
        nombre: datos[i][2],
        tipo: datos[i][3],
        cantidad: datos[i][4],
        destino: datos[i][5],
        factura: datos[i][6],
        observacion: datos[i][8]
      });
    }
  }

  return ultimas;
}

function listarMovimientos(idArticulo) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Movimientos");
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();
  datos.shift();

  const resultado = [];

  for (let i = 0; i < datos.length; i++) {
    const fila = datos[i];

    if (idArticulo && String(fila[1]).trim() !== String(idArticulo).trim()) {
      continue;
    }

    resultado.push({
      fecha: fila[0] instanceof Date ? fila[0].toISOString() : String(fila[0]),
      idArticulo: String(fila[1]),
      nombre: String(fila[2]),
      tipo: String(fila[3]),
      cantidad: Number(fila[4]) || 0,
      proveedor: String(fila[5] || ""),
      ordenCompra: String(fila[6] || ""),
      tipoCompra: String(fila[7] || ""),
      observacion: String(fila[8] || "")
    });
  }

  return resultado;
}

// ============================================================
// 07. DIRECCIONES
// ============================================================

function listarDirecciones() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Estructura");

  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();
  const resultado = [];

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][4] || "").trim().toUpperCase() !== "SI") continue;

    resultado.push({
      id: String(datos[i][0] || "").trim(),
      nombre: String(datos[i][1] || "").trim(),
      tipo: String(datos[i][2] || "").trim(),
      dependenciaSuperior: String(datos[i][3] || "").trim(),
      director: String(datos[i][6] || "").trim()
    });
  }

  return resultado;
}

function guardarDireccion(nombre, tipo, dependenciaSuperior) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!nombre || !nombre.trim()) {
      return { exito: false, error: "El nombre es obligatorio" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName("Estructura");

    if (!hoja) {
      return { exito: false, error: "No se encontró Estructura" };
    }

    const datos = hoja.getDataRange().getValues();
    const nombreNorm = normalizarNombreDireccion(nombre);

    let maxNumero = 900;

    for (let i = 1; i < datos.length; i++) {
      if (normalizarNombreDireccion(datos[i][1]) === nombreNorm) {
        return {
          exito: false,
          error: "Ya existe una dirección con ese nombre",
          idExistente: String(datos[i][0] || "").trim()
        };
      }

      const idStr = String(datos[i][0] || "").trim();
      const match = idStr.match(/^MT(\d+)$/);

      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumero) maxNumero = num;
      }
    }

    const nuevoID = "MT" + (maxNumero + 1);

    hoja.appendRow([
      nuevoID,
      nombre.trim(),
      tipo.trim() || "Dirección",
      dependenciaSuperior.trim() || "",
      "SI",
      nombre.trim()
    ]);

    return {
      exito: true,
      id: nuevoID,
      nombre: nombre.trim(),
      tipo: tipo.trim() || "Dirección",
      dependenciaSuperior: dependenciaSuperior.trim() || "",
      mensaje: "Dirección guardada correctamente"
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function obtenerEstadisticasDirecciones() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaDir = ss.getSheetByName("Estructura");

  if (!hojaDir) {
    return { exito: false, error: "No se encontró Estructura" };
  }

  const datosDir = hojaDir.getDataRange().getValues();
  const direccionesOficiales = {};

  for (let i = 1; i < datosDir.length; i++) {
    const nombre = String(datosDir[i][1] || "").trim();

    if (nombre && String(datosDir[i][4] || "").trim().toUpperCase() === "SI") {
      direccionesOficiales[normalizarNombreDireccion(nombre)] = {
        nombre: nombre,
        total: 0,
        articulos: {}
      };
    }
  }

  const hojaMov = ss.getSheetByName("Movimientos");

  if (!hojaMov) {
    return { exito: false, error: "No se encontró Movimientos" };
  }

  const datosMov = hojaMov.getDataRange().getValues();
  const hojaArt = ss.getSheetByName("API_Prueba");
  const categoriasPorID = {};

  if (hojaArt) {
    const datosArt = hojaArt.getDataRange().getValues();

    for (let i = 1; i < datosArt.length; i++) {
      categoriasPorID[String(datosArt[i][0]).trim()] =
        String(datosArt[i][3] || "").trim();
    }
  }

  for (let i = 1; i < datosMov.length; i++) {
    if (String(datosMov[i][3] || "").trim() !== "Salida") continue;

    const idArt = String(datosMov[i][1]).trim();
    const nombreArt = String(datosMov[i][2] || "").trim();
    const cantidad = Number(datosMov[i][4]) || 0;
    const destino = String(datosMov[i][5] || "").trim();

    if (!destino || cantidad <= 0) continue;

    const claveDestino = normalizarNombreDireccion(destino);

    if (direccionesOficiales[claveDestino]) {
      const dir = direccionesOficiales[claveDestino];
      dir.total += cantidad;

      const categoria = categoriasPorID[idArt] || "Sin categoría";
      const claveArt = nombreArt + "|" + categoria;

      if (!dir.articulos[claveArt]) {
        dir.articulos[claveArt] = {
          articulo: nombreArt,
          categoria: categoria,
          cantidad: 0
        };
      }

      dir.articulos[claveArt].cantidad += cantidad;
    }
  }

  const resultado = [];

  for (const clave in direccionesOficiales) {
    const dir = direccionesOficiales[clave];

    resultado.push({
      direccion: dir.nombre,
      total: dir.total,
      articulos: Object.values(dir.articulos)
        .sort((a, b) => b.cantidad - a.cantidad)
    });
  }

  return resultado
    .sort((a, b) => b.total - a.total)
    .filter(d => d.total > 0);
}

// ============================================================
// 08. DASHBOARD Y ESTADÍSTICAS
// ============================================================

function obtenerEstadisticasDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaArt = ss.getSheetByName("API_Prueba");

  if (!hojaArt) {
    return { exito: false, error: "No se encontró API_Prueba" };
  }

  const datosArt = hojaArt.getDataRange().getValues();

  let totalArticulos = 0;
  let unidadesTotales = 0;
  let criticos = 0;

  const categoriasSet = new Set();
  const articulosCriticos = [];

  for (let i = 1; i < datosArt.length; i++) {
    const nombre = String(datosArt[i][1] || "").trim();
    if (!nombre) continue;

    totalArticulos++;

    const stock = Number(datosArt[i][2]) || 0;
    const cat = String(datosArt[i][3] || "").trim();
    const stockCritico = Number(datosArt[i][11]) || 0;

    unidadesTotales += stock;

    if (cat) categoriasSet.add(cat);

    if (stock === 0 || (stockCritico > 0 && stock <= stockCritico)) {
      criticos++;

      articulosCriticos.push({
        id: String(datosArt[i][0]).trim(),
        articulo: nombre,
        stock: stock,
        categoria: cat
      });
    }
  }

  articulosCriticos.sort((a, b) => a.stock - b.stock);
  const top5Criticos = articulosCriticos.slice(0, 5);

  const hojaMov = ss.getSheetByName("Movimientos");

  if (!hojaMov) {
    return { exito: false, error: "No se encontró Movimientos" };
  }

  const datosMov = hojaMov.getDataRange().getValues();

  const ahoraARG = new Date(Date.now() - (3 * 60 * 60 * 1000));
  const añoHoy = ahoraARG.getFullYear();
  const mesHoy = ahoraARG.getMonth();
  const diaHoy = ahoraARG.getDate();

  let entradasMes = 0;
  let salidasMes = 0;

  const entradasHoy = [];
  const salidasConRemito = [];

  for (let i = 1; i < datosMov.length; i++) {
    const fechaRaw = datosMov[i][0];
    const tipo = String(datosMov[i][3] || "").trim();
    const cantidad = Number(datosMov[i][4]) || 0;
    const nombreArt = String(datosMov[i][2] || "").trim();
    const proveedor = String(datosMov[i][5] || "").trim();
    const remito = String(datosMov[i][6] || "").trim();

    if (!(fechaRaw instanceof Date)) continue;

    const fechaARG = new Date(fechaRaw.getTime() - (3 * 60 * 60 * 1000));

    const año = fechaARG.getFullYear();
    const mes = fechaARG.getMonth();
    const dia = fechaARG.getDate();

    if (tipo === "Entrada" && año === añoHoy && mes === mesHoy) {
      entradasMes += cantidad;
    }

    if (tipo === "Salida" && año === añoHoy && mes === mesHoy) {
      salidasMes += cantidad;
    }

    if (tipo === "Entrada" && año === añoHoy && mes === mesHoy && dia === diaHoy) {
      entradasHoy.push({
        fecha: fechaRaw.toISOString(),
        articulo: nombreArt,
        cantidad: cantidad,
        proveedor: proveedor
      });
    }

    if (tipo === "Salida" && remito) {
      salidasConRemito.push({
        fecha: fechaRaw.toISOString(),
        articulo: nombreArt,
        cantidad: cantidad,
        destino: proveedor,
        remito: remito
      });
    }
  }

  entradasHoy.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  salidasConRemito.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return {
    totalArticulos: totalArticulos,
    categorias: categoriasSet.size,
    unidadesTotales: unidadesTotales,
    criticos: criticos,
    entradasMes: entradasMes,
    salidasMes: salidasMes,
    top5Criticos: top5Criticos,
    entradasHoy: entradasHoy.slice(0, 5),
    salidasConRemito: salidasConRemito.slice(0, 5)
  };
}

// ============================================================
// 09. PEDIDOS
// ============================================================

function listarPedidos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaPed = ss.getSheetByName("Pedidos");
  const hojaDet = ss.getSheetByName("Detalle_Pedido");

  if (!hojaPed || !hojaDet) {
    return {
      exito: false,
      error: "Faltan hojas Pedidos o Detalle_Pedido"
    };
  }

  const datosPed = hojaPed.getDataRange().getValues();
  const datosDet = hojaDet.getDataRange().getValues();

  const detallePorPedido = {};

  for (let i = 1; i < datosDet.length; i++) {
    const idPed = String(datosDet[i][1] || "").trim();
    if (!idPed) continue;

    if (!detallePorPedido[idPed]) {
      detallePorPedido[idPed] = [];
    }

    detallePorPedido[idPed].push({
      idDetalle: String(datosDet[i][0] || "").trim(),
      articuloNombre: String(datosDet[i][2] || "").trim(),
      articuloId: String(datosDet[i][3] || "").trim(),
      categoria: String(datosDet[i][4] || "").trim(),
      cantidad: Number(datosDet[i][5]) || 0,
      textoCantidad: String(datosDet[i][6] || ""),
      formatoCantidad: String(datosDet[i][7] || "unidades").trim()
    });
  }

  const pedidos = [];

  for (let i = 1; i < datosPed.length; i++) {
    const idPed = String(datosPed[i][0] || "").trim();
    if (!idPed) continue;

    const fechaISO = datosPed[i][6] instanceof Date
      ? datosPed[i][6].toISOString()
      : String(datosPed[i][6] || "");

    const items = detallePorPedido[idPed] || [];
    const totalUnidades = items.reduce((a, it) => a + it.cantidad, 0);

    pedidos.push({
      id: idPed,
      nota: String(datosPed[i][1] || "").trim(),
      direccion: String(datosPed[i][2] || "").trim(),
      director: String(datosPed[i][3] || "").trim(),
      referencia: String(datosPed[i][4] || "").trim(),
      estado: String(datosPed[i][5] || "Pendiente").trim(),
      fecha: fechaISO,
      pdfRemito: String(datosPed[i][7] || "").trim(),
      items: items,
      totalUnidades: totalUnidades
    });
  }

  pedidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return { exito: true, pedidos: pedidos };
}

// ------------------------------------------------------------
// CREAR PEDIDO - CON LOCKSERVICE + DIRECTOR OBLIGATORIO + APRENDIZAJE
// ------------------------------------------------------------

function crearPedido(datos) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!datos) return { exito: false, error: "Sin datos" };

    if (!datos.direccion || !datos.direccion.trim()) {
      return { exito: false, error: "La dirección es obligatoria" };
    }

    if (!datos.director || !datos.director.trim()) {
      return { exito: false, error: "El director es obligatorio" };
    }

    if (!Array.isArray(datos.items) || datos.items.length === 0) {
      return { exito: false, error: "El carrito está vacío" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPed = ss.getSheetByName("Pedidos");
    const hojaDet = ss.getSheetByName("Detalle_Pedido");

    if (!hojaPed || !hojaDet) {
      return { exito: false, error: "Faltan hojas Pedidos o Detalle_Pedido" };
    }

    const idPedido = generarIDCorto();
    const fechaActual = construirFecha("");

    hojaPed.appendRow([
      idPedido,
      datos.nota || "",
      datos.direccion.trim(),
      datos.director.trim(),
      datos.referencia || "",
      "Pendiente",
      fechaActual,
      ""
    ]);

    datos.items.forEach(function(item) {
      hojaDet.appendRow([
        generarIDCorto(),
        idPedido,
        item.nombre || "",
        String(item.id || ""),
        item.categoria || "",
        Number(item.cantidad) || 0,
        item.textoCantidad || "",
        "unidades"
      ]);
    });

    // Aprendizaje de director en Estructura!G (match por dirección normalizada)
    try {
      const hojaEst = ss.getSheetByName("Estructura");
      if (hojaEst) {
        const director = datos.director.trim();
        const dirNorm = normalizarNombreDireccion(datos.direccion);
        const datosEst = hojaEst.getDataRange().getValues();
        let filaMatch = -1;
        for (let i = 1; i < datosEst.length; i++) {
          const nombreDir = String(datosEst[i][1] || "").trim();
          if (normalizarNombreDireccion(nombreDir) === dirNorm) {
            filaMatch = i + 1;
            break;
          }
        }
        if (filaMatch !== -1) {
          const gActual = String(datosEst[filaMatch - 1][6] || "").trim();
          if (!gActual) {
            hojaEst.getRange(filaMatch, 7).setValue(director);
          }
        }
      }
    } catch (errEst) {
      console.warn("No se pudo aprender el director: " + errEst.message);
    }

    return {
      exito: true,
      id: idPedido,
      mensaje: "Pedido creado en estado Pendiente"
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function editarPedido(idPedido, datos) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!idPedido) {
      return { exito: false, error: "Falta ID del pedido" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPed = ss.getSheetByName("Pedidos");
    const hojaDet = ss.getSheetByName("Detalle_Pedido");

    if (!hojaPed || !hojaDet) {
      return { exito: false, error: "Faltan hojas" };
    }

    const datosPed = hojaPed.getDataRange().getValues();
    let filaPed = -1;
    let estado = "";

  for (let i = 1; i < datosPed.length; i++) {
    if (String(datosPed[i][0]).trim() === String(idPedido).trim()) {
      filaPed = i + 1;
      estado = String(datosPed[i][5] || "").trim();
      break;
    }
  }

  if (filaPed === -1) {
    return { exito: false, error: "Pedido no encontrado" };
  }

  if (estado !== "Pendiente") {
    return {
      exito: false,
      error: "Solo se pueden editar pedidos Pendientes"
    };
  }

  if (datos.direccion !== undefined) {
    hojaPed.getRange(filaPed, 3).setValue(datos.direccion);
  }

  if (datos.director !== undefined) {
    hojaPed.getRange(filaPed, 4).setValue(datos.director);
  }

  if (datos.nota !== undefined) {
    hojaPed.getRange(filaPed, 2).setValue(datos.nota);
  }

  if (datos.referencia !== undefined) {
    hojaPed.getRange(filaPed, 5).setValue(datos.referencia);
  }

  if (Array.isArray(datos.items)) {
    const datosDet = hojaDet.getDataRange().getValues();

    for (let i = datosDet.length - 1; i >= 1; i--) {
      if (String(datosDet[i][1]).trim() === String(idPedido).trim()) {
        hojaDet.deleteRow(i + 1);
      }
    }

    datos.items.forEach(function(item) {
      hojaDet.appendRow([
        generarIDCorto(),
        idPedido,
        item.nombre || "",
        String(item.id || ""),
        item.categoria || "",
        Number(item.cantidad) || 0,
        item.textoCantidad || "",
        "unidades"
      ]);
    });
  }

  return { exito: true, mensaje: "Pedido actualizado" };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function cancelarPedido(idPedido) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!idPedido) {
      return { exito: false, error: "Falta ID" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPed = ss.getSheetByName("Pedidos");
    const hojaDet = ss.getSheetByName("Detalle_Pedido");

    if (!hojaPed || !hojaDet) {
      return { exito: false, error: "Faltan hojas" };
    }

    const datosPed = hojaPed.getDataRange().getValues();
    let filaPed = -1;
    let estado = "";

  for (let i = 1; i < datosPed.length; i++) {
    if (String(datosPed[i][0]).trim() === String(idPedido).trim()) {
      filaPed = i + 1;
      estado = String(datosPed[i][5] || "").trim();
      break;
    }
  }

  if (filaPed === -1) {
    return { exito: false, error: "Pedido no encontrado" };
  }

  if (estado !== "Pendiente") {
    return {
      exito: false,
      error: "Solo se pueden cancelar pedidos Pendientes"
    };
  }

  const datosDet = hojaDet.getDataRange().getValues();

  for (let i = datosDet.length - 1; i >= 1; i--) {
    if (String(datosDet[i][1]).trim() === String(idPedido).trim()) {
      hojaDet.deleteRow(i + 1);
    }
  }

  hojaPed.deleteRow(filaPed);

  return { exito: true, mensaje: "Pedido cancelado" };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------
// CONFIRMAR PEDIDO - SOLO GUARDA LISTA (valida stock, NO descuenta, NO PDF)
// ------------------------------------------------------------

function confirmarPedido(idPedido) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!idPedido) {
      return { exito: false, error: "Falta ID" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPed = ss.getSheetByName("Pedidos");
    const hojaDet = ss.getSheetByName("Detalle_Pedido");
    const hojaArt = ss.getSheetByName("API_Prueba");

    if (!hojaPed || !hojaDet || !hojaArt) {
      return { exito: false, error: "Faltan hojas necesarias" };
    }

    const datosPed = hojaPed.getDataRange().getValues();
    let filaPed = -1;
    let pedido = null;

    for (let i = 1; i < datosPed.length; i++) {
      if (String(datosPed[i][0]).trim() === String(idPedido).trim()) {
        filaPed = i + 1;

        pedido = {
          id: String(datosPed[i][0]).trim(),
          nota: String(datosPed[i][1] || "").trim(),
          direccion: String(datosPed[i][2] || "").trim(),
          director: String(datosPed[i][3] || "").trim(),
          referencia: String(datosPed[i][4] || "").trim(),
          estado: String(datosPed[i][5] || "").trim()
        };

        break;
      }
    }

    if (filaPed === -1) {
      return { exito: false, error: "Pedido no encontrado" };
    }

    if (pedido.estado !== "Pendiente") {
      return {
        exito: false,
        error: "Solo se pueden confirmar pedidos Pendientes"
      };
    }

    const datosDet = hojaDet.getDataRange().getValues();
    const items = [];

    for (let i = 1; i < datosDet.length; i++) {
      if (String(datosDet[i][1]).trim() === String(idPedido).trim()) {
        items.push({
          articuloNombre: String(datosDet[i][2] || "").trim(),
          articuloId: String(datosDet[i][3] || "").trim(),
          categoria: String(datosDet[i][4] || "").trim(),
          cantidad: Number(datosDet[i][5]) || 0,
          textoCantidad: String(datosDet[i][6] || ""),
          formatoCantidad: String(datosDet[i][7] || "unidades").trim()
        });
      }
    }

    if (items.length === 0) {
      return { exito: false, error: "El pedido no tiene artículos" };
    }

    // ⚠️ DETECTAR PEDIDOS HISTÓRICOS (formato anterior con packs/cajas)
    const esHistorico = items.some(function(it) {
      return it.formatoCantidad !== "unidades" && /pack|caja|bulto/i.test(it.textoCantidad);
    });

    if (esHistorico) {
      console.warn("⚠️ PEDIDO HISTÓRICO DETECTADO #" + idPedido + ": se interpretan cantidades como UNIDADES directas. Verificar antes de confirmar.");
    }

    const datosArt = hojaArt.getDataRange().getValues();
    const artIndex = {};

    for (let i = 1; i < datosArt.length; i++) {
      artIndex[String(datosArt[i][0]).trim()] = {
        fila: i + 1,
        nombre: String(datosArt[i][1] || "").trim(),
        stock: Number(datosArt[i][2]) || 0
      };
    }

    const faltantes = [];

    items.forEach(function(it) {
      const art = artIndex[it.articuloId];

      if (!art) {
        faltantes.push(it.articuloNombre + " (no encontrado)");
      } else if (art.stock < it.cantidad) {
        faltantes.push(
          it.articuloNombre +
          " (stock " + art.stock +
          ", pide " + it.cantidad + ")"
        );
      }
    });

    if (faltantes.length > 0) {
      return {
        exito: false,
        error: "Stock insuficiente: " + faltantes.join(" / ")
      };
    }

    // ✅ SOLO CAMBIA ESTADO A "Confirmado" — NO descuenta stock, NO genera PDF
    hojaPed.getRange(filaPed, 6).setValue("Confirmado");
    // Columna H (PDF_Remito) queda vacía hasta la entrega real

    return {
      exito: true,
      mensaje: "Pedido confirmado (lista guardada). Stock NO descontado. Use 'generarRemitoEntrega' cuando salgan los productos.",
      estadoNuevo: "Confirmado",
      esHistorico: esHistorico
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------
// NUEVO: GENERAR REMITO ENTREGA - Descuenta stock + PDF con firmas
// ------------------------------------------------------------

function generarRemitoEntrega(idPedido) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!idPedido) {
      return { exito: false, error: "Falta ID" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPed = ss.getSheetByName("Pedidos");
    const hojaDet = ss.getSheetByName("Detalle_Pedido");
    const hojaArt = ss.getSheetByName("API_Prueba");
    const hojaMov = ss.getSheetByName("Movimientos");

    if (!hojaPed || !hojaDet || !hojaArt || !hojaMov) {
      return { exito: false, error: "Faltan hojas necesarias" };
    }

    const datosPed = hojaPed.getDataRange().getValues();
    let filaPed = -1;
    let pedido = null;

    for (let i = 1; i < datosPed.length; i++) {
      if (String(datosPed[i][0]).trim() === String(idPedido).trim()) {
        filaPed = i + 1;

        pedido = {
          id: String(datosPed[i][0]).trim(),
          nota: String(datosPed[i][1] || "").trim(),
          direccion: String(datosPed[i][2] || "").trim(),
          director: String(datosPed[i][3] || "").trim(),
          referencia: String(datosPed[i][4] || "").trim(),
          estado: String(datosPed[i][5] || "").trim()
        };

        break;
      }
    }

    if (filaPed === -1) {
      return { exito: false, error: "Pedido no encontrado" };
    }

    if (pedido.estado !== "Confirmado") {
      return {
        exito: false,
        error: "Solo se pueden entregar pedidos en estado 'Confirmado'. Estado actual: " + pedido.estado
      };
    }

    const datosDet = hojaDet.getDataRange().getValues();
    const items = [];

    for (let i = 1; i < datosDet.length; i++) {
      if (String(datosDet[i][1]).trim() === String(idPedido).trim()) {
        items.push({
          articuloNombre: String(datosDet[i][2] || "").trim(),
          articuloId: String(datosDet[i][3] || "").trim(),
          categoria: String(datosDet[i][4] || "").trim(),
          cantidad: Number(datosDet[i][5]) || 0,
          textoCantidad: String(datosDet[i][6] || ""),
          formatoCantidad: String(datosDet[i][7] || "unidades").trim()
        });
      }
    }

    if (items.length === 0) {
      return { exito: false, error: "El pedido no tiene artículos" };
    }

    const datosArt = hojaArt.getDataRange().getValues();
    const artIndex = {};

    for (let i = 1; i < datosArt.length; i++) {
      artIndex[String(datosArt[i][0]).trim()] = {
        fila: i + 1,
        nombre: String(datosArt[i][1] || "").trim(),
        stock: Number(datosArt[i][2]) || 0
      };
    }

    // Validar stock ANTES de descontar (doble chequeo por si cambió desde la confirmación)
    const faltantes = [];

    items.forEach(function(it) {
      const art = artIndex[it.articuloId];

      if (!art) {
        faltantes.push(it.articuloNombre + " (no encontrado)");
      } else if (art.stock < it.cantidad) {
        faltantes.push(
          it.articuloNombre +
          " (stock " + art.stock +
          ", pide " + it.cantidad + ")"
        );
      }
    });

    if (faltantes.length > 0) {
      return {
        exito: false,
        error: "Stock insuficiente al momento de la entrega: " + faltantes.join(" / ")
      };
    }

    const nroRemito = obtenerProximoNroRemito();
    const ahoraARG = new Date(Date.now() - (3 * 60 * 60 * 1000));

    // ✅ DESCONTA STOCK REAL + REGISTRA MOVIMIENTOS
    items.forEach(function(it) {
      const art = artIndex[it.articuloId];

      hojaArt.getRange(art.fila, 3).setValue(art.stock - it.cantidad);

      hojaMov.appendRow([
        ahoraARG,
        it.articuloId,
        it.articuloNombre,
        "Salida",
        it.cantidad,
        pedido.direccion,
        nroRemito,
        "",
        "Entrega Pedido #" + pedido.id
      ]);
    });

    CacheService.getScriptCache().remove("articulos_v1");

    // ✅ GENERA PDF CON FIRMAS
    let pdfUrl = "";

    try {
      pdfUrl = generarRemitoEntregaPDF(pedido, items, nroRemito);
    } catch (err) {
      pdfUrl = "ERROR_PDF: " + err.message;
    }

    // ✅ CAMBIA ESTADO A "Entregado" + GUARDA PDF
    hojaPed.getRange(filaPed, 6).setValue("Entregado");
    hojaPed.getRange(filaPed, 8).setValue(pdfUrl || nroRemito);

    return {
      exito: true,
      nroRemito: nroRemito,
      pdfUrl: pdfUrl,
      mensaje: "Entrega registrada. Stock descontado. Remito " + nroRemito + " generado con firmas.",
      estadoNuevo: "Entregado"
    };

  } catch (e) {
    return { exito: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

function obtenerProximoNroRemito() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaMov = ss.getSheetByName("Movimientos");

  if (!hojaMov) return "2026-0001";

  const anioActual = new Date(Date.now() - (3 * 60 * 60 * 1000)).getFullYear();
  const prefijo = String(anioActual) + "-";
  const datos = hojaMov.getDataRange().getValues();

  let maxSecuencial = 0;

  for (let i = 1; i < datos.length; i++) {
    const valor = String(datos[i][6] || "").trim();

    if (valor.indexOf(prefijo) === 0) {
      const sec = parseInt(valor.substring(prefijo.length), 10);

      if (!isNaN(sec) && sec > maxSecuencial) {
        maxSecuencial = sec;
      }
    }
  }

  return prefijo + String(maxSecuencial + 1).padStart(4, "0");
}

// ============================================================
// 10. GENERACIÓN DE PDF
// ============================================================

// PDF original (se mantiene por compatibilidad, pero ya no se usa en confirmarPedido)
function generarYGuardarRemitoPDF(pedido, items, nroRemito) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName("Configuracion");

  const textoRemito = hojaConfig
    ? hojaConfig.getRange("B1").getValue()
    : "En el día de la fecha, la Dirección de Compras, Contrataciones y Suministros se complace en informar que se procede a la entrega de los siguientes elementos.";

  const firmaNombre = hojaConfig
    ? hojaConfig.getRange("B2").getValue()
    : "NOELIA N. ABELANDO";

  const ahoraARG = new Date(Date.now() - (3 * 60 * 60 * 1000));

  const fechaTxt = Utilities.formatDate(
    ahoraARG,
    "America/Argentina/Buenos_Aires",
    "dd 'de' MMMM 'de' yyyy"
  );

  const fechaCorta = Utilities.formatDate(
    ahoraARG,
    "America/Argentina/Buenos_Aires",
    "dd/MM/yyyy HH:mm"
  );

  const anioRemito = ahoraARG.getFullYear();

  let filasHTML = "";

  items.forEach(function(it, idx) {
    const fondo = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    const numArt = String(idx + 1).padStart(2, "0");
    const cantidadMostrar = it.textoCantidad || it.cantidad;

    filasHTML +=
      '<tr style="background:' + fondo + '; border-bottom: 1px solid #e2e8f0;">' +
        '<td style="padding: 8px 10px; font-size: 12px; text-align: center; border-right: 1px solid #e2e8f0;">' + numArt + '</td>' +
        '<td style="padding: 8px 10px; font-size: 12px;">' + escaparHTML(it.articuloNombre) + '</td>' +
        '<td style="padding: 8px 10px; font-size: 12px; text-align: center;">' + cantidadMostrar + '</td>' +
      '</tr>';
  });

  const html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #000000; background: #ffffff; line-height: 1.5;">' +
      '<div style="text-align: right; font-size: 12px; margin-bottom: 30px;">La Plata, ' + fechaTxt + '</div>' +
      '<div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 25px; text-transform: uppercase;">Dirección de Compras, Contrataciones y Suministros</div>' +
      '<div style="font-size: 12px; margin-bottom: 20px;">' +
        '<div style="margin-bottom: 5px;"><strong>Área solicitante:</strong> ' + escaparHTML(pedido.direccion) + '</div>' +
        '<div style="margin-bottom: 5px;"><strong>Director:</strong> ' + escaparHTML(pedido.director || "—") + '</div>' +
        '<div style="margin-bottom: 5px;"><strong>Referencia:</strong> ' + escaparHTML(pedido.referencia || "—") + '</div>' +
        '<div style="margin-bottom: 5px;"><strong>Nota Interna:</strong> ' + escaparHTML(pedido.nota || "—") + '</div>' +
        '<div style="margin-bottom: 5px;"><strong>Número:</strong> NO-' + anioRemito + '-' + nroRemito.replace("-", "") + '-GDEBA-DPFTMTRAGP</div>' +
      '</div>' +
      '<div style="font-size: 12px; text-align: justify; margin-bottom: 25px;">' + escaparHTML(textoRemito) + '</div>' +
      '<table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 40px;">' +
        '<thead><tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">' +
          '<th style="padding: 8px; text-align: center; font-size: 12px; font-weight: bold; width: 50px; border-right: 1px solid #000000;">Art</th>' +
          '<th style="padding: 8px; text-align: left; font-size: 12px; font-weight: bold; border-right: 1px solid #000000;">Descripción</th>' +
          '<th style="padding: 8px; text-align: center; font-size: 12px; font-weight: bold; width: 80px;">unidad</th>' +
        '</tr></thead><tbody>' + filasHTML + '</tbody>' +
      '</table>' +
      '<div style="margin-top: 60px; text-align: center; width: 300px; margin-left: auto; margin-right: auto;">' +
        '<div style="height: 50px;"></div>' +
        '<div style="border-top: 1px solid #000000; padding-top: 5px; font-size: 12px; font-weight: bold; text-transform: uppercase;">' + escaparHTML(firmaNombre) + '</div>' +
      '</div>' +
      '<div style="margin-top: 30px; text-align: center; font-size: 9px; color: #666666;">Documento generado automáticamente el ' + fechaCorta + ' · Pedido #' + pedido.id + '</div>' +
    '</body></html>';

  const blob = Utilities
    .newBlob(html, "text/html", "remito.html")
    .getAs("application/pdf")
    .setName("Remito_" + nroRemito + ".pdf");

  const archivo = DriveApp.getFolderById(CARPETA_REMITOS_ID).createFile(blob);

  return archivo.getUrl();
}

// ------------------------------------------------------------
// NUEVO: PDF REMITO ENTREGA CON FIRMAS (Entrega / Recibe)
// ------------------------------------------------------------

function generarRemitoEntregaPDF(pedido, items, nroRemito) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaConfig = ss.getSheetByName("Configuracion");

  const textoRemito = hojaConfig
    ? hojaConfig.getRange("B1").getValue()
    : "En el día de la fecha, la Dirección de Compras, Contrataciones y Suministros se complace en informar que se procede a la entrega de los siguientes elementos.";

  const firmaNombre = hojaConfig
    ? hojaConfig.getRange("B2").getValue()
    : "NOELIA N. ABELANDO";

  const ahoraARG = new Date(Date.now() - (3 * 60 * 60 * 1000));

  const fechaTxt = Utilities.formatDate(
    ahoraARG,
    "America/Argentina/Buenos_Aires",
    "dd 'de' MMMM 'de' yyyy"
  );

  const fechaCorta = Utilities.formatDate(
    ahoraARG,
    "America/Argentina/Buenos_Aires",
    "dd/MM/yyyy HH:mm"
  );

  const anioRemito = ahoraARG.getFullYear();

  let filasHTML = "";

  items.forEach(function(it, idx) {
    const fondo = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    const numArt = String(idx + 1).padStart(2, "0");
    const cantidadMostrar = it.textoCantidad || it.cantidad;

    filasHTML +=
      '<tr style="background:' + fondo + '; border-bottom: 1px solid #e2e8f0;">' +
        '<td style="padding: 8px 10px; font-size: 12px; text-align: center; border-right: 1px solid #e2e8f0;">' + numArt + '</td>' +
        '<td style="padding: 8px 10px; font-size: 12px;">' + escaparHTML(it.articuloNombre) + '</td>' +
        '<td style="padding: 8px 10px; font-size: 12px; text-align: center;">' + cantidadMostrar + '</td>' +
      '</tr>';
  });

  // Total de unidades
  const totalUnidades = items.reduce((sum, it) => sum + (Number(it.cantidad) || 0), 0);

  const html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #000000; background: #ffffff; line-height: 1.5;">' +
      '<div style="text-align: right; font-size: 12px; margin-bottom: 30px;">La Plata, ' + fechaTxt + '</div>' +
      '<div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 25px; text-transform: uppercase;">Dirección de Compras, Contrataciones y Suministros</div>' +
      '<div style="font-size: 12px; margin-bottom: 20px;">' +
        '<div style="margin-bottom: 5px;"><strong>Área solicitante:</strong> ' + escaparHTML(pedido.direccion) + '</div>' +
        '<div style="margin-bottom: 5px;"><strong>Director:</strong> ' + escaparHTML(pedido.director || "—") + '</div>' +
        '<div style="margin-bottom: 5px;"><strong>Referencia:</strong> ' + escaparHTML(pedido.referencia || "—") + '</div>' +
        '<div style="margin-bottom: 5px;"><strong>Nota Interna:</strong> ' + escaparHTML(pedido.nota || "—") + '</div>' +
        '<div style="margin-bottom: 5px;"><strong>Número:</strong> NO-' + anioRemito + '-' + nroRemito.replace("-", "") + '-GDEBA-DPFTMTRAGP</div>' +
      '</div>' +
      '<div style="font-size: 12px; text-align: justify; margin-bottom: 25px;">' + escaparHTML(textoRemito) + '</div>' +
      '<table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 20px;">' +
        '<thead><tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">' +
          '<th style="padding: 8px; text-align: center; font-size: 12px; font-weight: bold; width: 50px; border-right: 1px solid #000000;">Art</th>' +
          '<th style="padding: 8px; text-align: left; font-size: 12px; font-weight: bold; border-right: 1px solid #000000;">Descripción</th>' +
          '<th style="padding: 8px; text-align: center; font-size: 12px; font-weight: bold; width: 80px;">unidad</th>' +
        '</tr></thead><tbody>' + filasHTML + '</tbody>' +
      '</table>' +
      '<div style="font-size: 12px; font-weight: bold; margin-bottom: 40px; text-align: right;">' +
        'Total de unidades: ' + totalUnidades.toLocaleString('es-AR') +
      '</div>' +

      // FIRMAS
      '<div style="margin-top: 60px; display: table; width: 100%;">' +
        '<div style="display: table-row;">' +
          '<div style="display: table-cell; width: 50%; padding-right: 40px; vertical-align: bottom;">' +
            '<div style="height: 60px;"></div>' +
            '<div style="border-top: 1px solid #000000; padding-top: 8px; font-size: 11px;">' +
              '<strong>ENTREGA</strong><br>' +
              'Nombre: ________________________________________<br>' +
              'DNI: ________________________________________<br>' +
              'Fecha: ____________________  Hora: _______________<br>' +
              'Firma: ________________________________________' +
            '</div>' +
          '</div>' +
          '<div style="display: table-cell; width: 50%; padding-left: 40px; vertical-align: bottom;">' +
            '<div style="height: 60px;"></div>' +
            '<div style="border-top: 1px solid #000000; padding-top: 8px; font-size: 11px;">' +
              '<strong>RECIBE</strong><br>' +
              'Nombre: ________________________________________<br>' +
              'DNI: ________________________________________<br>' +
              'Fecha: ____________________  Hora: _______________<br>' +
              'Firma: ________________________________________' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div style="margin-top: 30px; text-align: center; font-size: 9px; color: #666666;">' +
        'Documento generado automáticamente el ' + fechaCorta + ' · Pedido #' + pedido.id +
      '</div>' +
    '</body></html>';

  const blob = Utilities
    .newBlob(html, "text/html", "remito_entrega.html")
    .getAs("application/pdf")
    .setName("Remito_Entrega_" + nroRemito + ".pdf");

  const archivo = DriveApp.getFolderById(CARPETA_REMITOS_ID).createFile(blob);

  return archivo.getUrl();
}

// ============================================================
// 11. CONFIGURACIÓN Y SETUP
// ============================================================

function crearHojasPedidos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss.getSheetByName("Pedidos")) {
    const hoja = ss.insertSheet("Pedidos");

    hoja.appendRow([
      "ID_Pedido",
      "Nota",
      "Direccion",
      "Director",
      "Referencia_Motivo",
      "Estado",
      "Fecha",
      "PDF_Remito"
    ]);

    hoja.getRange("A1:H1").setFontWeight("bold");
  }

  if (!ss.getSheetByName("Detalle_Pedido")) {
    const hoja = ss.insertSheet("Detalle_Pedido");

    hoja.appendRow([
      "ID_Detalle",
      "ID_Pedido",
      "Articulo_Nombre",
      "Articulo_ID",
      "Categoria",
      "Cantidad",
      "Texto_Cantidad",
      "Formato_Cantidad"
    ]);

    hoja.getRange("A1:H1").setFontWeight("bold");
  }
}

function crearHojaConfiguracion() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName("Configuracion");

  if (!hoja) {
    hoja = ss.insertSheet("Configuracion");

    hoja.getRange("A1").setValue("Texto_Remito");

    hoja.getRange("B1").setValue(
      "En el día de la fecha, la Dirección de Compras, Contrataciones y Suministros se complace en informar que se procede a la entrega de los siguientes elementos, en el marco de las acciones de asistencia y provisión de recursos destinados a fortalecer las tareas que desarrolla dicha Dirección."
    );

    hoja.getRange("A2").setValue("Firma_Nombre");
    hoja.getRange("B2").setValue("NOELIA N. ABELANDO");

    hoja.getRange("A3").setValue("Firma_Cargo");
    hoja.getRange("B3").setValue("Dirección de Compras, Contrataciones y Suministros");

    hoja.getRange("A1:A3").setFontWeight("bold");
    hoja.setColumnWidth(1, 150);
    hoja.setColumnWidth(2, 600);
    hoja.getRange("B1").setWrap(true);
  }
}

// ============================================================
// 12. BOT DE IMPORTACIÓN DE PEDIDOS EXTERNOS
// ============================================================

function importarPedidosExternos() {
  const HOJA_DESTINO_NOMBRE = "Pedidos";
  const ERRORES = [];

  try {
    const ssExterno = SpreadsheetApp.openById(ID_EXTERNO_SEGUIMIENTO);
    const hojaExterna = ssExterno.getSheets()[0];
    const datosExternos = hojaExterna.getDataRange().getDisplayValues();

    if (datosExternos.length <= 1) {
      return {
        exito: true,
        importados: 0,
        duplicados: 0,
        saltados: 0,
        errores: ["Hoja externa sin datos (solo cabecera)"]
      };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaPedidos = ss.getSheetByName(HOJA_DESTINO_NOMBRE);

    if (!hojaPedidos) {
      throw new Error(
        "No se encontró la hoja '" + HOJA_DESTINO_NOMBRE + "' en el spreadsheet actual"
      );
    }

    const datosPedidos = hojaPedidos.getDataRange().getValues();
    const notasExistentes = new Set();

    for (let i = 1; i < datosPedidos.length; i++) {
      const nota = String(datosPedidos[i][1] || "").trim().toLowerCase();
      if (nota) notasExistentes.add(nota);
    }

    const filasParaInsertar = [];
    let duplicados = 0;
    let saltados = 0;

    const hojaEst = ss.getSheetByName("Estructura");
    const directoresCache = {};
    if (hojaEst) {
      const datosEst = hojaEst.getDataRange().getValues();
      for (let i = 1; i < datosEst.length; i++) {
        const nombre = String(datosEst[i][1] || "").trim();
        const director = String(datosEst[i][6] || "").trim();
        if (nombre) {
          directoresCache[normalizarNombreDireccion(nombre)] = director;
        }
      }
    }

    for (let i = 1; i < datosExternos.length; i++) {
      const fila = datosExternos[i];

      try {
        const fechaInicioRaw = fila[0];
        const notaExterna = String(fila[1] || "").trim();
        const categoria = String(fila[2] || "").trim();
        const destino = String(fila[3] || "").trim();
        const estadoRaw = String(fila[4] || "").trim().toLowerCase();
        const linkRemito = String(fila[6] || "").trim();

        if (!notaExterna) {
          saltados++;
          continue;
        }

        const esPendiente = estadoRaw.includes("pendiente");
        const esListo = estadoRaw.includes("listo para entregar");

        if (!esPendiente && !esListo) {
          saltados++;
          continue;
        }

        const notaNorm = notaExterna.trim().toLowerCase();

        if (notasExistentes.has(notaNorm)) {
          duplicados++;
          continue;
        }

        const directorDestino = directoresCache[normalizarNombreDireccion(destino)] || "";

        const fechaPedido = construirFecha(fechaInicioRaw);
        const referencia = categoria
          ? "Importado: " + categoria
          : "Importado: Sin categoría";

        filasParaInsertar.push([
          generarIDCorto(),
          notaExterna,
          destino,
          directorDestino,
          referencia,
          "Pendiente",
          fechaPedido,
          linkRemito
        ]);

        notasExistentes.add(notaNorm);

      } catch (errFila) {
        ERRORES.push("Fila " + (i + 1) + ": " + errFila.message);
        saltados++;
      }
    }

    let importados = 0;

    if (filasParaInsertar.length > 0) {
      const ultimaFila = hojaPedidos.getLastRow();

      const rangoDestino = hojaPedidos.getRange(
        ultimaFila + 1,
        1,
        filasParaInsertar.length,
        8
      );

      rangoDestino.setValues(filasParaInsertar);
      importados = filasParaInsertar.length;
    }

    return {
      exito: true,
      importados: importados,
      duplicados: duplicados,
      saltados: saltados,
      errores: ERRORES
    };

  } catch (errGlobal) {
    return {
      exito: false,
      error: "Error global importando pedidos: " + errGlobal.message,
      errores: ERRORES
    };
  }
}

function testImportar() {
  const r = importarPedidosExternos();
  console.log(JSON.stringify(r, null, 2));
}

// ============================================================
// 13. CONFIGURACIÓN DE TRIGGERS
// ============================================================

function configurarTrigger15Minutos() {
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(t => {
    if (t.getHandlerFunction() === "importarPedidosExternos") {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("importarPedidosExternos")
    .timeBased()
    .everyMinutes(15)
    .create();

  console.log("Trigger de 15 minutos configurado correctamente.");
}

// ============================================================
// FIN DEL ARCHIVO
// ============================================================