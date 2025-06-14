// static/js/script.js

// Set the Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoiM25heWNpIiwiYSI6ImNtOXhkY2g4MjB4OWUycHM2MTVvbGtyZ2IifQ.WqFxG56wGUk61umdzIM1aQ';

// Alle verfügbaren Styles, einschließlich des Hamburg Custom Maps
const themeStyles = [
    { name: 'Standard', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json' },
    { name: 'Dunkler Modus', url: 'mapbox://styles/mapbox/dark-v10' },
    { name: 'Heller Modus', url: 'mapbox://styles/mapbox/light-v10' },
    { name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v11' },
    { name: 'Satellit', url: 'mapbox://styles/mapbox/satellite-v9' },
    { name: 'Sat. Streets', url: 'mapbox://styles/mapbox/satellite-streets-v11' },
    { name: 'Navigation', url: 'mapbox://styles/mapbox/navigation-day-v1' },
    { name: 'Nav. Nacht', url: 'mapbox://styles/mapbox/navigation-night-v1' }
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

// Function to load and display heatmap
function loadHeatmap() {
    console.log("Attempting to load heatmap data (simple style test)...");
    fetch('/api/heatmap')
        .then(response => {
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(geojson => {
            console.log("Heatmap GeoJSON data received (simple style test):", JSON.stringify(geojson, null, 2)); // Log the full data
            if (!geojson || !geojson.features || geojson.features.length === 0) {
                console.warn("Heatmap data is empty or invalid (simple style test).");
                return;
            }

            if (map.getSource('heatmap-data')) {
                console.log("Updating existing heatmap source (simple style test).");
                map.getSource('heatmap-data').setData(geojson);
            } else {
                console.log("Adding new heatmap source (simple style test).");
                map.addSource('heatmap-data', {
                    'type': 'geojson',
                    'data': geojson
                });
            }

            if (map.getLayer('heatmap-layer')) {
                console.log("Removing existing heatmap layer (simple style test).");
                map.removeLayer('heatmap-layer');
            }
            // Also remove points layer if it exists from previous attempts
            if (map.getLayer('heatmap-points')) {
                console.log("Removing existing heatmap-points layer (simple style test).");
                map.removeLayer('heatmap-points');
            }

            console.log("Adding heatmap layer to map (simple style test).");
            map.addLayer({
                'id': 'heatmap-layer',
                'type': 'heatmap',
                'source': 'heatmap-data',
                'maxzoom': 22,
                'paint': {
                    // SIMPLIFIED PROPERTIES FOR TESTING VISIBILITY
                    'heatmap-weight': 1, // Constant weight
                    'heatmap-intensity': 1, // Constant intensity
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, "rgba(0,0,255,0)",       // Transparent blue
                        0.5, "rgba(255,255,0,0.5)", // Semi-transparent yellow
                        1, "rgba(255,0,0,1)"        // Opaque red
                    ],
                    'heatmap-radius': 30, // Constant, fairly large radius
                    'heatmap-opacity': 0.75      // Constant opacity
                }
                // No beforeId, add on top for testing
            });
            console.log("Heatmap layer (simple style test) should be added.");

        })
        .catch(err => {
            console.error('Error loading or processing heatmap data for Mapbox (simple style test):', err);
        });
}

// Call loadHeatmap when the map style is loaded
map.on('style.load', () => {
    loadHeatmap();
    // Ensure other style-dependent setups are also called here if any
    // For example, if you re-add sources/layers on style change for other features
});

// If you have a theme toggle that changes styles, ensure heatmap is reloaded
// Modify your toggleTheme function if it's not already handling 'style.load'
const originalToggleTheme = toggleTheme;
function toggleTheme() {
    originalToggleTheme();
    // The 'style.load' event on the map should handle reloading the heatmap.
}


let allMapEvents = []; // Array to store all MapEvent instances for filtering

class MapEvent {
    constructor(title, date, location, description, coordinates) {
        this.title = title; // e.g., "UNFALL"
        this.date = new Date(date); // Convert date string to Date object
        this.location = location; // Original location string from data
        this.description = description;
        this.coordinates = coordinates; // [lng, lat]
        this.marker = null;
    }

    getGradientColor() {
        const now = new Date();
        const timeDiff = now - this.date;
        const oneDay = 1000 * 60 * 60 * 24;
        const daysDiff = timeDiff / oneDay;
    
        if (daysDiff <= 0) { // Today or future
            return 'rgb(0, 255, 0)'; // Bright Green
        } else if (daysDiff <= 7) { // Up to 1 week old (Green to Yellow)
            const ratio = daysDiff / 7;
            const red = Math.round(255 * ratio);
            // const green = 255; // Keep green at max for Green -> Yellow
            return `rgb(${red}, 255, 0)`;
        } else if (daysDiff <= 14) { // 1 to 2 weeks old (Yellow to Red)
            const ratio = (daysDiff - 7) / 7;
            // const red = 255; // Keep red at max
            const green = Math.round(255 * (1 - ratio));
            return `rgb(255, ${green}, 0)`;
        } else if (daysDiff <= 30) { // 2 weeks to 1 month old (Red to Grey)
            const ratio = (daysDiff - 14) / 16; // 30 - 14 = 16 days
            const colorValue = Math.round(255 - (127 * ratio)); // From 255 (red component) down to 128 (grey)
            return `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
        } else { // Older than 1 month
            return 'rgb(200, 200, 200)'; // Light Grey
        }
    }

    getMarkerOpacity() {
        const now = new Date();
        const timeDiff = now - this.date;
        const oneDay = 1000 * 60 * 60 * 24;
        const daysDiff = timeDiff / oneDay;

        if (daysDiff <= 1) return 1;
        if (daysDiff <= 7) return 0.9;
        if (daysDiff <= 14) return 0.8;
        if (daysDiff <= 30) return 0.65;
        return 0.5;
    }

    addToMap(mapInstance) {
        const el = document.createElement('div');
        el.style.backgroundColor = this.getGradientColor();
        el.style.opacity = this.getMarkerOpacity();
        el.style.width = '15px';
        el.style.height = '15px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white'; // Keep the white border for visibility
        // el.style.boxShadow = '0 0 8px rgba(0,0,0,0.3)'; // Removed box shadow
        el.style.cursor = 'pointer';

        this.marker = new mapboxgl.Marker(el)
            .setLngLat(this.coordinates)
            .addTo(mapInstance);

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            showEventDetails(this);
        });

        // Call addLatestEvent with the correct parameters
        addLatestEvent(
            this.title,
            this.date.toLocaleDateString('de-DE'), // Format: DD.MM.YYYY
            this.location,
            this.description
        );
    }
}


//FETCH EVENTS FROM DB
//Socket.io verbindung herstellen
const socket = io(); 

// Primary handler for events from the server
socket.on('EventCreated', (data) => {
    console.log('EventCreated received:', data);
    try {
        const newEvent = new MapEvent(
            data.type,
            data.date,
            data.location,
            data.description,
            [data.lng, data.lat]
        );
        newEvent.addToMap(map);
        allMapEvents.push(newEvent); // Add to the array for filtering
        updateFilter(); // Apply current filters
    } catch (e) {
        console.error("Error processing 'EventCreated':", e, data);
    }
});

socket.on('connect', () => {
    console.log('Verbunden mit Server');
    // If your server is set up to send all initial data using multiple 'EventCreated' events upon connection,
    // then the 'initial_events' handler might be redundant.
    // Or, you might explicitly request initial data here:
    // socket.emit('get_initial_data'); // Example
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

async function showEventDetails(event) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('event-content');
    if (!sidebar || !content) {
        console.error('Sidebar or event content element not found!');
        return;
    }

    const formattedDate = event.date.toLocaleString('de-DE', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    // Always set initial location text to "Fetching location..."
    // and prepare for dynamic update.
    content.innerHTML = `
        <h2>${event.title}</h2>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Location:</strong> <span id="event-location-text">Fetching location...</span></p>
        <p><strong>Coordinates:</strong> ${event.coordinates[1].toFixed(6)}, ${event.coordinates[0].toFixed(6)}</p>
        <p>${event.description || 'No description available.'}</p>
    `;
    sidebar.classList.add('active');

    const locationTextElement = document.getElementById('event-location-text');

    try {
        const [lng, lat] = event.coordinates;
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=address,poi,neighborhood,locality,place&limit=1`;
        const response = await fetch(geocodeUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (locationTextElement) {
            if (data.features && data.features.length > 0) {
                const placeName = data.features[0].place_name;
                locationTextElement.innerHTML = ''; // Clear "Fetching location..."
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = placeName;
                link.style.cursor = 'pointer';
                link.style.textDecoration = 'underline';
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    map.flyTo({
                        center: event.coordinates,
                        zoom: 15, // Adjust zoom level as preferred
                        speed: 0.8
                    });
                });
                locationTextElement.appendChild(link);
            } else {
                locationTextElement.textContent = "Location details not found";
            }
        }
    } catch (error) {
        console.error('Error fetching location:', error);
        if (locationTextElement) {
             locationTextElement.textContent = "Could not fetch location details";
        }
    }
}

// Theme-Toggle
function toggleTheme() {
    // Setze den nächsten Mapbox-Style
    currentThemeIndex = (currentThemeIndex + 1) % themeStyles.length;
    map.setStyle(themeStyles[currentThemeIndex].url);

    // Button-Text auf den jetzigen Style setzen
    const btn = document.getElementById('theme-toggle');
    const currentName = themeStyles[currentThemeIndex % themeStyles.length].name;
    btn.innerHTML = `<h3>${currentName}</h3>`;
}

// Filter- und Legend-Toggle
function toggleFiltersMenu() {
    document.getElementById('filters-menu').classList.toggle('active');
}
function updateFilter() {
    const startDateString = document.getElementById('filter-start-date')?.value;
    const endDateString = document.getElementById('filter-end-date')?.value;

    const startDate = startDateString ? new Date(startDateString) : null;
    let endDate = endDateString ? new Date(endDateString) : null;

    if (endDate) {
        endDate.setHours(23, 59, 59, 999);
    }
    if (startDate) {
        startDate.setHours(0, 0, 0, 0);
    }

    console.log("Filtering with Start:", startDate, "End:", endDate, "Total events in allMapEvents:", allMapEvents.length);

    allMapEvents.forEach(event => {
        if (event.marker) {
            const markerElement = event.marker.getElement();
            let visible = true;

            if (startDate && event.date < startDate) {
                visible = false;
            }
            if (endDate && event.date > endDate) {
                visible = false;
            }
            // For debugging individual event filtering:
            // console.log(`Event: ${event.title} on ${event.date.toLocaleDateString('de-DE')}, Visible: ${visible}`);
            markerElement.style.display = visible ? '' : 'none';
        }
    });
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

function addLatestEvent(title, dateString, locationString, descriptionString) {
    const content = document.getElementById('latest-events-content');
    if (content) {
        const placeholder = content.querySelector('p#latest-events-placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        const eventHTML = `
            <div class="latest-event">
                <h3>${title}</h3>
                <p><strong>Date:</strong> ${dateString}</p>
                <p><strong>Location:</strong> ${locationString || 'N/A'}</p> 
                <p>${descriptionString || 'No description available.'}</p>
            </div>
        `;
        content.insertAdjacentHTML('afterbegin', eventHTML);
        
        const maxEvents = 10;
        while (content.children.length > maxEvents) {
            if (content.lastChild.classList && content.lastChild.classList.contains('latest-event')) {
                 content.removeChild(content.lastChild);
            } else {
                break; // Should not happen if structure is correct
            }
        }
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
    "Eimsbüttel": { "Schanzenviertel": [9.963, 53.564], "Hoheluft-West": [9.973, 53.579], "Eppendorf": [9.982, 53.581] },
    "Altona": { "Ottensen": [9.933, 53.554], "Altona-Altstadt": [9.935, 53.546], "Bahrenfeld": [9.906, 53.565] },
    "Hamburg-Mitte": { "St. Pauli": [9.966, 53.550], "HafenCity": [10.002, 53.541], "Altstadt": [10.001, 53.550] }
};

function flyToDistrict() {
    const select = document.getElementById('district-select');
    if (!select) return;
    const value = select.value;

    if (!value) return;

    let districtKey = null;
    let subDistrictKey = null;

    // Iterate over the main district keys to correctly parse the value
    for (const dKey of Object.keys(districts)) {
        if (value.startsWith(dKey + '-')) {
            districtKey = dKey;
            // The rest of the string after "DistrictKey-" is the subDistrictKey
            subDistrictKey = value.substring(dKey.length + 1);
            break; // Found the main district, stop iterating
        }
    }

    if (districtKey && subDistrictKey) {
        const coordinates = districts[districtKey]?.[subDistrictKey];
        if (coordinates) {
            map.flyTo({ center: coordinates, zoom: 14, speed: 0.8 });
            select.value = ""; // Reset dropdown
        } else {
            console.error('Coordinates not found for district:', districtKey, 'sub-district:', subDistrictKey, 'from value:', value);
        }
    } else {
        console.error('Could not parse district and sub-district from value:', value);
    }
}

// WebSocket connection
socket.on('new_event', function(event) {
    console.log('New event received:', event);
    try {
        const newMapEvent = new MapEvent(
            event.type, // Use event.type from WebSocket payload for the title
            event.date,
            event.location, 
            event.description,
            [event.longitude, event.latitude]
        );
        newMapEvent.addToMap(map);
        allMapEvents.push(newMapEvent);
        updateFilter(); // Update filters when a new event is added
        addLatestEvent(event.type, new Date(event.date).toLocaleDateString('de-DE'), event.location, event.description);
    } catch (e) {
        console.error("Error processing new event:", e, event);
    }
});

socket.on('initial_events', function(events) {
    console.log('Initial events received:', events.length);
    allMapEvents = []; 
    document.querySelectorAll('.mapboxgl-marker').forEach(marker => marker.remove());

    events.forEach(event => {
        try {
            const mapEventInstance = new MapEvent(
                event.type, // Use event.type from WebSocket payload for the title
                event.date,
                event.location, 
                event.description,
                [event.longitude, event.latitude]
            );
            mapEventInstance.addToMap(map);
            allMapEvents.push(mapEventInstance);
        } catch (e) {
            console.error("Error processing initial event:", e, event);
        }
    });
    updateFilter(); 
});


document.addEventListener('DOMContentLoaded', () => {
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');

    if (startDateInput) {
        startDateInput.addEventListener('change', updateFilter);
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', updateFilter);
    }

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn && themeStyles.length > 0) {
         const currentThemeName = themeStyles[currentThemeIndex].name;
         themeToggleBtn.innerHTML = `<h3>${currentThemeName}</h3>`;
    }
    
    // Add placeholder if latest-events-content is empty
    const latestEventsContent = document.getElementById('latest-events-content');
    if (latestEventsContent && latestEventsContent.children.length === 0) {
        latestEventsContent.innerHTML = '<p id="latest-events-placeholder">No events yet.</p>';
    }
    // updateFilter(); // Call once on load in case there are default dates or pre-loaded events
});
