from pydantic import BaseModel, Field
from typing import List, Optional, Union, Any
from datetime import datetime

class EfetivoInputDTO(BaseModel):
    FUNCAO: str
    QUANTIDADE: int

class EquipamentoInputDTO(BaseModel):
    DESCRICAO: str
    QUANTIDADE: int

class ServicoInputDTO(BaseModel):
    CODATIVIDADE: int
    DESCRICAO: str 
    DATAINICIO: Union[str, datetime, Any]
    CLIMA_MANHA: str 
    CLIMA_TARDE: str 
    OCORRENCIAS: Optional[str] = None
    ANEXO_BASE64: Optional[str] = None
    PENDENCIA: Optional[str] = None

    efetivo: List[EfetivoInputDTO] = []
    equipamentos: list[EquipamentoInputDTO] = []

