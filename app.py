from flask import Flask, render_template
from flask_socketio import SocketIO, emit

# Erstelle eine Flask-Anwendung
app = Flask(__name__)

# Create a SocketIO instance
socketio = SocketIO(app, cors_allowed_origins="*")

# Definiere eine Route (eine URL, die eine Funktion aufruft)
@app.route('/')
def home():
    return render_template("index.html")

def new_entry():
    # Falls der Agent neue Einträge in die Datenbank einfügt, wird diese Funktion ausgeführt.
    return

def send_event(eventType, eventDate, eventLocation, eventLat, eventLng, eventDescription):
    socketio.emit('EventCreated', {
        'type': eventType,
        'date': eventDate,
        'location': eventLocation,
        'lat': eventLat,
        'lng': eventLng,
        'description': eventDescription
})

# Starte die Anwendung
if __name__ == '__main__':
    socketio.run(app, debug=True)