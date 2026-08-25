class ArticulosService {
    constructor() {
        this.api = apiService;
    }

    async obtenerArticulos() {
        return await this.api.get();
    }

    async actualizarStock(id, nuevoStock) {
        return await this.api.post({
            accion: "actualizarStock",
            id: id,
            stock: nuevoStock
        });
    }
}

const articulosService = new ArticulosService();