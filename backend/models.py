from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    ftrack_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="artist") # artist, lead, management
    hourly_rate = Column(Float, default=0.0)
    timezone = Column(String, default="UTC")

    time_logs = relationship("TimeLog", back_populates="user")

class TimeLog(Base):
    __tablename__ = "time_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ftrack_task_id = Column(String, index=True, nullable=False)
    ftrack_task_name = Column(String, nullable=True)
    ftrack_task_type = Column(String, nullable=True)
    ftrack_path = Column(String, nullable=True)
    bid_time = Column(Integer, nullable=True) # Duration in seconds
    project_id = Column(String, index=True, nullable=False)
    date = Column(DateTime, default=func.now(), nullable=False) # UTC
    duration = Column(Integer, nullable=False) # Configured in seconds
    description = Column(String, nullable=True)
    status = Column(String, default="logged") # logged, submitted, approved, disputed, resolved
    billable = Column(Boolean, default=True)
    creation_date = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="time_logs")
