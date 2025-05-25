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

class MapEvent {
    constructor(title, date, location, description, coordinates) {
        this.title = title;
        this.date = new Date(date); // Konvertiere Datum in ein Date-Objekt
        this.location = location;
        this.description = description;
        this.coordinates = coordinates; // [lng, lat]
        this.marker = null;
    }

    getGradientColor() {
        const now = new Date();
        const timeDiff = now - this.date; // Zeitdifferenz in Millisekunden
        const oneDay = 1000 * 60 * 60 * 24; // Millisekunden in einem Tag
        const daysDiff = timeDiff / oneDay; // Zeitdifferenz in Tagen
    
        if (daysDiff <= 0) {
            return 'rgb(0, 255, 0)'; // Grün (heute)
        } else if (daysDiff <= 7) {
            const ratio = daysDiff / 7; // Verhältnis innerhalb der Woche
            const red = Math.round(255 * ratio); // Rotanteil steigt
            const green = Math.round(255 * (1 - ratio)); // Grünanteil sinkt
            return `rgb(${red}, 255, 0)`; // Übergang von Grün zu Gelb
        } else if (daysDiff <= 14) {
            const ratio = (daysDiff - 7) / 7; // Verhältnis innerhalb der zweiten Woche
            const green = Math.round(255 * (1 - ratio)); // Grünanteil sinkt weiter
            return `rgb(255, ${green}, 0)`; // Übergang von Gelb zu Rot
        } else if (daysDiff <= 30) {
            const ratio = (daysDiff - 14) / 16; // Verhältnis innerhalb des Monats
            const gray = Math.round(128 + 127 * ratio); // Übergang zu Grau
            return `rgb(${gray}, ${gray}, ${gray})`; // Grau
        } else {
            return 'rgb(200, 200, 200)'; // Hellgrau (älter als 1 Monat)
        }
    }

    getMarkerOpacity() {
        const now = new Date();
        const timeDiff = now - this.date; // Zeitdifferenz in Millisekunden
        const oneDay = 1000 * 60 * 60 * 24; // Millisekunden in einem Tag
        const daysDiff = timeDiff / oneDay; // Zeitdifferenz in Tagen

        if (daysDiff <= 1) {
            return 1; // Volle Sichtbarkeit
        } else if (daysDiff <= 7) {
            return 1; // Leicht transparent
        } else if (daysDiff <= 14) {
            return 1; // Mehr transparent
        } else if (daysDiff <= 30) {
            return 0.8; // Noch transparenter
        } else {
            return 0.4; // Fast unsichtbar
        }
    }

    addToMap(map) {
        const el = document.createElement('div');
        el.type = this.title; // title ist der Typ: Accident oder Authority Operation
        el.className = 'map-marker';
        el.style.backgroundColor = this.getGradientColor(); // Setze die Farbe basierend auf dem Alter
        el.style.opacity = this.getMarkerOpacity(); // Setze die Transparenz basierend auf dem Alter
        el.style.width = '15px';
        el.style.height = '15px';
        el.style.borderRadius = '75%';

        this.marker = new mapboxgl.Marker(el)
            .setLngLat(this.coordinates) // Setze die Koordinaten
            .addTo(map);

        // Add click event to show details in the sidebar
        el.addEventListener('click', () => {
            showEventDetails(this);
        });

        // Add this event to the Latest Events sidebar
        addLatestEvent(
            this.title,
            this.date.toISOString().split('T')[0], // Format: YYYY-MM-DD
            this.location,
            this.coordinates[1], // Latitude
            this.coordinates[0], // Longitude
            this.description
        );
    }
}

//FETCH EVENTS FROM DB
//Socket.io verbindung herstellen
const socket = io();

//Listener für 'EventCreated' Events
socket.on('EventCreated', (data) => {
    console.log('Neues Event empfangen:', data);

    //Neues MapEvent erstellen
    const newEvent = new MapEvent(
        data.type,
        data.date,
        data.location,
        data.description,
        [data.lng, data.lat]
    )
    newEvent.addToMap(map);
})

socket.on('connect', () => {
    console.log('Verbunden mit Server')
})

socket.on('disconnect', () => {
    console.log('Verbindung zum Server getrennt')
})

// Dummy Werte

/*
const mapEvent1 = new MapEvent(
    'Accident',
    '2024-11-20 13:08:00',
    'Hamburg, Alsterglacis',
    'Hamburg, Alsterglacis, stadtauswärts in Höhe Mittelweg Unfallstelle geräumt',
    [9.987, 53.565] // [lng, lat]
);

const mapEvent2 = new MapEvent(
    'Authority Operation',
    '2024-11-26 18:28:00',
    'Hamburg, Landwehr',
    'B5 Hamburg, Landwehr in Richtung Süden in Höhe Angerstraße gesperrt, Feuerwehreinsatz',
    [10.001, 53.550] // [lng, lat]
);

// Füge die Events zur Karte und Sidebar hinzu
mapEvent1.addToMap(map);
mapEvent2.addToMap(map);

const mapEvent3 = new MapEvent(
    'Accident',
    '2025-04-13 14:45:00',
    'Hamburg, Reeperbahn',
    'Ein Verkehrsunfall mit mehreren Fahrzeugen auf der Reeperbahn in Richtung Osten. Polizei ist vor Ort.',
    [9.959, 53.550] // [lng, lat]
);

const mapEvent4 = new MapEvent(
    'Authority Operation',
    '2025-04-16 09:30:00',
    'Hamburg, HafenCity',
    'Feuerwehreinsatz in der HafenCity aufgrund eines gemeldeten Brandes in einem Wohngebäude.',
    [10.002, 53.541] // [lng, lat]
);

const mapEvent5 = new MapEvent(
    'Accident',
    '2025-04-20 18:15:00',
    'Hamburg, Elbchaussee',
    'Ein Motorradunfall auf der Elbchaussee in Richtung Westen. Der Verkehr ist stark beeinträchtigt.',
    [9.926, 53.546] // [lng, lat]
);

const mapEvent6 = new MapEvent(
    'Authority Operation',
    '2025-04-23 11:00:00',
    'Hamburg, Jungfernstieg',
    'Polizeieinsatz am Jungfernstieg aufgrund eines verdächtigen Gegenstands. Bereich wurde abgesperrt.',
    [9.991, 53.553] // [lng, lat]
);

const mapEvent7 = new MapEvent(
    'Accident',
    '2025-04-28 07:50:00',
    'Hamburg, Altonaer Straße',
    'Ein Verkehrsunfall mit einem LKW und einem PKW auf der Altonaer Straße. Der Verkehr wird umgeleitet.',
    [9.935, 53.554] // [lng, lat]
);

// Füge die neuen Events zur Karte und Sidebar hinzu
mapEvent3.addToMap(map);
mapEvent4.addToMap(map);
mapEvent5.addToMap(map);
mapEvent6.addToMap(map);
mapEvent7.addToMap(map);

*/

function showEventDetails(event) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('event-content');
    const [lng, lat] = event.coordinates; // Extrahiere lng und lat aus dem coordinates-Array
    content.innerHTML = `
        <h2>${event.title}</h2>
        <p><strong>Date:</strong> ${event.date}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p><strong>Coordinates:</strong> ${lat}, ${lng}</p>
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
function updateFilter(checkbox){
    const filterType = checkbox.value;
    const isChecked = checkbox.checked;

    document.querySelectorAll('.map-marker').forEach(marker => {
        console.log(marker.type, filterType, isChecked);
        if (marker.type === filterType) {
            marker.style.display = isChecked ? 'block' : 'none';
        }
    })
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

function addLatestEvent(type, date, location, lat, lng, description) {
    const content = document.getElementById('latest-events-content');
    if (content) {
        const eventHTML = `
            <div class="latest-event">
                <h3>${type}</h3>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Coordinates:</strong> ${lat}, ${lng}</p>
                <p>${description}</p>
            </div>
        `;
        content.innerHTML += eventHTML;
    } else {
        console.error('Latest Events Content element not found!');
    }
}

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
