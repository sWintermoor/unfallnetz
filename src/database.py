from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from pymongo.server_api import ServerApi
import requests

from datetime import datetime
from .utils import utils_sort_by_event_date

def initialize_db(collection, input_url, input_uri):
    # URL der API
    url = input_url
    uri = input_uri

    newest_entry = None

    try:
        # Create a new client and connect to the server
        client = MongoClient(uri, server_api=ServerApi('1'))

        # Verbindungs-Check: Send a ping to confirm a successful connection
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
        
        # Datenbank und Collection auswählen
        db = client["Unfall"]
        collection.set_collection(db["verkehrsmeldungen"])

        # Verkehrsdaten abrufen
        response = requests.get(url)
        if response.status_code == 200:

            data = response.json()

            # Features extrahieren
            features = data.get("features", {})
            if isinstance(features, list):
                documents = features

                # Save the newest entry
                newest_entry = documents[-1]

                if documents:
                    
                    # Optional: Alte Einträge vorher löschen (wenn du willst)
                    collection.delete_many({})

                    # Neue Einträge speichern
                    documents_with_timestamp = add_timestamp(documents)
                    sorted_documents = utils_sort_by_event_date(documents_with_timestamp)
                    collection.insert_many(sorted_documents)
                    print(f"Erfolgreich {len(sorted_documents)} Einträge gespeichert.")
                else:
                    print("Keine Daten zum Speichern gefunden.")
            else:
                print("Fehler: 'features' ist kein Dictionary.")
        else:
            print(f" Fehler beim Abrufen der Daten. Status Code: {response.status_code}")

        return client, db, newest_entry

    except ConnectionFailure:
        print("Fehler: Keine Verbindung zu MongoDB möglich.")
    except Exception as e:
        print(f"Ein Fehler ist aufgetreten: {e}")

def add_timestamp(documents):
    for doc in documents:
        # Adding a timestamp
        if "timestamp" not in doc:
            doc["timestamp"] = datetime.now()
    return documents
