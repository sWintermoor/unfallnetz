def register_websocket(socketio, collection):
    @socketio.on('connect')
    def handle_connect():
        send_data(socketio, collection.find())

def send_data(socketio, data):
    print("sending data to Frontend")

    for entry in data:
        eventType = entry.get("properties", {}).get("status", "Unknown")
        eventDate = entry.get("properties", {}).get("start", "Unknown")
        eventLat = entry.get("geometry", {}).get("coordinates", [0, 0])[1]
        eventLng = entry.get("geometry", {}).get("coordinates", [0, 0])[0]
        eventDescription = entry.get("properties", {}).get("description", "No description")

        send_event(socketio, eventType, eventDate, eventLat, eventLng, eventDescription)

    print("sending finished")

def send_event(socketio, eventType, eventDate, eventLat, eventLng, eventDescription):
    socketio.emit('EventCreated', {
        'type': eventType,
        'date': eventDate,
        'lat': eventLat,
        'lng': eventLng,
        'description': eventDescription
})
    
