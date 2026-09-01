# app/db.py
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# MongoDB URI
MONGO_URI = os.getenv("MONGO_URL") or os.getenv("MONGO_URI") or os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("No MongoDB URI found in environment variables!")

# MongoDB client and database
client = AsyncIOMotorClient(MONGO_URI)
db = client.ksm  # keep your database name as before
