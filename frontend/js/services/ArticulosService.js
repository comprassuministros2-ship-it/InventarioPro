/**
 * ArticulosService
 * 
 * Servicio encargado de conectar el Frontend con la API de Google Sheets.
 * Todas las funciones retornan una Promesa.
 */
class ArticulosService {

    constructor() {
        this.api = apiService;
    }

    /**
     * Obtiene todos los artículos desde la hoja "API_Prueba".
     * Devuelve un array de objetos con los datos del inventario.
     */
    async obtenerArticulos() {
        return await this.api.get();
    }

    /**
     * Registrar una ENTRADA de mercadería.
     * Envía el ID del artículo y la cantidad que se suma al stock.
     * La API (Code.gs) guardará el movimiento en la hoja "Movimientos" y actualizará el stock.
     */
    async registrarEntrada(id, cantidad) {
        return await this.api.post({
            accion: "registrarEntrada",
            id: id,
            cantidad: cantidad
        });
    }

}

const articulosService = new ArticulosService();