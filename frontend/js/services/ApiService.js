class ApiService {

    constructor() {
        this.baseUrl = CONFIG.API.BASE_URL;
    }

    async get() {

        const response = await fetch(this.baseUrl);

        if (!response.ok) {
            throw new Error("Error al conectar con la API");
        }

        return await response.json();

    }

}

const apiService = new ApiService();