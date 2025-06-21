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
      features: [],
      all: [],
      
      addEvent(data) {
        // No need to create MapEvent objects anymore, we'll work with GeoJSON directly
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

    points: {
      sourceId: 'points-data',
      layerId: 'points-layer'
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
    const separatorIndex = value.indexOf('-');
    if (separatorIndex === -1) {
        console.error('Invalid district format:', value);
        return;
    }
    const district = value.substring(0, separatorIndex);
    const subdistrict = value.substring(separatorIndex + 1);
    const coords = AppState.districts[district]?.[subdistrict];
    if (coords) {
      map.flyTo({ center: coords, zoom: 14, speed: 0.8 });
    } else {
      console.error('Koordinaten nicht gefunden für:', value, 'parsed as', district, subdistrict);
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

// 5. Klasse für Events (Marker) - REMOVED FOR PERFORMANCE. Using GeoJSON layer instead.

// 6. Socket.IO-Verbindung für Echtzeit-Events
const socket = io();
socket.on('connect', () => console.log('Verbunden mit Server'));
socket.on('disconnect', () => console.log('Verbindung getrennt'));
socket.on('EventCreated', (data) => {
  // Add to internal data store
  if (!window.geoJsonData) {
    window.geoJsonData = { type: 'FeatureCollection', features: [] };
  }
  window.geoJsonData.features.push(data);
  
  // Update map
  applyFilters();

  // Update "Latest Events" panel
  const p = data.properties;
  const coords = data.geometry.coordinates;
  addLatestEvent(
      p.name, 
      new Date(p.date).toLocaleString('de-DE'), 
      p.location, // Assuming location is now in properties
      coords[1], 
      coords[0], 
      p.description
  );
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

function toggleSidebar() {
    document.getElementById('sidebar').classList.remove('active');
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

    const filteredFeatures = (window.geoJsonData?.features || []).filter(feature => {
        const eventDate = new Date(feature.properties.date);
        if (startDate && eventDate < startDate) return false;
        if (endDate && eventDate > endDate) return false;
        if (checkedTypes.length > 0 && !checkedTypes.includes(feature.properties.name)) return false;
        return true;
    });

    // Pre-calculate color and opacity for performance
    filteredFeatures.forEach(feature => {
        const eventDate = new Date(feature.properties.date);
        const now = new Date();
        const timeDiff = now - eventDate;
        const oneDay = 1000 * 60 * 60 * 24;
        const daysDiff = timeDiff / oneDay;

        let color = 'rgb(200, 200, 200)'; // Default: Light Grey
        if (daysDiff <= 0) {
            color = 'rgb(0, 255, 0)';
        } else if (daysDiff <= 7) {
            const ratio = daysDiff / 7;
            const red = Math.round(255 * ratio);
            color = `rgb(${red}, 255, 0)`;
        } else if (daysDiff <= 14) {
            const ratio = (daysDiff - 7) / 7;
            const green = Math.round(255 * (1 - ratio));
            color = `rgb(255, ${green}, 0)`;
        } else if (daysDiff <= 30) {
            const ratio = (daysDiff - 14) / 16;
            const colorValue = Math.round(255 - (127 * ratio));
            color = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
        }
        feature.properties.color = color;

        let opacity = 0.5; // Default for > 30 and <= 90 days
        if (daysDiff <= 1) opacity = 1;
        else if (daysDiff <= 7) opacity = 0.9;
        else if (daysDiff <= 14) opacity = 0.8;
        else if (daysDiff <= 30) opacity = 0.65;
        else if (daysDiff > 90) opacity = 0.15; // Older than 3 months
        feature.properties.opacity = opacity;
    });

    const currentMode = AppState.modes[AppState.currentMode];
    const showPoints = currentMode === 'Punkte' || currentMode === 'Beides';
    const showHeatmap = currentMode === 'Heatmap' || currentMode === 'Beides';

    // --- High-Performance Points Layer ---
    const pointsSource = map.getSource(AppState.points.sourceId);
    const pointsLayer = map.getLayer(AppState.points.layerId);
    const pointsData = { type: 'FeatureCollection', features: filteredFeatures };

    if (showPoints) {
        if (pointsSource) {
            pointsSource.setData(pointsData);
        } else {
            map.addSource(AppState.points.sourceId, { type: 'geojson', data: pointsData });
        }
        if (!pointsLayer) {
            map.addLayer({
                id: AppState.points.layerId,
                type: 'circle',
                source: AppState.points.sourceId,
                paint: {
                    'circle-radius': 7,
                    'circle-color': ['get', 'color'],
                    'circle-opacity': ['get', 'opacity'],
                    'circle-stroke-width': 0 // Remove black border
                }
            });

            map.on('click', AppState.points.layerId, (e) => {
                const feature = e.features[0];
                // Re-create an "event" object for showEventDetails from the feature
                const event = {
                    title: feature.properties.name,
                    date: new Date(feature.properties.date),
                    coordinates: feature.geometry.coordinates,
                    description: feature.properties.description
                };
                showEventDetails(event);
            });

            map.on('mouseenter', AppState.points.layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
            map.on('mouseleave', AppState.points.layerId, () => { map.getCanvas().style.cursor = ''; });
        }
        if (pointsLayer) {
            map.setLayoutProperty(AppState.points.layerId, 'visibility', 'visible');
        }
    } else {
        if (pointsLayer) {
            map.setLayoutProperty(AppState.points.layerId, 'visibility', 'none');
        }
    }

    // --- Heatmap Layer ---
    const heatmapLayer = map.getLayer(AppState.heat.layerId);
    if (showHeatmap) {
        initializeHeatMapLayer(map, { type: 'FeatureCollection', features: filteredFeatures });
        if (heatmapLayer) {
            map.setLayoutProperty(AppState.heat.layerId, 'visibility', 'visible');
        }
    } else {
        if (heatmapLayer) {
            map.setLayoutProperty(AppState.heat.layerId, 'visibility', 'none');
        }
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

  // Remove placeholder if it exists
  const placeholder = content.querySelector('p');
  if (placeholder && placeholder.textContent.startsWith('Keine Ereignisse')) {
      content.innerHTML = '';
  }

  const maxEntries = 50;
  // Remove the oldest entry if the list is full
  if (content.children.length >= maxEntries) {
    content.removeChild(content.lastElementChild);
  }
  
  const eventDiv = document.createElement('div');
  eventDiv.className = 'latest-event';
  eventDiv.innerHTML = `
    <h3>${type}</h3>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Location:</strong> ${location || 'N/A'}</p>
    <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
    <p>${description || 'No description.'}</p>
  `;
  // Add the new event to the top of the list
  content.insertBefore(eventDiv, content.firstChild);
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
