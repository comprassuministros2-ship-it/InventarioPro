const https = require('https');
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, 'img');

// Artículos de Calle 3 con sus IDs y palabras clave para búsqueda
const articulos = [
    { id: 329, nombre: "Boquillas alcometer", keyword: "alcohol breathalyzer mouthpiece" },
    { id: 330, nombre: "Carpetas colgantes", keyword: "hanging file folders" },
    { id: 331, nombre: "Conos 70 cm", keyword: "traffic cone 70cm" },
    { id: 332, nombre: "Conos 120 cm", keyword: "traffic cone 120cm" },
    { id: 333, nombre: "Conos con base 90 cm", keyword: "traffic cone with base" },
    { id: 334, nombre: "Estufas tiro balanceado", keyword: "gas heater" },
    { id: 335, nombre: "Fuente de 5v3000", keyword: "power supply 5v" },
    { id: 336, nombre: "Fuente de 15v1500", keyword: "power supply 15v" },
    { id: 337, nombre: "Linternas de mano", keyword: "flashlight" },
    { id: 338, nombre: "Lonas sevi", keyword: "vinyl banner tarp" },
    { id: 339, nombre: "Mesas", keyword: "folding table" },
    { id: 340, nombre: "Pizarras 60x80", keyword: "whiteboard 60x80" },
    { id: 341, nombre: "Pizarras 90x150", keyword: "whiteboard 90x150" },
    { id: 342, nombre: "Pizarras 120x150", keyword: "whiteboard 120x150" },
    { id: 343, nombre: "Pizarras de corcho 60x80", keyword: "cork board 60x80" },
    { id: 344, nombre: "Pizarras de corcho 75x100", keyword: "cork board 75x100" },
    { id: 345, nombre: "Tótem liso", keyword: "totem sign" },
    { id: 346, nombre: "Tótem max 10", keyword: "totem display" },
    { id: 347, nombre: "Tótem PBA", keyword: "totem stand" },
    { id: 348, nombre: "Tótem publicitario", keyword: "advertising totem" },
    { id: 349, nombre: "Vallas azules", keyword: "blue fence barrier" },
    { id: 350, nombre: "Vallas rojas", keyword: "red fence barrier" },
    { id: 351, nombre: "Ventiladores 2en1", keyword: "2 in 1 fan" },
];

// Crear directorio si no existe
if (!fs.existsSync(IMG_DIR)) {
    fs.mkdirSync(IMG_DIR, { recursive: true });
}

// Placeholder genérico (SVG simple convertido a base64)
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#e0e0e0" width="400" height="300"/><text x="200" y="150" font-family="Arial, sans-serif" font-size="16" fill="#999" text-anchor="middle" dominant-baseline="middle">Sin imagen</text></svg>`;

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                file.close();
                fs.unlink(filepath, () => {});
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

// Unsplash Source URL (redirecciona a imagen aleatoria de la búsqueda)
function buildUnsplashUrl(keyword) {
    return `https://source.unsplash.com/featured/800x600/?${encodeURIComponent(keyword)}`;
}

async function downloadAll() {
    const results = [];

    for (const art of articulos) {
        const filepath = path.join(IMG_DIR, `${art.id}.jpg`);
        const url = buildUnsplashUrl(art.keyword);

        console.log(`[${art.id}] ${art.nombre} - buscando: "${art.keyword}"`);

        try {
            await downloadImage(url, filepath);
            console.log(`  ✓ Guardado: img/${art.id}.jpg`);
            results.push({ id: art.id, ruta: `img/${art.id}.jpg`, status: 'ok' });
        } catch (err) {
            console.log(`  ✗ Error: ${err.message} - usando placeholder`);
            // Crear placeholder como JPG (usando SVG como fallback)
            fs.writeFileSync(filepath, PLACEHOLDER_SVG);
            results.push({ id: art.id, ruta: `img/${art.id}.jpg`, status: 'placeholder' });
        }

        // Pequeña pausa para no saturar la API
        await new Promise(r => setTimeout(r, 500));
    }

    return results;
}

downloadAll().then(results => {
    console.log('\n=== RESUMEN ===');
    results.forEach(r => {
        console.log(`${r.id}\t${r.ruta}\t${r.status}`);
    });

    // Generar CSV (tab-separated)
    const csv = results.map(r => `${r.id}\t${r.ruta}`).join('\n');
    console.log('\n=== CSV PARA GOOGLE SHEETS ===');
    console.log(csv);

    // Guardar CSV
    fs.writeFileSync(path.join(__dirname, 'imagenes-calle3.csv'), csv);
    console.log('\nCSV guardado en imagenes-calle3.csv');
}).catch(console.error);