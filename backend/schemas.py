from datetime import datetime
from pydantic import BaseModel
from typing import Optional

class UserBase(BaseModel):
    username: str
    ftrack_id: str
    role: str
    hourly_rate: float
    timezone: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class TimeLogBase(BaseModel):
    ftrack_task_id: str
    ftrack_task_name: Optional[str] = None
    ftrack_task_type: Optional[str] = None
    ftrack_path: Optional[str] = None
    bid_time: Optional[int] = None
    project_id: str
    duration: int # Duration in seconds
    description: Optional[str] = None
    billable: bool = True

class TimeLogCreate(TimeLogBase):
    pass

class TimeLogResponse(TimeLogBase):
    id: int
    user_id: int
    date: datetime
    status: str
    creation_date: datetime
    class Config:
        from_attributes = True
