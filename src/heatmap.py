# src/heatmap.py

from flask import jsonify, current_app

def register_heatmap_routes(app, collection_handler):
    @app.route('/api/heatmap')
    def heatmap_api():
        """
        Liefert eine GeoJSON FeatureCollection aller Unfälle mit einer
        Gefahrenstufe (gefahrenstufe) pro Punkt. Bei Fehlern wird
        das Exception-Detail im Log und in der Response ausgegeben.
        """
        try:
            # Hole alle Dokumente über deinen CollectionHandler
            docs_cursor = collection_handler.find()
            docs = list(docs_cursor)
        except Exception as e:
            # Stacktrace in die Konsole
            current_app.logger.error("Fehler beim Abrufen der Unfalldaten:", exc_info=True)
            # Antwort mit Details (nur für Debug; später entfernen!)
            return jsonify({
                "error": "Datenbankfehler",
                "details": str(e)
            }), 500

        features = []
        for doc in docs:
            # Hier anpassen, je nach Struktur deiner eingefügten GeoJSON-Dokumente:
            # Wenn du GeoJSON-Features direkt speicherst, liegen Koordinaten unter doc["geometry"]["coordinates"]
            coords = doc.get("geometry", {}).get("coordinates")
            if not coords or len(coords) != 2:
                continue
            lon, lat = coords

            # Vorläufige Gefahrenstufe aus properties.severity oder properties.gefahrenstufe
            props = doc.get("properties", {})
            level = props.get("severity") or props.get("gefahrenstufe") or 1

            features.append({
                "type": "Feature",
                "properties": {"gefahrenstufe": level},
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                }
            })

        geojson = {"type": "FeatureCollection", "features": features}
        return jsonify(geojson)
