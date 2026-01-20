from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from io import BytesIO
from PIL import Image
import os

def desenhar_pdf(rdo, obra, eventos_timeline=[]):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    AZUL_ESCURO = colors.HexColor("#1e3a8a")
    CINZA_CLARO = colors.HexColor("#f3f4f6")
    CINZA_BORDA = colors.HexColor("#d1d5db")
    LARANJA = colors.HexColor("#f97316")
    
    y = height - 40 

    try:
        logo_path = os.path.join(os.path.dirname(__file__), "../../../assets/IanorthLog.png")
        if os.path.exists(logo_path):
            img = ImageReader(logo_path)
            iw, ih = img.getSize()
            aspect = iw / ih
            c.drawImage(img, 10, y - 20, width=20*aspect, height=20, mask='auto')
    except: pass  

    c.setFillColor(AZUL_ESCURO)
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, y - 20, "RELATÓRIO DIÁRIO DE OBRA")
    
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 10)
    data_fmt = rdo.DATAINICIO.strftime('%d/%m/%Y')
    c.drawRightString(width - 30, y - 15, f"RDO Nº: {rdo.ID:04d}")
    c.drawRightString(width - 30, y - 30, f"DATA: {data_fmt}")
    
    c.setFillColor(LARANJA if rdo.STATUS_DIA == 'EM ANDAMENTO' else (colors.green if rdo.STATUS_DIA == 'CONCLUIDO' else colors.red))
    c.rect(width - 130, y - 55, 100, 18, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width - 80, y - 50, rdo.STATUS_DIA or "STATUS N/A")

    y -= 70 

    c.setStrokeColor(AZUL_ESCURO)
    c.setLineWidth(1)
    c.line(30, y, width - 30, y)
    y -= 15

    def draw_data_row(label1, val1, label2=None, val2=None, current_y=0):
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(30, current_y, f"{label1}:")
        c.setFont("Helvetica", 8)
        c.drawString(100, current_y, str(val1 or "---")[:55])
        if label2:
            c.setFont("Helvetica-Bold", 8)
            c.drawString(320, current_y, f"{label2}:")
            c.setFont("Helvetica", 8)
            c.drawString(380, current_y, str(val2 or "---")[:40])
        return current_y - 12

    if obra:
        y = draw_data_row("OBRA", f"{obra.CODATIVIDADE} - {obra.DESCRICAO}", "LOCAL", obra.LOCAL, y)
        y = draw_data_row("CONTRATANTE", obra.CONTRATANTE, "CONTRATADA", obra.CONTRATADA, y)
        y = draw_data_row("OBJETIVO", obra.OBJETIVO, "FISCAL", obra.FISCAL, y)
    else:
        y = draw_data_row("OBRA", "Dados da obra não encontrados", current_y=y)

    y -= 5
    c.setStrokeColor(CINZA_BORDA)
    c.line(30, y, width - 30, y)
    y -= 20

    def check_page(current_y, needed=50):
        if current_y < needed:
            c.showPage()
            return height - 50
        return current_y

    # 1. EQUIPE
    indiretos = []
    diretos = []
    if rdo.efetivo:
        for ef in rdo.efetivo:
            texto = ef.FUNCAO or ""
            nome_limpo = texto.replace("[IND]", "").replace("[DIR]", "").strip()
            item = {"nome": nome_limpo}
            if "[IND]" in texto: indiretos.append(item)
            else: diretos.append(item)

    y = check_page(y, 100)
    c.setFillColor(AZUL_ESCURO)
    c.rect(30, y, width-60, 20, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y + 6, "1. EFETIVO / MÃO DE OBRA")
    y -= 20

    if indiretos:
        y -= 10
        c.setFillColor(colors.black); c.setFont("Helvetica-Bold", 9)
        c.drawString(30, y, "1.1 Equipe Indireta (Gestão & Apoio)")
        y -= 15; c.setFont("Helvetica", 8)
        for ind in indiretos:
            y = check_page(y)
            c.drawString(40, y, f"• {ind['nome']}")
            c.setStrokeColor(CINZA_CLARO); c.line(40, y-2, width-40, y-2)
            y -= 12

    if diretos:
        y -= 10
        c.setFillColor(colors.black); c.setFont("Helvetica-Bold", 9)
        c.drawString(30, y, "1.2 Equipe Direta (Execução)")
        y -= 15; c.setFont("Helvetica", 8)
        for dir in diretos:
            y = check_page(y)
            c.drawString(40, y, f"• {dir['nome']}")
            c.setStrokeColor(CINZA_CLARO); c.line(40, y-2, width-40, y-2)
            y -= 12

    # 2. EQUIPAMENTOS
    if rdo.equipamentos:
        y -= 15
        y = check_page(y, 60)
        c.setFillColor(AZUL_ESCURO)
        c.rect(30, y, width-60, 20, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(40, y + 6, "2. EQUIPAMENTOS UTILIZADOS")
        y -= 20
        c.setFillColor(colors.black); c.setFont("Helvetica", 8)
        for eq in rdo.equipamentos:
            y = check_page(y)
            c.drawString(40, y, f"• {eq.DESCRICAO}")
            c.drawRightString(width-40, y, f"{eq.QUANTIDADE} un.")
            c.setStrokeColor(CINZA_CLARO); c.line(40, y-2, width-40, y-2)
            y -= 12

    # 3. ATIVIDADES
    def draw_text_block(titulo, texto, current_y):
        current_y -= 15
        current_y = check_page(current_y, 80)
        c.setFillColor(AZUL_ESCURO)
        c.rect(30, current_y, width-60, 20, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(40, current_y + 6, titulo)
        current_y -= 20
        c.setFillColor(colors.black); c.setFont("Helvetica", 9)
        
        text_obj = c.beginText(40, current_y - 10)
        text_obj.setFont("Helvetica", 9)
        text_obj.setLeading(12)
        
        conteudo = str(texto or "Nada a declarar.")
        paragrafos = conteudo.split('\n')
        
        for paragrafo in paragrafos:
            words = paragrafo.split(' ')
            line = ""
            for word in words:
                if len(line + word) < 95: line += word + " "
                else:
                    text_obj.textLine(line)
                    current_y -= 12
                    line = word + " "
            text_obj.textLine(line) 
            current_y -= 12
            
        c.drawText(text_obj)
        return current_y - 10

    y = draw_text_block("3. DESCRIÇÃO DAS ATIVIDADES EXECUTADAS", rdo.DESCRICAO, y)

    # 4. CLIMA E OBSERVAÇÕES
    y -= 15; y = check_page(y, 100)
    c.setFillColor(AZUL_ESCURO)
    c.rect(30, y, width-60, 20, fill=1, stroke=0)
    c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y + 6, "4. CLIMA, CONDIÇÕES E OBSERVAÇÕES")
    y -= 30

    raw_nota = rdo.NOTA or ""
    clima_manha = "N/A"; clima_tarde = "N/A"; cond_area = "N/A"; obs_texto = raw_nota 

    if "CLIMA:" in raw_nota and "OBS:" in raw_nota:
        try:
            parts = raw_nota.split("OBS:")
            obs_texto = parts[1].strip() or "Sem observações adicionais."
            meta = parts[0]
            if "ÁREA:" in meta:
                meta_parts = meta.split("ÁREA:")
                cond_area = meta_parts[1].replace(".", "").strip()
                clima_part = meta_parts[0].replace("CLIMA:", "").strip()
                if "/T:" in clima_part:
                    c_parts = clima_part.split("/T:")
                    clima_manha = c_parts[0].replace("M:", "").strip()
                    clima_tarde = c_parts[1].replace(".", "").strip()
        except: pass 

    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 8); c.drawString(40, y, "CLIMA MANHÃ:"); c.setFont("Helvetica", 9); c.drawString(110, y, clima_manha)
    c.setFont("Helvetica-Bold", 8); c.drawString(200, y, "CLIMA TARDE:"); c.setFont("Helvetica", 9); c.drawString(270, y, clima_tarde)
    c.setFont("Helvetica-Bold", 8); c.drawString(380, y, "CONDIÇÃO ÁREA:"); c.setFont("Helvetica", 9); c.drawString(460, y, cond_area)
    y -= 25 

    c.setFont("Helvetica-Bold", 9); c.drawString(40, y, "OBSERVAÇÕES GERAIS:")
    y -= 15
    c.setFont("Helvetica", 9)
    text_obj = c.beginText(40, y); text_obj.setFont("Helvetica", 9); text_obj.setLeading(12)
    paragrafos_obs = obs_texto.split('\n')
    for paragrafo in paragrafos_obs:
        words = paragrafo.split(' ')
        line = ""
        for word in words:
            if len(line + word) < 95: line += word + " "
            else:
                text_obj.textLine(line)
                y -= 12
                line = word + " "
        text_obj.textLine(line); y -= 12
    c.drawText(text_obj)
    y -= 10 

    if rdo.PENDENCIA: y = draw_text_block("5. OCORRÊNCIAS / PENDÊNCIAS", rdo.PENDENCIA, y)

    # --- 6. CRONOGRAMA E ETAPAS (COM FOTOS) ---
    if obra and obra.etapas:
        y -= 15
        y = check_page(y, 100)
        c.setFillColor(AZUL_ESCURO)
        c.rect(30, y, width-60, 20, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 10)
        c.drawString(40, y + 6, "6. CRONOGRAMA E REGISTROS DAS ETAPAS")
        y -= 25
        
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 8); c.drawString(40, y, "ETAPA")
        c.drawRightString(width-40, y, "STATUS"); y -= 10
        c.setStrokeColor(CINZA_BORDA); c.line(30, y, width-30, y); y -= 10
        
        c.setFont("Helvetica", 8)
        for etapa in obra.etapas:
            y = check_page(y, 80) # Garante espaço para a etapa e possível foto
            c.setFillColor(colors.black)
            c.drawString(40, y, f"{etapa.ORDEM}. {etapa.NOME_ETAPA}")
            
            status = etapa.STATUS or "PENDENTE"
            if status == "CONCLUIDO": c.setFillColor(colors.green)
            elif status == "EM ANDAMENTO": c.setFillColor(LARANJA)
            else: c.setFillColor(colors.gray)
            c.drawRightString(width-40, y, status)
            y -= 15

            # FOTOS DA ETAPA (Busca nos eventos timeline passados como argumento)
            fotos_etapa = [ev.FOTO for ev in eventos_timeline if ev.ID_ETAPA == etapa.ID and ev.FOTO]
            if fotos_etapa:
                y_fotos = y
                x_foto = 60
                for f_data in fotos_etapa:
                    try:
                        img = ImageReader(BytesIO(f_data))
                        # Desenha miniatura (66x50)
                        c.drawImage(img, x_foto, y_fotos - 50, width=66, height=50, mask='auto')
                        x_foto += 70
                        if x_foto > width - 60: break # Limite de fotos por linha
                    except: pass
                y -= 60 
            
            c.setStrokeColor(CINZA_CLARO); c.line(40, y, width-40, y); y -= 10

    # ASSINATURAS
    y -= 40
    y = check_page(y, 60)
    c.setStrokeColor(colors.black); c.setLineWidth(1)
    c.line(50, y, 250, y); c.line(300, y, 500, y)
    y -= 12
    c.setFont("Helvetica", 8)
    c.drawCentredString(150, y, "Responsável Técnico (IANORTH)")
    c.drawCentredString(400, y, "Fiscalização / Cliente")

    # FOTOS FINAIS (ÁLBUM)
    if rdo.fotos:
        c.showPage()
        height = A4[1]
        c.setFillColor(AZUL_ESCURO); c.rect(0, height - 50, width, 50, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(width/2, height - 30, f"REGISTRO FOTOGRÁFICO - RDO FINAL")
        y = height - 80; x_start = 40; x = x_start; photo_w = 240; photo_h = 180
        for i, foto in enumerate(rdo.fotos):
            if y < 200: c.showPage(); y = height - 50; x = x_start
            try:
                if foto.ARQUIVO:
                    img = ImageReader(BytesIO(foto.ARQUIVO))
                    c.drawImage(img, x, y - photo_h, width=photo_w, height=photo_h, mask='auto')
                    if x == x_start: x += 270 
                    else: x = x_start; y -= 210
            except: pass

    c.save()
    buffer.seek(0)
    return buffer

def desenhar_orcamento(obra, itens):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    COR_AZUL = colors.HexColor("#1e3a8a")
    
    # Cabeçalho Orcamento
    c.setFillColor(colors.white); c.rect(0, height - 80, width, 80, fill=1, stroke=0)
    try:
        logo_path = os.path.join(os.path.dirname(__file__), "../../../assets/IanorthLog.png")
        if os.path.exists(logo_path):
            img = ImageReader(logo_path); iw, ih = img.getSize(); aspect = iw / ih
            c.drawImage(img, 30, height - 60, width=40*aspect, height=40, mask='auto')
    except: pass

    c.setFillColor(COR_AZUL); c.rect(0, height - 100, width, 25, fill=1, stroke=0)
    c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(width/2, height - 93, "PLANILHA DE CUSTOS PREVISTOS")
    
    y = height - 130
    c.setFillColor(colors.black); c.setFont("Helvetica-Bold", 10)
    c.drawString(30, y, "OBRA:"); c.setFont("Helvetica", 10)
    c.drawString(80, y, f"{obra.CODATIVIDADE} - {obra.DESCRICAO}")
    
    def draw_header(y_pos, titulo, cor_fundo):
        c.setFillColor(cor_fundo); c.rect(30, y_pos, width-60, 20, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont("Helvetica-Bold", 10)
        c.drawString(40, y_pos+6, titulo)
        return y_pos - 20

    y -= 30

    materiais = [i for i in itens if i['TIPO'] == 'MATERIAL']
    if materiais:
        y = draw_header(y, "MATERIAIS", colors.HexColor("#ea580c")) 
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(40, y+5, "ITEM")
        c.drawRightString(400, y+5, "QTD")
        c.drawRightString(480, y+5, "UNIT.")
        c.drawRightString(550, y+5, "TOTAL")
        y -= 15

        total_mat = 0
        c.setFont("Helvetica", 8)
        for item in materiais:
            if y < 50: 
                c.showPage()
                y = height - 50
            c.drawString(40, y, f"{item['CODIGO']} - {item['DESCRICAO'][:65]}")
            c.drawRightString(400, y, f"{item['QTD']} {item.get('UNIDADE', '')}")
            c.drawRightString(480, y, f"R$ {item['UNITARIO']:.2f}")
            c.drawRightString(550, y, f"R$ {item['TOTAL']:.2f}")
            total_mat += item['TOTAL']
            y -= 12
        
        y -= 5
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(550, y, f"Total Materiais: R$ {total_mat:.2f}")
        y -= 25

    servicos = [i for i in itens if i['TIPO'] == 'SERVICO']
    if servicos:
        if y < 80: 
            c.showPage()
            y = height - 50
        y = draw_header(y, "SERVIÇOS / MÃO DE OBRA", colors.HexColor("#7e22ce"))
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(40, y+5, "ITEM")
        c.drawRightString(550, y+5, "TOTAL")
        y -= 15

        total_serv = 0
        c.setFont("Helvetica", 8)
        for item in servicos:
            if y < 50: 
                c.showPage()
                y = height - 50
            c.drawString(40, y, f"{item['CODIGO']} - {item['DESCRICAO'][:65]}")
            c.drawRightString(550, y, f"R$ {item['TOTAL']:.2f}")
            total_serv += item['TOTAL']
            y -= 12
            
        y -= 5
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(550, y, f"Total Serviços: R$ {total_serv:.2f}")
        y -= 25

    y -= 15
    c.setFillColor(COR_AZUL)
    c.rect(350, y, 215, 25, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    total_geral = sum(i['TOTAL'] for i in itens)
    c.drawRightString(550, y+8, f"TOTAL GERAL: R$ {total_geral:.2f}")

    c.showPage()
    c.save() 
    
    buffer.seek(0)
    return buffer
