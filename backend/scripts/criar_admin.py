import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.db.session import SessionLocal, engine
from src.infrastructure.db.models import Base, TFuncionario
from src.auth import gerar_hash_senha

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Cria usuário Admin Padrão
cpf_admin = "00000000000"
existe = db.query(TFuncionario).filter_by(CPF=cpf_admin).first()

if not existe:
    admin = TFuncionario(
        NOME="ADMINISTRADOR",
        FUNCAO="DIRETOR",
        CPF=cpf_admin,
        MATRICULA="ADMIN",
        PERFIL="ADMIN",
        SENHA_HASH=gerar_hash_senha("admin123"), 
        STATUS=1
    )
    db.add(admin)
    db.commit()
    print("✅ Usuário ADMIN criado!")
    print(f"Login: {cpf_admin} (ou ADMIN)")
    print("Senha: admin123")
else:
    print("⚠️ Admin já existe.")

db.close()
