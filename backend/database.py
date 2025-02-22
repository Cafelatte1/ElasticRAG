import os
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Boolean,
    ARRAY,
    DateTime,
    ForeignKey,
    inspect,
    text,
)
from dotenv import load_dotenv
load_dotenv()

# === Postgres ===
SQLALCHEMY_DATABASE_URL = f"postgresql://postgres:1541@localhost/{os.getenv('RDB_DATABASE_NAME')}"
rdb_engine = create_engine(SQLALCHEMY_DATABASE_URL)
rdb_session = sessionmaker(autocommit=False, autoflush=False, bind=rdb_engine)
Base = declarative_base()

def GetRDB():
    db = rdb_session()
    try:
        yield db
    finally:
        db.close()

def create_schema():
    schema_name = os.getenv('RDB_SCHEMA_NAME')
    inspector = inspect(rdb_engine)
    schemas = inspector.get_schema_names()
    if schema_name not in schemas:
        with rdb_engine.connect() as connection:
            connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS {schema_name}'))
            connection.commit()

class Users(Base):
    __table_args__ = {"schema": os.getenv('RDB_SCHEMA_NAME')}
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(60), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())

class Chats(Base):
    __table_args__ = {"schema": os.getenv('RDB_SCHEMA_NAME')}
    __tablename__ = "chats"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), ForeignKey(f"{os.getenv('RDB_SCHEMA_NAME')}.users.username"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())

class ChatMessages(Base):
    __table_args__ = {"schema": os.getenv('RDB_SCHEMA_NAME')}
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey(f"{os.getenv('RDB_SCHEMA_NAME')}.chats.id"), nullable=False, index=True)
    user = Column(Text, nullable=False)
    assistant = Column(Text, nullable=True)
    doc_ids = Column(ARRAY(Integer), nullable=True)
    chunk_ids = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())

class Documents(Base):
    __table_args__ = {"schema": os.getenv('RDB_SCHEMA_NAME')}
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True)
    user_username = Column(String(100), ForeignKey(f"{os.getenv('RDB_SCHEMA_NAME')}.users.username"))
    title = Column(String(100), nullable=False, index=True)
    extension = Column(String(30), nullable=False)
    proc_type = Column(String(30), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    progress = Column(Integer, nullable=False, default=0)

# Create schema if not exists
create_schema()
# Create Table in Postgres
Base.metadata.create_all(bind=rdb_engine)
