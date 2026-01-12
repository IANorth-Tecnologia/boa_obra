import csv
import sys
import os

# Ajusta o caminho para encontrar o 'src'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.db.session import engine, SessionLocal
from src.infrastructure.db import models

def setup_total():
    # 1. Recria as tabelas (Garante estrutura nova)
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    print("🚀 INICIANDO SETUP DO BANCO DE DADOS...")

    # --- PASSO A: CRIAR DADOS BÁSICOS (OBRA) ---
    print("\n🏗️  Verificando Obras...")
    if not db.query(models.TAtividade).first():
        try:
            # Cria Local
            local = models.TLocalServico(DESCRICAO="Sede IANorth")
            db.add(local)
            db.flush()
            
            # Cria Contratante
            cliente = models.TContratante(
                RESPONSAVELCONTRATANTE="Gestão Sinobras", 
                AREA_CONTRATANTE="Engenharia"
            )
            db.add(cliente)
            db.flush()

            # Cria Obra
            obra = models.TAtividade(
                CODLOCALSERVICO=local.ID,
                CODRESPONSAVEL=cliente.CODRESPONSAVEL,
                CODATIVIDADE="OBRA-001",
                DESCRICAO="Manutenção Geral - Pátio Sucata",
                DATA_ABERTURA="2024-01-01",
                STATUSATIVIDADE=1
            )
            db.add(obra)
            db.commit()
            print("   ✅ Obra de Teste criada com sucesso!")
        except Exception as e:
            print(f"   ❌ Erro ao criar obra: {e}")
            db.rollback()
    else:
        print("   ℹ️  Obras já existem.")

    # --- PASSO B: IMPORTAR CSV (COM DEBUG) ---
    arquivo_csv = "Mapa de Preços.CSV"
    print(f"\n💰 Importando Preços de: {arquivo_csv}")
    
    if not os.path.exists(arquivo_csv):
        print(f"   ❌ ERRO: Arquivo '{arquivo_csv}' não encontrado na pasta backend.")
        return

    try:
        # Tenta encoding 'utf-8-sig' (Excel moderno) e 'latin-1' (Excel antigo)
        try:
            f = open(arquivo_csv, mode='r', encoding='utf-8-sig')
            f.readline() # Teste de leitura
            f.seek(0)
        except:
            f = open(arquivo_csv, mode='r', encoding='latin-1')

        # Detecta delimitador (; ou ,)
        sample = f.read(2048)
        f.seek(0)
        sniffer = csv.Sniffer()
        try:
            dialect = sniffer.sniff(sample)
        except:
            dialect = 'excel' # Fallback
            
        reader = csv.DictReader(f, dialect=dialect)
        
        # --- DEBUG CRÍTICO: MOSTRA AS COLUNAS ---
        print(f"   🔎 COLUNAS ENCONTRADAS NO ARQUIVO: {reader.fieldnames}")
        print("   ---------------------------------------------------")

        contador = 0
        for row in reader:
            # Normaliza chaves (tudo maiúsculo e sem espaço extra)
            row_clean = {k.strip().upper(): v for k, v in row.items() if k}
            
            # TENTA ENCONTRAR OS CAMPOS COM VARIAS OPÇÕES DE NOME
            codigo = row_clean.get('CODIGO') or row_clean.get('ITEM') or row_clean.get('CÓDIGO') or row_clean.get('COD')
            desc = row_clean.get('DESCRICAO') or row_clean.get('SERVICO') or row_clean.get('DESCRIÇÃO') or row_clean.get('NOME')
            unid = row_clean.get('UNID') or row_clean.get('UNIDADE') or 'UN'
            
            preco_raw = (
                row_clean.get('PRECO_UNITARIO') or 
                row_clean.get('PRECO') or 
                row_clean.get('V. UNIT') or 
                row_clean.get('VALOR') or '0'
            )

            if codigo and desc:
                # Limpa valor R$ 1.200,50 -> 1200.50
                preco_str = str(preco_raw).replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
                try:
                    preco = float(preco_str)
                except:
                    preco = 0.0

                # Salva
                existe = db.query(models.TItemPreco).filter_by(CODIGO_ITEM=codigo).first()
                if not existe:
                    novo = models.TItemPreco(
                        CODIGO_ITEM=codigo,
                        DESCRICAO=desc,
                        UNIDADE=unid,
                        PRECO_UNITARIO=preco
                    )
                    db.add(novo)
                    contador += 1
        
        db.commit()
        print(f"   ✅ Importação finalizada! {contador} itens novos inseridos.")
        f.close()

    except Exception as e:
        print(f"   ❌ Erro na leitura do CSV: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    setup_total()
