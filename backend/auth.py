"""Shared JWT auth helpers — imported by main.py and coach router."""
import jwt
import os
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from fastapi import Request, HTTPException

load_dotenv(Path(__file__).resolve().parent / '.env')

JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-here')


def create_token(user_id: int) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except Exception:
        return None


async def get_current_user_id(request: Request) -> int:
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    token = auth_header.split(' ')[1]
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    return user_id
