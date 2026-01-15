import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.infrastructure.db.session import SessionLocal
from src.infrastructure.db.models import TEtapaPadrao, TServicoPadrao

def criar_catalogo_padrao():
    db = SessionLocal()
    print("🚀 Iniciando criação do Catálogo de Serviços Padrão...")

    estrutura = {
        "1. Mobilização": [
            "Transporte de Equipe", "Montagem de Canteiro", "DDS Inicial", "Integração", "Deslocamento"
        ],
        "2. Infraestrutura Seca": [
            "Instalação de Eletrocalhas", "Instalação de Eletrodutos", "Instalação de Perfilados", 
            "Instalação de Leitos", "Fixação de Caixas de Passagem", "Furação de Laje/Parede"
        ],
        "3. Cabeamento Estruturado": [
            "Lançamento de Cabos UTP", "Lançamento de Fibra Óptica", "Lançamento de Cabos Telefonia",
            "Organização de Rack", "Montagem de Patch Panel", "Conectorização RJ45 (Fêmea/Macho)"
        ],
        "4. Elétrica": [
            "Passagem de Cabos Elétricos", "Montagem de Quadros", "Instalação de Tomadas", 
            "Infraestrutura Elétrica (Eletrodutos)", "Iluminação"
        ],
        "5. Identificação": [
            "Tagueamento de Cabos", "Identificação de Tomadas/Espelhos", 
            "Etiquetagem de Patch Panel", "Elaboração de Mapa de Rede"
        ],
        "6. Equipamentos": [
            "Fixação de APs (Access Points)", "Instalação de Câmeras (CFTV)", 
            "Instalação de Sensores", "Instalação de Ativos de Rede (Switches/Roteadores)",
            "Instalação de Nobreaks"
        ],
        "7. Certificação e Testes": [
            "Teste de Fluke (Certificação de Pontos)", "Teste de Fibra (OTDR/Power Meter)", 
            "Relatório Fotográfico", "Testes de Continuidade Elétrica"
        ],
        "8. Desmobilização": [
            "Limpeza da Obra", "Retirada de Ferramentas/Sobras", 
            "Entrega Técnica", "As-Built (Documentação Final)"
        ]
    }

    ordem = 1
    total_etapas = 0
    total_servicos = 0

    for nome_etapa, lista_servicos in estrutura.items():
        etapa = db.query(TEtapaPadrao).filter(TEtapaPadrao.NOME == nome_etapa).first()
        if not etapa:
            etapa = TEtapaPadrao(NOME=nome_etapa, ORDEM=ordem)
            db.add(etapa)
            db.commit()
            db.refresh(etapa)
            total_etapas += 1
            print(f"   [+] Nova Etapa: {nome_etapa}")
        
        for nome_servico in lista_servicos:
            servico = db.query(TServicoPadrao).filter(
                TServicoPadrao.NOME == nome_servico, 
                TServicoPadrao.ETAPA_ID == etapa.ID
            ).first()
            
            if not servico:
                novo_servico = TServicoPadrao(NOME=nome_servico, ETAPA_ID=etapa.ID, UNIDADE="Und")
                db.add(novo_servico)
                total_servicos += 1
        
        ordem += 1

    db.commit()
    print("-" * 40)
    print(f"✅ Sucesso! {total_etapas} etapas e {total_servicos} serviços adicionados ao catálogo.")
    db.close()

if __name__ == "__main__":
    criar_catalogo_padrao()
