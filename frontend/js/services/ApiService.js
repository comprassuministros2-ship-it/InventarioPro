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

    async post(datos) {

        const response = await fetch(this.baseUrl, {
            method: "POST",
            // Apps Script requiere text/plain para evitar problemas de CORS
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(datos)
        });

        if (!response.ok) {
            throw new Error("Error al conectar con la API");
        }

        return await response.json();

    }

}

const apiService = new ApiService();