from flask import Flask
from flask_pymongo import PyMongo
from flask_socketio import SocketIO
import requests

import asyncio
from datetime import datetime

from src import CollectionHandler
from src import Config
from src.routes import register_routes
from src.websocket import register_websocket, send_data
from src.utils import utils_parse_date, utils_sort_by_event_date
from src.database import initialize_db

app = Flask(__name__)

COLLECTION = CollectionHandler()

# Create a SocketIO instance
socketio = SocketIO(app, cors_allowed_origins="*")

def run_socketio():
    print("SocketIO started")
    socketio.run(app, debug=True, use_reloader=False)

app.config.from_object(Config)
mongo = PyMongo(app)

register_routes(app)

register_websocket(socketio, COLLECTION)

async def update_system():
    print("Update System started")
    url = app.config["SOURCE_URL"]
    uri = app.config["MONGODB_URI"]

    client, db, newest_entry = initialize_db(COLLECTION, url, uri)

    await asyncio.sleep(10)

    while True:
        print("loop")

        # Check for new entries in source website
        # TODO: Überprüfen, ob features eine Liste ist
        response = requests.get(url)
        data = response.json()
        features = data.get("features", {})
        get_last_entry = features[-1]

        if get_last_entry != newest_entry:

            features = utils_sort_by_event_date(features)
            if newest_entry:
                newest_entry_date = utils_parse_date(newest_entry.get("properties", {}).get("start", "Unknown"))
            else:
                newest_entry_date = datetime.min
            new_features = []

            for entry in features:
                entry_date = utils_parse_date(entry.get("properties", {}).get("start", "Unknown"))                
                if entry_date > newest_entry_date:
                    new_features.append(entry)
                else:
                    # Adding new features to the database
                    if len(new_features) > 0:
                        COLLECTION.insert_many(new_features)
                        print(f"Erfolgreich {len(new_features)} Einträge gespeichert.")

                        # Sending new features to the frontend
                        print("New Features sending...")
                        send_data(socketio, new_features)
                    break
            newest_entry = get_last_entry

        else:
            print("No new data available.")

        await asyncio.sleep(20)

async def main():
    socketio_task = asyncio.to_thread(run_socketio)
    update_task = asyncio.create_task(update_system())
    await asyncio.gather(socketio_task, update_task)

if __name__ == '__main__':
    asyncio.run(main())