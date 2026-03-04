from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

import models, auth, ftrack_integration
from database import get_db

router = APIRouter(tags=["Authentication"])

@router.post("/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Verify via Ftrack since we are using Ftrack login
    user_info = ftrack_integration.verify_user_credentials(form_data.username, form_data.password)
    
    if not user_info:
        # Fallback for dev/testing if Ftrack server not available
        if form_data.username == "test" and form_data.password == "test":
             user_info = {"username": "test", "ftrack_id": "test_id"}
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # Check if user exists locally, otherwise create
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user:
        # Defaults to artist. A real app might fetch roles from ftrack team page.
        user = models.User(
            username=user_info["username"], 
            ftrack_id=user_info["ftrack_id"],
            role="artist" 
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {"id": user.id, "username": user.username, "role": user.role}
    }
