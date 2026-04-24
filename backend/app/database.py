from sqlmodel import SQLModel, create_engine, Session
from app.config import settings
import os

os.makedirs("./data", exist_ok=True)
engine = create_engine(settings.database_url)


def create_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
