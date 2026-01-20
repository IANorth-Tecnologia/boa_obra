from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File, Form
from sqlalchemy.orm import Session, defer, joinedload
from sqlalchemy import or_, desc, func, case, cast, Date
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from jose import JWTError, jwt
import io
import traceback

from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from src.infrastructure.db import models
from src.infrastructure.db.session import SessionLocal, engine, get_db
from src.application.use_cases.sincronizar_servico import SincronizarServicoUC
from src.application.dtos import ServicoInputDTO
from src.application.use_cases.gerar_pdf import desenhar_pdf, desenhar_orcamento
from src.auth import verificar_senha, gerar_hash_senha, criar_token_acesso, SECRET_KEY, ALGORITHM
from src.routers import etapas

def agora_br():
    return datetime.now(ZoneInfo("America/Sao_Paulo"))

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Boa Obra ERP")
app.include_router(etapas.router)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS ---
class ItemPrecoRead(BaseModel):
    ID: int
    CODIGO_ITEM: str
    DESCRICAO: str
    UNIDADE: str | None = None
    PRECO_UNITARIO: float
    TIPO: Optional[str] = "MATERIAL"
    class Config: from_attributes = True

class FuncionarioRead(BaseModel):
    ID: int
    NOME: str
    FUNCAO: str
    STATUS: int
    MATRICULA: Optional[str] = None
    CPF: Optional[str] = None
    PERFIL: Optional[str] = None
    GRUPO: Optional[str] = None
    class Config: from_attributes = True

class OrcamentoCreate(BaseModel):
    ID_ATIVIDADE: int
    ID_ITEM_PRECO: int
    QUANTIDADE: float

class OrcamentoUpdate(BaseModel):
    QUANTIDADE: float

class FuncionarioCreate(BaseModel):
    NOME: str
    FUNCAO: str
    MATRICULA: Optional[str] = ""
    CPF: Optional[str] = None
    SENHA: str
    PERFIL: str
    GRUPO: Optional[str] = "GERAL"

class StatusUpdate(BaseModel):
    STATUS: int

class LoginData(BaseModel):
    login: str 
    senha: str

class SenhaReset(BaseModel):
    NOVA_SENHA: str

class AtividadeCreate(BaseModel):
    CODATIVIDADE: str
    DESCRICAO: str
    CONTRATADA: Optional[str] = "IANORTH"
    CONTRATANTE: Optional[str] = ""
    OBJETIVO: Optional[str] = ""
    LOCAL: Optional[str] = ""
    FISCAL: Optional[str] = ""
    TIPO_SERVICO: Optional[str] = ""
    ETAPAS: List[str] = []

class PrecoCreate(BaseModel):
    CODIGO_ITEM: str
    DESCRICAO: str
    UNIDADE: str
    PRECO_UNITARIO: float
    TIPO: Optional[str] = "MATERIAL"

class EquipamentoCreate(BaseModel):
    DESCRICAO: str
    VALOR: Optional[float] = 0.0

class GrupoUpdate(BaseModel):
    nome_antigo: str
    nome_novo: str

class EfetivoItem(BaseModel):
    FUNCAO: str
    QUANTIDADE: int

class EquipamentoItem(BaseModel):
    DESCRICAO: str
    QUANTIDADE: int

class RDOCreate(BaseModel):
    ID_ATIVIDADE: int
    ID_ETAPA: Optional[int] = None 
    DATAINICIO: datetime
    DATAFIM: datetime
    DESCRICAO: str
    NOTA: Optional[str] = ""
    PENDENCIA: Optional[str] = ""
    STATUS: Optional[str] = "EM ANDAMENTO"
    EFETIVO: List[EfetivoItem] = []
    EQUIPAMENTOS: List[EquipamentoItem] = []

class PropostaCreate(BaseModel):
    CLIENTE: str
    OBRA: str
    VALIDADE: Optional[int] = 15
    OBSERVACOES: Optional[str] = ""

class PropostaItemCreate(BaseModel):
    DESCRICAO: str
    UNIDADE: str
    QUANTIDADE: float
    PRECO_UNITARIO: float

class RDOFinalizacao(BaseModel):
    STATUS: str
    CLIMA_MANHA: str
    CLIMA_TARDE: str
    CONDICAO_AREA: str
    DESCRICAO: str
    OBSERVACOES: str
    EFETIVO: List[EfetivoItem]
    EQUIPAMENTOS: List[EquipamentoItem]

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("id")
        if user_id is None: raise HTTPException(status_code=401, detail="Token inválido")
    except JWTError:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    user = db.query(models.TFuncionario).filter(models.TFuncionario.ID == user_id).first()
    if user is None: raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if user.STATUS != 1: raise HTTPException(status_code=401, detail="Usuário desativado. Acesso negado.")
    return user


@app.post("/token")
def login_para_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.TFuncionario).filter(
        (models.TFuncionario.CPF == form_data.username) |
        (models.TFuncionario.MATRICULA == form_data.username)
    ).first()
    if not user or not verificar_senha(form_data.password, user.SENHA_HASH):
        raise HTTPException(status_code=400, detail="Credenciais inválidas")
    if user.STATUS != 1:
        raise HTTPException(status_code=403, detail="Acesso bloqueado. Contate o administrador.")
    token = criar_token_acesso(data={"sub": user.NOME, "id": user.ID, "perfil": user.PERFIL})
    return {"access_token": token, "token_type": "bearer", "perfil": user.PERFIL, "nome": user.NOME}

@app.get("/atividades")
def listar_atividades(db: Session = Depends(get_db)):
    if not db.query(models.TLocalServico).filter_by(ID=1).first():
        try:
            if not db.query(models.TAtividade).first(): db.add(models.TLocalServico(ID=1, DESCRICAO="Local Geral"))
            db.commit()
        except: db.rollback()
    return db.query(models.TAtividade).all()

@app.get("/precos", response_model=List[ItemPrecoRead])
def buscar_precos(q: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.TItemPreco)
    if q: query = query.filter(or_(models.TItemPreco.CODIGO_ITEM.contains(q), models.TItemPreco.DESCRICAO.contains(q)))
    return query.order_by(desc(models.TItemPreco.ID)).limit(100).all()

@app.get("/orcamentos/{id_atividade}")
def ver_orcamento(id_atividade: int, db: Session = Depends(get_db)):
    itens = db.query(models.TOrcamentoObra).filter_by(ID_ATIVIDADE=id_atividade).all()
    resultado = []
    total = 0
    for i in itens:
        if not i.item_preco: continue
        total_item = float(i.QUANTIDADE_PREVISTA) * float(i.item_preco.PRECO_UNITARIO)
        total += total_item
        resultado.append({"ID": i.ID, "CODIGO": i.item_preco.CODIGO_ITEM, "DESCRICAO": i.item_preco.DESCRICAO, "TIPO": i.item_preco.TIPO, "QTD": i.QUANTIDADE_PREVISTA, "UNITARIO": i.item_preco.PRECO_UNITARIO, "TOTAL": total_item})
    return {"itens": resultado, "total_geral": total}

@app.get("/admin/funcionarios", response_model=List[FuncionarioRead])
def listar_funcionarios(apenas_ativos: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.TFuncionario).options(defer(models.TFuncionario.FOTO))
    if apenas_ativos: query = query.filter(models.TFuncionario.STATUS == 1)
    return query.all()

@app.get("/admin/funcionarios/{id}/foto")
def ver_foto_funcionario(id: int, db: Session = Depends(get_db)):
    func = db.query(models.TFuncionario).filter(models.TFuncionario.ID == id).first()
    if not func or not func.FOTO: raise HTTPException(status_code=404, detail="Sem foto")
    return StreamingResponse(io.BytesIO(func.FOTO), media_type="image/jpeg")

@app.get("/admin/equipamentos")
def listar_equipamentos(db: Session = Depends(get_db)):
    return db.query(models.TEquipamento).all()

@app.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_colaboradores = db.query(models.TFuncionario).filter(models.TFuncionario.STATUS == 1).count()
    total_obras_ativas = db.query(models.TAtividade).count()
    hoje = agora_br().date()
    inicio_mes = hoje.replace(day=1)
    rdos_hoje = db.query(models.TServico).filter(cast(models.TServico.DATAINICIO, Date) == hoje).count()
    rdos_mes = db.query(models.TServico).filter(models.TServico.DATAINICIO >= inicio_mes).count()
    status_counts = db.query(models.TServico.STATUS_DIA, func.count(models.TServico.ID)).filter(models.TServico.DATAINICIO >= inicio_mes).group_by(models.TServico.STATUS_DIA).all()
    status_dict = {s: c for s, c in status_counts if s}
    
    pendencias = db.query(models.TServico).filter(
        models.TServico.STATUS_DIA != 'CONCLUIDO',
        models.TServico.DATAINICIO >= inicio_mes
    ).order_by(desc(models.TServico.DATAINICIO)).limit(5).all()

    alertas = []
    for p in pendencias:
        obra = db.query(models.TAtividade).filter(models.TAtividade.ID == p.CODATIVIDADE).first()
        nome_obra = obra.DESCRICAO if obra else f"ID {p.CODATIVIDADE}"
        alertas.append({
            "id": p.ID,
            "obra": nome_obra,
            "data": p.DATAINICIO,
            "status": p.STATUS_DIA
        })

    return {
        "ranking": [], 
        "kpis_globais": {
            "rdos_hoje": rdos_hoje,
            "rdos_mes": rdos_mes,
            "equipe": total_colaboradores,
            "obras": total_obras_ativas
        },
        "meus_stats": {
            "total_mes": rdos_mes,
            "alertas": alertas
        }
    }

@app.get("/admin/dashboard/stats")
def get_dashboard_stats_admin(db: Session = Depends(get_db)):
    return get_dashboard_stats(db)

@app.get("/propostas")
def listar_propostas(db: Session = Depends(get_db)):
    return db.query(models.TProposta).order_by(desc(models.TProposta.ID)).all()

@app.get("/propostas/{id}")
def pegar_proposta(id: int, db: Session = Depends(get_db)):
    prop = db.query(models.TProposta).options(joinedload(models.TProposta.itens)).filter(models.TProposta.ID == id).first()
    if not prop: raise HTTPException(404, "Proposta não encontrada")
    return prop

@app.post("/orcamentos")
def adicionar_item_orcamento(item: OrcamentoCreate, db: Session = Depends(get_db)):
    obra = db.query(models.TAtividade).filter(models.TAtividade.ID == item.ID_ATIVIDADE).first()
    if not obra: raise HTTPException(status_code=404, detail="Obra não encontrada")
    novo = models.TOrcamentoObra(ID_ATIVIDADE=item.ID_ATIVIDADE, ID_ITEM_PRECO=item.ID_ITEM_PRECO, QUANTIDADE_PREVISTA=item.QUANTIDADE)
    db.add(novo)
    db.commit()
    return {"status": "adicionado", "id": novo.ID}

@app.post("/admin/funcionarios")
def criar_funcionario(item: FuncionarioCreate, db: Session = Depends(get_db)):
    if db.query(models.TFuncionario).filter((models.TFuncionario.CPF == item.CPF) & (item.CPF != "")).first():
        raise HTTPException(status_code=400, detail="CPF já cadastrado")
    novo = models.TFuncionario(
        NOME=item.NOME.upper(), FUNCAO=item.FUNCAO.upper(), MATRICULA=item.MATRICULA, CPF=item.CPF,
        PERFIL=item.PERFIL.upper(), SENHA_HASH=gerar_hash_senha(item.SENHA), GRUPO=item.GRUPO, STATUS=1
    )
    db.add(novo)
    db.commit()
    return {"msg": "Usuário Criado com Sucesso"}

@app.post("/admin/funcionarios/{id}/foto")
async def upload_foto_funcionario(id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    func = db.query(models.TFuncionario).filter(models.TFuncionario.ID == id).first()
    if not func: raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    conteudo = await file.read()
    func.FOTO = conteudo
    db.commit()
    return {"msg": "Foto atualizada"}

@app.post("/admin/atividades")
def criar_atividade(item: AtividadeCreate, db: Session = Depends(get_db)):
    try:
        novo = models.TAtividade(
            CODATIVIDADE=item.CODATIVIDADE, DESCRICAO=item.DESCRICAO, CONTRATADA=item.CONTRATADA,
            CONTRATANTE=item.CONTRATANTE, OBJETIVO=item.OBJETIVO, LOCAL=item.LOCAL, FISCAL=item.FISCAL,
            TIPO_SERVICO=item.TIPO_SERVICO, DATA_ABERTURA=agora_br(), STATUSATIVIDADE=1, CODLOCALSERVICO=1
        )
        db.add(novo)
        db.commit()
        db.refresh(novo)
        if item.ETAPAS:
            lista_objetos = []
            for index, nome_etapa in enumerate(item.ETAPAS):
                etapa = models.TEtapaObra(
                    ID_ATIVIDADE=novo.ID, NOME_ETAPA=nome_etapa.upper(), ORDEM=index + 1, PERCENTUAL=0.0,
                    STATUS="PENDENTE", DATA_INICIO=agora_br(), DATA_FIM=agora_br()
                )
                lista_objetos.append(etapa)
            db.add_all(lista_objetos)
            db.commit()
        return {"msg": "Obra e Etapas Criadas com Sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/precos")
def criar_preco(item: PrecoCreate, db: Session = Depends(get_db)):
    novo = models.TItemPreco(CODIGO_ITEM=item.CODIGO_ITEM, DESCRICAO=item.DESCRICAO, UNIDADE=item.UNIDADE, PRECO_UNITARIO=item.PRECO_UNITARIO, TIPO=item.TIPO)
    db.add(novo)
    db.commit()
    return {"msg": "Preço Criado"}

@app.post("/admin/equipamentos")
def criar_equipamento(item: EquipamentoCreate, db: Session = Depends(get_db)):
    novo = models.TEquipamento(DESCRICAO=item.DESCRICAO.upper(), VALOR=item.VALOR)
    db.add(novo)
    db.commit()
    return {"msg": "Equipamento cadastrado"}


@app.post("/rdo/evento")
async def registrar_evento_rdo(
    ID_ATIVIDADE: int = Form(...), 
    ID_ETAPA: Optional[int] = Form(None), 
    TIPO_EVENTO: str = Form(...), 
    OBSERVACAO: str = Form(""),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.TFuncionario = Depends(get_current_user)
):
    hoje = agora_br().date()
    id_etapa_db = ID_ETAPA if ID_ETAPA and ID_ETAPA > 0 else None
    
    query = db.query(models.TServico).filter(models.TServico.CODATIVIDADE == ID_ATIVIDADE, cast(models.TServico.DATAINICIO, Date) == hoje)
    if id_etapa_db: query = query.filter(models.TServico.ID_ETAPA == id_etapa_db)
    else: query = query.filter(models.TServico.ID_ETAPA == None)
    rdo = query.first()

    if not rdo:
        if TIPO_EVENTO == "INICIO":
            rdo = models.TServico(
                CODATIVIDADE=ID_ATIVIDADE, ID_ETAPA=id_etapa_db, ID_RESPONSAVEL=current_user.ID,
                DESCRICAO=f"Acompanhamento Diário" if id_etapa_db else "Diário Geral / Administrativo",
                DATAINICIO=agora_br(), STATUS_DIA="EM ANDAMENTO"
            )
            db.add(rdo)
            db.commit()
            db.refresh(rdo)
        else: raise HTTPException(400, "É necessário INICIAR antes de registrar outros eventos.")

    foto_bytes = None
    if file:
        try:
            content = await file.read()
            if len(content) > 0:
                foto_bytes = content
        except Exception as e:
            print(f"Erro ao ler arquivo: {e}")
    
    novo_evento = models.TRDO_Detalhado(
        ID_ETAPA=id_etapa_db, ID_FUNCIONARIO=current_user.ID, DATA_HORA_REGISTRO=agora_br(),
        TIPO_EVENTO=TIPO_EVENTO, OBSERVACAO=OBSERVACAO, FOTO=foto_bytes
    )
    db.add(novo_evento)

    if TIPO_EVENTO == "PAUSA": rdo.STATUS_DIA = "PAUSADO"
    elif TIPO_EVENTO == "RETOMADA": rdo.STATUS_DIA = "EM ANDAMENTO"
    elif TIPO_EVENTO == "CONCLUSAO":
        rdo.STATUS_DIA = "CONCLUIDO"
        rdo.DATAFIM = agora_br()

    db.commit()
    return {"msg": "Evento registrado", "status_atual": rdo.STATUS_DIA, "rdo_id": rdo.ID}


@app.get("/rdo/timeline/{id_atividade}/{id_etapa}")
def obter_timeline(id_atividade: int, id_etapa: int, db: Session = Depends(get_db)):
    hoje = agora_br().date()
    id_etapa_db = id_etapa if id_etapa > 0 else None
    
    query_eventos = db.query(models.TRDO_Detalhado).filter(cast(models.TRDO_Detalhado.DATA_HORA_REGISTRO, Date) == hoje)
    query_rdo = db.query(models.TServico).filter(models.TServico.CODATIVIDADE == id_atividade, cast(models.TServico.DATAINICIO, Date) == hoje)

    if id_etapa_db:
        query_eventos = query_eventos.filter(models.TRDO_Detalhado.ID_ETAPA == id_etapa_db)
        query_rdo = query_rdo.filter(models.TServico.ID_ETAPA == id_etapa_db)
    else:
        query_eventos = query_eventos.filter(models.TRDO_Detalhado.ID_ETAPA == None)
        query_rdo = query_rdo.filter(models.TServico.ID_ETAPA == None)

    eventos = query_eventos.order_by(desc(models.TRDO_Detalhado.DATA_HORA_REGISTRO)).all()
    rdo = query_rdo.first()
    status_atual = rdo.STATUS_DIA if rdo else "NAO_INICIADO"

    timeline = []
    for ev in eventos:
        timeline.append({
            "hora": ev.DATA_HORA_REGISTRO.strftime("%H:%M"),
            "tipo": ev.TIPO_EVENTO,
            "obs": ev.OBSERVACAO,
            "tem_foto": ev.FOTO is not None
        })
    return {"status": status_atual, "timeline": timeline, "rdo_id": rdo.ID if rdo else None}

@app.put("/rdo/{rdo_id}/finalizar")
def finalizar_rdo_completo(rdo_id: int, dados: RDOFinalizacao, db: Session = Depends(get_db)):
    rdo = db.query(models.TServico).filter(models.TServico.ID == rdo_id).first()
    if not rdo: raise HTTPException(404, "RDO não encontrado para finalização")

    rdo.STATUS_DIA = dados.STATUS
    rdo.DESCRICAO = dados.DESCRICAO
    rdo.NOTA = dados.OBSERVACOES
    rdo.PENDENCIA = f"CLIMA: {dados.CLIMA_MANHA}/{dados.CLIMA_TARDE} | AREA: {dados.CONDICAO_AREA}"
    rdo.DATAFIM = agora_br()

    db.query(models.TRDO_Efetivo).filter_by(ID_SERVICO=rdo_id).delete()
    db.query(models.TRDO_Equipamento).filter_by(ID_SERVICO=rdo_id).delete()

    for op in dados.EFETIVO:
        db.add(models.TRDO_Efetivo(ID_SERVICO=rdo_id, FUNCAO=op.FUNCAO.upper(), QUANTIDADE=op.QUANTIDADE))
    for eq in dados.EQUIPAMENTOS:
        db.add(models.TRDO_Equipamento(ID_SERVICO=rdo_id, DESCRICAO=eq.DESCRICAO.upper(), QUANTIDADE=eq.QUANTIDADE))

    db.commit()
    return {"msg": "RDO Finalizado com sucesso!"}

@app.delete("/rdo/{rdo_id}")
def deletar_rdo(rdo_id: int, db: Session = Depends(get_db)):
    rdo = db.query(models.TServico).filter(models.TServico.ID == rdo_id).first()
    if not rdo: raise HTTPException(status_code=404, detail="RDO não encontrado")
    
    db.query(models.TRDO_Efetivo).filter_by(ID_SERVICO=rdo_id).delete()
    db.query(models.TRDO_Equipamento).filter_by(ID_SERVICO=rdo_id).delete()
    db.query(models.TRDO_Foto).filter_by(ID_SERVICO=rdo_id).delete()
    
    db.delete(rdo)
    db.commit()
    return {"msg": "RDO excluído com sucesso"}

@app.post("/rdos")
def criar_rdo(item: RDOCreate, db: Session = Depends(get_db), current_user: models.TFuncionario = Depends(get_current_user)):
    novo_rdo = models.TServico(
        CODATIVIDADE=item.ID_ATIVIDADE, ID_ETAPA=item.ID_ETAPA, ID_RESPONSAVEL=current_user.ID,
        DESCRICAO=item.DESCRICAO, DATAINICIO=item.DATAINICIO, DATAFIM=item.DATAFIM,
        NOTA=item.NOTA, PENDENCIA=item.PENDENCIA, STATUS_DIA=item.STATUS
    )
    db.add(novo_rdo)
    db.commit()
    db.refresh(novo_rdo)
    for op in item.EFETIVO:
        db.add(models.TRDO_Efetivo(ID_SERVICO=novo_rdo.ID, FUNCAO=op.FUNCAO.upper(), QUANTIDADE=op.QUANTIDADE))
    for eq in item.EQUIPAMENTOS:
        db.add(models.TRDO_Equipamento(ID_SERVICO=novo_rdo.ID, DESCRICAO=eq.DESCRICAO.upper(), QUANTIDADE=eq.QUANTIDADE))
    db.commit()
    return {"msg": "RDO Criado", "id": novo_rdo.ID}

@app.post("/rdo/{id}/fotos")
async def upload_fotos_rdo(id: int, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    rdo = db.query(models.TServico).filter(models.TServico.ID == id).first()
    if not rdo: raise HTTPException(status_code=404, detail="RDO não encontrado")
    count = 0
    for file in files:
        conteudo = await file.read()
        db.add(models.TRDO_Foto(ID_SERVICO=id, ARQUIVO=conteudo))
        count += 1
    db.commit()
    return {"msg": f"{count} fotos enviadas"}

@app.put("/admin/funcionarios/{id}")
def atualizar_funcionario(id: int, item: FuncionarioCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.TFuncionario).filter(models.TFuncionario.ID == id).first()
    if not db_item: raise HTTPException(status_code=404, detail="Não encontrado")
    if item.CPF and item.CPF != db_item.CPF:
        cpf_usado = db.query(models.TFuncionario).filter(models.TFuncionario.CPF == item.CPF, models.TFuncionario.ID != id).first()
        if cpf_usado: raise HTTPException(status_code=400, detail="Este CPF já pertence a outro colaborador.")
    if item.MATRICULA and item.MATRICULA != db_item.MATRICULA:
        mat_usada = db.query(models.TFuncionario).filter(models.TFuncionario.MATRICULA == item.MATRICULA, models.TFuncionario.ID != id).first()
        if mat_usada: raise HTTPException(status_code=400, detail="Esta Matrícula já está em uso.")
    db_item.NOME = item.NOME.upper()
    db_item.FUNCAO = item.FUNCAO.upper()
    db_item.MATRICULA = item.MATRICULA
    db_item.CPF = item.CPF
    db_item.GRUPO = item.GRUPO
    db_item.PERFIL = item.PERFIL.upper()
    db.commit()
    return {"msg": "Dados atualizados com sucesso"}

@app.patch("/admin/funcionarios/{id}/status")
def alterar_status_funcionario(id: int, item: StatusUpdate, db: Session = Depends(get_db)):
    func = db.query(models.TFuncionario).filter(models.TFuncionario.ID == id).first()
    if not func: raise HTTPException(status_code=404, detail="Não encontrado")
    func.STATUS = item.STATUS
    db.commit()
    return {"msg": "Status atualizado"}

@app.put("/admin/grupos/renomear")
def renomear_grupo(item: GrupoUpdate, db: Session = Depends(get_db)):
    funcionarios = db.query(models.TFuncionario).filter(models.TFuncionario.GRUPO == item.nome_antigo).all()
    if not funcionarios: raise HTTPException(status_code=404, detail="Grupo não encontrado")
    for func in funcionarios: func.GRUPO = item.nome_novo.upper()
    db.commit()
    return {"msg": f"{len(funcionarios)} movidos"}

@app.put("/orcamentos/item/{id}")
def atualizar_item_orcamento(id: int, item: OrcamentoUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.TOrcamentoObra).filter(models.TOrcamentoObra.ID == id).first()
    if not db_item: raise HTTPException(status_code=404, detail="Item não encontrado")
    db_item.QUANTIDADE_PREVISTA = item.QUANTIDADE
    db.commit()
    return {"msg": "Atualizado"}

@app.put("/admin/precos/{id}")
def atualizar_preco(id: int, item: PrecoCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.TItemPreco).filter(models.TItemPreco.ID == id).first()
    if not db_item: raise HTTPException(status_code=404, detail="Não encontrado")
    db_item.CODIGO_ITEM = item.CODIGO_ITEM; db_item.DESCRICAO = item.DESCRICAO; db_item.UNIDADE = item.UNIDADE; db_item.PRECO_UNITARIO = item.PRECO_UNITARIO; db_item.TIPO = item.TIPO
    db.commit()
    return {"msg": "Atualizado"}

@app.put("/admin/atividades/{id}")
def atualizar_atividade(id: int, item: AtividadeCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.TAtividade).filter(models.TAtividade.ID == id).first()
    if not db_item: raise HTTPException(status_code=404, detail="Não encontrada")
    db_item.CODATIVIDADE = item.CODATIVIDADE; db_item.DESCRICAO = item.DESCRICAO; db_item.CONTRATADA = item.CONTRATADA
    db_item.CONTRATANTE = item.CONTRATANTE; db_item.OBJETIVO = item.OBJETIVO; db_item.LOCAL = item.LOCAL
    db_item.FISCAL = item.FISCAL; db_item.TIPO_SERVICO = item.TIPO_SERVICO
    if item.ETAPAS is not None:
        db.query(models.TEtapaObra).filter(models.TEtapaObra.ID_ATIVIDADE == id).delete()
        for index, nome_etapa in enumerate(item.ETAPAS):
            etapa = models.TEtapaObra(ID_ATIVIDADE=id, NOME_ETAPA=nome_etapa.upper(), ORDEM=index + 1, PERCENTUAL=0.0, STATUS="PENDENTE", DATA_INICIO=agora_br(), DATA_FIM=agora_br())
            db.add(etapa)
    db.commit()
    return {"msg": "Atualizado"}

@app.put("/admin/funcionarios/{id}/senha")
def resetar_senha_funcionario(id: int, item: SenhaReset, db: Session = Depends(get_db)):
    func = db.query(models.TFuncionario).filter(models.TFuncionario.ID == id).first()
    if not func: raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    func.SENHA_HASH = gerar_hash_senha(item.NOVA_SENHA)
    db.commit()
    return {"msg": f"Senha de {func.NOME} alterada com sucesso."}

@app.put("/propostas/{id}/status")
def status_proposta(id: int, status: str, db: Session = Depends(get_db)):
    prop = db.query(models.TProposta).filter(models.TProposta.ID == id).first()
    prop.STATUS = status
    db.commit()
    return {"msg": "Status atualizado"}

@app.delete("/orcamentos/item/{id}")
def remover_item_orcamento(id: int, db: Session = Depends(get_db)):
    db.query(models.TOrcamentoObra).filter(models.TOrcamentoObra.ID == id).delete()
    db.commit()
    return {"msg": "Removido"}

@app.delete("/admin/funcionarios/{id}")
def deletar_funcionario(id: int, db: Session = Depends(get_db)):
    db.query(models.TFuncionario).filter(models.TFuncionario.ID == id).delete()
    db.commit()
    return {"msg": "Deletado"}

@app.delete("/admin/atividades/{id}")
def deletar_atividade(id: int, db: Session = Depends(get_db)):
    item = db.query(models.TAtividade).filter(models.TAtividade.ID == id).first()
    if item:
        db.delete(item); db.commit()
        return {"msg": "Removida com sucesso"}
    raise HTTPException(status_code=404, detail="Obra não encontrada")

@app.delete("/admin/precos/{id}")
def deletar_preco(id: int, db: Session = Depends(get_db)):
    db.query(models.TItemPreco).filter(models.TItemPreco.ID == id).delete()
    db.commit()
    return {"msg": "Removido"}

@app.delete("/admin/equipamentos/{id}")
def deletar_equipamento(id: int, db: Session = Depends(get_db)):
    db.query(models.TEquipamento).filter(models.TEquipamento.ID == id).delete()
    db.commit()
    return {"msg": "Deletado"}

@app.delete("/propostas/item/{id_item}")
def del_item_proposta(id_item: int, db: Session = Depends(get_db)):
    item = db.query(models.TPropostaItem).filter(models.TPropostaItem.ID == id_item).first()
    if not item: raise HTTPException(404, "Item não encontrado")
    prop = db.query(models.TProposta).filter(models.TProposta.ID == item.ID_PROPOSTA).first()
    prop.VALOR_TOTAL -= item.SUBTOTAL
    db.delete(item)
    db.commit()
    return {"msg": "Removido"}

@app.get("/rdo/{rdo_id}/pdf")
def baixar_pdf_rdo(rdo_id: int, db: Session = Depends(get_db)):
    rdo = db.query(models.TServico).filter(models.TServico.ID == rdo_id).first()
    if not rdo: raise HTTPException(status_code=404, detail="RDO não encontrado")
    
    obra = db.query(models.TAtividade).filter(models.TAtividade.ID == rdo.CODATIVIDADE).first()
    
    data_rdo = rdo.DATAINICIO.date()
    etapas_ids = [e.ID for e in obra.etapas] if obra else []
    
    eventos_timeline = []
    if etapas_ids:
        eventos_timeline = db.query(models.TRDO_Detalhado).filter(
            models.TRDO_Detalhado.ID_ETAPA.in_(etapas_ids),
            cast(models.TRDO_Detalhado.DATA_HORA_REGISTRO, Date) == data_rdo
        ).all()

    pdf_buffer = desenhar_pdf(rdo, obra, eventos_timeline)
    
    data_str = rdo.DATAINICIO.strftime('%Y%m%d')
    nome_arquivo = f"RDO_{rdo_id}_{data_str}.pdf"
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"})

@app.get("/rdos")
def listar_todos_rdos(db: Session = Depends(get_db)):
    lista = db.query(models.TServico).order_by(desc(models.TServico.DATAINICIO)).limit(200).all()
    resultado = []
    for rdo in lista:
        obra = db.query(models.TAtividade).filter(models.TAtividade.ID == rdo.CODATIVIDADE).first()
        nome_obra = obra.DESCRICAO if obra else "Obra não encontrada"
        
        data_fmt = rdo.DATAINICIO if rdo.DATAINICIO else datetime.now()

        resultado.append({
            "ID": rdo.ID, "DATA": data_fmt, "OBRA": nome_obra, "STATUS": rdo.STATUS_DIA, "DESCRICAO": rdo.DESCRICAO
        })
    return resultado

@app.get("/orcamentos/{id_atividade}/pdf")
def baixar_pdf_orcamento(id_atividade: int, db: Session = Depends(get_db)):
    obra = db.query(models.TAtividade).filter(models.TAtividade.ID == id_atividade).first()
    if not obra: raise HTTPException(404, "Obra não encontrada")
    itens_db = db.query(models.TOrcamentoObra).filter_by(ID_ATIVIDADE=id_atividade).all()
    lista_itens = []
    for i in itens_db:
        if not i.item_preco: continue
        total = float(i.QUANTIDADE_PREVISTA) * float(i.item_preco.PRECO_UNITARIO)
        lista_itens.append({ "CODIGO": i.item_preco.CODIGO_ITEM, "DESCRICAO": i.item_preco.DESCRICAO, "UNIDADE": i.item_preco.UNIDADE, "TIPO": i.item_preco.TIPO, "QTD": i.QUANTIDADE_PREVISTA, "UNITARIO": i.item_preco.PRECO_UNITARIO, "TOTAL": total })
    pdf_buffer = desenhar_orcamento(obra, lista_itens)
    nome_arquivo = f"Orcamento_{obra.CODATIVIDADE}.pdf"
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={nome_arquivo}"})
