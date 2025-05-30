from flask import jsonify

def register_heatmap_routes(app):
    @app.route('/api/heatmap')
    def heatmap_api():
        return jsonify({
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"gefahrenstufe": 2},
                    "geometry": {
                        "type": "Point",
                        "coordinates": [9.9937, 53.5511]
                    }
                }
            ]
        })
