
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("No DATABASE_URL environment variable set")

engine = create_engine(DATABASE_URL)

def get_user_role(email: str) -> str | None:
    """
    Fetches the role for a given user email from the database.

    Args:
        email: The email of the user to look up.

    Returns:
        The user's role as a string, or None if the user is not found.
    """
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT role FROM user_roles WHERE email = :email"),
            {"email": email}
        ).fetchone()
        
        if result:
            return result[0]
        return None
