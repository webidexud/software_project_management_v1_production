from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.catalogs import AppUser
from app.schemas.catalogs import Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(AppUser).filter(AppUser.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    token = create_access_token(data={"sub": user.username})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Solo permitir registro si no hay usuarios (primer admin)
    count = db.query(AppUser).count()
    existing = db.query(AppUser).filter(
        (AppUser.username == user_in.username) | (AppUser.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Usuario o email ya existe")

    user = AppUser(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        is_admin=True if count == 0 else user_in.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
