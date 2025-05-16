import requests

import asyncio
from datetime import datetime

from .websocket import send_data
from .utils import utils_parse_date, utils_sort_by_event_date

async def update_system(url, collection, socketio):
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
                        collection.insert_many(new_features)
                        print(f"Erfolgreich {len(new_features)} Einträge gespeichert.")

                        # Sending new features to the frontend
                        print("New Features sending...")
                        send_data(socketio, new_features)
                    break
            newest_entry = get_last_entry

        else:
            print("No new data available.")

        await asyncio.sleep(20)