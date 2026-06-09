from sqlmodel import Session, text
from typing import Optional

def get_user_id_by_email(db: Session, email: str) -> Optional[str]:
    """
    Looks up the user ID in the Better Auth 'user' table by email.
    """
    try:
        result = db.execute(
            text('SELECT id FROM "neon_auth"."user" WHERE email = :email'),
            {"email": email}
        ).first()
        return str(result[0]) if result else None
    except Exception as e:
        print(f"Error looking up user ID by email: {e}")
        return None
