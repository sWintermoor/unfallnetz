from datetime import datetime
from flask import Flask, render_template
from flask_pymongo import PyMongo
from flask_socketio import SocketIO, emit

app = Flask(__name__)

# Create a SocketIO instance
socketio = SocketIO(app, cors_allowed_origins="*")

# Definiere eine Route (eine URL, die eine Funktion aufruft)
# Verbindung zu deiner MongoDB
app.config["MONGO_URI"] = "mongodb://localhost:27017/unfallnetz"
mongo = PyMongo(app)

# Startseite
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
# API: Letztes Update holen
@app.route('/api/last-update')
def last_update():
    # Suche den neuesten Eintrag in der 'events'-Collection
    latest = mongo.db.events.find_one(sort=[("updated_at", -1)])
    
    if not latest or "updated_at" not in latest:
        return jsonify({"last_update": None}), 204

    ts = latest["updated_at"]
    if isinstance(ts, str):
        dt = datetime.fromisoformat(ts)
    else:
        dt = ts  # Falls schon datetime

    return jsonify({
        "last_update": dt.strftime("%Y-%m-%d %H:%M:%S")
    })

if __name__ == '__main__':
    socketio.run(app, debug=True)