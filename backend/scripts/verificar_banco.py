import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.db.session import SessionLocal
from src.infrastructure.db import models

def checar():
    db = SessionLocal()
    
    print("--- DIAGNÓSTICO DO BANCO DE DADOS ---")
    
    qtd_obras = db.query(models.TAtividade).count()
    print(f"Obras cadastradas: {qtd_obras}")
    if qtd_obras > 0:
        obra = db.query(models.TAtividade).first()
        print(f"   Exemplo: {obra.DESCRICAO} (ID: {obra.ID})")
    else:
        print("Nenhuma obra! O Frontend vai ficar vazio.")

    qtd_precos = db.query(models.TItemPreco).count()
    print(f"Itens de Preço: {qtd_precos}")
    if qtd_precos > 0:
        item = db.query(models.TItemPreco).first()
        print(f"   Exemplo: {item.CODIGO_ITEM} - {item.DESCRICAO}")
    else:
        print("   ⚠️ Nenhum preço! O CSV não foi lido corretamente.")

    db.close()

if __name__ == "__main__":
    checar()
