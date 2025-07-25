import os
from dotenv import load_dotenv

from pymongo import MongoClient
from pymongo.server_api import ServerApi
from langchain.schema import Document
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"), server_api=ServerApi('1'))
db = client["Unfall"]

def load_docs():
    data = db["verkehrsmeldungen"]
    docs = []

    for entry in data:
        content = entry
        metadata = {"type": "Verkehrsmeldung"}

        docs.append(Document(page_content=content, metadata=metadata))

    return docs

def build_vectorstore():
    docs = load_docs()
    embeddings = OpenAIEmbeddings()
    return FAISS.from_documents(docs, embeddings)

    




