import requests

import asyncio
from datetime import datetime

from .websocket import send_data
from .utils import utils_parse_date, utils_sort_by_event_date

async def update_system(url, collection, socketio):
    await asyncio.sleep(10)

    while True:

        try:
            # Check for new entries in source website
            # TODO: Überprüfen, ob features eine Liste ist
            response = requests.get(url)
            data = response.json()
            features = data.get("features", {})
            sorted_features = utils_sort_by_event_date(features)
            api_newest_entry_date = sorted_features[0].get("properties", {}).get("start", "Unknown")

            db_newest_entry = list(collection.find())[0]
            db_newest_entry_date = db_newest_entry.get("properties", {}).get("start", "Unknown")

            if api_newest_entry_date != db_newest_entry_date: 
                new_features = []

                for entry in sorted_features:
                    entry_date = utils_parse_date(entry.get("properties", {}).get("start", "Unknown"))                
                    if entry_date > db_newest_entry_date:
                        new_features.insert(entry)
                    else:
                        # Adding new features to the database
                        if len(new_features) > 0:
                            collection.insert_many(new_features)
                            print(f"Erfolgreich {len(new_features)} Einträge gespeichert.")

                            # Sending new features to the frontend
                            print("New Features sending...")
                            send_data(socketio, new_features)
                            db_newest_entry = new_features[-1]
                        break

            else:
                print("No new data available.")
        except Exception as e:
            print(f"Ein Fehler ist aufgetreten im Updater: {e}")

        await asyncio.sleep(20)