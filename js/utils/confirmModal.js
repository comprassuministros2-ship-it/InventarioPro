/**
 * ============================================================
 * CONFIRM MODAL - Modal de confirmación personalizado
 * ------------------------------------------------------------
 * Reemplaza window.confirm() con un modal moderno, accesible
 * y reutilizable para todas las confirmaciones de la app.
 *
 * Uso:
 *   import { confirmarAccion } from './utils/confirmModal.js';
 *
 *   confirmarAccion({
 *       titulo: 'Confirmar pedido',
 *       mensaje: 'Vas a confirmar el siguiente pedido:',
 *       items: [{ nombre: 'Tarjetas PVC', cantidad: '2.000 uds' }],
 *       direccion: 'Depósito Central',
 *       solicitante: 'Juan Pérez',
 *       onConfirm: () => { /* lógica *\/ },
 *       onCancel: () => { /* opcional *\/ }
 *   });
 *
 *   // Para acciones destructivas (cancelar/anular):
 *   confirmarAccion({
 *       ...,
 *       danger: true,
 *       textoConfirmar: 'Sí, anular'
 *   });
 * ============================================================
 */

// Estado del modal
let modalState = {
    resolve: null,
    reject: null,
    onConfirm: null,
    onCancel: null
};

// Elementos del DOM (se cachean al inicializar)
let elements = {};

/**
 * Inicializa referencias a elementos del DOM
 */
function initElements() {
    elements = {
        overlay: document.getElementById('modalConfirm'),
        title: document.getElementById('modalConfirmTitle'),
        message: document.getElementById('modalConfirmMessage'),
        details: document.getElementById('modalConfirmDetails'),
        cancelBtn: document.getElementById('modalConfirmCancel'),
        confirmBtn: document.getElementById('modalConfirmOk'),
        closeBtn: elements.overlay?.querySelector('.modal-confirm-close')
    };
}

/**
 * Construye el HTML de los detalles del pedido
 */
function buildDetailsHTML({ items = [], direccion = '', solicitante = '', referencia = '' }) {
    let html = '';

    // Items
    if (items.length > 0) {
        html += items.map(item => `
            <div class="confirm-item">
                <span class="confirm-label">${escapeHtml(item.nombre)}</span>
                <span class="confirm-value">${escapeHtml(item.cantidad)}</span>
            </div>
        `).join('');

        if (direccion || solicitante) {
            html += '<div class="confirm-divider"></div>';
        }
    }

    // Meta: dirección y solicitante
    if (direccion || solicitante) {
        html += '<div class="confirm-meta">';
        if (direccion) {
            html += `<span class="confirm-label">Dirección</span><span class="confirm-value">${escapeHtml(direccion)}</span>`;
        }
        if (solicitante) {
            html += `<span class="confirm-label">Solicitado por</span><span class="confirm-value">${escapeHtml(solicitante)}</span>`;
        }
        html += '</div>';
    }

    return html || '<em style="color: var(--text-muted);">Sin detalles</em>';
}

/**
 * Abre el modal con la configuración dada
 */
function openModal(config) {
    initElements();

    const {
        titulo = 'Confirmar acción',
        mensaje = '¿Estás seguro de realizar esta acción?',
        items = [],
        direccion = '',
        solicitante = '',
        danger = false,
        textoConfirmar = 'Confirmar'
    } = config;

    // Configurar contenido
    elements.title.textContent = titulo;
    elements.message.textContent = mensaje;
    elements.details.innerHTML = buildDetailsHTML({ items, direccion, solicitante });

    // Variante danger
    elements.overlay.classList.toggle('modal-confirm--danger', danger);
    elements.confirmBtn.textContent = textoConfirmar;
    elements.confirmBtn.classList.toggle('btn-confirm--danger', danger);

    // Mostrar modal
    elements.overlay.hidden = false;
    elements.overlay.classList.add('modal-confirm--open');

    // Focus en botón cancelar (más seguro)
    elements.cancelBtn.focus();

    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';

    // Event listeners (se remueven al cerrar)
    const handleConfirm = () => closeModal(true);
    const handleCancel = () => closeModal(false);
    const handleKeydown = (e) => {
        if (e.key === 'Escape') closeModal(false);
        if (e.key === 'Enter' && e.target !== elements.confirmBtn && e.target !== elements.cancelBtn) {
            // Enter en cualquier lado confirma (excepto si está en un input)
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                closeModal(true);
            }
        }
        // Trap focus dentro del modal
        if (e.key === 'Tab') trapFocus(e);
    };

    elements.confirmBtn.addEventListener('click', handleConfirm);
    elements.cancelBtn.addEventListener('click', handleCancel);
    elements.closeBtn?.addEventListener('click', handleCancel);
    elements.overlay.addEventListener('click', (e) => {
        if (e.target === elements.overlay) handleCancel();
    });
    document.addEventListener('keydown', handleKeydown);

    // Guardar cleanup
    modalState.cleanup = () => {
        elements.confirmBtn.removeEventListener('click', handleConfirm);
        elements.cancelBtn.removeEventListener('click', handleCancel);
        elements.closeBtn?.removeEventListener('click', handleCancel);
        document.removeEventListener('keydown', handleKeydown);
    };

    // Resolver la promesa
    return new Promise((resolve) => {
        modalState.resolve = resolve;
    });
}

/**
 * Cierra el modal y resuelve la promesa
 */
function closeModal(confirmed) {
    if (!elements.overlay) return;

    // Cleanup
    if (modalState.cleanup) modalState.cleanup();

    // Animación de salida
    elements.overlay.classList.remove('modal-confirm--open');

    // Esperar animación antes de ocultar
    setTimeout(() => {
        elements.overlay.hidden = true;
        elements.overlay.classList.remove('modal-confirm--danger');
        document.body.style.overflow = '';

        // Resolver
        if (modalState.resolve) {
            modalState.resolve(confirmed);
            modalState.resolve = null;
        }
    }, 200);
}

/**
 * Trap focus dentro del modal para accesibilidad
 */
function trapFocus(e) {
    const focusableElements = elements.overlay.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
    }
}

/**
 * API principal: confirma una acción con modal personalizado
 * @param {Object} config - Configuración del modal
 * @param {string} config.titulo - Título del modal
 * @param {string} config.mensaje - Mensaje principal
 * @param {Array} config.items - Array de {nombre, cantidad} para mostrar en el resumen
 * @param {string} config.direccion - Dirección del pedido
 * @param {string} config.solicitante - Nombre del solicitante
 * @param {boolean} config.danger - Si es true, usa variante roja (acciones destructivas)
 * @param {string} config.textoConfirmar - Texto del botón de confirmar
 * @returns {Promise<boolean>} - true si confirmó, false si canceló
 */
export async function confirmarAccion(config) {
    return await openModal(config);
}

/**
 * Versión simplificada para confirmaciones rápidas (solo título y mensaje)
 */
export async function confirmarSimple(titulo, mensaje, danger = false) {
    return await confirmarAccion({ titulo, mensaje, danger });
}

/**
 * Cierra el modal programáticamente (cancelando)
 */
export function cancelarModal() {
    closeModal(false);
}

// Exponer globalmente para uso desde HTML onclick si se necesita
window.confirmModal = {
    confirmarAccion,
    confirmarSimple,
    cancelarModal
};