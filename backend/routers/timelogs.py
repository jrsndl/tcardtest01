from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/timelogs", tags=["TimeLogs"])

@router.post("/", response_model=schemas.TimeLogResponse)
def create_time_log(
    timelog: schemas.TimeLogCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    db_timelog = models.TimeLog(**timelog.model_dump(), user_id=current_user.id)
    db.add(db_timelog)
    db.commit()
    db.refresh(db_timelog)
    return db_timelog

@router.get("/", response_model=List[schemas.TimeLogResponse])
def get_time_logs(
    skip: int = 0, limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role in ["management", "admin"]:
        return db.query(models.TimeLog).offset(skip).limit(limit).all()
    # Artists only see their own logs
    return db.query(models.TimeLog).filter(models.TimeLog.user_id == current_user.id).offset(skip).limit(limit).all()

@router.patch("/{timelog_id}/status", response_model=schemas.TimeLogResponse)
def update_timelog_status(
    timelog_id: int, 
    new_status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    timelog = db.query(models.TimeLog).filter(models.TimeLog.id == timelog_id).first()
    if not timelog:
        raise HTTPException(status_code=404, detail="TimeLog not found")

    # State Machine rules
    if current_user.role == "artist":
        if timelog.status in ["submitted", "approved", "resolved"]:
            raise HTTPException(status_code=403, detail="Cannot edit submitted/approved logs")
        if new_status not in ["logged", "submitted"]:
            raise HTTPException(status_code=403, detail="Artist can only submit logs")
    elif current_user.role == "management":
        if timelog.status == "resolved":
            raise HTTPException(status_code=403, detail="Cannot edit resolved logs")
        if new_status not in ["approved", "disputed"]:
            raise HTTPException(status_code=403, detail="Management can only approve or dispute logs")

    timelog.status = new_status
    db.commit()
    db.refresh(timelog)
    return timelog

@router.put("/{timelog_id}", response_model=schemas.TimeLogResponse)
def update_timelog(
    timelog_id: int, 
    timelog_update: schemas.TimeLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    timelog = db.query(models.TimeLog).filter(models.TimeLog.id == timelog_id).first()
    if not timelog:
        raise HTTPException(status_code=404, detail="TimeLog not found")

    # Artist can only edit if status is "logged" or "disputed"
    if current_user.role == "artist" and timelog.status not in ["logged", "disputed"]:
        raise HTTPException(status_code=403, detail="Cannot edit in current state")

    for key, value in timelog_update.model_dump().items():
        setattr(timelog, key, value)

    db.commit()
    db.refresh(timelog)
    return timelog
