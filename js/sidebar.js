(() => {
    const sidebar = document.getElementById('sidebar');
    const menuButton = document.getElementById('btnMenu');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar || !menuButton || !overlay) return;

    const closeSidebar = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        menuButton.setAttribute('aria-expanded', 'false');
        sidebar.setAttribute('inert', '');
    };

    const openSidebar = () => {
        sidebar.classList.add('open');
        overlay.classList.add('show');
        sidebar.removeAttribute('inert');
        menuButton.setAttribute('aria-expanded', 'true');
    };

    const toggleSidebar = () => {
        sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
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

    // Estado inicial: sidebar cerrado
    closeSidebar();
})();