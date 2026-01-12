import sys
import os
import csv
from typing import List

# Ajusta o caminho para o projeto
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.db.session import SessionLocal
from src.infrastructure.db import models

# Tenta importar openpyxl (para ler Excel)
try:
    import openpyxl
    TEM_OPENPYXL = True
except ImportError:
    TEM_OPENPYXL = False

def ler_arquivo_excel(caminho):
    print("   📊 Tentando ler como EXCEL (.xlsx)...")
    try:
        wb = openpyxl.load_workbook(caminho, data_only=True)
        ws = wb.active
        linhas = []
        for row in ws.iter_rows(values_only=True):
            # Converte tudo para string e substitui None por ''
            linhas.append([str(cell).strip() if cell is not None else '' for cell in row])
        print("   ✅ Arquivo Excel lido com sucesso!")
        return linhas
    except Exception as e:
        print(f"   ⚠️ Não é um Excel válido ou erro de leitura: {e}")
        return None

def ler_arquivo_csv(caminho):
    print("   📄 Tentando ler como CSV (Texto)...")
    encodings = ['utf-8-sig', 'latin-1', 'cp1252']
    
    for enc in encodings:
        try:
            with open(caminho, 'r', encoding=enc) as f:
                conteudo = f.readlines()
                # Tenta detectar separador na primeira linha
                if ';' in conteudo[0]: separador = ';'
                else: separador = ','
                
                linhas = []
                for linha in conteudo:
                    linhas.append([c.strip().replace('"','') for c in linha.split(separador)])
                
                print(f"   ✅ CSV lido com encoding {enc} e separador '{separador}'")
                return linhas
        except:
            continue
    return None

def importar_equipe():
    db = SessionLocal()
    # Tenta achar o arquivo com extensão correta ou o renomeado
    arquivos_possiveis = ["funcionarios.xlsx", "funcionarios.csv", "Planilha funcionarios.xlsx"]
    arquivo_alvo = None
    
    for arq in arquivos_possiveis:
        if os.path.exists(arq):
            arquivo_alvo = arq
            break
    
    if not arquivo_alvo:
        print(f"❌ ERRO: Nenhum arquivo encontrado ({arquivos_possiveis})")
        return

    print(f"🚀 INICIANDO IMPORTAÇÃO: {arquivo_alvo}")
    
    dados = None
    
    # 1. Tenta ler como Excel (Se tiver a lib instalada)
    if TEM_OPENPYXL:
        dados = ler_arquivo_excel(arquivo_alvo)
    else:
        print("   ℹ️ Biblioteca 'openpyxl' não instalada. Pulando tentativa de Excel.")

    # 2. Se falhou (ou não é excel), tenta CSV
    if not dados:
        dados = ler_arquivo_csv(arquivo_alvo)

    if not dados:
        print("❌ FALHA CRÍTICA: Não foi possível ler o arquivo.")
        return

    # --- PROCESSAMENTO DOS DADOS ---
    print("   ⚙️ Processando colunas...")
    
    cabecalho = []
    idx_nome = -1
    idx_funcao = -1
    inicio_dados = 0

    # Procura cabeçalho
    for i, linha in enumerate(dados):
        colunas_upper = [str(c).upper().strip() for c in linha]
        
        if "NOME" in colunas_upper and ("FUNÇÃO" in colunas_upper or "FUNCAO" in colunas_upper):
            cabecalho = colunas_upper
            idx_nome = colunas_upper.index("NOME")
            try: idx_funcao = colunas_upper.index("FUNÇÃO")
            except: idx_funcao = colunas_upper.index("FUNCAO")
            inicio_dados = i + 1
            print(f"   ✅ Cabeçalho encontrado na linha {i+1}")
            break
    
    if idx_nome == -1:
        print("❌ ERRO: Colunas 'NOME' e 'FUNÇÃO' não encontradas.")
        return

    novos = 0
    atualizados = 0

    for linha in dados[inicio_dados:]:
        # Pula linhas incompletas
        if len(linha) <= max(idx_nome, idx_funcao): continue
        
        nome = linha[idx_nome].strip()
        funcao = linha[idx_funcao].strip()

        if len(nome) < 3: continue # Ignora nomes muito curtos ou vazios

        # Banco de Dados
        existente = db.query(models.TFuncionario).filter(models.TFuncionario.NOME == nome).first()
        
        if not existente:
            novo = models.TFuncionario(NOME=nome, FUNCAO=funcao or "Operacional", STATUS=1)
            db.add(novo)
            novos += 1
            print(f"      [+] {nome}")
        else:
            if existente.FUNCAO != funcao and funcao:
                existente.FUNCAO = funcao
                atualizados += 1

    db.commit()
    print("-" * 40)
    print(f"✅ IMPORTAÇÃO CONCLUÍDA!")
    print(f"🆕 Novos: {novos}")
    print(f"🔄 Atualizados: {atualizados}")
    db.close()

if __name__ == "__main__":
    importar_equipe()
