// static/js/script.js

// Set the Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoiM25heWNpIiwiYSI6ImNtOXhkY2g4MjB4OWUycHM2MTVvbGtyZ2IifQ.WqFxG56wGUk61umdzIM1aQ';

// Alle verfügbaren Styles, einschließlich des Hamburg Custom Maps
const themeStyles = [
    { name: 'Default', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json' },
    { name: 'Dark Mode', url: 'mapbox://styles/mapbox/dark-v10' },
    { name: 'Light Mode', url: 'mapbox://styles/mapbox/light-v10' },
    { name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v11' },
    { name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
    { name: 'Sat. Streets', url: 'mapbox://styles/mapbox/satellite-streets-v11' },
    { name: 'Navigation', url: 'mapbox://styles/mapbox/navigation-day-v1' },
    { name: 'Nav. Night', url: 'mapbox://styles/mapbox/navigation-night-v1' }
];
let currentThemeIndex = 0; // Zeigt, welcher themeStyles-Eintrag als nächstes kommt

// Karte initialisieren mit dem Hamburg Custom Map Style
const map = new mapboxgl.Map({
    container: 'map',
    style: themeStyles[currentThemeIndex].url, // Start mit dem ersten Style (Hamburg Custom Map)
    center: [9.990682, 53.564086],
    zoom: 10.5
});
map.addControl(new mapboxgl.NavigationControl());

// MapEvent-Klasse für Marker
class MapEvent {
    constructor(title, date, location, description, coordinates) {
        this.title = title;
        this.date = date;
        this.location = location;
        this.description = description;
        this.coordinates = coordinates;
        this.marker = null;
    }
    addToMap(map) {
        const el = document.createElement('div');
        el.className = 'map-marker';
        this.marker = new mapboxgl.Marker(el)
            .setLngLat(this.coordinates)
            .addTo(map);

        // Add click event to show details in the sidebar
        el.addEventListener('click', () => {
            showEventDetails(this);
        });
    }
}

// Beispiel-Events
const event1 = new MapEvent('Music Festival', '2023-10-15', 'Hamburg Central Park', 'A great music festival.', [9.993682, 53.551086]);
event1.addToMap(map);
const event2 = new MapEvent('Food Truck Rally', '2023-11-20', 'Sternschanze', 'Delicious street food.', [9.9510, 53.5530]);
event2.addToMap(map);

// Show event details in the sidebar
function showEventDetails(event) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('event-content');
    content.innerHTML = `
        <h2>${event.title}</h2>
        <p><strong>Date:</strong> ${event.date}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p>${event.description}</p>
    `;
    sidebar.classList.add('active');
}

// Theme-Toggle
function toggleTheme() {
    // Setze den nächsten Mapbox-Style
    currentThemeIndex = (currentThemeIndex + 1) % themeStyles.length;
    map.setStyle(themeStyles[currentThemeIndex].url);

    // Button-Text auf den übernächsten Style setzen
    const btn = document.getElementById('theme-toggle');
    const nextName = themeStyles[(currentThemeIndex + 1) % themeStyles.length].name;
    btn.innerHTML = `<h3>${nextName}</h3>`;
}

// Filter- und Legend-Toggle
function toggleFiltersMenu() {
    document.getElementById('filters-menu').classList.toggle('active');
}
function toggleLegendMenu() {
    document.getElementById('legend-menu').classList.toggle('active');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    } else {
        console.error('Sidebar element not found!');
    }
}

function toggleLatestEventsSidebar() {
    const sidebar = document.getElementById('latest-events-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    } else {
        console.error('Latest Events Sidebar element not found!');
    }
}

function addLatestEvent(title, date, location, description) {
    const content = document.getElementById('latest-events-content');
    if (content) {
        const eventHTML = `
            <div class="latest-event">
                <h3>${title}</h3>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p>${description}</p>
            </div>
        `;
        content.innerHTML += eventHTML;
    } else {
        console.error('Latest Events Content element not found!');
    }
}



// Example: Add some events to the Latest Events sidebar
addLatestEvent('Music Festival', '2023-10-15', 'Hamburg Central Park', 'A great music festival.');
addLatestEvent('Food Truck Rally', '2023-11-20', 'Sternschanze', 'Delicious street food.');

// Add ScaleControl to the map
const scale = new mapboxgl.ScaleControl({
    maxWidth: 100, // Maximale Breite des Maßstabs
    unit: 'metric' // Einheit: metrisch (Kilometer/Meter)
});
map.addControl(scale, 'bottom-left'); // Positioniere den Maßstab unten links

const geolocate = new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true, // Verfolgt den Standort des Nutzers
    showUserHeading: true    // Zeigt die Blickrichtung des Nutzers an
});
map.addControl(geolocate, 'top-right'); // Positioniere oben rechts

const fullscreenControl = new mapboxgl.FullscreenControl();
map.addControl(fullscreenControl, 'top-right'); // Positioniere oben rechts

const districts = {
    "Eimsbüttel": {
        "Schanzenviertel": [9.963, 53.564],
        "Hoheluft-West": [9.973, 53.579],
        "Eppendorf": [9.982, 53.581]
    },
    "Altona": {
        "Ottensen": [9.933, 53.554],
        "Altona-Altstadt": [9.935, 53.546],
        "Bahrenfeld": [9.906, 53.565]
    },
    "Hamburg-Mitte": {
        "St. Pauli": [9.966, 53.550],
        "HafenCity": [10.002, 53.541],
        "Altstadt": [10.001, 53.550]
    }
};

function flyToDistrict() {
    const select = document.getElementById('district-select');
    const value = select.value;

    if (!value) return; // Wenn nichts ausgewählt ist, nichts tun

    // Wert aufteilen in District und Subdistrict
    const [district, subdistrict] = value.split('-');

    // Koordinaten aus den districts-Daten holen
    const coordinates = districts[district]?.[subdistrict];

    if (coordinates) {
        map.flyTo({
            center: coordinates,
            zoom: 14,
            speed: 0.8
        });

        // Dropdown zurücksetzen
        select.value = "";
    } else {
        console.error('Coordinates not found for:', value);
    }
}
