// Set the Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoiM25heWNpIiwiYSI6ImNtOXhkY2g4MjB4OWUycHM2MTVvbGtyZ2IifQ.WqFxG56wGUk61umdzIM1aQ';

// Initialize the map with basemap.de Web Vektor
const map = new mapboxgl.Map({
    container: 'map', // ID of the map container
    style: 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/styles/bm_web_col.json', // basemap.de Web Vektor (Farbe)
    center: [9.993682, 53.551086], // Longitude, Latitude (Hamburg center)
    zoom: 11 // Initial zoom level
});

// Add navigation controls
map.addControl(new mapboxgl.NavigationControl());

// Create example events
const event1 = new MapEvent(
    'Music Festival',
    '2023-10-15',
    'Hamburg Central Park',
    'A great music festival with live bands.',
    [9.993682, 53.551086]
);

const event2 = new MapEvent(
    'Art Exhibition',
    '2023-11-01',
    'Hamburg Art Gallery',
    'An exhibition showcasing local artists.',
    [9.982682, 53.561086]
);

// Add events to the map
event1.addToMap(map);
event2.addToMap(map);

// Add events to the "Latest Events" sidebar
const latestEventsContent = document.getElementById('latest-events-content');
latestEventsContent.innerHTML = `
    <p>1. Music Festival - 2023-10-15</p>
    <p>2. Art Exhibition - 2023-11-01</p>
`;

// Swipe functionality for "Latest Events" sidebar
let startX = 0;
let isDragging = false;

document.getElementById('latest-events-sidebar').addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
});

document.getElementById('latest-events-sidebar').addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    if (startX - currentX > 50) { // Swipe left to close
        toggleLatestEventsSidebar();
        isDragging = false;
    }
});

document.addEventListener('touchend', () => {
    isDragging = false;
});

// Theme toggle function
function toggleTheme() {
    // Increment the style index and loop back to the start if necessary
    currentStyleIndex = (currentStyleIndex + 1) % mapStyles.length;

    // Get the next style
    const nextStyle = mapStyles[currentStyleIndex];

    // Update the map style
    map.setStyle(nextStyle.url);

    // Update the button text to show the next style name
    const themeToggleButton = document.getElementById('theme-toggle');
    const nextStyleName = mapStyles[(currentStyleIndex + 1) % mapStyles.length].name;
    themeToggleButton.textContent = `Switch to ${nextStyleName}`;
}

// Toggle Filters Menu
function toggleFiltersMenu() {
    const filtersMenu = document.getElementById('filters-menu');
    filtersMenu.classList.toggle('active');
}

// Toggle Legend Menu
function toggleLegendMenu() {
    const legendMenu = document.getElementById('legend-menu');
    legendMenu.classList.toggle('active');
}

// Apply filters
function applyFilters() {
    const form = document.getElementById('filter-form');
    const formData = new FormData(form);
    const selectedTypes = formData.getAll('type');

    if (!map || typeof map.getStyle !== 'function') {
        console.error('Map is not initialized or invalid.');
        return;
    }

    if (!map.isStyleLoaded()) {
        console.error('Map style is not fully loaded.');
        return;
    }

    try {
        const layers = map.getStyle().layers;

        layers.forEach((layer) => {
            if (layer.type === 'symbol') {
                const eventType = layer.metadata?.type;
                if (!selectedTypes.includes(eventType)) {
                    map.setLayoutProperty(layer.id, 'visibility', 'none');
                } else {
                    map.setLayoutProperty(layer.id, 'visibility', 'visible');
                }
            }
        });
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}