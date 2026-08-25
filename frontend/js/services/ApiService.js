class ApiService {
  constructor() {
    if (typeof CONFIG === "undefined" || !CONFIG.API || !CONFIG.API.BASE_URL) {
      throw new Error("CONFIG.API.BASE_URL no está configurada.");
    }
    this.baseUrl = CONFIG.API.BASE_URL;
    this.timeout = CONFIG.API.TIMEOUT_MS || 15000;
  }

  // Función interna para el GET (lee datos)
  async ejecutarGet() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.baseUrl, { method: "GET", signal: controller.signal });
      if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
      const resultado = await response.json();
      return resultado;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("La conexión con la API agotó el tiempo.");
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Función interna para el POST (escribe datos con no-cors)
  async ejecutarPost(payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow",
        mode: "no-cors", // Clave para evitar el bloqueo
        signal: controller.signal
      });
      // Como no podemos leer la respuesta, asumimos éxito (la escritura se hizo en Apps Script)
      return { exito: true };
    } catch (error) {
      if (error.name === "AbortError") throw new Error("La conexión con la API agotó el tiempo.");
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get() {
    return await this.ejecutarGet();
  }

  async post(payload) {
    return await this.ejecutarPost(payload);
  }
}

const apiService = new ApiService();