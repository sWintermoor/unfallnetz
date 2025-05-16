class CollectionHandler:
    def __init__(self):
        self.collection = None

    def find(self):
        return self.collection.find()

    def insert_many(self, documents):
        self.collection.insert_many(documents)

    def delete_many(self, query):
        self.collection.delete_many(query)

    def set_collection(self, collection):
        self.collection = collection

    def get_collection(self):
        return self.collection