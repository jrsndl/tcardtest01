import os
import ftrack_api
import logging

logger = logging.getLogger(__name__)

def get_ftrack_session():
    """
    Initializes and returns an Ftrack API session.
    Assumes FTRACK_SERVER, FTRACK_API_USER, and FTRACK_API_KEY are in the environment.
    """
    try:
        session = ftrack_api.Session()
        return session
    except Exception as e:
        logger.error(f"Failed to connect to Ftrack: {e}")
        return None

def fetch_projects():
    """
    Dummy functionality based on ftrack-helpers idea.
    Would query Ftrack for active projects.
    """
    session = get_ftrack_session()
    if not session:
        return []
    
    # Needs to match ftrack API queries e.g.
    # projects = session.query('select id, name, start_date, end_date from Project').all()
    # return projects
    return []

def verify_user_credentials(username, api_key):
    """
    Verifies user credentials by attempting to create a session with them.
    """
    try:
        session = ftrack_api.Session(
            server_url=os.getenv("FTRACK_SERVER"),
            api_user=username,
            api_key=api_key
        )
        user = session.query(f'User where username is "{username}"').one()
        return {
            "ftrack_id": user['id'],
            "username": user['username'],
        }
    except Exception:
        return None
