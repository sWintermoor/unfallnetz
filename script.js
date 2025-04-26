// Sidebar toggle functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function toggleLatestEventsSidebar() {
    const latestEventsSidebar = document.getElementById('latest-events-sidebar');
    latestEventsSidebar.classList.toggle('active');
}

// MapEvent class
class MapEvent {
    constructor(title, date, location, description, coordinates) {
        this.title = title;
        this.date = date;
        this.location = location;
        this.description = description;
        this.coordinates = coordinates;
    }

    addToMap(map) {
        // Create a custom circular marker
        const markerElement = document.createElement('div');
        markerElement.className = 'map-marker';

        const marker = new mapboxgl.Marker(markerElement)
            .setLngLat(this.coordinates)
            .addTo(map);

        // Add click event to the marker
        markerElement.addEventListener('click', () => {
            this.showDetails();
        });
    }

    showDetails() {
        // Fill the sidebar with event details
        document.getElementById('event-content').innerHTML = `
            <p>Event Title: ${this.title}</p>
            <p>Date: ${this.date}</p>
            <p>Location: ${this.location}</p>
            <p>Description: ${this.description}</p>
        `;
        // Open the sidebar
        toggleSidebar();
    }
}

// Initialize the map
mapboxgl.accessToken = 'pk.eyJ1IjoiM25heWNpIiwiYSI6ImNtOXhkY2g4MjB4OWUycHM2MTVvbGtyZ2IifQ.WqFxG56wGUk61umdzIM1aQ';
let currentStyleIndex = 0; // Index to track the current style

// List of cool Mapbox styles
const mapStyles = [
    { name: 'Standard', url: 'mapbox://styles/mapbox/streets-v11' },
    { name: 'Dark Mode', url: 'mapbox://styles/mapbox/dark-v10' },
    { name: 'Light Mode', url: 'mapbox://styles/mapbox/light-v10' },
    { name: 'Outdoors', url: 'mapbox://styles/mapbox/outdoors-v11' },
    { name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-v9' },
    { name: 'Satellite Streets', url: 'mapbox://styles/mapbox/satellite-streets-v11' },
    { name: 'Navigation Day', url: 'mapbox://styles/mapbox/navigation-day-v1' },
    { name: 'Navigation Night', url: 'mapbox://styles/mapbox/navigation-night-v1' }
];

// Set the initial map style
const map = new mapboxgl.Map({
    container: 'map',
    style: mapStyles[currentStyleIndex].url,
    center: [9.993682, 53.551086],
    zoom: 12
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

// Theme toggle function
function toggleTheme() {
    currentStyleIndex = (currentStyleIndex + 1) % mapStyles.length;
    const nextStyle = mapStyles[currentStyleIndex];
    map.setStyle(nextStyle.url);

    const themeToggleButton = document.getElementById('theme-toggle');
    const nextStyleName = mapStyles[(currentStyleIndex + 1) % mapStyles.length].name;
    themeToggleButton.textContent = `Switch to ${nextStyleName}`;
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