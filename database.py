from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

SQLALCHEMY_DATABASE_URL = "postgresql://postgres.yltbfinwwpmzrcnmxsvd:r1FLoSj2ifSxvQcJ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
