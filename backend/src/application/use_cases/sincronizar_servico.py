from sqlalchemy.orm import Session
from src.infrastructure.db import models
from src.application.dtos import ServicoInputDTO
from datetime import datetime
import base64

class SincronizarServicoUC:
    def __init__(self, db: Session):
        self.db = db

    def execute(self, dto: ServicoInputDTO):
        if isinstance(dto.DATAINICIO, str):
            try:
                data_formatada = datetime.strptime(dto.DATAINICIO, "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                try:
                    data_formatada = datetime.strptime(dto.DATAINICIO[:10], "%Y-%m-%d")
                except:
                    data_formatada = datetime.now()
        else:
            data_formatada = dto.DATAINICIO

        foto_bytes = None
        if dto.ANEXO_BASE64:
            try:
                if "," in dto.ANEXO_BASE64:
                    header, encoded = dto.ANEXO_BASE64.split(",", 1)
                else:
                    encoded = dto.ANEXO_BASE64
                foto_bytes = base64.b64decode(encoded)
            except Exception as e:
                print(f"Erro imagem: {e}")
                foto_bytes = None

        nota_clima = f"{dto.CLIMA_MANHA or '-'} | {dto.CLIMA_TARDE or '-'}"

        novo_servico = models.TServico(
            CODATIVIDADE=dto.CODATIVIDADE,
            DESCRICAO=dto.DESCRICAO,
            DATAINICIO=data_formatada,
            NOTA=nota_clima,
            PENDENCIA=dto.PENDENCIA or dto.OCORRENCIAS,
            ANEXO=foto_bytes
        )
        
        self.db.add(novo_servico)
        self.db.commit()
        self.db.refresh(novo_servico)

        for item in dto.efetivo:
            if item.FUNCAO and item.QUANTIDADE:
                self.db.add(models.TRDO_Efetivo(
                    ID_SERVICO=novo_servico.ID,
                    FUNCAO=item.FUNCAO,
                    QUANTIDADE=item.QUANTIDADE
                ))

        for item in dto.equipamentos:
            if item.DESCRICAO and item.QUANTIDADE:
                self.db.add(models.TRDO_Equipamento(
                    ID_SERVICO=novo_servico.ID,
                    DESCRICAO=item.DESCRICAO,
                    QUANTIDADE=item.QUANTIDADE
                ))

        self.db.commit()
        return novo_servico
