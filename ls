class ArticulosService {

    constructor() {
        this.api = apiService;
    }

    async obtenerArticulos() {

        return await this.api.get();

    }

}

const articulosService = new ArticulosService();