import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI_ENV")
    MONGODB_URI = os.getenv("MONGODB_URI_ENV")
    SOURCE_URL = os.getenv("SOURCE_URL_ENV")
