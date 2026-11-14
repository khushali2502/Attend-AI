import psycopg2
from urllib.parse import urlparse, unquote
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Parse connection string
url = urlparse(settings.DATABASE_URL)
dbname = url.path[1:]
user = unquote(url.username) if url.username else None
password = unquote(url.password) if url.password else None
host = url.hostname
port = url.port or 5432

def create_database_if_not_exists():
    try:
        # Connect to postgres server (default db) to check/create target database
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{dbname}'")
        exists = cursor.fetchone()
        if not exists:
            cursor.execute(f"CREATE DATABASE {dbname}")
            print(f"Database {dbname} created successfully.")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Warning: Could not check or create database automatically: {e}")

# Check/create db
create_database_if_not_exists()

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
