// static/js/heatmap.js

// Karte initialisieren und auf Hamburg zentrieren
const map = L.map('map').setView([53.5511, 9.9937], 12);

// Basiskarte von OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap-Mitwirkende'
}).addTo(map);

// GeoJSON-Daten vom Flask-Server holen und als Layer hinzufügen
fetch('/api/heatmap')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then(geojson => {
    // Punkt-Layer mit gefärbten Markern
    L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        const level = feature.properties.gefahrenstufe;
        let color;
        switch (level) {
          case 0: color = '#00ff00'; break; // Grün
          case 1: color = '#ffff00'; break; // Gelb
          case 2: color = '#ff0000'; break; // Rot
          default: color = '#0000ff';      // Blau (Fallback)
        }
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: color,
          color: '#333',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      }
    }).addTo(map);
  })
  .catch(err => {
    console.error('Fehler beim Laden der Heatmap-Daten:', err);
  });
