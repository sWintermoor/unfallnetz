from datetime import datetime
from flask import Flask, render_template, jsonify
from flask_pymongo import PyMongo
from flask_socketio import SocketIO, emit

from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from datetime import datetime

import requests
import json
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

import asyncio

app = Flask(__name__)

# Create a SocketIO instance
socketio = SocketIO(app, cors_allowed_origins="*")

async def run_socketio():
    socketio.run(app, debug=True)

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
    pass

async def update_system():
    print("Update System started")
    uri = "mongodb+srv://jaikamboj:0Ju6y7Vadk1I7NQj@cluster0.cmmgnde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" #works but not with os.getenv

    # Create a new client and connect to the server
    client = MongoClient(uri, server_api=ServerApi('1'))

    # Verbindungs-Check: Send a ping to confirm a successful connection
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
    
    # Datenbank und Collection auswählen
    db = client["Unfall"]
    while True:
        print("loop")
        initialize_db()
        await asyncio.sleep(1)
        for entry in mongo.db["verkehrsmeldungen"].find():
            eventType = entry.get("properties", {}).get("status", "Unknown")
            eventDate = entry.get("properties", {}).get("start", "Unknown")
            eventLat = entry.get("geometry", {}).get("coordinates", [0, 0])[1]
            eventLng = entry.get("geometry", {}).get("coordinates", [0, 0])[0]
            eventDescription = entry.get("properties", {}).get("description", "No description")

            send_event(eventType, eventDate, eventLat, eventLng, eventDescription)

        await asyncio.sleep(60)


def send_event(eventType, eventDate, eventLat, eventLng, eventDescription):
    socketio.emit('EventCreated', {
        'type': eventType,
        'date': eventDate,
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


# Database

def add_timestamp(documents):
    for doc in documents:
        # Adding a timestamp
        if "timestamp" not in doc:
            doc["timestamp"] = datetime.now()
    return documents

def sort_by_event_date(documents):
    return sorted(documents, key=lambda x: x.get('properties', datetime.min).get('start', datetime.min), reverse=True)

def initialize_db():
    # URL der API
    url = "https://api.hamburg.de/datasets/v1/verkehrsinformation/collections/hauptmeldungen/items?status=UNFALL&limit=3000&f=json"
    # URI
    uri = "mongodb+srv://jaikamboj:0Ju6y7Vadk1I7NQj@cluster0.cmmgnde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" #works but not with os.getenv

    try:
        # Create a new client and connect to the server
        client = MongoClient(uri, server_api=ServerApi('1'))

        # Verbindungs-Check: Send a ping to confirm a successful connection
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
        
        # Datenbank und Collection auswählen
        db = client["Unfall"]
        collection = db["verkehrsmeldungen"]

        # Verkehrsdaten abrufen
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()

            # Features extrahieren
            features = data.get("features", {})
            if isinstance(features, list):
                documents = features

                if documents:
                    
                    # Optional: Alte Einträge vorher löschen (wenn du willst)
                    collection.delete_many({})

                    # Neue Einträge speichern
                    documents_with_timestamp = add_timestamp(documents)
                    sorted_documents = sort_by_event_date(documents_with_timestamp)
                    collection.insert_many(sorted_documents)
                    print(f"Erfolgreich {len(sorted_documents)} Einträge gespeichert.")
                else:
                    print("Keine Daten zum Speichern gefunden.")
            else:
                print("Fehler: 'features' ist kein Dictionary.")
        else:
            print(f" Fehler beim Abrufen der Daten. Status Code: {response.status_code}")

    except ConnectionFailure:
        print("Fehler: Keine Verbindung zu MongoDB möglich.")
    except Exception as e:
        print(f"Ein Fehler ist aufgetreten: {e}")

async def main():
    await asyncio.gather(
        run_socketio(),
        update_system()
    )

if __name__ == '__main__':
    asyncio.run(main())