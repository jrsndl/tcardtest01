from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import pandas as pd
from io import StringIO
from datetime import datetime

import models, auth
from database import get_db

router = APIRouter(prefix="/exports", tags=["Exports"])

@router.get("/csv")
def export_timelogs_csv(
    month: int = None, 
    year: int = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.TimeLog)
    
    # If artist, only export their own items
    if current_user.role == "artist":
        query = query.filter(models.TimeLog.user_id == current_user.id)
    
    # Optional filtering by month/year
    # NOTE: SQLAlchemy specific dialect matching might be needed for precise month filtering
    # Here, we fetch and use pandas to filter easily as a basic implementation.
    
    timelogs = query.all()
    
    data = []
    for log in timelogs:
        # Simple date filter
        if month and log.date.month != month: continue
        if year and log.date.year != year: continue
            
        data.append({
            "ID": log.id,
            "User ID": log.user_id,
            "Ftrack Task ID": log.ftrack_task_id,
            "Project ID": log.project_id,
            "Date": log.date.strftime("%Y-%m-%d"),
            "Duration (hrs)": log.duration,
            "Description": log.description,
            "Status": log.status,
            "Billable": log.billable
        })
        
    df = pd.DataFrame(data)
    
    stream = StringIO()
    df.to_csv(stream, index=False)
    
    filename = f"timelogs_export_{datetime.now().strftime('%Y%m%d')}.csv"
    
    response = Response(content=stream.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response
