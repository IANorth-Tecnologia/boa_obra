import os
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base 
from dotenv import load_dotenv

load_dotenv()

DB_TYPE = os.getenv("DB_TYPE", "sqlite")

print(f"Inicializando Banco de Dados em modo: {DB_TYPE.upper()}")

Base = declarative_base()

if DB_TYPE == "sqlite":
    # Modo espelho em desenvolvimento 
    db_file = os.getenv("DB_NAME", "boa_obra.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///./{db_file}"
    connect_args = {"check_same_thread": False}

else:
    # Modo Windows em produção 
    SERVER = os.getenv("DB_SERVER")
    DATABASE = os.getenv("DB_NAME")
    UID = os.getenv("DB_USER")
    PWD = os.getenv("DB_PASSWORD")
    
    params = urllib.parse.quote_plus(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={SERVER};"
        f"DATABASE={DATABASE};"
        f"UID={UID};"
        f"PWD={PWD};"
        f"TrustServerCertificate=yes;" 
    )
    SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"
    connect_args = {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
