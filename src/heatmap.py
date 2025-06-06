# src/heatmap.py

from flask import jsonify, current_app

# TODO: Überprüfen, ob der Code nicht zu routes gehört.

def register_heatmap_routes(app, collection_handler):
    @app.route('/api/heatmap')
    def heatmap_api():
        try:
            docs = list(collection_handler.find())
        except Exception:
            current_app.logger.error("Fehler beim Abrufen der Unfalldaten", exc_info=True)
            return jsonify({"error": "Datenbankfehler"}), 500

        features = []
        for doc in docs:
            coords = doc.get("geometry", {}).get("coordinates", [])
            if len(coords) != 2:
                continue
            lon, lat = coords
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

        return jsonify({
            "type": "FeatureCollection",
            "features": features
        })
