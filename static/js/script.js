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

    // Selection state
    selection: {
      isSelecting: false,
      startPoint: null,
      endPoint: null,
      selectedEvents: [],
      selectionBox: null
    },
  
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
    },    districts: {
      'Eimsbüttel': {
        'Schanzenviertel': [9.9638, 53.5643],
        'Hoheluft-West': [9.9736, 53.5794],
        'Eppendorf': [9.9820, 53.5810]
      },
      'Altona': {
        'Ottensen': [9.9326, 53.5542],
        'Altona-Altstadt': [9.9347, 53.5464],
        'Bahrenfeld': [9.9061, 53.5654]
      },
      'Hamburg-Mitte': {
        'St. Pauli': [9.9658, 53.5503],
        'HafenCity': [10.0024, 53.5414],
        'Altstadt': [10.0013, 53.5503]
      },
      'Hamburg-Nord': {
        'Winterhude': [10.0098, 53.5916],
        'Barmbek': [10.0456, 53.5851],
        'Fuhlsbüttel': [9.9935, 53.6320]
      },
      'Wandsbek': {
        'Rahlstedt': [10.1547, 53.6058],
        'Wandsbek': [10.0743, 53.5741],
        'Bramfeld': [10.0891, 53.6158]
      },
      'Bergedorf': {
        'Bergedorf': [10.2319, 53.4844],
        'Billstedt': [10.1254, 53.5395],
        'Lohbrügge': [10.1987, 53.4934]
      },
      'Harburg': {
        'Harburg': [9.9886, 53.4607],
        'Neugraben-Fischbek': [9.8637, 53.4711],
        'Finkenwerder': [9.8354, 53.5353]
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
  },  flyToDistrict(value) {
    // Known district prefixes in order of specificity (longer names first)
    const districtPrefixes = ['Hamburg-Nord', 'Hamburg-Mitte', 'Eimsbüttel', 'Altona', 'Wandsbek', 'Bergedorf', 'Harburg'];
    
    let district = null;
    let subdistrict = null;
    
    // Find the matching district prefix
    for (const prefix of districtPrefixes) {
      if (value.startsWith(prefix + '-')) {
        district = prefix;
        subdistrict = value.substring(prefix.length + 1); // +1 for the '-'
        break;
      }
    }
    
    if (!district || !subdistrict) {
      console.error('Invalid district format:', value);
      return;
    }
    
    const coords = AppState.districts[district]?.[subdistrict];
    if (coords) {
      map.flyTo({ center: coords, zoom: 14, speed: 0.8 });
    } else {
      console.error('Koordinaten nicht gefunden für:', value, 'parsed as district:', district, 'subdistrict:', subdistrict);
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

// Add rectangle selection event handlers
map.on('load', () => {
    // Apply initial filters once the map has loaded.
    // This will use the default date values set in the DOMContentLoaded listener.
    applyFilters();
});

// Rectangle selection event handlers
map.on('mousedown', (e) => {
    if (!AppState.selection.isSelecting) return;
    
    AppState.selection.startPoint = {
        x: e.point.x,
        y: e.point.y
    };
    
    e.preventDefault();
});

map.on('mousemove', (e) => {
    if (!AppState.selection.isSelecting || !AppState.selection.startPoint) return;
    
    AppState.selection.endPoint = {
        x: e.point.x,
        y: e.point.y
    };
    
    createSelectionBox(AppState.selection.startPoint, AppState.selection.endPoint);
});

map.on('mouseup', (e) => {
    if (!AppState.selection.isSelecting || !AppState.selection.startPoint) return;
    
    AppState.selection.endPoint = {
        x: e.point.x,
        y: e.point.y
    };
    
    // Get events in the selected rectangle
    const selectedEvents = getEventsInRectangle(AppState.selection.startPoint, AppState.selection.endPoint);
      if (selectedEvents.length > 0) {
        AppState.selection.selectedEvents = selectedEvents;
        showMultipleEventDetails(selectedEvents);
    } else {
        // Show a temporary message for empty selection
        const sidebar = document.getElementById('sidebar');
        const content = document.getElementById('event-content');
        content.innerHTML = `
            <h2>Keine Ereignisse gefunden</h2>
            <p>In dem ausgewählten Bereich wurden keine Ereignisse gefunden.</p>
            <p>Versuche einen größeren Bereich zu wählen oder prüfe die aktuellen Filter.</p>
        `;
        sidebar.classList.add('active');
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            sidebar.classList.remove('active');
        }, 3000);
    }
    
    // End selection mode
    endRectangleSelection();
});

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
  
  // Update map, which in turn will update the latest events list
  applyFilters();
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

// New helper function for reverse geocoding
async function reverseGeocode(lng, lat) {
    try {
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&types=address,poi,neighborhood,locality,place&limit=1`;
        const response = await fetch(geocodeUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.features && data.features.length > 0) {
            return data.features[0].place_name;
        }
        return "Location details not found";
    } catch (error) {
        console.error('Error fetching location:', error);
        return "Could not fetch location details";
    }
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

    if (locationTextElement) {
        const [lng, lat] = event.coordinates;
        const placeName = await reverseGeocode(lng, lat);

        locationTextElement.innerHTML = ''; // Clear "Fetching..."
        if (placeName.startsWith("Could not") || placeName.startsWith("Location details")) {
            locationTextElement.textContent = placeName;
        } else {
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
        }
    }
}

// New function to show multiple selected events
function showMultipleEventDetails(events) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('event-content');
    if (!sidebar || !content) {
        console.error('Sidebar or event content element not found!');
        return;
    }

    content.innerHTML = `
        <h2>Ausgewählte Ereignisse (${events.length})</h2>
        <div id="selected-events-list"></div>
    `;

    const eventsList = document.getElementById('selected-events-list');
    
    events.forEach((event, index) => {
        const formattedDate = event.date.toLocaleString('de-DE', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });        const eventDiv = document.createElement('div');
        eventDiv.className = 'selected-event-item';
        eventDiv.innerHTML = `
            <div class="event-header" onclick="toggleEventDetails(${index})">
                <h3>${event.title} <span class="toggle-icon">▼</span></h3>
            </div>
            <div class="event-details" id="event-details-${index}" style="display: none;">
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Coordinates:</strong> ${event.coordinates[1].toFixed(6)}, ${event.coordinates[0].toFixed(6)}</p>
                <p><strong>Location:</strong> <a href="#" id="multi-event-location-${index}" style="color: #4c51bf; text-decoration: underline; cursor: pointer;" data-lng="${event.coordinates[0]}" data-lat="${event.coordinates[1]}">Click to fetch location</a></p>
                <p>${event.description || 'No description available.'}</p>
                <button onclick="flyToEvent(${event.coordinates[0]}, ${event.coordinates[1]})" class="fly-to-btn">Zu diesem Ereignis</button>
            </div>
        `;
        eventsList.appendChild(eventDiv);

        // Add event listener for location fetching in multi-event view
        const locationLink = eventDiv.querySelector(`#multi-event-location-${index}`);
        if (locationLink) {
            locationLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const link = e.currentTarget;
                const lng = parseFloat(link.dataset.lng);
                const lat = parseFloat(link.dataset.lat);
                
                link.textContent = 'Loading...';
                link.style.textDecoration = 'none';
                link.style.cursor = 'default';
                
                const placeName = await reverseGeocode(lng, lat);
                
                if (placeName.startsWith("Could not") || placeName.startsWith("Location details")) {
                    link.textContent = placeName;
                    link.style.color = '#718096';
                } else {
                    link.textContent = placeName;
                    link.style.textDecoration = 'underline';
                    link.style.cursor = 'pointer';
                    link.style.color = '#4c51bf';
                    
                    // Add click event to fly to location
                    link.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        map.flyTo({
                            center: [lng, lat],
                            zoom: 15,
                            speed: 0.8
                        });
                    });
                }
            }, { once: true });
        }
    });

    sidebar.classList.add('active');
}

// Toggle individual event details in multi-selection view
function toggleEventDetails(index) {
    const details = document.getElementById(`event-details-${index}`);
    const icon = document.querySelector(`#selected-events-list .event-header:nth-child(${(index * 2) + 1}) .toggle-icon`);
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        icon.textContent = '▲';
    } else {
        details.style.display = 'none';
        icon.textContent = '▼';
    }
}

// Fly to specific event coordinates
function flyToEvent(lng, lat) {
    map.flyTo({
        center: [lng, lat],
        zoom: 15,
        speed: 0.8
    });
}

// Rectangle selection functions
function startRectangleSelection() {
    AppState.selection.isSelecting = true;
    map.getCanvas().style.cursor = 'crosshair';
    
    // Disable map interactions during selection
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.keyboard.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();
}

function endRectangleSelection() {
    AppState.selection.isSelecting = false;
    AppState.selection.startPoint = null;
    AppState.selection.endPoint = null;
    map.getCanvas().style.cursor = '';
    
    // Re-enable map interactions
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.boxZoom.enable();
    map.dragRotate.enable();
    map.keyboard.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
    
    // Remove selection box if it exists
    if (AppState.selection.selectionBox) {
        AppState.selection.selectionBox.remove();
        AppState.selection.selectionBox = null;
    }
}

function createSelectionBox(startPoint, endPoint) {
    // Remove existing selection box
    if (AppState.selection.selectionBox) {
        AppState.selection.selectionBox.remove();
    }
    
    const box = document.createElement('div');
    box.className = 'selection-box';
    
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    
    box.style.left = left + 'px';
    box.style.top = top + 'px';
    box.style.width = width + 'px';
    box.style.height = height + 'px';
    
    map.getContainer().appendChild(box);
    AppState.selection.selectionBox = box;
}

function getEventsInRectangle(startPoint, endPoint) {
    // Use currently filtered and visible features instead of all features
    const currentlyVisibleFeatures = getCurrentlyFilteredFeatures();
    const selectedEvents = [];
    
    // Convert screen coordinates to map coordinates
    const startLngLat = map.unproject(startPoint);
    const endLngLat = map.unproject(endPoint);
    
    // Create bounding box
    const minLng = Math.min(startLngLat.lng, endLngLat.lng);
    const maxLng = Math.max(startLngLat.lng, endLngLat.lng);
    const minLat = Math.min(startLngLat.lat, endLngLat.lat);
    const maxLat = Math.max(startLngLat.lat, endLngLat.lat);
    
    currentlyVisibleFeatures.forEach(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        
        if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
            const event = {
                title: feature.properties.name,
                date: new Date(feature.properties.date),
                coordinates: feature.geometry.coordinates,
                description: feature.properties.description
            };
            selectedEvents.push(event);
        }
    });
    
    return selectedEvents;
}

// Helper function to get currently filtered features (same logic as applyFilters)
function getCurrentlyFilteredFeatures() {
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

    return filteredFeatures;
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

        // --- DYNAMIC MARKER SIZING ---
        const maxRadius = 7;
        const minRadius = 5.7;
        const interpolationDays = 90;
        let radius = minRadius; // Default for oldest

        if (daysDiff <= 0) { // today or future (newest)
            radius = maxRadius;
        } else if (daysDiff < interpolationDays) { // linear interpolation
            const slope = (minRadius - maxRadius) / interpolationDays;
            radius = slope * daysDiff + maxRadius;
        }
        // For daysDiff >= interpolationDays, it will remain minRadius

        feature.properties.radius = radius;
    });

    const currentMode = AppState.modes[AppState.currentMode];
    const showPoints = currentMode === 'Punkte' || currentMode === 'Beides';
    const showHeatmap = currentMode === 'Heatmap' || currentMode === 'Beides';

    // --- High-Performance Points Layer ---
    const pointsSource = map.getSource(AppState.points.sourceId);
    const pointsLayer = map.getLayer(AppState.points.layerId);
    const shadowLayer = map.getLayer(AppState.points.layerId + '-shadow');
    const pointsData = { type: 'FeatureCollection', features: filteredFeatures };

    if (showPoints) {
        if (pointsSource) {
            pointsSource.setData(pointsData);
        } else {
            map.addSource(AppState.points.sourceId, { type: 'geojson', data: pointsData });
        }

        if (!pointsLayer) {
            // Add a larger, blurred layer underneath for a glow/shadow effect.
            // The radius and blur are interpolated based on zoom level to ensure visibility.
            map.addLayer({
                id: AppState.points.layerId + '-shadow',
                type: 'circle',
                source: AppState.points.sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 20, // At zoom 10, radius is 10px
                        22, 40  // At zoom 22, radius is 20px
                    ],
                    'circle-color': ['get', 'color'],
                    'circle-opacity': ['get', 'opacity'],
                    'circle-blur': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 2.5, // At zoom 10, blur is 2.5
                        22, 8    // At zoom 22, blur is 8
                    ]
                }
            });
            // Add the main, crisp point layer on top
            map.addLayer({
                id: AppState.points.layerId,
                type: 'circle',
                source: AppState.points.sourceId,
                paint: {
                    'circle-radius': ['get', 'radius'], // Use dynamic radius
                    'circle-color': ['get', 'color'],
                    'circle-opacity': ['get', 'opacity'],
                    'circle-stroke-width': 0 // No border
                }
            });            map.on('click', AppState.points.layerId, (e) => {
                // Check if we're in selection mode
                if (AppState.selection.isSelecting) return;
                
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

        // Toggle visibility for both layers
        if (pointsLayer) {
            map.setLayoutProperty(AppState.points.layerId, 'visibility', 'visible');
        }
        if (shadowLayer) {
            map.setLayoutProperty(AppState.points.layerId + '-shadow', 'visibility', 'visible');
        }
    } else {
        if (pointsLayer) {
            map.setLayoutProperty(AppState.points.layerId, 'visibility', 'none');
        }
        if (shadowLayer) {
            map.setLayoutProperty(AppState.points.layerId + '-shadow', 'visibility', 'none');
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

    // Update the latest events list from the master data source, sorted correctly.
    updateLatestEventsList(window.geoJsonData?.features);
}

function toggleFiltersMenu() {
  document.getElementById('filters-menu').classList.toggle('active');
}

function toggleLegendMenu() {
  document.getElementById('legend-menu').classList.toggle('active');
}

// Rebuilds the entire "Latest Events" list from the source data, ensuring correct sort order.
function updateLatestEventsList(features) {
    const content = document.getElementById('latest-events-content');
    if (!content) return;

    // Create a sorted copy of features, newest first.
    const sortedFeatures = [...(features || [])].sort((a, b) => new Date(b.properties.date) - new Date(a.properties.date));

    // Clear the list
    content.innerHTML = '';

    if (sortedFeatures.length === 0) {
        content.innerHTML = '<p>Keine Ereignisse vorhanden.</p>';
        return;
    }

    const maxEntries = 50;
    const featuresToShow = sortedFeatures.slice(0, maxEntries);

    featuresToShow.forEach(feature => {
        const p = feature.properties;
        const coords = feature.geometry.coordinates;
        
        const eventDiv = document.createElement('div');
        eventDiv.className = 'latest-event';
        
        const locationId = `latest-event-location-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const date = new Date(p.date).toLocaleString('de-DE');
        const location = p.location;
        const lat = coords[1];
        const lng = coords[0];        let locationHTML;
        if (location && location !== 'N/A') {
            locationHTML = `<span>${location}</span>`;
        } else {
            locationHTML = `<a href="#" id="${locationId}" style="color: #4c51bf; text-decoration: underline; cursor: pointer;" data-lng="${lng}" data-lat="${lat}">Click to fetch location</a>`;
        }

        eventDiv.innerHTML = `
          <h3>${p.name}</h3>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Location:</strong> ${locationHTML}</p>
          <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
          <p>${p.description || 'No description.'}</p>
        `;
          content.appendChild(eventDiv);

        const fetchLink = eventDiv.querySelector(`#${locationId}`);
        if (fetchLink) {
            fetchLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const link = e.currentTarget;
                const lng = parseFloat(link.dataset.lng);
                const lat = parseFloat(link.dataset.lat);
                
                link.textContent = 'Loading...';
                link.style.textDecoration = 'none';
                link.style.cursor = 'default';
                
                const placeName = await reverseGeocode(lng, lat);
                
                link.innerHTML = '';

                if (placeName.startsWith("Could not") || placeName.startsWith("Location details")) {
                    link.textContent = placeName;
                    link.style.color = '#718096';
                } else {
                    const newLink = document.createElement('a');
                    newLink.href = '#';
                    newLink.textContent = placeName;
                    newLink.style.cursor = 'pointer';
                    newLink.style.textDecoration = 'underline';
                    newLink.style.color = '#4c51bf';
                    newLink.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        map.flyTo({
                            center: [lng, lat],
                            zoom: 15,
                            speed: 0.8
                        });
                    });
                    link.parentNode.replaceChild(newLink, link);
                }
            }, { once: true });
        }
    });
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

// Toggle rectangle selection mode
function toggleRectangleSelection() {
    const button = document.getElementById('selection-toggle');
    
    if (AppState.selection.isSelecting) {
        // End selection mode
        endRectangleSelection();
        button.textContent = '📦 Auswahl';
        button.classList.remove('active');
    } else {
        // Start selection mode
        startRectangleSelection();
        button.textContent = '❌ Beenden';
        button.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');

    // Sorting is now handled by prepending new events in addLatestEvent.
    // The flex-direction: column-reverse style is no longer needed.

    // Set default start date to 30 days ago
    if (startDateInput) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    }
    
    // Set default end date to today
    if (endDateInput) {
        const today = new Date();
        endDateInput.value = today.toISOString().split('T')[0];
    }

    if (startDateInput) {
        startDateInput.addEventListener('change', applyFilters);
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', applyFilters);
    }

    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Press 'S' to toggle selection mode
        if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.altKey && !e.metaKey) {
            const activeElement = document.activeElement;
            // Don't trigger if user is typing in an input field
            if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                toggleRectangleSelection();
            }
        }
        
        // Press 'Escape' to end selection mode
        if (e.key === 'Escape' && AppState.selection.isSelecting) {
            e.preventDefault();
            endRectangleSelection();
            const button = document.getElementById('selection-toggle');
            button.textContent = '📦 Auswahl';
            button.classList.remove('active');
        }
    });
});
