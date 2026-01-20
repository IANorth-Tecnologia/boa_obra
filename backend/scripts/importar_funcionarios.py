import sys
import os
import csv
from typing import List

# Ajusta o caminho para o projeto (assume que o script está na pasta scripts/)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.db.session import SessionLocal
from src.infrastructure.db import models
from src.auth import gerar_hash_senha # <--- IMPORTANTE: Importa a criptografia

# --- CONFIGURAÇÕES ---
SENHA_PADRAO = "Ia@nort!01"
PERFIL_PADRAO = "COLABORADOR"
GRUPO_PADRAO = "GERAL"

# Tenta importar openpyxl (para ler Excel)
try:
    import openpyxl
    TEM_OPENPYXL = True
except ImportError:
    TEM_OPENPYXL = False

def limpar_cpf(cpf_raw):
    """Remove pontos e traços do CPF para salvar limpo no banco"""
    if not cpf_raw: return ""
    return str(cpf_raw).replace('.', '').replace('-', '').strip()

def ler_arquivo_excel(caminho):
    print("   📊 Tentando ler como EXCEL (.xlsx)...")
    try:
        wb = openpyxl.load_workbook(caminho, data_only=True)
        ws = wb.active
        linhas = []
        for row in ws.iter_rows(values_only=True):
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
                # Tenta detectar separador
                separador = ';' if ';' in conteudo[0] else ','
                if len(conteudo) > 2 and ',' in conteudo[2] and separador == ';': separador = ',' # Fallback
                
                linhas = []
                for linha in conteudo:
                    # Remove aspas extras que o CSV as vezes coloca
                    linhas.append([c.strip().replace('"','') for c in linha.split(separador)])
                
                print(f"   ✅ CSV lido com encoding {enc} e separador '{separador}'")
                return linhas
        except:
            continue
    return None

def importar_equipe():
    db = SessionLocal()
    
    # Adicionei o nome do seu arquivo aqui na lista
    arquivos_possiveis = [
        "LAMINADOR II.xlsx - Planilha1.csv", 
        "funcionarios.xlsx", 
        "funcionarios.csv"
    ]
    
    arquivo_alvo = None
    dir_atual = os.path.dirname(os.path.abspath(__file__))

    for arq in arquivos_possiveis:
        caminho_completo = os.path.join(dir_atual, arq)
        if os.path.exists(caminho_completo):
            arquivo_alvo = caminho_completo
            break
    
    if not arquivo_alvo:
        print(f"❌ ERRO: Nenhum arquivo encontrado na pasta {dir_atual}")
        return

    print(f"🚀 INICIANDO IMPORTAÇÃO: {arquivo_alvo}")
    
    dados = None
    if TEM_OPENPYXL and arquivo_alvo.endswith('.xlsx'):
        dados = ler_arquivo_excel(arquivo_alvo)
    
    if not dados:
        dados = ler_arquivo_csv(arquivo_alvo)

    if not dados:
        print("❌ FALHA CRÍTICA: Não foi possível ler o arquivo.")
        return

    # --- PROCESSAMENTO ---
    print("   ⚙️ Processando colunas...")
    
    idx_nome = -1
    idx_cpf = -1
    idx_funcao = -1
    inicio_dados = 0

    # Procura cabeçalho inteligente
    for i, linha in enumerate(dados):
        colunas_upper = [str(c).upper().strip() for c in linha]
        
        # Procura por NOME e (CPF ou COLABORADOR)
        if ("NOME" in colunas_upper or "COLABORADOR" in colunas_upper) and "CPF" in colunas_upper:
            print(f"   ✅ Cabeçalho encontrado na linha {i+1}: {colunas_upper}")
            
            try: idx_nome = colunas_upper.index("NOME")
            except: idx_nome = colunas_upper.index("COLABORADOR")
            
            idx_cpf = colunas_upper.index("CPF")
            
            # Tenta achar função, se não tiver usa padrão
            try: idx_funcao = colunas_upper.index("FUNÇÃO")
            except: 
                try: idx_funcao = colunas_upper.index("FUNCAO")
                except: idx_funcao = -1

            inicio_dados = i + 1
            break
    
    if idx_nome == -1 or idx_cpf == -1:
        print("❌ ERRO: Colunas 'COLABORADOR/NOME' e 'CPF' são obrigatórias.")
        return

    novos = 0
    atualizados = 0

    # Gera o hash da senha padrão uma vez só para ganhar performance
    senha_hash_padrao = gerar_hash_senha(SENHA_PADRAO)

    for linha in dados[inicio_dados:]:
        if len(linha) <= max(idx_nome, idx_cpf): continue
        
        nome = linha[idx_nome].strip().upper()
        cpf_sujo = linha[idx_cpf].strip()
        
        if len(nome) < 3 or len(cpf_sujo) < 5: continue 

        cpf = limpar_cpf(cpf_sujo)
        
        # Define a função (cargo)
        funcao = "OPERACIONAL"
        if idx_funcao != -1 and len(linha) > idx_funcao:
            f = linha[idx_funcao].strip().upper()
            if f: funcao = f

        # Busca por CPF (é mais seguro que nome)
        existente = db.query(models.TFuncionario).filter(models.TFuncionario.CPF == cpf).first()
        
        if not existente:
            # CRIAR NOVO
            novo = models.TFuncionario(
                NOME=nome, 
                CPF=cpf,
                MATRICULA="", 
                FUNCAO=funcao, 
                SENHA_HASH=senha_hash_padrao, # <--- AQUI A MÁGICA
                PERFIL=PERFIL_PADRAO,
                GRUPO=GRUPO_PADRAO,
                STATUS=1
            )
            db.add(novo)
            novos += 1
            print(f"      [+] Criando: {nome}")
        else:
            # ATUALIZAR EXISTENTE (Reseta senha e atualiza nome/cargo)
            mudou = False
            if existente.SENHA_HASH != senha_hash_padrao:
                existente.SENHA_HASH = senha_hash_padrao
                mudou = True
            
            if existente.NOME != nome:
                existente.NOME = nome
                mudou = True
                
            if mudou:
                atualizados += 1
                print(f"      [~] Atualizando: {nome}")

    db.commit()
    print("-" * 40)
    print(f"✅ IMPORTAÇÃO CONCLUÍDA!")
    print(f"🆕 Novos Cadastros: {novos}")
    print(f"🔄 Atualizados (Senha Resetada): {atualizados}")
    db.close()

if __name__ == "__main__":
    importar_equipe()
