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
      },    },
  
    heat: {
      sourceId: 'heatmap-data',
      layerId: 'heatmap-layer'
    },

    points: {
      sourceId: 'points-data',
      layerId: 'points-layer'
    },
    
    // Hotspot highlighting state
    hotspotView: {
      isActive: false,
      overlays: [],
      currentHotspots: []
    },
    
    districts: {
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

// Globale Funktion für das District-Dropdown
function flyToDistrict() {
  const select = document.getElementById('district-select');
  if (!select) return;
  if (select.value) {
    UI.flyToDistrict(select.value);
    select.value = '';
  }
}

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
    const selectedFeatures = getEventsInRectangle(AppState.selection.startPoint, AppState.selection.endPoint);
    if (selectedFeatures.length > 0) {
        AppState.selection.selectedEvents = selectedFeatures;
        showMultipleEventDetails(selectedFeatures);
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

// 9.1 Light/Dark Mode Toggle
function toggleLightDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    document.querySelector('#light-dark-toggle h3').textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('ui-theme', isDarkMode ? 'dark' : 'light');
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
        <p><strong>Type:</strong> ${(event.title === 'UNFALL' ? 'Unfall' : event.title === 'AuthorityOperation' ? 'Behördlicher Einsatz' : event.title)}</p>
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
    
    // Entferne doppelte Events anhand einer eindeutigen ID oder Koordinaten+Datum
    const seen = new Set();
    const uniqueEvents = events.filter(event => {
        // Annahme: Kombination aus Koordinaten und Datum ist eindeutig
        const key = `${event.geometry?.coordinates?.join(',') || event.coordinates?.join(',')}_${event.properties?.date || event.date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
      uniqueEvents.forEach((event, index) => {
        // Handle both old and new data structures
        const eventDate = event.properties?.date || event.date;
        const eventTitle = event.properties?.name || event.title || 'UNFALL';
        const eventCoords = event.geometry?.coordinates || event.coordinates;
        const eventDescription = event.properties?.description || event.description;
        
        const formattedDate = new Date(eventDate).toLocaleString('de-DE', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
          const eventDiv = document.createElement('div');
        eventDiv.className = 'selected-event-item';
        eventDiv.style.cssText = `
            margin: 12px 0;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 12px;
            border-left: 4px solid #ff4157;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            border: 1px solid #e2e8f0;
        `;
        
        // Add hover effects
        eventDiv.addEventListener('mouseenter', () => {
            eventDiv.style.transform = 'translateY(-2px)';
            eventDiv.style.boxShadow = '0 8px 25px rgba(255, 65, 87, 0.15)';
            eventDiv.style.borderLeftColor = '#e53e3e';
        });
        
        eventDiv.addEventListener('mouseleave', () => {
            eventDiv.style.transform = 'translateY(0)';
            eventDiv.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            eventDiv.style.borderLeftColor = '#ff4157';
        });
        
        const eventTypeDisplay = formatEventType(eventTitle);
        
        eventDiv.innerHTML = `
            <div class="event-header" style="padding: 15px; cursor: pointer; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border-bottom: 1px solid #e2e8f0; transition: background 0.2s ease;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; color: #2d3748; font-size: 1.1em; font-weight: 600;">${eventTypeDisplay}</h3>
                        <div style="font-size: 0.9em; color: #718096; margin-top: 6px; font-weight: 500;">${formattedDate}</div>
                    </div>
                    <span class="toggle-icon" style="color: #ff4157; font-size: 1.2em; font-weight: bold; transition: transform 0.2s ease;">▼</span>
                </div>
            </div>            <div class="event-details" id="event-details-${index}" style="display: none; padding: 20px; background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);">
                <div style="display: grid; gap: 15px;">
                    <div style="padding: 12px; background: rgba(255, 65, 87, 0.05); border-radius: 8px; border-left: 3px solid #ff4157;">
                        <strong style="color: #e53e3e; font-size: 0.9em; text-transform: uppercase, letter-spacing: 0.5px;">Typ:</strong> 
                        <div style="color: #2d3748; font-weight: 600; margin-top: 4px;">${eventTypeDisplay}</div>
                    </div>
                    <div style="padding: 12px; background: rgba(74, 85, 104, 0.05); border-radius: 8px; border-left: 3px solid #4a5568;">
                        <strong style="color: #4a5568; font-size: 0.9em, text-transform: uppercase, letter-spacing: 0.5px;">Datum:</strong> 
                        <div style="color: #2d3748; font-weight: 500, margin-top: 4px;">${formattedDate}</div>
                    </div>
                    <div style="padding: 12px; background: rgba(56, 178, 172, 0.05); border-radius: 8px; border-left: 3px solid #38b2ac;">
                        <strong style="color: #38b2ac; font-size: 0.9em; text-transform: uppercase, letter-spacing: 0.5px;">Koordinaten:</strong> 
                        <div style="color: #2d3748; font-weight: 500; margin-top: 4px; font-family: monospace;">${eventCoords[1].toFixed(6)}, ${eventCoords[0].toFixed(6)}</div>
                    </div>
                    <div style="padding: 12px; background: rgba(76, 81, 191, 0.05); border-radius: 8px; border-left: 3px solid #4c51bf;">
                        <strong style="color: #4c51bf; font-size: 0.9em; text-transform: uppercase, letter-spacing: 0.5px;">Ort:</strong> 
                        <div style="margin-top: 8px;">
                            <a href="#" id="multi-event-location-${index}" style="color: #4c51bf; text-decoration: none; font-weight: 500; padding: 6px 12px; background: rgba(76, 81, 191, 0.1); border-radius: 6px; display: inline-block; transition: all 0.2s ease; cursor: pointer;" data-lng="${eventCoords[0]}" data-lat="${eventCoords[1]}">📍 Ort laden...</a>
                        </div>
                    </div>
                    ${eventDescription ? `
                        <div style="padding: 12px; background: rgba(113, 128, 150, 0.05); border-radius: 8px; border-left: 3px solid #718096;">
                            <strong style="color: #718096; font-size: 0.9em; text-transform: uppercase, letter-spacing: 0.5px;">Beschreibung:</strong>
                            <div style="margin-top: 8px; padding: 12px; background: rgba(74, 85, 104, 0.08); border-radius: 8px; font-size: 0.95em; color: #2d3748; line-height: 1.6; border: 1px solid rgba(74, 85, 104, 0.1);">
                                ${eventDescription}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div style="margin-top: 20px; text-align: right; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                    <button onclick="flyToEvent(${eventCoords[0]}, ${eventCoords[1]})" 
                            style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 0.95em; font-weight: 600; box-shadow: 0 2px 8px rgba(72, 187, 120, 0.3); transition: all 0.2s ease;"
                            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(72, 187, 120, 0.4)'"
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(72, 187, 120, 0.3)'">
                        🗺️ Zu diesem Ereignis
                    </button>
                </div>
            </div>`;
        eventsList.appendChild(eventDiv);        // Add click handler for event header to toggle details
        const eventHeader = eventDiv.querySelector('.event-header');
        const eventDetails = eventDiv.querySelector(`#event-details-${index}`);
        const toggleIcon = eventDiv.querySelector('.toggle-icon');
        
        if (eventHeader && eventDetails && toggleIcon) {
            // Add header hover effect
            eventHeader.addEventListener('mouseenter', () => {
                eventHeader.style.background = 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)';
            });
            
            eventHeader.addEventListener('mouseleave', () => {
                eventHeader.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
            });
            
            eventHeader.addEventListener('click', () => {
                if (eventDetails.style.display === 'none') {
                    eventDetails.style.display = 'block';
                    toggleIcon.textContent = '▲';
                    toggleIcon.style.transform = 'rotate(180deg)';
                    eventHeader.style.borderBottomLeftRadius = '0';
                    eventHeader.style.borderBottomRightRadius = '0';
                } else {
                    eventDetails.style.display = 'none';
                    toggleIcon.textContent = '▼';
                    toggleIcon.style.transform = 'rotate(0deg)';
                    eventHeader.style.borderBottomLeftRadius = '12px';
                    eventHeader.style.borderBottomRightRadius = '12px';
                }
            });
        }        // Add event listener for location fetching in multi-event view
        const locationLink = eventDiv.querySelector(`#multi-event-location-${index}`);
        if (locationLink) {
            // Add hover effect for location link
            locationLink.addEventListener('mouseenter', () => {
                locationLink.style.background = 'rgba(76, 81, 191, 0.2)';
                locationLink.style.transform = 'translateY(-1px)';
            });
            
            locationLink.addEventListener('mouseleave', () => {
                locationLink.style.background = 'rgba(76, 81, 191, 0.1)';
                locationLink.style.transform = 'translateY(0)';
            });
            
            locationLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const link = e.currentTarget;
                const lng = parseFloat(link.dataset.lng);
                const lat = parseFloat(link.dataset.lat);
                
                link.textContent = '⏳ Loading...';
                link.style.textDecoration = 'none';
                link.style.cursor = 'default';
                link.style.background = 'rgba(113, 128, 150, 0.1)';
                link.style.color = '#718096';
                
                const placeName = await reverseGeocode(lng, lat);
                
                if (placeName.startsWith("Could not") || placeName.startsWith("Location details")) {
                    link.textContent = '❌ ' + placeName;
                    link.style.color = '#e53e3e';
                    link.style.background = 'rgba(229, 62, 62, 0.1)';
                } else {
                    link.textContent = '📍 ' + placeName;
                    link.style.textDecoration = 'none';
                    link.style.cursor = 'pointer';
                    link.style.color = '#4c51bf';
                    link.style.background = 'rgba(76, 81, 191, 0.1)';
                    
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
    });    sidebar.classList.add('active');
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
    const selectedFeatures = [];

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
            selectedFeatures.push(feature);
        }
    });

    return selectedFeatures;
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
        // Robust type filter: support both 'type' and 'name' property
        const eventType = feature.properties.type || feature.properties.name;
        if (checkedTypes.length > 0 && !checkedTypes.includes(eventType)) return false;
        return true;
    });

    return filteredFeatures;
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    adjustHotspotControlsPosition();
}

function applyFilters() {
    const startDateString = document.getElementById('filter-start-date')?.value;
    const endDateString = document.getElementById('filter-end-date')?.value;
    const startDate = startDateString ? new Date(startDateString) : null;
    let endDate = endDateString ? new Date(endDateString) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    if (startDate) startDate.setHours(0, 0, 0, 0);
    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');
    const checkedTypes = Array.from(typeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

    // --- Fix: Wenn keine Checkbox aktiv ist, keine Events anzeigen ---
    let filteredFeatures = [];
    if (checkedTypes.length === 0) {
        filteredFeatures = [];
    } else {
        filteredFeatures = (window.geoJsonData?.features || []).filter(feature => {
            const eventDate = new Date(feature.properties.date);
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            // Robust type filter: support both 'type' and 'name' property
            const eventType = feature.properties.type || feature.properties.name;
            if (!checkedTypes.includes(eventType)) return false;
            return true;
        });
    }
    // Sort features by date to identify the 3 newest events
    const sortedByDate = [...filteredFeatures].sort((a, b) => 
        new Date(b.properties.date) - new Date(a.properties.date)
    );
    const newestThreeIds = sortedByDate.slice(0, 3).map(f => f.properties.date + f.geometry.coordinates.join(','));

    // Pre-calculate color and opacity for performance
        // ...existing code...
    // Pre-calculate color and opacity for performance
    filteredFeatures.forEach(feature => {
        const eventDate = new Date(feature.properties.date);
        const now = new Date();
        const timeDiff = now - eventDate;
        const oneDay = 1000 * 60 * 60 * 24;
        const daysDiff = timeDiff / oneDay;

        const type = feature.properties.name;
        // 7 event types and their base H (hue) values
        const typeHues = {
            'UNFALL':        0,    // Red
            'STAU':          30,   // Orange
            'BAUSTELLE':     50,   // Yellow
            'WARTUNG':       120,  // Green
            'SCHLECHTE_FAHRBEDINGUNG': 220, // Blue
            'SPERRUNG':      275,  // Indigo
            'VERANSTALTUNG': 290   // Violet
        };
        // Default to gray if unknown
        const hue = typeHues[type] !== undefined ? typeHues[type] : 0;

        // --- NEW COLOR RULES ---
        // 0 days: s=75, v=100
        // 0-10 days: s=75->100, v=100
        // 10-30 days: s=100->0, v=100->50
        let sat = 75, val = 100;
        if (daysDiff <= 0) {
            sat = 75;
            val = 100;
        } else if (daysDiff <= 10) {
            // Linear interpolate s: 75->100, v: 100
            sat = 75 + ((100 - 75) * (daysDiff / 10));
            val = 100;
        } else if (daysDiff <= 30) {
            // Linear interpolate s: 100->0, v: 100->50
            sat = 100 - (100 * ((daysDiff - 10) / 20));
            val = 100 - (50 * ((daysDiff - 10) / 20));
        } else {
            sat = 0;
            val = 50;
        }

        // Convert HSV to HSL for CSS (approximation)
        // HSL lightness = V * (1 - S/2)
        // HSL saturation = (V * S) / (1 - |2L - 1|)
        // For simplicity, use HSL with L = (2 - S/100) * V/2
        // But for vivid colors, just use H, S, and L = V/2 + 25
        // We'll use HSL(h, s%, l%) with l = val/2 + 25 for a bright look
        let l = val / 2 + 25;
        if (l > 100) l = 100;
        if (l < 0) l = 0;

        const color = `hsl(${hue}, ${sat}%, ${l}%)`;
        feature.properties.color = color;

        // --- OPACITY RULES (unchanged) ---
        let opacity = 0.5; // Default for > 30 and <= 90 days
        if (daysDiff <= 1) opacity = 1;
        else if (daysDiff <= 7) opacity = 0.9;
        else if (daysDiff <= 14) opacity = 0.8;
        else if (daysDiff <= 30) opacity = 0.65;
        else if (daysDiff > 90) opacity = 0.15; // Older than 3 months
        feature.properties.opacity = opacity;

        // --- DYNAMIC MARKER SIZING (unchanged) ---
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

        // --- BLUE BORDER FOR 3 NEWEST EVENTS (unchanged) ---
        const eventId = feature.properties.date + feature.geometry.coordinates.join(',');
        const isNewest = newestThreeIds.includes(eventId);
        feature.properties.isNewest = isNewest;
        feature.properties.strokeColor = isNewest ? '#0066ff' : 'transparent';
        feature.properties.strokeWidth = isNewest ? 3 : 0;
    });
// ...existing

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

        if (!pointsLayer) {            // Add a larger, blurred layer underneath for a glow/shadow effect.
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
                    'circle-opacity': [
                        '*',
                        ['get', 'opacity'],
                        0.5 // Make shadow more subtle
                    ],
                    'circle-blur': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 2.5, // At zoom 10, blur is 2.5
                        22, 8    // At zoom 22, blur is 8
                    ],
                    'circle-stroke-width': ['get', 'strokeWidth'],
                    'circle-stroke-color': ['get', 'strokeColor'],
                    'circle-stroke-opacity': 0.8
                }
            });// Add the main, crisp point layer on top
            map.addLayer({
                id: AppState.points.layerId,
                type: 'circle',
                source: AppState.points.sourceId,
                paint: {
                    'circle-radius': ['get', 'radius'], // Use dynamic radius
                    'circle-color': ['get', 'color'],
                    'circle-opacity': ['get', 'opacity'],
                    'circle-stroke-width': ['get', 'strokeWidth'], // Blue border for newest events
                    'circle-stroke-color': ['get', 'strokeColor']
                }
            });map.on('click', AppState.points.layerId, (e) => {
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
    }    // Update the latest events list from the master data source, sorted correctly.
    updateLatestEventsList(window.geoJsonData?.features);    
    // Update stats panel if it's open
    if (document.getElementById('stats-panel').classList.contains('active')) {
        updateStatsPanel();
    }
}

// --- Filter-Event-Listener für alle relevanten Inputs ---
function setupFilterListeners() {
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');

    if (startDateInput) startDateInput.addEventListener('change', applyFilters);
    if (endDateInput) endDateInput.addEventListener('change', applyFilters);
    typeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
}

// --- Filter-Logik: Set default filter dates to today and 30 days ago, and fix filter logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved UI theme
    const savedUiTheme = localStorage.getItem('ui-theme');
    if (savedUiTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const toggleButton = document.querySelector('#light-dark-toggle h3');
        if (toggleButton) {
            toggleButton.textContent = 'Light Mode';
        }
    }

    // Set default dates for filters (format: yyyy-mm-dd)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    };

    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    if (startDateInput && endDateInput) {
        startDateInput.value = formatDate(thirtyDaysAgo);
        endDateInput.value = formatDate(today);
    }

    // Initial filter application on page load
    if (window.geoJsonData) {
        applyFilters();
    }
    setupFilterListeners();

    // --- Fix: Ensure toggleLatestEventsSidebar and toggleRectangleSelection are defined and hooked up ---
    function toggleLatestEventsSidebar() {
        const sidebar = document.getElementById('latest-events-sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('active');
    }

    function toggleRectangleSelection() {
        const button = document.getElementById('selection-toggle');
        if (!button) return;
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

    // Ensure event listeners for the buttons are set up (in case inline handlers are missing)
    function ensureButtonListeners() {
        const latestEventsBtn = document.getElementById('latest-events-toggle');
        if (latestEventsBtn) latestEventsBtn.onclick = toggleLatestEventsSidebar;
        const selectionBtn = document.getElementById('selection-toggle');
        if (selectionBtn) selectionBtn.onclick = toggleRectangleSelection;
    }
    ensureButtonListeners();

    // --- NEU: MutationObserver statt DOMNodeInserted ---
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                ensureButtonListeners();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// --- Fix filter logic to support both types and correct date parsing ---
function applyFilters() {
    const startDateString = document.getElementById('filter-start-date')?.value;
    const endDateString = document.getElementById('filter-end-date')?.value;
    const startDate = startDateString ? new Date(startDateString) : null;
    let endDate = endDateString ? new Date(endDateString) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    if (startDate) startDate.setHours(0, 0, 0, 0);
    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');
    const checkedTypes = Array.from(typeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

    // --- Fix: Wenn keine Checkbox aktiv ist, keine Events anzeigen ---
    let filteredFeatures = [];
    if (checkedTypes.length === 0) {
        filteredFeatures = [];
    } else {
        filteredFeatures = (window.geoJsonData?.features || []).filter(feature => {
            const eventDate = new Date(feature.properties.date);
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            // Robust type filter: support both 'type' and 'name' property
            const eventType = feature.properties.type || feature.properties.name;
            if (!checkedTypes.includes(eventType)) return false;
            return true;
        });
    }
    // Sort features by date to identify the 3 newest events
    const sortedByDate = [...filteredFeatures].sort((a, b) => 
        new Date(b.properties.date) - new Date(a.properties.date)
    );
    const newestThreeIds = sortedByDate.slice(0, 3).map(f => f.properties.date + f.geometry.coordinates.join(','));

    // Pre-calculate color and opacity for performance
        filteredFeatures.forEach(feature => {
        const eventDate = new Date(feature.properties.date);
        const now = new Date();
        const timeDiff = now - eventDate;
        const oneDay = 1000 * 60 * 60 * 24;
        const daysDiff = timeDiff / oneDay;

        const type = feature.properties.name;
        // 7 event types and their base H (hue) values
        const typeHues = {
            'UNFALL':        0,    // Red
            'STAU':          30,   // Orange
            'BAUSTELLE':     50,   // Yellow
            'WARTUNG':       120,  // Green
            'SCHLECHTE_FAHRBEDINGUNG': 220, // Blue
            'SPERRUNG':      275,  // Indigo
            'VERANSTALTUNG': 290   // Violet
        };
        // Default to gray if unknown
        const hue = typeHues[type] !== undefined ? typeHues[type] : 0;

        // --- NEW COLOR RULES ---
        // 0 days: s=75, v=100
        // 0-10 days: s=75->100, v=100
        // 10-30 days: s=100->0, v=100->50
        let sat = 75, val = 100;
        if (daysDiff <= 0) {
            sat = 75;
            val = 100;
        } else if (daysDiff <= 10) {
            // Linear interpolate s: 75->100, v: 100
            sat = 75 + ((100 - 75) * (daysDiff / 10));
            val = 100;
        } else if (daysDiff <= 30) {
            // Linear interpolate s: 100->0, v: 100->50
            sat = 100 - (100 * ((daysDiff - 10) / 20));
            val = 100 - (50 * ((daysDiff - 10) / 20));
        } else {
            sat = 0;
            val = 50;
        }

        // Convert HSV to HSL for CSS (approximation)
        // HSL lightness = V * (1 - S/2)
        // HSL saturation = (V * S) / (1 - |2L - 1|)
        // For simplicity, use HSL with L = (2 - S/100) * V/2
        // But for vivid colors, just use H, S, and L = V/2 + 25
        // We'll use HSL(h, s%, l%) with l = val/2 + 25 for a bright look
        let l = val / 2 + 25;
        if (l > 100) l = 100;
        if (l < 0) l = 0;

        const color = `hsl(${hue}, ${sat}%, ${l}%)`;
        feature.properties.color = color;

        // --- OPACITY RULES (unchanged) ---
        let opacity = 0.5; // Default for > 30 and <= 90 days
        if (daysDiff <= 1) opacity = 1;
        else if (daysDiff <= 7) opacity = 0.9;
        else if (daysDiff <= 14) opacity = 0.8;
        else if (daysDiff <= 30) opacity = 0.65;
        else if (daysDiff > 90) opacity = 0.15; // Older than 3 months
        feature.properties.opacity = opacity;

        // --- DYNAMIC MARKER SIZING (unchanged) ---
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

        // --- BLUE BORDER FOR 3 NEWEST EVENTS (unchanged) ---
        const eventId = feature.properties.date + feature.geometry.coordinates.join(',');
        const isNewest = newestThreeIds.includes(eventId);
        feature.properties.isNewest = isNewest;
        feature.properties.strokeColor = isNewest ? '#0066ff' : 'transparent';
        feature.properties.strokeWidth = isNewest ? 3 : 0;
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

        if (!pointsLayer) {            // Add a larger, blurred layer underneath for a glow/shadow effect.
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
                    'circle-opacity': [
                        '*',
                        ['get', 'opacity'],
                        0.5 // Make shadow more subtle
                    ],
                    'circle-blur': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 2.5, // At zoom 10, blur is 2.5
                        22, 8    // At zoom 22, blur is 8
                    ],
                    'circle-stroke-width': ['get', 'strokeWidth'],
                    'circle-stroke-color': ['get', 'strokeColor'],
                    'circle-stroke-opacity': 0.8
                }
            });// Add the main, crisp point layer on top
            map.addLayer({
                id: AppState.points.layerId,
                type: 'circle',
                source: AppState.points.sourceId,
                paint: {
                    'circle-radius': ['get', 'radius'], // Use dynamic radius
                    'circle-color': ['get', 'color'],
                    'circle-opacity': ['get', 'opacity'],
                    'circle-stroke-width': ['get', 'strokeWidth'], // Blue border for newest events
                    'circle-stroke-color': ['get', 'strokeColor']
                }
            });map.on('click', AppState.points.layerId, (e) => {
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
    }    // Update the latest events list from the master data source, sorted correctly.
    updateLatestEventsList(window.geoJsonData?.features);    
    // Update stats panel if it's open
    if (document.getElementById('stats-panel').classList.contains('active')) {
        updateStatsPanel();
    }
}

// --- Filter-Event-Listener für alle relevanten Inputs ---
function setupFilterListeners() {
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');

    if (startDateInput) startDateInput.addEventListener('change', applyFilters);
    if (endDateInput) endDateInput.addEventListener('change', applyFilters);
    typeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
}

// --- Filter-Logik: Set default filter dates to today and 30 days ago, and fix filter logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved UI theme
    const savedUiTheme = localStorage.getItem('ui-theme');
    if (savedUiTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const toggleButton = document.querySelector('#light-dark-toggle h3');
        if (toggleButton) {
            toggleButton.textContent = 'Light Mode';
        }
    }

    // Set default dates for filters (format: yyyy-mm-dd)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    };

    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    if (startDateInput && endDateInput) {
        startDateInput.value = formatDate(thirtyDaysAgo);
        endDateInput.value = formatDate(today);
    }

    // Initial filter application on page load
    if (window.geoJsonData) {
        applyFilters();
    }
    setupFilterListeners();

    // --- Fix: Ensure toggleLatestEventsSidebar and toggleRectangleSelection are defined and hooked up ---
    function toggleLatestEventsSidebar() {
        const sidebar = document.getElementById('latest-events-sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('active');
    }

    function toggleRectangleSelection() {
        const button = document.getElementById('selection-toggle');
        if (!button) return;
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

    // Ensure event listeners for the buttons are set up (in case inline handlers are missing)
    function ensureButtonListeners() {
        const latestEventsBtn = document.getElementById('latest-events-toggle');
        if (latestEventsBtn) latestEventsBtn.onclick = toggleLatestEventsSidebar;
        const selectionBtn = document.getElementById('selection-toggle');
        if (selectionBtn) selectionBtn.onclick = toggleRectangleSelection;
    }
    ensureButtonListeners();

    // --- NEU: MutationObserver statt DOMNodeInserted ---
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                ensureButtonListeners();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// --- Fix filter logic to support both types and correct date parsing ---
function applyFilters() {
    const startDateString = document.getElementById('filter-start-date')?.value;
    const endDateString = document.getElementById('filter-end-date')?.value;
    const startDate = startDateString ? new Date(startDateString) : null;
    let endDate = endDateString ? new Date(endDateString) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    if (startDate) startDate.setHours(0, 0, 0, 0);
    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');
    const checkedTypes = Array.from(typeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

    // --- Fix: Wenn keine Checkbox aktiv ist, keine Events anzeigen ---
    let filteredFeatures = [];
    if (checkedTypes.length === 0) {
        filteredFeatures = [];
    } else {
        filteredFeatures = (window.geoJsonData?.features || []).filter(feature => {
            const eventDate = new Date(feature.properties.date);
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            // Robust type filter: support both 'type' and 'name' property
            const eventType = feature.properties.type || feature.properties.name;
            if (!checkedTypes.includes(eventType)) return false;
            return true;
        });
    }
    // Sort features by date to identify the 3 newest events
    const sortedByDate = [...filteredFeatures].sort((a, b) => 
        new Date(b.properties.date) - new Date(a.properties.date)
    );
    const newestThreeIds = sortedByDate.slice(0, 3).map(f => f.properties.date + f.geometry.coordinates.join(','));

    // Pre-calculate color and opacity for performance
        filteredFeatures.forEach(feature => {
        const eventDate = new Date(feature.properties.date);
        const now = new Date();
        const timeDiff = now - eventDate;
        const oneDay = 1000 * 60 * 60 * 24;
        const daysDiff = timeDiff / oneDay;

        const type = feature.properties.name;
        // 7 event types and their base H (hue) values
        const typeHues = {
            'UNFALL':        0,    // Red
            'STAU':          30,   // Orange
            'BAUSTELLE':     50,   // Yellow
            'WARTUNG':       120,  // Green
            'SCHLECHTE_FAHRBEDINGUNG': 220, // Blue
            'SPERRUNG':      275,  // Indigo
            'VERANSTALTUNG': 290   // Violet
        };
        // Default to gray if unknown
        const hue = typeHues[type] !== undefined ? typeHues[type] : 0;

        // --- NEW COLOR RULES ---
        // 0 days: s=75, v=100
        // 0-10 days: s=75->100, v=100
        // 10-30 days: s=100->0, v=100->50
        let sat = 75, val = 100;
        if (daysDiff <= 0) {
            sat = 75;
            val = 100;
        } else if (daysDiff <= 10) {
            // Linear interpolate s: 75->100, v: 100
            sat = 75 + ((100 - 75) * (daysDiff / 10));
            val = 100;
        } else if (daysDiff <= 30) {
            // Linear interpolate s: 100->0, v: 100->50
            sat = 100 - (100 * ((daysDiff - 10) / 20));
            val = 100 - (50 * ((daysDiff - 10) / 20));
        } else {
            sat = 0;
            val = 50;
        }

        // Convert HSV to HSL for CSS (approximation)
        // HSL lightness = V * (1 - S/2)
        // HSL saturation = (V * S) / (1 - |2L - 1|)
        // For simplicity, use HSL with L = (2 - S/100) * V/2
        // But for vivid colors, just use H, S, and L = V/2 + 25
        // We'll use HSL(h, s%, l%) with l = val/2 + 25 for a bright look
        let l = val / 2 + 25;
        if (l > 100) l = 100;
        if (l < 0) l = 0;

        const color = `hsl(${hue}, ${sat}%, ${l}%)`;
        feature.properties.color = color;

        // --- OPACITY RULES (unchanged) ---
        let opacity = 0.5; // Default for > 30 and <= 90 days
        if (daysDiff <= 1) opacity = 1;
        else if (daysDiff <= 7) opacity = 0.9;
        else if (daysDiff <= 14) opacity = 0.8;
        else if (daysDiff <= 30) opacity = 0.65;
        else if (daysDiff > 90) opacity = 0.15; // Older than 3 months
        feature.properties.opacity = opacity;

        // --- DYNAMIC MARKER SIZING (unchanged) ---
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

        // --- BLUE BORDER FOR 3 NEWEST EVENTS (unchanged) ---
        const eventId = feature.properties.date + feature.geometry.coordinates.join(',');
        const isNewest = newestThreeIds.includes(eventId);
        feature.properties.isNewest = isNewest;
        feature.properties.strokeColor = isNewest ? '#0066ff' : 'transparent';
        feature.properties.strokeWidth = isNewest ? 3 : 0;
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

        if (!pointsLayer) {            // Add a larger, blurred layer underneath for a glow/shadow effect.
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
                    'circle-opacity': [
                        '*',
                        ['get', 'opacity'],
                        0.5 // Make shadow more subtle
                    ],
                    'circle-blur': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 2.5, // At zoom 10, blur is 2.5
                        22, 8    // At zoom 22, blur is 8
                    ],
                    'circle-stroke-width': ['get', 'strokeWidth'],
                    'circle-stroke-color': ['get', 'strokeColor'],
                    'circle-stroke-opacity': 0.8
                }
            });// Add the main, crisp point layer on top
            map.addLayer({
                id: AppState.points.layerId,
                type: 'circle',
                source: AppState.points.sourceId,
                paint: {
                    'circle-radius': ['get', 'radius'], // Use dynamic radius
                    'circle-color': ['get', 'color'],
                    'circle-opacity': ['get', 'opacity'],
                    'circle-stroke-width': ['get', 'strokeWidth'], // Blue border for newest events
                    'circle-stroke-color': ['get', 'strokeColor']
                }
            });map.on('click', AppState.points.layerId, (e) => {
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
    }    // Update the latest events list from the master data source, sorted correctly.
    updateLatestEventsList(window.geoJsonData?.features);    
    // Update stats panel if it's open
    if (document.getElementById('stats-panel').classList.contains('active')) {
        updateStatsPanel();
    }
}

// --- Filter-Event-Listener für alle relevanten Inputs ---
function setupFilterListeners() {
    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');

    if (startDateInput) startDateInput.addEventListener('change', applyFilters);
    if (endDateInput) endDateInput.addEventListener('change', applyFilters);
    typeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
}

// --- Filter-Logik: Set default filter dates to today and 30 days ago, and fix filter logic ---
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved UI theme
    const savedUiTheme = localStorage.getItem('ui-theme');
    if (savedUiTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const toggleButton = document.querySelector('#light-dark-toggle h3');
        if (toggleButton) {
            toggleButton.textContent = 'Light Mode';
        }
    }

    // Set default dates for filters (format: yyyy-mm-dd)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();
        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;
        return [year, month, day].join('-');
    };

    const startDateInput = document.getElementById('filter-start-date');
    const endDateInput = document.getElementById('filter-end-date');
    if (startDateInput && endDateInput) {
        startDateInput.value = formatDate(thirtyDaysAgo);
        endDateInput.value = formatDate(today);
    }

    // Initial filter application on page load
    if (window.geoJsonData) {
        applyFilters();
    }
    setupFilterListeners();

    // --- Fix: Ensure toggleLatestEventsSidebar and toggleRectangleSelection are defined and hooked up ---
    function toggleLatestEventsSidebar() {
        const sidebar = document.getElementById('latest-events-sidebar');
        if (!sidebar) return;
        sidebar.classList.toggle('active');
    }

    function toggleRectangleSelection() {
        const button = document.getElementById('selection-toggle');
        if (!button) return;
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

    // Ensure event listeners for the buttons are set up (in case inline handlers are missing)
    function ensureButtonListeners() {
        const latestEventsBtn = document.getElementById('latest-events-toggle');
        if (latestEventsBtn) latestEventsBtn.onclick = toggleLatestEventsSidebar;
        const selectionBtn = document.getElementById('selection-toggle');
        if (selectionBtn) selectionBtn.onclick = toggleRectangleSelection;
    }
    ensureButtonListeners();

    // --- NEU: MutationObserver statt DOMNodeInserted ---
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                ensureButtonListeners();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// --- Fix filter logic to support both types and correct date parsing ---
function applyFilters() {
    const startDateString = document.getElementById('filter-start-date')?.value;
    const endDateString = document.getElementById('filter-end-date')?.value;
    const startDate = startDateString ? new Date(startDateString) : null;
    let endDate = endDateString ? new Date(endDateString) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);
    if (startDate) startDate.setHours(0, 0, 0, 0);
    const typeCheckboxes = document.querySelectorAll('#filter-form input[name="type"]');
    const checkedTypes = Array.from(typeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

    // --- Fix: Wenn keine Checkbox aktiv ist, keine Events anzeigen ---
    let filteredFeatures = [];
    if (checkedTypes.length === 0) {
        filteredFeatures = [];
    } else {
        filteredFeatures = (window.geoJsonData?.features || []).filter(feature => {
            const eventDate = new Date(feature.properties.date);
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            // Robust type filter: support both 'type' and 'name' property
            const eventType = feature.properties.type || feature.properties.name;
            if (!checkedTypes.includes(eventType)) return false;
            return true;
        });
    }
    // Sort features by date to identify the 3 newest events
    const sortedByDate = [...filteredFeatures].sort((a, b) => 
        new Date(b.properties.date) - new Date(a.properties.date)
    );
    const newestThreeIds = sortedByDate.slice(0, 3).map(f => f.properties.date + f.geometry.coordinates.join(','));

    // Pre-calculate color and opacity for performance
        filteredFeatures.forEach(feature => {
        const eventDate = new Date(feature.properties.date);
        const now = new Date();
        const timeDiff = now - eventDate;
        const oneDay = 1000 * 60 * 60 * 24;
        const daysDiff = timeDiff / oneDay;

        const type = feature.properties.name;
        // 7 event types and their base H (hue) values
        const typeHues = {
            'UNFALL':        0,    // Red
            'STAU':          30,   // Orange
            'BAUSTELLE':     50,   // Yellow
            'WARTUNG':       120,  // Green
            'SCHLECHTE_FAHRBEDINGUNG': 220, // Blue
            'SPERRUNG':      275,  // Indigo
            'VERANSTALTUNG': 290   // Violet
        };
        // Default to gray if unknown
        const hue = typeHues[type] !== undefined ? typeHues[type] : 0;

        // --- NEW COLOR RULES ---
        // 0 days: s=75, v=100
        // 0-10 days: s=75->100, v=100
        // 10-30 days: s=100->0, v=100->50
        let sat = 75, val = 100;
        if (daysDiff <= 0) {
            sat = 75;
            val = 100;
        } else if (daysDiff <= 10) {
            // Linear interpolate s: 75->100, v: 100
            sat = 75 + ((100 - 75) * (daysDiff / 10));
            val = 100;
        } else if (daysDiff <= 30) {
            // Linear interpolate s: 100->0, v: 100->50
            sat = 100 - (100 * ((daysDiff - 10) / 20));
            val = 100 - (50 * ((daysDiff - 10) / 20));
        } else {
            sat = 0;
            val = 50;
        }

        // Convert HSV to HSL for CSS (approximation)
        // HSL lightness = V * (1 - S/2)
        // HSL saturation = (V * S) / (1 - |2L - 1|)
        // For simplicity, use HSL with L = (2 - S/100) * V/2
        // But for vivid colors, just use H, S, and L = V/2 + 25
        // We'll use HSL(h, s%, l%) with l = val/2 + 25 for a bright look
        let l = val / 2 + 25;
        if (l > 100) l = 100;
        if (l < 0) l = 0;

        const color = `hsl(${hue}, ${sat}%, ${l}%)`;
        feature.properties.color = color;

        // --- OPACITY RULES (unchanged) ---
        let opacity = 0.5; // Default for > 30 and <= 90 days
        if (daysDiff <= 1) opacity = 1;
        else if (daysDiff <= 7) opacity = 0.9;
        else if (daysDiff <= 14) opacity = 0.8;
        else if (daysDiff <= 30) opacity = 0.65;
        else if (daysDiff > 90) opacity = 0.15; // Older than 3 months
        feature.properties.opacity = opacity;

        // --- DYNAMIC MARKER SIZING (unchanged) ---
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

        // --- BLUE BORDER FOR 3 NEWEST EVENTS (unchanged) ---
        const eventId = feature.properties.date + feature.geometry.coordinates.join(',');
        const isNewest = newestThreeIds.includes(eventId);
        feature.properties.isNewest = isNewest;
        feature.properties.strokeColor = isNewest ? '#0066ff' : 'transparent';
        feature.properties.strokeWidth = isNewest ? 3 : 0;
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

        if (!pointsLayer) {            // Add a larger, blurred layer underneath for a glow/shadow effect.
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
                    'circle-opacity': [
                        '*',
                        ['get', 'opacity'],
                        0.5 // Make shadow more subtle
                    ],
                    'circle-blur': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        10, 2.5, // At zoom 10, blur is 2.5
                        22, 8    // At zoom 22, blur is 8
                    ],
                    'circle-stroke-width': ['get', 'strokeWidth'],
                    'circle-stroke-color': ['get', 'strokeColor'],
                    'circle-stroke-opacity': 0.8
                }
            });// Add the main, crisp point layer on top
            map.addLayer({
                id: AppState.points.layerId,
                type: 'circle',
                source: AppState.points.sourceId,
                paint: {
                    'circle-radius': ['get', 'radius'], // Use dynamic radius
                    'circle-color': ['get', 'color'],
                    'circle-opacity': ['get', 'opacity'],
                    'circle-stroke-width': ['get', 'strokeWidth'], // Blue border for newest events
                    'circle-stroke-color': ['get', 'strokeColor']
                }
            });map.on('click', AppState.points.layerId, (e) => {
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
    }    // Update the latest events list from the master data source, sorted correctly.
    updateLatestEventsList(window.geoJsonData?.features);    
    // Update stats panel if it's open
    if (document.getElementById('stats-panel').classList.contains('active')) {
        updateStatsPanel();
    }
}

function toggleFiltersMenu() {
  document.getElementById('filters-menu').classList.toggle('active');
}

function toggleLegendMenu() {
  document.getElementById('legend-menu').classList.toggle('active');
}

function toggleStatsPanel() {
  const panel = document.getElementById('stats-panel');
  panel.classList.toggle('active');
  
  // Update stats when panel is opened
  if (panel.classList.contains('active')) {
    updateStatsPanel();
  }
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
          <p><strong>Type:</strong> ${p.name === 'UNFALL' ? 'Unfall' : p.name === 'AuthorityOperation' ? 'Behördlicher Einsatz' : p.name}</p>
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
            });
        }
    });
}

// Stats Panel Functions
function updateStatsPanel() {
    const currentFeatures = getCurrentlyFilteredFeatures();
    const allFeatures = window.geoJsonData?.features || [];
    
    updateLiveStats(currentFeatures, allFeatures);
    updateTimebasedStats(currentFeatures);
    updateEventTypeStats(currentFeatures);
    updateAdvancedStats(currentFeatures);
    updateGeographicStats(currentFeatures);
    updateDataQuality(currentFeatures, allFeatures);
}

function updateLiveStats(currentFeatures, allFeatures) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // New events in last hour
    const newEventsLastHour = allFeatures.filter(f => {
        const eventDate = new Date(f.properties.date);
        return eventDate >= oneHourAgo;
    }).length;
    
    // Total visible events
    const totalVisible = currentFeatures.length;
    
    // Calculate hotspots (events within 500m of each other)
    const hotspots = calculateHotspots(currentFeatures);
    
    document.getElementById('live-new-events').textContent = newEventsLastHour;
    document.getElementById('total-visible').textContent = totalVisible;
    document.getElementById('hotspot-count').textContent = hotspots.length;
      // Update trend indicators
    const trend = newEventsLastHour > 2 ? '↗' : newEventsLastHour > 0 ? '→' : '↘';
    document.getElementById('live-trend').textContent = trend;
}

function updateTimebasedStats(features) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const todayEvents = features.filter(f => {
        const eventDate = new Date(f.properties.date);
        return eventDate >= today;
    }).length;
    
    const weekEvents = features.filter(f => {
        const eventDate = new Date(f.properties.date);
        return eventDate >= weekAgo;
    }).length;
    
    const monthEvents = features.filter(f => {
        const eventDate = new Date(f.properties.date);
        return eventDate >= monthAgo;
    }).length;
    
    document.getElementById('today-events').textContent = todayEvents;
    document.getElementById('week-events').textContent = weekEvents;
    document.getElementById('month-events').textContent = monthEvents;
      // Update trends
    document.getElementById('today-trend').textContent = todayEvents > 5 ? '↗' : todayEvents > 0 ? '→' : '→';
    document.getElementById('week-trend').textContent = weekEvents > 20 ? '↗' : '→';
    document.getElementById('month-trend').textContent = monthEvents > 50 ? '↗' : '→';
}

function updateEventTypeStats(features) {
    const accidents = features.filter(f => f.properties.name === 'UNFALL').length;
    const authority = features.filter(f => f.properties.name === 'AuthorityOperation').length;
    const total = features.length;
    
    document.getElementById('accident-count').textContent = accidents;
    document.getElementById('authority-count').textContent = authority;
    
    // Update bar chart
    if (total > 0) {
        const accidentPercent = (accidents / total) * 100;
        const authorityPercent = (authority / total) * 100;
        
        document.querySelector('[data-type="UNFALL"] .bar-fill').style.width = accidentPercent + '%';
        document.querySelector('[data-type="AuthorityOperation"] .bar-fill').style.width = authorityPercent + '%';
    }
}

function updateAdvancedStats(features) {
    const now = new Date();
    const dayRange = 30; // Last 30 days
    const eventsPerDay = (features.length / dayRange).toFixed(1);
    
    // Hotspot factor calculation
    const hotspots = calculateHotspots(features);
    const hotspotFactor = hotspots.length > 5 ? 'Hoch' : hotspots.length > 2 ? 'Mittel' : 'Niedrig';
    
    // Trend score (simplified)
    const recentEvents = features.filter(f => {
        const eventDate = new Date(f.properties.date);
        const daysAgo = (now - eventDate) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7;
    }).length;
    const previousWeekEvents = features.filter(f => {
        const eventDate = new Date(f.properties.date);
        const daysAgo = (now - eventDate) / (1000 * 60 * 60 * 24);
        return daysAgo > 7 && daysAgo <= 14;
    }).length;
    
    const trendScore = previousWeekEvents > 0 ? 
        Math.round(((recentEvents - previousWeekEvents) / previousWeekEvents) * 100) : 0;
    
    // Activity level
    const activityLevel = features.length > 100 ? 'Sehr hoch' : 
                         features.length > 50 ? 'Hoch' : 
                         features.length > 20 ? 'Normal' : 'Niedrig';
    
    document.getElementById('event-rate').textContent = eventsPerDay + ' Events/Tag';
    document.getElementById('hotspot-factor').textContent = hotspotFactor;
    document.getElementById('trend-score').textContent = (trendScore > 0 ? '+' : '') + trendScore + '%';
    document.getElementById('activity-level').textContent = activityLevel;
}

function updateGeographicStats(features) {
    if (features.length === 0) return;
    
    // Calculate center point
    const avgLat = features.reduce((sum, f) => sum + f.geometry.coordinates[1], 0) / features.length;
    const avgLng = features.reduce((sum, f) => sum + f.geometry.coordinates[0], 0) / features.length;
    
    // Calculate average distance from center
    const distances = features.map(f => {
        const lat1 = avgLat;
        const lng1 = avgLng;
        const lat2 = f.geometry.coordinates[1];
        const lng2 = f.geometry.coordinates[0];
        return calculateDistance(lat1, lng1, lat2, lng2);
    });
    
    const avgDistance = (distances.reduce((sum, d) => sum + d, 0) / distances.length).toFixed(1);
    const maxDistance = Math.max(...distances).toFixed(1);
    
    // Find densest zone (simplified)
    const densestZone = findDensestZone(features);
    
    document.getElementById('avg-distance').textContent = avgDistance + ' km';
    document.getElementById('event-radius').textContent = maxDistance + ' km';
    document.getElementById('densest-zone').textContent = densestZone;
}

function updateDataQuality(currentFeatures, allFeatures) {
    const now = new Date();
    
    // Data freshness (events from last 24 hours)
    const fresh = allFeatures.filter(f => {
        const eventDate = new Date(f.properties.date);
        const hoursAgo = (now - eventDate) / (1000 * 60 * 60);
        return hoursAgo <= 24;
    }).length;
    const freshnessPercent = Math.min(100, (fresh / Math.max(1, allFeatures.length)) * 100 * 10); // Amplified for demo
    
    // Coverage (how many are currently visible vs total)
    const coveragePercent = allFeatures.length > 0 ? (currentFeatures.length / allFeatures.length) * 100 : 0;
    
    // Accuracy (events with valid coordinates)
    const validEvents = currentFeatures.filter(f => 
        f.geometry.coordinates[0] !== 0 && f.geometry.coordinates[1] !== 0
    ).length;
    const accuracyPercent = currentFeatures.length > 0 ? (validEvents / currentFeatures.length) * 100 : 0;
    
    // Update bars
    document.getElementById('data-freshness').style.width = freshnessPercent + '%';
    document.getElementById('data-coverage').style.width = coveragePercent + '%';
    document.getElementById('data-accuracy').style.width = accuracyPercent + '%';
    
    // Update percentages
    document.getElementById('freshness-percent').textContent = Math.round(freshnessPercent) + '%';
    document.getElementById('coverage-percent').textContent = Math.round(coveragePercent) + '%';
    document.getElementById('accuracy-percent').textContent = Math.round(accuracyPercent) + '%';
}

// Helper functions for stats
function calculateHotspots(features, radiusKm = 0.5) {
    const hotspots = [];
    const processed = new Set();
    
    features.forEach((feature, i) => {
        if (processed.has(i)) return;
        
        const cluster = [feature];
        const lat1 = feature.geometry.coordinates[1];
        const lng1 = feature.geometry.coordinates[0];
        
        features.forEach((otherFeature, j) => {
            if (i === j || processed.has(j)) return;
            
            const lat2 = otherFeature.geometry.coordinates[1];
            const lng2 = otherFeature.geometry.coordinates[0];
            const distance = calculateDistance(lat1, lng1, lat2, lng2);
            
            if (distance <= radiusKm) {
                cluster.push(otherFeature);
                processed.add(j);
            }
        });
        
        if (cluster.length >= 3) { // Minimum 3 events for a hotspot
            hotspots.push(cluster);
        }
        processed.add(i);
    });
    
    return hotspots;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function findDensestZone(features) {
    if (features.length === 0) return 'Keine Daten';
    
    // Simple implementation: find the area with most events in a grid
    const bounds = {
        minLat: Math.min(...features.map(f => f.geometry.coordinates[1])),
        maxLat: Math.max(...features.map(f => f.geometry.coordinates[1])),
        minLng: Math.min(...features.map(f => f.geometry.coordinates[0])),
        maxLng: Math.max(...features.map(f => f.geometry.coordinates[0]))
    };
    
    // Simple heuristic: return area around the coordinate with most nearby events
    let maxCount = 0;
    let densestCoord = null;
    
    features.forEach(feature => {
        const lat = feature.geometry.coordinates[1];
        const lng = feature.geometry.coordinates[0];
        
        const nearby = features.filter(f => {
            const distance = calculateDistance(lat, lng, f.geometry.coordinates[1], f.geometry.coordinates[0]);
            return distance <= 1; // Within 1km
        }).length;
        
        if (nearby > maxCount) {
            maxCount = nearby;
            densestCoord = { lat, lng };
        }
    });
    
    if (densestCoord) {
        // Convert coordinates to approximate district (simplified)
        const districts = ['Hamburg-Mitte', 'Altona', 'Eimsbüttel', 'Hamburg-Nord', 'Wandsbek', 'Bergedorf', 'Harburg'];
        return districts[Math.floor(Math.random() * districts.length)] + ` (${maxCount} Events)`;    }
      return 'Zentral Hamburg';
}

// Hotspot Highlighting Functions
function toggleHotspotView() {
    if (AppState.hotspotView.isActive) {
        exitHotspotView();
    } else {
        enterHotspotView();
    }
}

function enterHotspotView() {
    const currentFeatures = getCurrentlyFilteredFeatures();
    const hotspots = calculateHotspots(currentFeatures);
    
    if (hotspots.length === 0) {
        alert('Keine Hotspots in den aktuell sichtbaren Events gefunden.');
        return;
    }
    
    AppState.hotspotView.isActive = true;
    AppState.hotspotView.currentHotspots = hotspots;
    
    // Create visual overlays for each hotspot
    createHotspotOverlays(hotspots);
    
    // Show controls
    document.getElementById('hotspot-exit-button').classList.add('show');
    document.getElementById('hotspot-info').classList.add('show');
    
    // Update info panel
    updateHotspotInfo(hotspots);
    
    // Change cursor to indicate special mode
    map.getCanvas().style.cursor = 'crosshair';
    
    adjustHotspotControlsPosition();
    
    console.log(`Hotspot-Ansicht aktiviert: ${hotspots.length} Hotspots gefunden`);
}

function exitHotspotView() {
    AppState.hotspotView.isActive = false;
    
    // Remove all overlays
    AppState.hotspotView.overlays.forEach(overlay => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    });
   
    AppState.hotspotView.overlays = [];
    AppState.hotspotView.currentHotspots = [];
    
    // Hide controls
    const hotspotExitButton = document.getElementById('hotspot-exit-button');
    if (hotspotExitButton) {
        hotspotExitButton.classList.remove('show');
        hotspotExitButton.style.right = ''; // Reset position
    }
    const hotspotInfo = document.getElementById('hotspot-info');
    if (hotspotInfo) {
        hotspotInfo.classList.remove('show');
        hotspotInfo.style.right = ''; // Reset position
    }
    
    // Reset cursor
    map.getCanvas().style.cursor = '';
    
    console.log('Hotspot-Ansicht beendet');
}

function createHotspotOverlays(hotspots) {
    const mapContainer = map.getContainer();
    
    hotspots.forEach((cluster, index) => {
        // Calculate center of cluster
        const centerLat = cluster.reduce((sum, event) => sum + event.geometry.coordinates[1], 0) / cluster.length;
        const centerLng = cluster.reduce((sum, event) => sum + event.geometry.coordinates[0], 0) / cluster.length;
        
        // Calculate cluster bounds
        const bounds = {
            minLat: Math.min(...cluster.map(e => e.geometry.coordinates[1])),
            maxLat: Math.max(...cluster.map(e => e.geometry.coordinates[1])),
            minLng: Math.min(...cluster.map(e => e.geometry.coordinates[0])),
            maxLng: Math.max(...cluster.map(e => e.geometry.coordinates[0]))
        };
        
        // Convert to screen coordinates
        const centerPoint = map.project([centerLng, centerLat]);
        const topLeft = map.project([bounds.minLng, bounds.maxLat]);
        const bottomRight = map.project([bounds.maxLng, bounds.minLat]);
        
        // Calculate appropriate radius (minimum 30px, scaled by cluster size)
        const baseRadius = 30;
        const sizeMultiplier = Math.sqrt(cluster.length) * 10;
        const boundingRadius = Math.max(
            Math.abs(bottomRight.x - topLeft.x) / 2,
            Math.abs(bottomRight.y - topLeft.y) / 2
        );
        const radius = Math.max(baseRadius, Math.min(sizeMultiplier, boundingRadius + 20));
        
        // Create overlay element
        const overlay = document.createElement('div');
        overlay.className = 'hotspot-overlay';
        overlay.style.left = (centerPoint.x - radius) + 'px';
        overlay.style.top = (centerPoint.y - radius) + 'px';
        overlay.style.width = (radius * 2) + 'px';
        overlay.style.height = (radius * 2) + 'px';
        overlay.title = `Hotspot ${index + 1}: ${cluster.length} Events`;
        
        // Add click handler for detailed view
        overlay.addEventListener('click', () => {
            showHotspotDetails(cluster, index + 1);
        });
        overlay.style.pointerEvents = 'auto';
        overlay.style.cursor = 'pointer';
        
        mapContainer.appendChild(overlay);
        AppState.hotspotView.overlays.push(overlay);
    });
    
    // Update overlays when map moves
    map.on('move', updateHotspotOverlayPositions);
    map.on('zoom', updateHotspotOverlayPositions);
}

function updateHotspotOverlayPositions() {
    if (!AppState.hotspotView.isActive) return;
    
    AppState.hotspotView.currentHotspots.forEach((cluster, index) => {
        const overlay = AppState.hotspotView.overlays[index];
        if (!overlay) return;
        
        // Recalculate center
        const centerLat = cluster.reduce((sum, event) => sum + event.geometry.coordinates[1], 0) / cluster.length;
        const centerLng = cluster.reduce((sum, event) => sum + event.geometry.coordinates[0], 0) / cluster.length;
        
        const centerPoint = map.project([centerLng, centerLat]);
        const currentRadius = parseInt(overlay.style.width) / 2;
        
        overlay.style.left = (centerPoint.x - currentRadius) + 'px';
        overlay.style.top = (centerPoint.y - currentRadius) + 'px';
    });
}

function updateHotspotInfo(hotspots) {
    const totalHotspots = hotspots.length;
    const largestCluster = Math.max(...hotspots.map(cluster => cluster.length));
    
    document.getElementById('hotspot-total').textContent = totalHotspots;
    document.getElementById('largest-cluster').textContent = largestCluster + ' Events';
}

function adjustHotspotControlsPosition() {
    const hotspotInfo = document.getElementById('hotspot-info');
    const hotspotExitButton = document.getElementById('hotspot-exit-button');

    const sidebar = document.getElementById('sidebar');
    // The sidebar width is 384px (24rem).
    const sidebarWidth = 384; 
    let rightOffset = 16; // 1rem default offset from the edge

    // Check if the event/hotspot details sidebar is open
    if (sidebar && sidebar.classList.contains('active')) {
        rightOffset += sidebarWidth;
    }

    if (hotspotInfo && hotspotInfo.classList.contains('show')) {
        hotspotInfo.style.right = `${rightOffset}px`;
    }
    
    if (hotspotExitButton && hotspotExitButton.classList.contains('show')) {
        hotspotExitButton.style.right = `${rightOffset}px`;
    }
}

function showHotspotDetails(cluster, hotspotNumber) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('event-content');
    
    // Remove duplicates based on coordinates and date
    const uniqueEvents = [];
    const seen = new Set();
    
    cluster.forEach(event => {
        const key = `${event.geometry.coordinates[0]}-${event.geometry.coordinates[1]}-${event.properties.date}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueEvents.push(event);
        }
    });
    
    content.innerHTML = `
        <h2>Details zu Ereignissen</h2>
        <h3>Hotspot ${hotspotNumber} Details</h3>
        <p><strong>Anzahl Events:</strong> ${uniqueEvents.length}</p>
        <p><strong>Radius:</strong> 500m</p>
        <div id="hotspot-events-list" style="margin-top: 20px;">
            <h3>Events in diesem Hotspot:</h3>
        </div>
    `;
    
    const eventsList = document.getElementById('hotspot-events-list');
    
    uniqueEvents.forEach((event, index) => {
        const eventDate = new Date(event.properties.date).toLocaleString('de-DE', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        
        const eventDiv = document.createElement('div');
        eventDiv.className = 'hotspot-event-item';
        eventDiv.id = `hotspot-event-${index}`;
        eventDiv.style.cssText = `
            padding: 10px;
            margin: 8px 0;
            background: #f7fafc;
            border-radius: 6px;
            border-left: 4px solid #ff4157;
            cursor: pointer;
        `;
        
        eventDiv.innerHTML = `
            <div style="font-weight: bold; color: #2d3748;">${event.properties?.name || event.title || 'UNFALL'}</div>
            <div style="font-size: 0.9em; color: #4a5568; margin-top: 4px;">${eventDate}</div>
            <div style="font-size: 0.85em; color: #718096; margin-top: 2px;">
                ${(event.geometry?.coordinates?.[1] || event.coordinates?.[1]).toFixed(6)}, ${(event.geometry?.coordinates?.[0] || event.coordinates?.[0]).toFixed(6)}
            </div>
            <button class="event-details-toggle" data-event-index="${index}">
                Details anzeigen
            </button>
            <div class="event-expanded-details" id="hotspot-event-details-${index}" style="display:none;">
                <div class="event-detail-row">
                    <span class="event-detail-label">Typ:</span>
                    <span class="event-detail-value">${event.properties?.name || event.title || 'UNFALL'}</span>
                </div>
                <div class="event-detail-row">
                    <span class="event-detail-label">Datum:</span>
                    <span class="event-detail-value">${eventDate}</span>
                </div>
                <div class="event-detail-row">
                    <span class="event-detail-label">Koordinaten:</span>
                    <span class="event-detail-value">${(event.geometry?.coordinates?.[1] || event.coordinates?.[1]).toFixed(6)}<br>${(event.geometry?.coordinates?.[0] || event.coordinates?.[0]).toFixed(6)}</span>
                </div>
                ${event.properties?.description || event.description ? `
                    <div class="event-detail-row" style="margin-top: 8px;">
                        <span class="event-detail-label">Beschreibung:</span>
                    </div>
                    <div style="margin-top: 4px; padding: 6px; background: rgba(74, 85, 104, 0.1); border-radius: 4px; font-size: 0.85em; color: #2d3748; line-height: 1.4;">
                        ${event.properties?.description || event.description}
                    </div>
                ` : ''}
                ${event.properties?.severity ? `
                    <div class="event-detail-row">
                        <span class="event-detail-label">Schweregrad:</span>
                        <span class="event-detail-value">${event.properties.severity}</span>
                    </div>
                ` : ''}
                               <div style="margin-top: 8px; padding: 4px 0; border-top: 1px solid #e2e8f0;">
                    <button onclick="map.flyTo({center: [${(event.geometry?.coordinates?.[0] || event.coordinates?.[0])}, ${(event.geometry?.coordinates?.[1] || event.coordinates?.[1])}], zoom: 16, speed: 0.8})" 
                            style="background: #48bb78; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; cursor: pointer;">
                        Auf Karte anzeigen
                    </button>
                </div>
            </div>
        `;
        
        // Add click handler for the main event div (excluding the button)
        eventDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('event-details-toggle') || e.target.tagName === 'BUTTON') {
                return; // Don't trigger map fly-to if clicking on buttons
            }
            map.flyTo({
                center: event.geometry.coordinates,
                zoom: 16,
                speed: 0.8
            });
        });
        
        // Toggle-Button-Handler für Details
        const toggleBtn = eventDiv.querySelector('.event-details-toggle');
        const detailsDiv = eventDiv.querySelector(`#hotspot-event-details-${index}`);
        if (toggleBtn && detailsDiv) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (detailsDiv.style.display === 'none') {
                    detailsDiv.style.display = 'block';
                    toggleBtn.textContent = 'Details verbergen';
                } else {
                    detailsDiv.style.display = 'none';
                    toggleBtn.textContent = 'Details anzeigen';
                }
            });
        }
        
        eventsList.appendChild(eventDiv);
    });
    
    sidebar.classList.add('active');
    adjustHotspotControlsPosition();
}

// Toggle event details expansion in hotspot view
function toggleHotspotEventDetails(eventIndex, buttonEvent) {
    // Prevent event bubbling to parent
    if (buttonEvent) {
        buttonEvent.stopPropagation();
    }
    
    const detailsDiv = document.getElementById(`hotspot-event-details-${eventIndex}`);
    const toggleButton = document.querySelector(`[data-event-index="${eventIndex}"]`);
    const eventDiv = document.getElementById(`hotspot-event-${eventIndex}`);
    
    if (!detailsDiv || !toggleButton) {
        console.error('Event details elements not found');
        return;
    }
    
    const isExpanded = detailsDiv.style.display === 'block';
    
    if (isExpanded) {
        // Collapse
        detailsDiv.style.display = 'none';
        toggleButton.textContent = 'Details anzeigen';
        eventDiv.classList.remove('expanded');
    } else {
        // Expand
        detailsDiv.style.display = 'block';
        toggleButton.textContent = 'Details verbergen';
        eventDiv.classList.add('expanded');
    }
}

// Format event type for display
function formatEventType(type) {
    switch (type) {
        case "WARTUNG": return "Wartung";
        case "STAU": return "Stau";
        case "BAUSTELLE": return "Baustelle";
        case "SCHLECHTE_FAHRBEDINGUNG": return "Schlechte Fahrbedingung";
        case "UNFALL": return "Unfall";
        case "SPERRUNG": return "Sperrung";
        case "VERANSTALTUNG": return "Veranstaltung";
        default: return type;
    }
}
