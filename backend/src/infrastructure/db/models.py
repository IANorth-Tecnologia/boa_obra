from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, LargeBinary, DECIMAL
from sqlalchemy.orm import relationship
from src.infrastructure.db.session import Base
from datetime import datetime


class TLocalServico(Base):
    __tablename__ = 'TLOCALSERVICO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    DESCRICAO = Column(String(100))
    atividades = relationship("TAtividade", back_populates="local")
    etapas = relationship("TEtapaObra", back_populates="obra", cascade="all, delete-orphan")

class TAtividade(Base):
    __tablename__ = 'TATIVIDADE'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    CODATIVIDADE = Column(String(50), nullable=False)
    DESCRICAO = Column(String(200), nullable=False)
    CONTRATADA = Column(String(100))      
    CONTRATANTE = Column(String(100))     
    OBJETIVO = Column(String(500))        
    LOCAL = Column(String(150))           
    FISCAL = Column(String(100))          
    TIPO_SERVICO = Column(String(100))    
    DATA_ABERTURA = Column(DateTime)
    STATUSATIVIDADE = Column(Integer)
    CODLOCALSERVICO = Column(Integer, ForeignKey('TLOCALSERVICO.ID'), default=1)
    local = relationship("TLocalServico", back_populates="atividades")
    orcamentos = relationship("TOrcamentoObra", back_populates="atividade")

class TItemPreco(Base):
    __tablename__ = 'TITEMPRECO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    CODIGO_ITEM = Column(String(50))
    DESCRICAO = Column(String(300))
    UNIDADE = Column(String(20))
    PRECO_UNITARIO = Column(DECIMAL(10, 2)) 
    TIPO = Column(String(20), default="MATERIAL")

class TOrcamentoObra(Base):
    __tablename__ = 'TORCAMENTO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    ID_ATIVIDADE = Column(Integer, ForeignKey('TATIVIDADE.ID'))
    ID_ITEM_PRECO = Column(Integer, ForeignKey('TITEMPRECO.ID'))
    QUANTIDADE_PREVISTA = Column(Float)
    atividade = relationship("TAtividade", back_populates="orcamentos")
    item_preco = relationship("TItemPreco")

class TFuncionario(Base):
    __tablename__ = 'TFUNCIONARIO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    NOME = Column(String(100), nullable=False)
    FUNCAO = Column(String(50))
    CPF = Column(String(14), nullable=True)
    MATRICULA = Column(String(20), unique=True, nullable=True)
    SENHA_HASH = Column(String(200))                        
    PERFIL = Column(String(20), default="COLABORADOR")
    STATUS = Column(Integer, default=1)
    GRUPO = Column(String(50), nullable=True)
    FOTO = Column(LargeBinary, nullable=True)

class TEquipamento(Base):
    __tablename__ = 'TEQUIPAMENTO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    DESCRICAO = Column(String(100), nullable=False)
    VALOR = Column(Float, nullable=True, default=0.0)

class TServico(Base):
    __tablename__ = 'TSERVICO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    CODATIVIDADE = Column(Integer) 
    ID_RESPONSAVEL = Column(Integer, ForeignKey('TFUNCIONARIO.ID'))
    DESCRICAO = Column(Text)
    DATAINICIO = Column(DateTime)
    DATAFIM = Column(DateTime)
    NOTA = Column(Text)       
    PENDENCIA = Column(Text)
    STATUS_DIA = Column(String(50)) 
    responsavel = relationship("TFuncionario")
    efetivo = relationship("TRDO_Efetivo", back_populates="servico")
    equipamentos = relationship("TRDO_Equipamento", back_populates="servico")
    fotos = relationship("TRDO_Foto", back_populates="servico")

class TRDO_Foto(Base):
    __tablename__ = 'TRDO_FOTO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    ID_SERVICO = Column(Integer, ForeignKey('TSERVICO.ID'))
    ARQUIVO = Column(LargeBinary)
    servico = relationship("TServico", back_populates="fotos")

class TRDO_Efetivo(Base):
    __tablename__ = 'TRDO_EFETIVO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    ID_SERVICO = Column(Integer, ForeignKey('TSERVICO.ID'))
    FUNCAO = Column(String(100))
    QUANTIDADE = Column(Integer)
    servico = relationship("TServico", back_populates="efetivo")

class TRDO_Equipamento(Base):
    __tablename__ = 'TRDO_EQUIPAMENTO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    ID_SERVICO = Column(Integer, ForeignKey('TSERVICO.ID'))
    DESCRICAO = Column(String(100))
    QUANTIDADE = Column(Integer)
    servico = relationship("TServico", back_populates="equipamentos")

class TProposta(Base):
    __tablename__ = 'TPROPOSTA'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    CLIENTE = Column(String(100))
    OBRA = Column(String(100)) 
    DATA_CRIACAO = Column(DateTime, default=datetime.now)
    VALIDADE = Column(Integer, default=15) 
    STATUS = Column(String(20), default='RASCUNHO') 
    OBSERVACOES = Column(Text, nullable=True)
    VALOR_TOTAL = Column(Float, default=0.0)
    itens = relationship("TPropostaItem", back_populates="proposta", cascade="all, delete-orphan")

class TPropostaItem(Base):
    __tablename__ = 'TPROPOSTA_ITEM'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    ID_PROPOSTA = Column(Integer, ForeignKey('TPROPOSTA.ID'))
    DESCRICAO = Column(String(200))
    UNIDADE = Column(String(10))
    QUANTIDADE = Column(Float)
    PRECO_UNITARIO = Column(Float)
    SUBTOTAL = Column(Float)
    proposta = relationship("TProposta", back_populates="itens")


class TEtapaObra(Base):
    """
    Tabela que define as fases/etapas de cada Obra (baseado no seu PDF).
    """
    __tablename__ = 'TETAPA_OBRA'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    ID_LOCAL = Column(Integer, ForeignKey('TLOCALSERVICO.ID')) 
    
    NOME_ETAPA = Column(String(150), nullable=False) 
    ORDEM = Column(Integer, default=1)               
    STATUS = Column(String(50), default="PENDENTE")  
    PERCENTUAL = Column(Integer, default=0)         
    
    obra = relationship("TLocalServico", back_populates="etapas")
    apontamentos = relationship("TRDO_Detalhado", back_populates="etapa")

class TRDO_Detalhado(Base):
    """
    O 'Ponto Eletrônico' da tarefa. Registra início, pausas e conclusões.
    """
    __tablename__ = 'TRDO_DETALHADO'
    ID = Column(Integer, primary_key=True, autoincrement=True)
    
    ID_ETAPA = Column(Integer, ForeignKey('TETAPA_OBRA.ID'))
    ID_FUNCIONARIO = Column(Integer, ForeignKey('TFUNCIONARIO.ID'))
    
    DATA_HORA_REGISTRO = Column(DateTime, default=datetime.now)
    TIPO_EVENTO = Column(String(50)) 
    OBSERVACAO = Column(Text, nullable=True)
    FOTO = Column(LargeBinary, nullable=True) 
    
    etapa = relationship("TEtapaObra", back_populates="apontamentos")
    funcionario = relationship("TFuncionario")
