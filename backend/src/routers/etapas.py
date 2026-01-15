from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from src.infrastructure.db.session import get_db
from src.infrastructure.db.models import TEtapaPadrao, TServicoPadrao, TEtapaObra, TLocalServico

router = APIRouter(prefix="/etapas", tags=["Etapas e Planejamento"])

class ServicoPadraoRead(BaseModel):
    ID: int
    NOME: str
    UNIDADE: Optional[str]
    class Config:
        from_attributes = True

class EtapaPadraoRead(BaseModel):
    ID: int
    NOME: str
    servicos: List[ServicoPadraoRead] = []
    class Config:
        from_attributes = True


@router.get("/padrao", response_model=List[EtapaPadraoRead])
def listar_catalogo_padrao(db: Session = Depends(get_db)):
    """
    Lista o 'Menu' de etapas e serviços padrão disponíveis para importação.
    """
    return db.query(TEtapaPadrao).order_by(TEtapaPadrao.ORDEM).all()

@router.post("/importar/{id_local}")
def importar_padrao_para_obra(id_local: int, db: Session = Depends(get_db)):
    """
    Copia o Catálogo Padrão para uma Obra específica (ID_LOCAL).
    Isso cria o cronograma inicial da obra.
    """
    obra = db.query(TLocalServico).filter(TLocalServico.ID == id_local).first()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra/Local não encontrado")

    ja_tem_etapas = db.query(TEtapaObra).filter(TEtapaObra.ID_LOCAL == id_local).first()
    if ja_tem_etapas:
        raise HTTPException(status_code=400, detail="Esta obra já possui etapas cadastradas!")

    etapas_padrao = db.query(TEtapaPadrao).all()
    
    count = 0
    for padrao in etapas_padrao:
        nova_etapa = TEtapaObra(
            ID_LOCAL=id_local,
            NOME_ETAPA=padrao.NOME,
            ORDEM=padrao.ORDEM,
            STATUS="PENDENTE",
            PERCENTUAL=0
        )
        db.add(nova_etapa)
        count += 1
    
    db.commit()
    return {"message": f"Sucesso! {count} etapas foram criadas para a obra {obra.DESCRICAO}."}

@router.get("/obra/{id_local}")
def listar_etapas_da_obra(id_local: int, db: Session = Depends(get_db)):
    """
    Mostra como está o andamento das etapas de uma obra específica.
    """
    etapas = db.query(TEtapaObra).filter(TEtapaObra.ID_LOCAL == id_local).order_by(TEtapaObra.ORDEM).all()
    return etapas
