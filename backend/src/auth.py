from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY = "sua_chave_secreta_super_segura_aqui" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_senha(senha_simples, senha_hash):
    """Verifica se a senha digitada bate com o hash salvo."""
    return pwd_context.verify(senha_simples, senha_hash)

def gerar_hash_senha(senha):
    """Gera um hash seguro da senha para salvar no banco."""
    return pwd_context.hash(senha)

def criar_token_acesso(data: dict):
    """Gera o token JWT usando a SECRET_KEY."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
