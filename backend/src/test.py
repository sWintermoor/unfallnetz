# The right backend file

import os
from dotenv import load_dotenv
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from datetime import datetime

# load_dotenv()
# mongodb_username = os.getenv("MONGODB_USERNAME")
# mongodb_token = os.getenv("MONGODB_TOKEN")

import requests
import json
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

def add_timestamp(documents):
    for doc in documents:
        # Adding a timestamp
        if "timestamp" not in doc:
            doc["timestamp"] = datetime.now()
    return documents

def main():
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
                    # collection.delete_many({})

                    # Neue Einträge speichern

                    documents_with_timestamp = add_timestamp(documents)
                    collection.insert_many(documents_with_timestamp)
                    print(f"Erfolgreich {len(documents_with_timestamp)} Einträge gespeichert.")
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

if __name__ == "__main__":
    main()