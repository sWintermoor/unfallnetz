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
        eventLevel = entry.get("properties", {}).get("severity", 1)

        send_event(socketio, eventType, eventDate, eventLat, eventLng, eventDescription, eventLevel)

    print("sending finished")

def send_event(socketio, eventType, eventDate, eventLat, eventLng, eventDescription, eventLevel):
    socketio.emit('EventCreated', {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [eventLng, eventLat]
        },
        "properties":{
            "name": eventType,
            "value": eventLevel,
            "date": eventDate,
            "description": eventDescription,
        }
})
    
