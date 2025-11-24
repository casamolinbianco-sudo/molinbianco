// Coordinate Casa Molin Bianco
const casa = {
    lat: 43.451639,
    lng: 11.845278
};

// Inizializzazione mappa
const map = L.map('map').setView([43.4634, 11.8797], 14);

// Tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

// Icone personalizzate
const icons = {
    multipiano: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    }),
    superficie: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    }),
    privato: L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    })
};

// Marker Casa Molin Bianco
L.marker([casa.lat, casa.lng], {
    title: "Casa Molin Bianco"
}).addTo(map).bindPopup("<b>Casa Molin Bianco</b>");

let markers = [];

// Carica parcheggi
fetch("data.json")
    .then(r => r.json())
    .then(data => {
        data.forEach(p => {
            let m = L.marker([p.lat, p.lng], {
                icon: icons[p.tipo]
            }).addTo(map);

            m.bindPopup(`
                <b>${p.nome}</b><br>
                Tipo: ${p.tipo}<br>
                ${p.tariffe ? "Tariffe: " + p.tariffe + "<br>" : ""}
                Distanza: ${dist(p.lat, p.lng).toFixed(2)} km
            `);

            markers.push({ marker: m, tipo: p.tipo });
        });
    });

// Funzione distanza
function dist(lat, lng) {
    return map.distance([lat, lng], [casa.lat, casa.lng]) / 1000;
}

// Filtri
document.querySelectorAll(".filter").forEach(cb => {
    cb.addEventListener("change", () => {
        const active = [...document.querySelectorAll(".filter:checked")].map(c => c.value);

        markers.forEach(m => {
            if (active.includes(m.tipo)) {
                m.marker.addTo(map);
            } else {
                map.removeLayer(m.marker);
            }
        });
    });
});

