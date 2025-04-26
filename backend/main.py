import requests
import json
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure



def main():
    # URL der API
    url = "https://api.hamburg.de/datasets/v1/verkehrsinformation/collections/hauptmeldungen/items?status=UNFALL&limit=3000&f=json"

    try:
        # MongoDB-Verbindung (lokal)
        client = MongoClient("mongodb+srv://jaikamboj:0Ju6y7Vadk1I7NQj@cluster0.abcd.mongodb.net/?retryWrites=true&w=majority")

        # Verbindungs-Check
        client.admin.command('ping')
        
        # database und collection:
        db = client["Unfall"]                 
        collection = db["verkehrsmeldungen"]

        # Daten von der API holen
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            features = data.get("features", {})

            # Überprüfen, ob features ein dict ist
            if isinstance(features, dict):
                # Optional: Vorher Collection leeren
                # collection.delete_many({})

                # Alle Einträge (0, 1, 2, ...) durchlaufen
                for key, entry in features.items():
                    collection.insert_one(entry)
                print(f"Erfolgreich {len(features)} Datensätze gespeichert.")
            else:
                print("Fehler: 'features' ist kein Dictionary.")
        else:
            print(f"Fehler beim Abrufen der Daten. Status Code: {response.status_code}")
    except ConnectionFailure:
        print("Fehler: Keine Verbindung zu MongoDB möglich.")
    except Exception as e:
        print(f"Ein Fehler ist aufgetreten: {e}")

if __name__ == "__main__":
    main()