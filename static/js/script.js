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
  
    modes: ['Punkte', 'Heatmap'],
    currentMode: 0,
  
    markers: [],
  
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
  
  // 3.2 Farbe basierend auf Alter berechnen
  function computeColorByAge(date) {
    const days = (Date.now() - date) / (1000 * 60 * 60 * 24);
    if (days <= 0) return 'rgb(0,255,0)';
    if (days <= 7) {
      const r = Math.round(255 * (days / 7));
      const g = Math.round(255 * (1 - days / 7));
      return `rgb(${r},${g},0)`;
    }
    if (days <= 14) {
      const g = Math.round(255 * (1 - (days - 7) / 7));
      return `rgb(255,${g},0)`;
    }
    if (days <= 30) {
      const gray = Math.round(128 + 127 * ((days - 14) / 16));
      return `rgb(${gray},${gray},${gray})`;
    }
    return 'rgb(200,200,200)';
  }
  
  // 3.3 Opazität basierend auf Alter berechnen
  function computeOpacityByAge(date) {
    const days = (Date.now() - date) / (1000 * 60 * 60 * 24);
    if (days <= 30) return 1 - Math.min(days / 60, 0.6);
    return 0.4;
  }
  
  // 3.4 Heatmap-Layer laden oder aktualisieren
  function ensureHeatmapLayer(map) {
    const { sourceId, layerId } = AppState.heat;
    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(window.geoJsonData);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: window.geoJsonData });
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
  
    addToMap(map) {
      const el = document.createElement('div');
      el.className = 'map-marker';
      el.style.backgroundColor = computeColorByAge(this.date);
      el.style.opacity = computeOpacityByAge(this.date);
      el.style.width = '15px';
      el.style.height = '15px';
      el.style.borderRadius = '75%';
      el.type = this.title;
  
      this.marker = new mapboxgl.Marker(el)
        .setLngLat(this.coordinates)
        .addTo(map);
  
      el.addEventListener('click', () => showEventDetails(this));
      addLatestEvent(
        this.title,
        this.date.toISOString().split('T')[0],
        this.location,
        this.coordinates[1], // lat
        this.coordinates[0], // lng
        this.description
      );
      AppState.markers.push(this.marker);
    }
  }
  
  // 6. Socket.IO-Verbindung für Echtzeit-Events
  const socket = io();
  socket.on('connect', () => console.log('Verbunden mit Server'));
  socket.on('disconnect', () => console.log('Verbindung getrennt'));
  socket.on('EventCreated', (data) => {

    const event = new MapEvent(data);
    event.addToMap(map);

    if (!window.geoJsonData) {
        window.geoJsonData = {
            type: 'FeatureCollection',
            features: []
        };
    }
    
    window.geoJsonData.features.push(data);

    // Wenn Heatmap aktiv ist, Layer aktualisieren
    if (AppState.modes[AppState.currentMode] === 'Heatmap') {
        const source = map.getSource(AppState.heat.sourceId);
        if (source) {
            source.setData(window.geoJsonData);
        }
    }
  });
  
  // 7. Heatmap-Daten laden
  function loadHeatmapData() {
    ensureHeatmapLayer(map);
  }
  
  // 8. Theme-Wechsel
  function toggleTheme() {
    switchTo('currentTheme', 'themes', (newIndex) => {
      map.setStyle(AppState.themes[newIndex].url);
      map.once('style.load', () => {
        if (AppState.modes[AppState.currentMode] === 'Heatmap') {
          loadHeatmapData();
        } else {
          AppState.markers.forEach(m => m.addTo(map));
        }
      });
    });
    document.getElementById('theme-toggle').innerHTML =
      `<h3>${AppState.themes[AppState.currentTheme].name}</h3>`;
  }
  
  // 9. Moduswechsel zwischen Punkten und Heatmap
  function toggleModeChange() {
    switchTo('currentMode', 'modes', (newIndex) => {
      const currentMode = AppState.modes[newIndex];
      if (currentMode === 'Heatmap') {
        AppState.markers.forEach(m => m.remove());
        loadHeatmapData();
      } else {
        if (map.getLayer(AppState.heat.layerId)) {
          map.removeLayer(AppState.heat.layerId);
        }
        if (map.getSource(AppState.heat.sourceId)) {
          map.removeSource(AppState.heat.sourceId);
        }
        AppState.markers.forEach(m => m.addTo(map));
      }
    });
    document.getElementById('mode-toggle').innerHTML =
      `<h3>${AppState.modes[AppState.currentMode]}</h3>`;
  }

  // 10. Sidebar- und Filter-Funktionen
  function showEventDetails(event) {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('event-content');
    const [lng, lat] = event.coordinates;
    content.innerHTML = `
      <h2>${event.title}</h2>
      <p><strong>Date:</strong> ${event.date.toLocaleString()}</p>
      <p><strong>Location:</strong> ${event.location}</p>
      <p><strong>Coordinates:</strong> ${lat}, ${lng}</p>
      <p>${event.description}</p>
    `;
    sidebar?.classList.add('active');
  }


  
  function updateFilter(checkbox) {
    const filterType = checkbox.value;
    const isChecked = checkbox.checked;
    document.querySelectorAll('.map-marker').forEach(markerEl => {
      if (markerEl.type === filterType) {
        markerEl.style.display = isChecked ? 'block' : 'none';
      }
    });
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
    // Maximal 50 Einträge anzeigen; ältere entfernen
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