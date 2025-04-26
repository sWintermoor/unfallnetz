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
mapboxgl.accessToken = 'accesstoken';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
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