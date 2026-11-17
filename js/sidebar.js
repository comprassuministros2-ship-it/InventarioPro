(() => {
    const sidebar = document.getElementById('sidebar');
    const menuButton = document.getElementById('btnMenu');
    const overlay = document.getElementById('sidebarOverlay');
    const mobileView = window.matchMedia('(max-width: 768px)');

    if (!sidebar || !menuButton || !overlay) return;

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        menuButton.setAttribute('aria-expanded', 'false');
        if (mobileView.matches) sidebar.setAttribute('inert', '');
    };

    const openSidebar = () => {
        if (!mobileView.matches) return;
        sidebar.classList.add('open');
        overlay.classList.add('show');
        sidebar.removeAttribute('inert');
        menuButton.setAttribute('aria-expanded', 'true');
    };

    const toggleSidebar = () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    };

    const syncSidebar = () => {
        closeSidebar();
        if (!mobileView.matches) sidebar.removeAttribute('inert');
    };

    // Toggle al tocar el botón hamburguesa
    menuButton.addEventListener('click', toggleSidebar);

    // Cerrar al tocar el overlay (fuera del sidebar)
    overlay.addEventListener('click', closeSidebar);

    // Cerrar al tocar un enlace del menú
    sidebar.addEventListener('click', event => {
        if (event.target.closest('.sidebar-link')) closeSidebar();
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSidebar();
    });

    // Cerrar al navegar a otra página (pagehide)
    window.addEventListener('pagehide', closeSidebar);

    // Sincronizar al cambiar de tamaño de pantalla
    mobileView.addEventListener('change', syncSidebar);

    // Estado inicial
    syncSidebar();
})();