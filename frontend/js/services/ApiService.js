/**
 * ApiService
 *
 * Único punto de comunicación entre el frontend
 * y el Web App de Google Apps Script.
 */
class ApiService {

  constructor() {

    if (
      typeof CONFIG === "undefined" ||
      !CONFIG.API ||
      !CONFIG.API.BASE_URL
    ) {
      throw new Error(
        "CONFIG.API.BASE_URL no está configurada."
      );
    }

    this.baseUrl = CONFIG.API.BASE_URL;

    this.timeout =
      CONFIG.API.TIMEOUT_MS || 15000;
  }


  /**
   * Ejecuta una petición HTTP.
   */
  async ejecutar(url, opciones = {}) {

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.timeout);

    try {

      const response = await fetch(url, {
        ...opciones,
        redirect: "follow",
        signal: controller.signal
      });

      if (!response.ok) {

        throw new Error(
          `Error HTTP ${response.status}`
        );
      }

      const resultado = await response.json();

      /**
       * Apps Script puede devolver:
       *
       * GET:
       *   [...]
       *
       * POST:
       *   { exito: true, ... }
       *
       * Error:
       *   { exito: false, error: "..." }
       */

      if (
        resultado &&
        !Array.isArray(resultado) &&
        resultado.exito === false
      ) {

        throw new Error(
          resultado.error ||
          "Error desconocido en Apps Script"
        );
      }

      return resultado;

    } catch (error) {

      if (error.name === "AbortError") {

        throw new Error(
          "La conexión con la API agotó el tiempo de espera."
        );
      }

      throw error;

    } finally {

      clearTimeout(timeoutId);

    }
  }


  /**
   * GET
   *
   * Obtiene el listado completo de artículos.
   */
  async get() {

    return await this.ejecutar(
      this.baseUrl,
      {
        method: "GET"
      }
    );

  }


  /**
   * POST
   *
   * Envía una acción al backend.
   *
   * Ejemplo:
   *
   * {
   *   accion: "actualizarStock",
   *   id: 25,
   *   stock: 100
   * }
   */
  async post(payload) {

    return await this.ejecutar(
      this.baseUrl,
      {
        method: "POST",

        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },

        body: JSON.stringify(payload)
      }
    );

  }

}


/**
 * Instancia única utilizada por los servicios.
 */
const apiService = new ApiService();