# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

PINK = HexColor("#d6336c")
PINK_DARK = HexColor("#9e1b5a")
PINK_LIGHT = HexColor("#fce4ec")
CREAM = HexColor("#fff5f8")
WHITE = HexColor("#ffffff")
TEXT = HexColor("#3b2135")

W, H = landscape(A4)

title_style = ParagraphStyle(
    "title", fontName="Helvetica-Bold", fontSize=30, leading=36,
    textColor=WHITE, alignment=TA_CENTER, spaceAfter=6,
)
title_sub = ParagraphStyle(
    "title_sub", fontName="Helvetica", fontSize=15, leading=20,
    textColor=HexColor("#ffe3ee"), alignment=TA_CENTER,
)
slide_title = ParagraphStyle(
    "slide_title", fontName="Helvetica-Bold", fontSize=24, leading=30,
    textColor=PINK_DARK,
)
body = ParagraphStyle(
    "body", fontName="Helvetica", fontSize=13, leading=20,
    textColor=TEXT, alignment=TA_JUSTIFY, spaceAfter=8,
)
bullet = ParagraphStyle(
    "bullet", parent=body, leftIndent=16, alignment=TA_LEFT,
    spaceAfter=7, bulletIndent=2,
)
footer_style = ParagraphStyle(
    "footer", fontName="Helvetica", fontSize=9, leading=12,
    textColor=HexColor("#c08497"), alignment=TA_CENTER,
)


def draw_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, W, H, stroke=0, fill=1)
    canvas.setFillColor(PINK)
    canvas.rect(0, H - 14, W, 14, stroke=0, fill=1)
    canvas.rect(0, 0, W, 5, stroke=0, fill=1)
    canvas.setFillColor(HexColor("#f8d0de"))
    canvas.circle(W - 60, H - 55, 32, stroke=0, fill=1)
    canvas.circle(55, 42, 26, stroke=0, fill=1)
    canvas.restoreState()


def title_slide(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PINK)
    canvas.rect(0, 0, W, H, stroke=0, fill=1)
    canvas.setFillColor(HexColor("#f8d0de"))
    canvas.circle(W - 90, H - 90, 90, stroke=0, fill=1)
    canvas.circle(70, 90, 60, stroke=0, fill=1)
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawCentredString(W / 2, H - 165, "DIREITO EMPRESARIAL  •  TRABALHO ACADEMICO")
    canvas.restoreState()


def slide_number(canvas, doc):
    page = canvas.getPageNumber()
    if page > 1:
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(HexColor("#c08497"))
        canvas.drawCentredString(W / 2, 14, "Direito Empresarial — Direito do Consumidor  •  %d" % page)
        canvas.restoreState()


story = []

# --- Slide 1: Capa (página própria) ---
story.extend([
    Spacer(1, H * 0.35),
    Paragraph("DIREITO DO CONSUMIDOR", title_style),
    Spacer(1, 14),
    Paragraph("Uma analise dentro do Direito Empresarial", title_sub),
    Spacer(1, 8),
    Paragraph("Lei nº 8.078, de 11 de setembro de 1990 (CDC)", title_sub),
])

slides = [
    ("Introducao",
     ["O Direito do Consumidor e o ramo juridico que protege as pessoas fisicas ou juridicas "
      "que adquirem ou utilizam produtos e servicos como destinatarias finais.",
      "No Brasil, os direitos do consumidor sao garantias constitucionais previstas no "
      "artigo 5º, inciso XXXII, da Constituicao Federal de 1988.",
      "Dentro do Direito Empresarial, as empresas sao as fornecedoras — e, portanto, "
      "sujeitas a obrigacoes e responsabilidades especificas perante o consumidor."]),
    ("Contexto Historico",
     ["Antes do CDC, vigia o sistema do Codigo Civil de 1916, baseado na autonomia da vontade "
      "e no pacta sunt servanda — desfavoravel ao mais fraco da relacao.",
      "Com o advento da Constituicao de 1988, o consumidor passou a ter protecao expressa "
      "(art. 5º, XXXII) e a defesa do consumidor virou principio da ordem economica "
      "(art. 170, V).",
      "Em 1990 foi editada a Lei nº 8.078 (CDC), considerada uma das mais modernas do mundo, "
      "instituindo o Codigo de Defesa do Consumidor e o Sistema Nacional de Defesa do Consumidor."]),
    ("Relacao de Consumo",
     ["CONSUMIDOR: toda pessoa fisica ou juridica que adquira ou utilize produto ou servico "
      "como destinatario final (art. 2º).",
      "FORNECEDOR: toda pessoa fisica ou juridica, publica ou privada, que desenvolve atividade "
      "de producao, montagem, criacao, construcao, transformacao, importacao, exportacao, "
      "distribuicao ou comercializacao de produtos ou prestacao de servicos (art. 3º).",
      "PRODUTO e SERVICO: qualquer bem, movel ou imovel, material ou imaterial, e qualquer "
      "atividade fornecida no mercado de consumo, mediante ou nao remuneracao."]),
    ("Principios Fundamentais",
     ["VULNERABILIDADE: presuncao (relativa) de que o consumidor e o elo mais fraco da relacao "
      "de consumo — reconhecida formalmente pelo CDC (art. 4º, I).",
      "HIPOSSUFICIENCIA: alem da vulnerabilidade, ha consumidores com fragilidade tecnica, "
      "juridica ou economica que justifica a inversao do onus da prova (art. 6º, VIII).",
      "BOA-FE OBJETIVA: a relacao de consumo deve pautar-se pela lealdade e transparencia, "
      "vedando condutas abusivas e vantagens manifestamente excessivas.",
      "EQUILIBRIO DAS RELACOES: busca o balanceamento entre as partes, limitando o poder "
      "economico do fornecedor."]),
    ("Direitos Basicos do Consumidor (art. 6º)",
     ["IGUALDADE NAS CONTRATACOES: respeito a dignidade, saude e seguranca na oferta de "
      "produtos e servicos.",
      "INFORMACAO: direito a informacao adequada e clara sobre produtos e servicos, com "
      "especificacao correta de quantidade, caracteristicas, composicao, qualidade e preco.",
      "PROTECAO CONTRA PUBLICIDADE ENGANOSA E ABUSIVA: vedacao de praticas comerciais que "
      "induzam o consumidor a erro.",
      "REPARACAO DE DANOS: direito a efetiva prevencao e reparacao de danos patrimoniais e "
      "morais, individuais, coletivos e difusos.",
      "ACESSO A JUSTICA: facilitacao da defesa, inclusive com inversao do onus da prova a "
      "favor do consumidor."]),
    ("Responsabilidade Civil",
     ["RESPONSABILIDADE PELO FATO DO PRODUTO: o fornecedor responde, independentemente de "
      "culpa, pela reparacao dos danos causados por defeito de produto ou servico "
      "(art. 12 e 14).",
      "RESPONSABILIDADE PELO VICIO DO PRODUTO: responde pelos defeitos de qualidade que tornem "
      "o produto improprio ao consumo ou lhe diminuam o valor (art. 18).",
      "SOLIDARIEDADE: todos os integrantes da cadeia de fornecimento respondem solidariamente "
      "pelos danos causados ao consumidor.",
      "HIPOSSUFICIENCIA: a inversao do onus da prova opera quando verossimeis as alegacoes e "
      "hipossuficiente o consumidor (art. 6º, VIII)."]),
    ("Praticas Abusivas e Publicidade",
     ["PRATICAS ABUSIVAS (art. 39): condicionar venda a outro produto, elevar preco sem "
      "justa causa, exigir vantagem manifestamente excessiva, repassar ao consumidor "
      "custo de cobranca de terceiros, etc.",
      "PUBLICIDADE ENGANOSA: informacao falsa ou capaz de induzir o consumidor a erro "
      "(art. 37, §1º).",
      "PUBLICIDADE ABUSIVA: discriminatoria, que incite violencia, explore o medo ou a "
      "supersticao, ou se aproveite da deficiencia de julgamento de criancas e adolescentes "
      "(art. 37, §2º).",
      "A publicidade e vinculante: o anunciante responde pelo cumprimento das ofertas feitas "
      "(art. 30 e 35)."]),
    ("Protecao Administrativa e Judicial",
     ["PROCON: orgao estadual e municipal de defesa do consumidor — realiza atendimento, "
      "conciliacao, fiscalizacao e aplicacao de multas.",
      "SECRETARIA NACIONAL DO CONSUMIDOR (SENACON) e MINISTERIO PUBLICO: atuam na defesa "
      "coletiva dos interesses dos consumidores.",
      "JUIZADOS ESPECIAIS CIVEIS: via rapida e gratuita para demandas de ate 40 salarios "
      "minimos (Lei nº 9.099/1995).",
      "ACAO CIVIL PUBLICA e ACAO CIVIL COLETIVA: instrumentos para a tutela dos direitos "
      "difusos, coletivos e individuais homogeneos (Lei nº 7.347/1985 e CDC, art. 81)."]),
    ("Desafios Atuais",
     ["COMERCIO ELETRONICO: direito de arrependimento (art. 49) de 7 dias para compras feitas "
      "fora do estabelecimento comercial.",
      "PROTECAO DE DADOS: a LGPD (Lei nº 13.709/2018) complementa o CDC na protecao dos "
      "dados pessoais de consumo.",
      "VENDAS POR APLICATIVO e MARKETPLACES: a responsabilidade das plataformas a frente da "
      "cadeia de consumo.",
      "CONSUMIDOR SUPERENDIVIDADO: a Lei nº 14.181/2021 trouxe mecanismos de prevencao e "
      "renegociacao de dividas."]),
    ("Conclusao",
     ["O CDC representa uma conquista civilizatoria que equilibra a relacao entre empresas "
      "e consumidores, impondo etica, transparencia e responsabilidade no mercado.",
      "Para o Direito Empresarial, a defesa do consumidor e hoje inegociavel: empresas que "
      "ignoram o CDC comprometem sua reputacao, sua licenca social para operar e sofrem "
      "sancoes administrativas e judiciais.",
      "Compreender e aplicar a normativa de consumo e, portanto, condicao de "
      "sustentabilidade e competitividade empresarial no Brasil."]),
]

for title, items in slides:
    story.append(Spacer(1, 30))
    story.append(Paragraph(title, slide_title))
    story.append(HRFlowable(width="100%", thickness=2, color=PINK, spaceAfter=14))
    for it in items:
        story.append(Paragraph("&bull; " + it, bullet))
    story.append(Spacer(1, 12))

story.append(Spacer(1, 40))
story.append(HRFlowable(width="100%", thickness=1.5, color=PINK, spaceAfter=10))
story.append(Paragraph(
    "REFERENCIAS: BRASIL. Lei nº 8.078/1990 (Codigo de Defesa do Consumidor). "
    "BRASIL. Constituicao Federal de 1988. BRASIL. Lei nº 9.099/1995 (Juizados Especiais). "
    "BRASIL. Lei nº 13.709/2018 (LGPD). BRASIL. Lei nº 14.181/2021.",
    ParagraphStyle("ref", parent=body, fontSize=10, leading=15, textColor=HexColor("#6b4a5c")),
))
story.append(Paragraph("<b>Obrigado!</b>", title_style))
story.append(Spacer(1, 14))
story.append(Paragraph("Questoes?", footer_style))

doc = SimpleDocTemplate(
    "Apresentacao-direito-do-consumidor.pdf",
    pagesize=landscape(A4),
    leftMargin=45, rightMargin=45, topMargin=45, bottomMargin=35,
)
doc.build(story, onFirstPage=title_slide, onLaterPages=lambda c, d: (draw_background(c, d), slide_number(c, d)))

print("PDF gerado com sucesso!")