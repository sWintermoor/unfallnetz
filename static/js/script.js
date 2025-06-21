// static/js/script.js

// 1. Globaler Zustand und Konstanten
const AppState = {
    themes: [
      { name: 'Standard', url: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json'  },
      { name: 'Alternative', url: 'mapbox://styles/mapbox/streets-v11' },
      { name: 'Dark', url: 'mapbox://styles/mapbox/dark-v10' },
      { name: 'Light', url: 'mapbox://styles/mapbox/light-v10' }
    ],
    currentTheme: 0,
  
    modes: ['Punkte', 'Heatmap', 'Beides'],
    currentMode: 0,
  
    events: {
      markers:[],
      features: [],
      all: [],
      
      addEvent(data) {
        const event = new MapEvent(data);
        this.all.push(event);

        if (!window.geoJsonData) {
            window.geoJsonData = {
              type: 'FeatureCollection',
              features: []
          };
        }

        window.geoJsonData.features.push(data);

        applyFilters();
      },
    },
  
    heat: {
      sourceId: 'heatmap-data',
      layerId: 'heatmap-layer'
    },
  
    districts: {
      'Eimsbüttel': {
        'Schanzenviertel': [9.963, 53.564],
        'Hoheluft-West': [9.973, 53.579],
        'Eppendorf': [9.982, 53.581]
      },
      'Altona': {
        'Ottensen': [9.933, 53.554],
        'Altona-Altstadt': [9.935, 53.546],
        'Bahrenfeld': [9.906, 53.565]
      },
      'Hamburg-Mitte': {
        'St. Pauli': [9.966, 53.550],
        'HafenCity': [10.002, 53.541],
        'Altstadt': [10.001, 53.550]
      }
    }
  };
  
// 2. Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoiM25heWNpIiwiYSI6ImNtOXhkY2g4MjB4OWUycHM2MTVvbGtyZ2IifQ.WqFxG56wGUk61umdzIM1aQ';

// 3. Helferfunktionen

// 3.1 Controls zur Karte hinzufügen
function addControls(map) {
  map.addControl(new mapboxgl.NavigationControl());
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');
  map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
  }), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
}

// 3.4 Heatmap-Layer laden oder aktualisieren
function initializeHeatMapLayer(map, geoJsonDataInput) {
  const { sourceId, layerId } = AppState.heat;
  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(geoJsonDataInput);
  } else {
    map.addSource(sourceId, { type: 'geojson', data: geoJsonDataInput });
  }
  if (!map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: 'heatmap',
      source: sourceId,
      maxzoom: 17,
      paint: {
        'heatmap-weight': ['get', 'gefahrenstufe'],
        'heatmap-intensity': 1,
        'heatmap-radius': 25,
        'heatmap-opacity': 0.6,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 255, 0)',
          0.2, 'blue',
          0.4, 'lime',
          0.6, 'yellow',
          0.8, 'orange',
          1, 'red'
        ]
      }
    });
  }
}

// 3.5 Ein generischer Switch-Funktionshelfer für Arrays
function switchTo(indexKey, arrayKey, onChange) {
  AppState[indexKey] = (AppState[indexKey] + 1) % AppState[arrayKey].length;
  onChange(AppState[indexKey]);
}

// 3.6 UI-Helpers für Toggle und FlyTo
const UI = {
  toggle(id) {
    document.getElementById(id)?.classList.toggle('active');
  },
  flyToDistrict(value) {
    const [district, subdistrict] = value.split('-');
    const coords = AppState.districts[district]?.[subdistrict];
    if (coords) {
      map.flyTo({ center: coords, zoom: 14, speed: 0.8 });
    } else {
      console.error('Koordinaten nicht gefunden für:', value);
    }
  }
};

// 4. Map-Instanz erzeugen
const map = new mapboxgl.Map({
  container: 'map',
  style: AppState.themes[AppState.currentTheme].url,
  center: [9.990682, 53.564086],
  zoom: 10.5
});
addControls(map);

// 5. Klasse für Events (Marker)
class MapEvent {
    constructor(data) {
        this.title = data.properties.name;
        this.date = new Date(data.properties.date);
        this.location = data.location;
        this.description = data.properties.description;
        this.coordinates = [data.geometry.coordinates[0], data.geometry.coordinates[1]];
        this.level = data.properties.value;
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
            return `rgb(${red}, 255, 0)`;
        } else if (daysDiff <= 14) { // 1 to 2 weeks old (Yellow to Red)
            const ratio = (daysDiff - 7) / 7;
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

    createMarker() {
        const el = document.createElement('div');
        el.className = 'map-marker';
        el.style.backgroundColor = this.getGradientColor();
        el.style.opacity = this.getMarkerOpacity();
        el.style.width = '15px';
        el.style.height = '15px';
        el.style.borderRadius = '75%';
        el.type = this.title;

        this.marker = new mapboxgl.Marker(el)
            .setLngLat(this.coordinates);

        el.addEventListener('click', () => showEventDetails(this));
        return this.marker;
    }
}

// 6. Socket.IO-Verbindung für Echtzeit-Events
const socket = io();
socket.on('connect', () => console.log('Verbunden mit Server'));
socket.on('disconnect', () => console.log('Verbindung getrennt'));
socket.on('EventCreated', (data) => {
  AppState.events.addEvent(data);
});

// 8. Theme-Wechsel
function toggleTheme() {
  switchTo('currentTheme', 'themes', (newIndex) => {
    map.setStyle(AppState.themes[newIndex].url);
    map.once('style.load', () => {
        applyFilters();
    });
  });
  document.getElementById('theme-toggle').innerHTML =
    `<h3>${AppState.themes[AppState.currentTheme].name}</h3>`;
}

// 9. Moduswechsel zwischen Punkten und Heatmap
function toggleModeChange() {
  switchTo('currentMode', 'modes', (newIndex) => {
    applyFilters();
  });
  document.getElementById('mode-toggle').innerHTML =
    `<h3>${AppState.modes[AppState.currentMode]}</h3>`;
}

// 10. Sidebar- und Filter-Funktionen
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
                locationTextElement.innerHTML = '';
                const link = document.createElement('a');
                link.href = '#';
                link.textContent = placeName;
                link.style.cursor = 'pointer';
                link.style.textDecoration = 'underline';
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    map.flyTo({
                        center: event.coordinates,
                        zoom: 15,
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

function applyFilters() {
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

    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');
    const checkedTypes = Array.from(typeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

    // Clear existing layers
    AppState.events.markers.forEach(m => m.remove());
    AppState.events.markers = [];
    if (map.getLayer(AppState.heat.layerId)) {
        map.removeLayer(AppState.heat.layerId);
    }
    if (map.getSource(AppState.heat.sourceId)) {
        map.removeSource(AppState.heat.sourceId);
    }

    const currentMode = AppState.modes[AppState.currentMode];
    
    const filteredEvents = AppState.events.all.filter(event => {
        let visible = true;
        if (startDate && event.date < startDate) {
            visible = false;
        }
        if (endDate && event.date > endDate) {
            visible = false;
        }
        if (!checkedTypes.includes(event.title)) {
            visible = false;
        }
        return visible;
    });

    const filteredFeatures = window.geoJsonData.features.filter(feature => {
        const eventDate = new Date(feature.properties.date);
        let visible = true;
        if (startDate && eventDate < startDate) {
            visible = false;
        }
        if (endDate && eventDate > endDate) {
            visible = false;
        }
        if (!checkedTypes.includes(feature.properties.name)) {
            visible = false;
        }
        return visible;
    });

    if (currentMode === 'Punkte' || currentMode === 'Beides') {
        filteredEvents.forEach(event => {
            const marker = event.createMarker();
            marker.addTo(map);
            AppState.events.markers.push(marker);
        });
    }

    if (currentMode === 'Heatmap' || currentMode === 'Beides') {
        initializeHeatMapLayer(map, {
            type: 'FeatureCollection',
            features: filteredFeatures
        });
    }
}

function toggleFiltersMenu() {
  document.getElementById('filters-menu').classList.toggle('active');
}

function toggleLegendMenu() {
  document.getElementById('legend-menu').classList.toggle('active');
}

function addLatestEvent(type, date, location, lat, lng, description) {
  const content = document.getElementById('latest-events-content');
  if (!content) return;
  const maxEntries = 50;
  if (content.children.length >= maxEntries) {
    content.removeChild(content.firstElementChild);
  }
  const eventDiv = document.createElement('div');
  eventDiv.className = 'latest-event';
  eventDiv.innerHTML = `
    <h3>${type}</h3>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Location:</strong> ${location}</p>
    <p><strong>Coordinates:</strong> ${lat}, ${lng}</p>
    <p>${description}</p>
  `;
  content.appendChild(eventDiv);
}

function flyToDistrict() {
  const select = document.getElementById('district-select');
  if (!select) return;
  UI.flyToDistrict(select.value);
  select.value = '';
}

function toggleLatestEventsSidebar() {
    const sidebar = document.getElementById('latest-events-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');

    if (startDateInput) {
        startDateInput.addEventListener('change', applyFilters);
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', applyFilters);
    }

    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');
    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
});
