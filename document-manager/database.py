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
from pymilvus import (
    connections,
    Collection,
    CollectionSchema,
    FieldSchema,
    DataType,
    utility,
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

# === Milvus ===
def GetVectorDB():
    collection = Collection(name=os.getenv('MILVUS_COLLECTION_NAME'))
    collection.load()
    return collection

connections.connect(host=os.getenv('MILVUS_DATABASE_URL'), db_name=os.getenv('MILVUS_DATABASE_NAME'))
fields = [
    FieldSchema(name="id", dtype=DataType.VARCHAR, is_primary=True, max_length=32),
    FieldSchema(name="doc_id", dtype=DataType.INT64),
    FieldSchema(name="page_number", dtype=DataType.INT64),
    FieldSchema(name="chunk_type", dtype=DataType.VARCHAR, max_length=30),
    FieldSchema(name="chunk_id", dtype=DataType.INT64),
    FieldSchema(name="chunk_content", dtype=DataType.VARCHAR, max_length=65535),
    FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=int(os.getenv("EMBEDDING_DIMENSION")))
]

# Create collection if not exists
if not utility.has_collection(os.getenv('MILVUS_COLLECTION_NAME')):
    schema = CollectionSchema(fields=fields, description="Document chunks collection")
    collection = Collection(name=os.getenv('MILVUS_COLLECTION_NAME'), schema=schema)

    # Create index
    index_params = {
        "metric_type": "IP",
        "index_type": "IVF_FLAT",
        "params": {"nlist": int(os.getenv("MILVUS_N_CLUSTERS"))}
    }
    collection.create_index(field_name="vector", index_params=index_params)
