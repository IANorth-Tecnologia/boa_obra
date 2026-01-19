from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from src.infrastructure.db.session import get_db
from src.infrastructure.db.models import TEtapaPadrao, TEtapaObra

router = APIRouter(prefix="/etapas", tags=["Etapas e Planejamento"])

class EtapaRead(BaseModel):
    ID: int
    NOME_ETAPA: str
    STATUS: str
    PERCENTUAL: int
    ORDEM: int
    class Config:
        from_attributes = True

@router.get("/padrao")
def listar_catalogo_padrao(db: Session = Depends(get_db)):
    return db.query(TEtapaPadrao).order_by(TEtapaPadrao.ORDEM).all()

@router.get("/obra/{id_atividade}", response_model=List[EtapaRead])
def listar_etapas_da_obra(id_atividade: int, db: Session = Depends(get_db)):
    etapas = db.query(TEtapaObra).filter(TEtapaObra.ID_ATIVIDADE == id_atividade).order_by(TEtapaObra.ORDEM).all()
    return etapas
