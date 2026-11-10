(() => {
    const sidebar = document.getElementById('sidebar');
    const menuButton = document.getElementById('btnMenu');
    const overlay = document.getElementById('sidebarOverlay');
    const mobileView = window.matchMedia('(max-width: 900px)');

    if (!sidebar || !menuButton || !overlay) return;

    const closeSidebar = () => {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
        menuButton.setAttribute('aria-expanded', 'false');
        if (mobileView.matches) sidebar.setAttribute('aria-hidden', 'true');
    };

    const openSidebar = () => {
        if (!mobileView.matches) return;
        sidebar.classList.add('is-open');
        overlay.classList.add('is-visible');
        sidebar.setAttribute('aria-hidden', 'false');
        menuButton.setAttribute('aria-expanded', 'true');
    };

    const syncSidebar = () => {
        closeSidebar();
        if (!mobileView.matches) sidebar.setAttribute('aria-hidden', 'false');
    };

    menuButton.addEventListener('click', () => {
        sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
    });
    overlay.addEventListener('click', closeSidebar);
    sidebar.addEventListener('click', event => {
        if (event.target.closest('.sidebar-link')) closeSidebar();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeSidebar();
    });
    window.addEventListener('pagehide', closeSidebar);
    mobileView.addEventListener('change', syncSidebar);
    syncSidebar();
})();
