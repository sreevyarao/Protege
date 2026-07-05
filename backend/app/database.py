from sqlmodel import SQLModel, create_engine, Session as DBSession
from typing import Generator
from app.models import *

sqlite_file_name = "app.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_db() -> Generator[DBSession, None, None]:
    with DBSession(engine) as session:
        yield session
