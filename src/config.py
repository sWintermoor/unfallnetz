# Definiere eine Route (eine URL, die eine Funktion aufruft)
# Verbindung zu deiner MongoDB
class Config:
    MONGO_URI = "mongodb://localhost:27017/unfallnetz"
    MONGODB_URI = "mongodb+srv://jaikamboj:0Ju6y7Vadk1I7NQj@cluster0.cmmgnde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    SOURCE_URL = "https://api.hamburg.de/datasets/v1/verkehrsinformation/collections/hauptmeldungen/items?limit=3000&f=json"
