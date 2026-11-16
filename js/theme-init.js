// Inicialización del tema (claro/oscuro) - cargado antes del body para evitar FOUC
(function() {
    try {
        var tema = localStorage.getItem('inventario-tema');
        if (tema !== 'dark' && tema !== 'light') {
            tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', tema);
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();