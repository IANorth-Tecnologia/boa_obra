import csv
import sys
import os

# Ajusta o caminho para o projeto
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.db.session import SessionLocal
from src.infrastructure.db import models

def importar_precos():
    db = SessionLocal()
    
    # Lista de nomes possíveis (incluindo o original)
    nomes_possiveis = [
        "precos.csv", 
        "Mapa de Preços.CSV", 
        "Mapa de Preços.csv",
        "Mapa de Preços.CSV" # Variação de caracteres Mac/Windows
    ]
    
    arquivo_encontrado = None
    # Procura na pasta atual e na pasta backend/
    caminhos_busca = ["backend/", "scripts/", "./"] 

    for nome in nomes_possiveis:
        if os.path.exists(nome):
            arquivo_encontrado = nome
            break
        # Tenta procurar dentro da pasta backend se estiver rodando da raiz
        if os.path.exists(os.path.join("backend", nome)):
            arquivo_encontrado = os.path.join("backend", nome)
            break

    if not arquivo_encontrado:
        print(f"❌ ERRO: Nenhum arquivo encontrado.")
        print(f"   Procuramos por: {nomes_possiveis}")
        print("   -> Verifique se o arquivo 'Mapa de Preços.CSV' está na pasta backend.")
        return

    print(f"🚀 INICIANDO IMPORTAÇÃO: {arquivo_encontrado}")

    try:
        # Tenta descobrir o encoding (UTF-8 ou Latin-1)
        linhas = []
        encoding_usado = ''
        
        for enc in ['utf-8-sig', 'latin-1', 'cp1252']:
            try:
                with open(arquivo_encontrado, mode='r', encoding=enc) as f:
                    linhas = f.readlines()
                    encoding_usado = enc
                break
            except UnicodeDecodeError:
                continue
        
        if not linhas:
            print("❌ Erro de Encoding: Não foi possível ler o arquivo.")
            return

        # Detectar separador (; ou ,)
        if ';' in linhas[0]: separador = ';'
        else: separador = ','
            
        reader = csv.DictReader(linhas, delimiter=separador)
        
        # Limpa espaços nos nomes das colunas
        if reader.fieldnames:
            reader.fieldnames = [name.strip() for name in reader.fieldnames]
        
        print(f"   📄 Lendo com {encoding_usado} (Separador: '{separador}')")
        
        novos = 0
        atualizados = 0

        for row in reader:
            # Busca colunas flexíveis
            codigo = row.get('Cód.', '').strip() or row.get('Código', '').strip() or row.get('CÃ³d.', '').strip()
            descricao = row.get('Item', '').strip() or row.get('Descrição', '').strip() or row.get('Especificação em Português', '').strip()
            unidade = row.get('Unidade', 'UN').strip()
            valor_str = row.get('VALOR', '0').strip()

            if not codigo or len(codigo) < 2 or 'R$' not in valor_str:
                continue

            # Converte Valor (R$ 1.200,00 -> 1200.00)
            try:
                valor_limpo = valor_str.replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
                preco = float(valor_limpo)
            except:
                continue

            # Define TIPO padrão como MATERIAL (pode ser alterado na tela depois)
            tipo_item = "MATERIAL" 

            # Banco de Dados
            existente = db.query(models.TItemPreco).filter(models.TItemPreco.CODIGO_ITEM == codigo).first()
            
            if not existente:
                novo = models.TItemPreco(
                    CODIGO_ITEM=codigo,
                    DESCRICAO=descricao,
                    UNIDADE=unidade,
                    PRECO_UNITARIO=preco,
                    TIPO=tipo_item # <--- Novo campo preenchido
                )
                db.add(novo)
                novos += 1
                print(f"      [+] {codigo} - R$ {preco}")
            else:
                existente.DESCRICAO = descricao
                existente.PRECO_UNITARIO = preco
                # existente.TIPO = tipo_item (Opcional: não sobrescrever se já foi editado manualmente)
                atualizados += 1
        
        db.commit()
        print("-" * 40)
        print(f"✅ IMPORTAÇÃO CONCLUÍDA!")
        print(f"🆕 Novos: {novos}")
        print(f"🔄 Atualizados: {atualizados}")

    except Exception as e:
        print(f"❌ Erro crítico: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    importar_precos()
