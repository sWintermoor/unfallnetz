from flask_socketio import emit
from flask import request

from .langchain_bot import run_prompt_chatbot
from .cookie_handler import create_cookie

def register_websocket(socketio, collection):
    @socketio.on('connect')
    def handle_connect():
        """
        cookies = request.cookies
        key = cookies.get("key")
        print(f"cookies key: {key}")
        emit('SetCookie', {
            "name": "key",
            "key": key,    
        })
        """

        send_data(socketio, collection.find())

    @socketio.on('ChatbotMessage')
    def handle_chatbotMessage(payload):
        cookies = request.cookies
        key = cookies.get('key', 'default')
        response, commands = run_prompt_chatbot(payload, key)
        emit('ChatbotResponse', {
            'answer': response,
            'commands': commands
        })

# Helping functions
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
    emit('EventCreated', {
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
    
