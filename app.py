from flask import Flask, render_template, jsonify
from flask_pymongo import PyMongo
from datetime import datetime

app = Flask(__name__)

# Verbindung zu deiner MongoDB
app.config["MONGO_URI"] = "mongodb://localhost:27017/unfallnetz"
mongo = PyMongo(app)

# Startseite
@app.route('/')
def home():
    return render_template("index.html")

# API: Letztes Update holen
@app.route('/api/last-update')
def last_update():
    # Suche den neuesten Eintrag in der 'events'-Collection
    latest = mongo.db.events.find_one(sort=[("updated_at", -1)])
    
    if not latest or "updated_at" not in latest:
        return jsonify({"last_update": None}), 204

    ts = latest["updated_at"]
    if isinstance(ts, str):
        dt = datetime.fromisoformat(ts)
    else:
        dt = ts  # Falls schon datetime

    return jsonify({
        "last_update": dt.strftime("%Y-%m-%d %H:%M:%S")
    })

if __name__ == '__main__':
    app.run(debug=True)
