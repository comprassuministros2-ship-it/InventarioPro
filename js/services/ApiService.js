/**
 * ============================================================
 * APISERVICE - Servicio de comunicación con la API
 * ------------------------------------------------------------
 * Este archivo se encarga de TODAS las llamadas HTTP que hace
 * la app hacia Google Apps Script (Web App).
 * 
 * Métodos disponibles:
 *   - get()              → trae datos (ej: artículos)
 *   - post(payload)      → envía acciones al backend
 * ============================================================
 */
class ApiService {

    /**
     * ------------------------------------------------------------
     * CONSTRUCTOR
     * ------------------------------------------------------------
     * Se ejecuta al crear la instancia. Verifica que CONFIG esté
     * cargado y guarda la URL y el timeout.
     */
    constructor() {
        // Validar que la URL esté configurada
        if (typeof CONFIG === "undefined" || !CONFIG.API || !CONFIG.API.BASE_URL) {
            throw new Error("CONFIG.API.BASE_URL no está configurada.");
        }

        // Guardar la URL base de la API (Google Apps Script)
        this.baseUrl = CONFIG.API.BASE_URL;

        // Guardar el tiempo máximo de espera (por defecto 15 segundos)
        this.timeout = CONFIG.API.TIMEOUT_MS || 15000;
    }

    /**
     * ------------------------------------------------------------
     * MÉTODO INTERNO: ejecutarGet()
     * ------------------------------------------------------------
     * Hace una petición GET a la API.
     * Se usa para LEER datos (ej: obtener todos los artículos).
     */
    async ejecutarGet() {

        // Crear un "AbortController" para poder cancelar si tarda demasiado
        const controller = new AbortController();

        // Si la petición tarda más que el timeout, la cancelamos
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {

            // Hacer el GET a la API con la señal de cancelación
            const response = await fetch(this.baseUrl, {
                method: "GET",
                signal: controller.signal
            });

            // Si la respuesta no es 200 OK, lanzar error
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            // Convertir la respuesta a JSON y devolverla
            return await response.json();

        } catch (error) {

            // Si se canceló por timeout, dar un mensaje claro
            if (error.name === "AbortError") {
                throw new Error("La conexión con la API agotó el tiempo.");
            }

            // Si es otro error, relanzarlo
            throw error;

        } finally {

            // Siempre limpiar el timeout, haya funcionado o no
            clearTimeout(timeoutId);
        }
    }

    /**
     * ------------------------------------------------------------
     * MÉTODO INTERNO: ejecutarPost(payload)
     * ------------------------------------------------------------
     * Hace una petición POST a la API.
     * Se usa para ESCRIBIR datos (ej: registrar entrada/salida).
     * 
     * IMPORTANTE: 
     * - El Content-Type DEBE ser 'text/plain;charset=utf-8'
     *   porque Google Apps Script lo requiere así.
     * - NO usar mode: 'no-cors' porque no podríamos leer la respuesta.
     */
    async ejecutarPost(payload) {

        // Crear un AbortController para cancelar si tarda demasiado
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {

            // Hacer el POST a la API
            const response = await fetch(this.baseUrl, {
                method: "POST",

                // Content-Type especial que requiere Google Apps Script
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },

                // Convertir el payload a JSON (string)
                body: JSON.stringify(payload),

                // Seguir los redirects (Apps Script hace uno a googleusercontent.com)
                redirect: "follow",

                // Señal de cancelación por timeout
                signal: controller.signal
            });

            // Si la respuesta no es 200 OK, lanzar error
            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            // Convertir la respuesta a JSON y devolverla
            return await response.json();

        } catch (error) {

            // Si se canceló por timeout
            if (error.name === "AbortError") {
                throw new Error("La conexión con la API agotó el tiempo.");
            }

            // Si es otro error, relanzarlo
            throw error;

        } finally {

            // Limpiar el timeout siempre
            clearTimeout(timeoutId);
        }
    }

    /**
     * ------------------------------------------------------------
     * MÉTODO PÚBLICO: get()
     * ------------------------------------------------------------
     * Atajo para hacer un GET. Se usa desde otros servicios
     * (ej: articulosService.obtenerArticulos()).
     */
    async get() {
        return await this.ejecutarGet();
    }

    /**
     * ------------------------------------------------------------
     * MÉTODO PÚBLICO: post(payload)
     * ------------------------------------------------------------
     * Atajo para hacer un POST. Se usa desde otros servicios
     * (ej: articulosService.registrarEntrada(...)).
     * 
     * Ejemplo de payload:
     *   {
     *     accion: "registrarEntrada",
     *     id: 5,
     *     cantidad: 10,
     *     ...
     *   }
     */
    async post(payload) {
        return await this.ejecutarPost(payload);
    }
}

/**
 * ============================================================
 * INSTANCIA ÚNICA
 * ------------------------------------------------------------
 * Se crea UNA sola instancia de ApiService para que todos los
 * servicios la usen (y no crear múltiples).
 * 
 * Se usa así desde otros archivos:
 *   apiService.get()
 *   apiService.post({ accion: '...' })
 * ============================================================
 */
const apiService = new ApiService();