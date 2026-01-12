import sys
import os

# Adiciona o diretório pai ao path para conseguir importar do 'src'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.db.session import SessionLocal, engine
from src.infrastructure.db.models import Base, TEquipamento

# Garante que as tabelas existem
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Lista inicial de equipamentos comuns em obra
lista_basica = [
    "BETONEIRA 400L",
    "ANDAIME TUBULAR 1.0X1.0",
    "ANDAIME TUBULAR 1.5X1.5",
    "MARTELETE ROMPEDOR 10KG",
    "MARTELETE ROMPEDOR 30KG",
    "FURADEIRA DE IMPACTO",
    "PARAFUSADEIRA A BATERIA",
    "ESMERILHADEIRA 4.5 POL",
    "ESMERILHADEIRA 7 POL",
    "SERRA CIRCULAR MANUAL",
    "SERRA MÁRMORE (MAKITA)",
    "SERRA TICO-TICO",
    "COMPACTADOR DE SOLO (SAPO)",
    "PLACA VIBRATÓRIA",
    "VIBRADOR DE CONCRETO",
    "MANGOTE DE VIBRAÇÃO",
    "NÍVEL A LASER",
    "NÍVEL ÓPTICO",
    "TEODOLITO / ESTAÇÃO TOTAL",
    "GERADOR DE ENERGIA 5KVA",
    "GERADOR DE ENERGIA 10KVA",
    "BOMBA SUBMERSÍVEL (LAMA)",
    "CAMINHÃO MUNCK",
    "CAMINHÃO BASCULANTE",
    "RETROESCAVADEIRA",
    "MINI CARREGADEIRA (BOBCAT)",
    "GUINCHO DE COLUNA",
    "MÁQUINA DE SOLDA INVERSORA",
    "LIXADEIRA ORBITAL",
    "EXTENSÃO ELÉTRICA INDUSTRIAL",
    "ESCADA DE ALUMÍNIO EXTENSIVA",
    "CARRINHO DE MÃO"
]

print("--- IMPORTANDO EQUIPAMENTOS BÁSICOS ---")

count = 0
for item in lista_basica:
    # Verifica se já existe para não duplicar
    exists = db.query(TEquipamento).filter_by(DESCRICAO=item).first()
    
    if not exists:
        novo = TEquipamento(DESCRICAO=item)
        db.add(novo)
        print(f"✅ Adicionado: {item}")
        count += 1
    else:
        print(f"⚠️  Já existe: {item}")

db.commit()
db.close()
print(f"\n--- SUCESSO! {count} EQUIPAMENTOS IMPORTADOS ---")
