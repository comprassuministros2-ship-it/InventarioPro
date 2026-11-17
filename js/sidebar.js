(() => {
    const sidebar = document.getElementById('sidebar');
    const menuButton = document.getElementById('btnMenu');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar || !menuButton || !overlay) return;

    const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

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

    // --- HOVER DESKTOP (≥1024px) ---
    if (isDesktop()) {
        // Área invisible de 20px a la izquierda para abrir
        const hoverArea = document.createElement('div');
        hoverArea.className = 'sidebar-hover-trigger';
        hoverArea.style.cssText = `
            position: fixed; top: 0; left: 0; width: 20px; height: 100vh;
            z-index: 998; background: transparent;
        `;
        document.body.appendChild(hoverArea);

        hoverArea.addEventListener('mouseenter', openSidebar);
        sidebar.addEventListener('mouseleave', closeSidebar);
    }

    // Toggle al tocar el botón hamburguesa (funciona en móvil y desktop)
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