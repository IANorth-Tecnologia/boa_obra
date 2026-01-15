from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class EtapaBase(BaseModel):
    nome_etapa: str
    ordem: int
    status: Optional[str] = "PENDENTE"
    percentual: Optional[int] = 0

class EtapaCreate(EtapaBase):
    id_local: int  

class EtapaUpdate(BaseModel):
    status: Optional[str] = None
    percentual: Optional[int] = None

class EtapaResponse(EtapaBase):
    id: int
    id_local: int
    
    class Config:
        from_attributes = True  


class RDOApontamentoBase(BaseModel):
    id_etapa: int
    id_funcionario: int
    tipo_evento: str  
    observacao: Optional[str] = None

class RDOApontamentoCreate(RDOApontamentoBase):
    foto_base64: Optional[str] = None 

class RDOApontamentoResponse(RDOApontamentoBase):
    id: int
    data_hora_registro: datetime
    
    class Config:
        from_attributes = True
