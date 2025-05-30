# src/heatmap.py
from flask import current_app as app, jsonify
from .database import get_unfaelle, get_baustellen, get_verkehrsdaten, get_historie

# Schwellwerte (anpassen nach Bedarf)
VERKEHRSSCHWELLE = 1000    # Fahrzeuge/Tag
HISTORIESCHWELLE = 5       # Unfälle in letzten 30 Tagen

def compute_gefahrenstufe(segment):
    """Berechnet die Gefahrenstufe (0–2) für ein Segment."""
    hat_unfall = segment['id'] in get_unfaelle()
    hat_baustelle = segment['id'] in get_baustellen()
    traffic = get_verkehrsdaten().get(segment['id'], 0)
    history = get_historie().get(segment['id'], 0)

    # Stufe 0: grün (kein Ereignis)
    if not (hat_unfall or hat_baustelle or traffic >= VERKEHRSSCHWELLE or history >= HISTORIESCHWELLE):
        return 0

    # Stufe 2: rot (Kombination aus Unfall + (Baustelle | hohes Verkehrsaufkommen | typ. Unfallzone))
    if hat_unfall and (hat_baustelle or traffic >= VERKEHRSSCHWELLE or history >= HISTORIESCHWELLE):
        return 2

    # sonst Stufe 1: gelb (einzelnes Ereignis)
    return 1

@app.route('/api/heatmap')
def heatmap_api():
    # Beispiel: alle Straßen-Segmente abfragen
    segmente = app.db.get_all_segments()  
    features = []
    for seg in segmente:
        stufe = compute_gefahrenstufe(seg)
        features.append({
            "type": "Feature",
            "properties": {"gefahrenstufe": stufe},
            "geometry": seg["geometry"]  # GeoJSON-kompatibles Dict
        })
    return jsonify({"type": "FeatureCollection", "features": features})
