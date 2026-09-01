class ArticulosService {
    /**
     * Obtiene todos los artículos desde Google Apps Script
     */
    async obtenerArticulos() {
        // Asumimos que ApiService tiene un método get()
        return await apiService.get();
    }

    /**
     * Envía los datos de una entrada al backend
     */
    async registrarEntrada(id, cantidad, proveedor, ordenCompra, tipoCompra, observacion, fecha) {
        // Armamos el objeto que le vamos a enviar a doPost(e) en Apps Script
        const payload = {
            accion: "registrarEntrada", // <- ESENCIAL: el switch del backend busca esto
            id: id,
            cantidad: cantidad,
            proveedor: proveedor,
            ordenCompra: ordenCompra,
            tipoCompra: tipoCompra,
            observacion: observacion,
            fecha: fecha // <- La fecha que agregamos en el paso anterior
        };

        // Asumimos que ApiService tiene un método post() que recibe un objeto
        return await apiService.post(payload);
    }
}

// Lo instanciamos para que script.js pueda usar "articulosService.obtenerArticulos()"
const articulosService = new ArticulosService();