# src/database.py

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from pymongo.server_api import ServerApi
import requests

from datetime import datetime
from .utils import utils_sort_by_event_date

def initialize_db(collection_handler, input_url, input_uri):
    """
    Verbindet zu MongoDB, lädt externes GeoJSON von SOURCE_URL,
    speichert es in der CollectionHandler-Collection.
    """
    try:
        client = MongoClient(input_uri, server_api=ServerApi('1'))
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")

        db = client["Unfall"]
        collection_handler.set_collection(db["verkehrsmeldungen"])

        response = requests.get(input_url)
        if response.status_code == 200:
            data = response.json()
            features = data.get("features", [])
            documents = features if isinstance(features, list) else []
            if documents:
                # Alte Einträge löschen
                collection_handler.delete_many({})
                # Zeitstempel hinzufügen und sortieren
                docs_ts = add_timestamp(documents)
                sorted_docs = utils_sort_by_event_date(docs_ts)
                collection_handler.insert_many(sorted_docs)
                print(f"Erfolgreich {len(sorted_docs)} Einträge gespeichert.")
            else:
                print("Keine Daten zum Speichern gefunden.")
        else:
            print(f"Fehler beim Abrufen der Daten. Status Code: {response.status_code}")

        return client
    except ConnectionFailure:
        print("Fehler: Keine Verbindung zu MongoDB möglich.")
    except Exception as e:
        print(f"Ein Fehler ist aufgetreten: {e}")


def add_timestamp(documents):
    for doc in documents:
        if "timestamp" not in doc:
            doc["timestamp"] = datetime.now()
    return documents

"""
def get_unfaelle(collection_handler):
    
    # Gibt alle Unfalldokumente als Liste von Dicts zurück.
    
    coll = getattr(collection_handler, "collection", None)
    if coll is None:
        raise RuntimeError("Collection noch nicht initialisiert.")
    # Optional: hier schon filtern oder nur bestimmte Felder holen
    return list(coll.find({}))
"""
