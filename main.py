from flask import Flask
from flask_pymongo import PyMongo
from flask_socketio import SocketIO

import asyncio

from src import CollectionHandler
from src import Config
from src.routes import register_routes
from src.websocket import register_websocket
from src.database import initialize_db
from src.updater import update_system

app = Flask(__name__)

collection = CollectionHandler()

# Create a SocketIO instance
socketio = SocketIO(app, cors_allowed_origins="*")

def run_socketio():
    print("SocketIO started")
    socketio.run(app, debug=True, use_reloader=False)

async def main():
    app.config.from_object(Config)
    mongo = PyMongo(app)

    register_routes(app)

    register_websocket(socketio, collection)

    url = app.config["SOURCE_URL"]
    uri = app.config["MONGODB_URI"]

    initialize_db(collection, url, uri)

    socketio_task = asyncio.to_thread(run_socketio)
    update_task = asyncio.create_task(update_system(url, collection, socketio))
    await asyncio.gather(socketio_task, update_task)

if __name__ == '__main__':
    asyncio.run(main())