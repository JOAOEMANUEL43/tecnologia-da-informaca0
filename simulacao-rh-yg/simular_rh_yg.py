#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
 SIMULAÇÃO DE DADOS DE RECURSOS HUMANOS - EMPRESA YG (INDÚSTRIA MUSICAL)
 200 funcionários | posição em 30/09/2026 | movimentação de jan a set/2026
==============================================================================

O QUE ESTE ARQUIVO É
    Um gerador de base de RH. Ele monta um quadro de 200 pessoas distribuídas
    em 14 setores de uma gravadora, com cargo, nível, salário, data de
    admissão, afastamentos, desligamentos e nota de desempenho.

    A simulação é DETERMINÍSTICA. Com a mesma semente, o script devolve
    sempre a mesma base, linha a linha. Isso importa: num trabalho
    acadêmico, um número que muda a cada execução não pode ser conferido
    nem comparado com a versão anterior.

COMO USAR

    python simular_rh_yg.py            gera a base com a semente 2026
    python simular_rh_yg.py 77         gera a base com outra semente

    Saídas, todas gravadas na pasta entregas:
        entregas/funcionarios-yg.csv      1 linha por funcionário (40 colunas)
        entregas/resumo-por-setor.csv     1 linha por setor
        entregas/indicadores-rh-yg.csv    1 linha por indicador de RH
        entregas/distribuicoes-rh-yg.csv  1 linha por categoria de distribuição
        entregas/relatorio-rh-yg.md       relatório com os mesmos números

    Os quatro CSV usam ponto e vírgula como separador e encoding utf-8-sig, que
    é o que o Excel em português abre sem perguntar nada.

NADA DEPENDE DE BIBLIOTECA EXTERNA
    Só a biblioteca padrão do Python. Não precisa instalar nada. Os CSV saem
    separados por ponto e vírgula e com acentuação, que é o que o Excel em
    português abre sem perguntar nada.

O QUE ESTE SCRIPT NÃO FAZ
    Não descreve o perfil de quem realmente trabalha numa gravadora. Os
    percentuais de sexo, a curva de rotatividade e as faixas salariais são
    hipóteses de trabalho, explicadas no relatório. Todo número aqui é
    SIMULADO e serve para treinar análise de dados, não para decidir nada
    sobre pessoas reais.

AVISO LGPD
    Nenhum dado pessoal real foi usado. Não há CPF, nome de pessoa real nem
    contato de ninguém. Os nomes são combinações de listas públicas de
    prenomes e sobrenomes brasileiros. Dado de RH é dado pessoal e precisa
    de base legal para circular (Lei nº 13.709/2018).
==============================================================================
"""

import csv
import os
import random
import sys
from collections import Counter
from datetime import date, timedelta

# ------------------------------------------------------------------ período

EMPRESA = "YG Música e Entretenimento S.A."
SEMENTE_PADRAO = 2026
REFERENCIA = date(2026, 9, 30)
INICIO_MOVIMENTO = date(2026, 1, 1)
MESES_PERIODO = 9
DIAS_UTEIS = 188
TOTAL_FUNCIONARIOS = 200
ENCARGOS = 0.34

DIR_ENTREGAS = "entregas"
ARQ_BASE = os.path.join(DIR_ENTREGAS, "funcionarios-yg.csv")
ARQ_RESUMO = os.path.join(DIR_ENTREGAS, "resumo-por-setor.csv")
ARQ_INDICADORES = os.path.join(DIR_ENTREGAS, "indicadores-rh-yg.csv")
ARQ_DISTRIBUICOES = os.path.join(DIR_ENTREGAS, "distribuicoes-rh-yg.csv")
ARQ_RELATORIO = os.path.join(DIR_ENTREGAS, "relatorio-rh-yg.md")

# ----------------------------------------------------- quadro organizacional
# nome do setor | pessoas | proporção de mulheres | (cargo, nível, sal mín,
# sal máx, peso). O peso distribui as pessoas entre os cargos do setor; a
# soma dos setores fecha em 200.

AREAS = [
    ("Produção Musical", 28, 0.38, [
        ("Produtor Musical", "Senior", 9000, 16000, 3),
        ("Produtor Musical", "Pleno", 5000, 8000, 4),
        ("Assistente de Produção", "Assistente", 1900, 2700, 6),
        ("Técnico de Áudio", "Pleno", 3000, 4500, 6),
        ("Editor de Áudio", "Junior", 2400, 3600, 5),
        ("Estagiário de Produção", "Estagio", 1200, 1800, 3),
        ("Supervisor de Produção", "Coordenacao", 8000, 12000, 2),
        ("Gerente de Produção", "Gerencia", 12000, 19000, 2),
    ]),
    ("Estúdio e Áudio", 18, 0.30, [
        ("Mestre de Gravação", "Senior", 5500, 8500, 3),
        ("Técnico de Gravação", "Pleno", 2800, 4200, 4),
        ("Técnico de Gravação", "Junior", 2200, 3000, 4),
        ("Operador de Áudio", "Pleno", 2600, 3800, 1),
        ("Assistente de Estúdio", "Assistente", 1800, 2500, 3),
        ("Estagiário de Estúdio", "Estagio", 1200, 1800, 2),
        ("Coordenador de Estúdio", "Coordenacao", 7000, 10500, 2),
        ("Gerente de Estúdio", "Gerencia", 11000, 16000, 1),
    ]),
    ("Artistas e Repertório", 14, 0.50, [
        ("Analista de A&R", "Junior", 2400, 3400, 4),
        ("Analista de A&R", "Pleno", 3800, 5500, 4),
        ("Coordenador de A&R", "Coordenacao", 7500, 11000, 2),
        ("Assistente de Artista", "Assistente", 1800, 2600, 2),
        ("Gerente de Repertório", "Gerencia", 12000, 18000, 2),
    ]),
    ("Marketing e Comunicação", 22, 0.58, [
        ("Analista de Marketing", "Junior", 2200, 3200, 6),
        ("Analista de Marketing", "Pleno", 3200, 4800, 6),
        ("Social Media", "Pleno", 2400, 3600, 1),
        ("Designer", "Pleno", 3000, 4500, 3),
        ("Editor de Vídeo", "Junior", 2200, 3300, 2),
        ("Assistente de Marketing", "Assistente", 1800, 2400, 2),
        ("Estagiário de Marketing", "Estagio", 1200, 1800, 3),
        ("Gerente de Marketing", "Gerencia", 11000, 17000, 2),
    ]),
    ("Streaming e Distribuição", 14, 0.45, [
        ("Analista de Conteúdo Digital", "Pleno", 3500, 5000, 4),
        ("Analista de Direitos Digitais", "Senior", 5500, 8000, 3),
        ("Suporte a Artistas", "Pleno", 2400, 3400, 2),
        ("Assistente de Operações", "Assistente", 1900, 2700, 3),
        ("Coordenador de Distribuição", "Coordenacao", 7000, 10000, 2),
    ]),
    ("Vendas e Licenciamento", 12, 0.46, [
        ("Executivo de Contas", "Senior", 5200, 8000, 3),
        ("Executivo de Contas", "Pleno", 3200, 5200, 4),
        ("Analista de Licenciamento", "Pleno", 3800, 5600, 2),
        ("Assistente Comercial", "Assistente", 1800, 2500, 2),
        ("Estagiário Comercial", "Estagio", 1200, 1800, 2),
        ("Gerente de Vendas", "Gerencia", 11000, 18000, 1),
    ]),
    ("Eventos e Shows", 18, 0.32, [
        ("Coordenador de Produção de Evento", "Coordenacao", 6500, 9500, 2),
        ("Produtor de Eventos", "Pleno", 3000, 4500, 4),
        ("Técnico de Som e Luz", "Operacional", 1900, 2700, 5),
        ("Montador de Palco", "Assistente", 1800, 2400, 4),
        ("Analista de Eventos", "Junior", 2200, 3200, 2),
        ("Estagiário de Produção de Evento", "Estagio", 1200, 1800, 2),
        ("Gerente de Eventos", "Gerencia", 12000, 20000, 1),
    ]),
    ("Jurídico e Direitos Autorais", 9, 0.45, [
        ("Advogado", "Senior", 6000, 9500, 3),
        ("Analista Jurídico", "Pleno", 3500, 5200, 2),
        ("Assistente Jurídico", "Assistente", 1900, 2700, 2),
        ("Estágio Jurídico", "Estagio", 1200, 1800, 1),
        ("Gerente Jurídico", "Gerencia", 13000, 22000, 1),
    ]),
    ("Composição e Royalties", 8, 0.45, [
        ("Analista de Royalties", "Pleno", 3000, 4500, 3),
        ("Analista de Royalties", "Junior", 2200, 3200, 2),
        ("Assistente de Composição", "Assistente", 1800, 2500, 2),
        ("Coordenador de Repartição", "Coordenacao", 6000, 9000, 1),
    ]),
    ("Financeiro e Controladoria", 11, 0.45, [
        ("Contador", "Senior", 5000, 8000, 2),
        ("Analista Financeiro", "Pleno", 3600, 5400, 3),
        ("Analista Financeiro", "Junior", 2400, 3500, 3),
        ("Assistente Financeiro", "Assistente", 1900, 2700, 2),
        ("Gerente Financeiro", "Gerencia", 13000, 22000, 1),
    ]),
    ("Recursos Humanos", 7, 0.60, [
        ("Analista de RH", "Pleno", 3000, 4500, 2),
        ("Analista de RH", "Junior", 2200, 3200, 2),
        ("Recrutador", "Pleno", 2800, 4000, 1),
        ("Estágio de RH", "Estagio", 1200, 1800, 1),
        ("Gerente de RH", "Gerencia", 11000, 18000, 1),
    ]),
    ("Tecnologia da Informação", 14, 0.35, [
        ("Desenvolvedor de Software", "Senior", 6000, 9500, 2),
        ("Analista de TI", "Pleno", 3800, 5600, 4),
        ("Analista de TI", "Junior", 2500, 3600, 4),
        ("Suporte Técnico", "Assistente", 1900, 2800, 2),
        ("Estagiário de TI", "Estagio", 1200, 1800, 1),
        ("Coordenador de TI", "Coordenacao", 7500, 11000, 1),
        ("Gerente de TI", "Gerencia", 13000, 21000, 1),
    ]),
    ("Logística e Serviços Gerais", 17, 0.20, [
        ("Analista de Suprimentos", "Pleno", 3500, 5200, 2),
        ("Analista de Logística", "Junior", 2200, 3200, 3),
        ("Motorista", "Operacional", 2000, 2800, 3),
        ("Auxiliar de Serviços Gerais", "Operacional", 1800, 2400, 7),
        ("Coordenador de Logística", "Coordenacao", 5500, 8000, 1),
        ("Gerente de Logística", "Gerencia", 9000, 15000, 1),
    ]),
    ("Administrativo", 8, 0.50, [
        ("Analista Administrativo", "Pleno", 2800, 4000, 3),
        ("Assistente Administrativo", "Assistente", 1800, 2500, 3),
        ("Recepcionista", "Operacional", 1800, 2400, 1),
        ("Gerente Administrativo", "Gerencia", 9000, 14000, 1),
    ]),
]

NIVEIS = ["Estagio", "Assistente", "Operacional", "Junior", "Pleno",
          "Senior", "Coordenacao", "Gerencia"]
NIVEIS_ROTULO = {"Estagio": "Estágio", "Assistente": "Assistente",
                 "Operacional": "Operacional", "Junior": "Júnior",
                 "Pleno": "Pleno", "Senior": "Sênior",
                 "Coordenacao": "Coordenação", "Gerencia": "Gerência"}

# (faixa de idade de ingresso, faixa de tempo de casa em anos)
PERFIL_NIVEL = {
    "Estagio":      ((20, 24), (0.0, 0.8)),
    "Assistente":   ((20, 31), (0.3, 6.0)),
    "Operacional":  ((21, 40), (0.4, 9.0)),
    "Junior":       ((22, 33), (0.4, 8.0)),
    "Pleno":        ((26, 41), (1.0, 12.0)),
    "Senior":       ((31, 49), (2.0, 14.0)),
    "Coordenacao":  ((34, 51), (3.0, 14.0)),
    "Gerencia":     ((39, 57), (4.0, 15.0)),
}

SETORES_COM_ADICIONAL = {"Eventos e Shows", "Logística e Serviços Gerais",
                         "Estúdio e Áudio", "Tecnologia da Informação"}

PRENOMES_F = ["Ana", "Beatriz", "Bruna", "Camila", "Carolina", "Catarina",
              "Clara", "Cristina", "Daniela", "Eduarda", "Elaine", "Fernanda",
              "Gabriela", "Helena", "Isabela", "Joana", "Juliana", "Larissa",
              "Letícia", "Luana", "Luiza", "Manuela", "Mariana", "Marina",
              "Natália", "Patrícia", "Paula", "Priscila", "Rafaela", "Renata",
              "Roberta", "Sabrina", "Sandra", "Sofia", "Tatiana", "Vanessa",
              "Yasmin", "Aline", "Amanda", "Bianca", "Carla", "Débora"]
PRENOMES_M = ["André", "Bruno", "Caio", "Carlos", "Cauã", "Daniel", "Diego",
              "Douglas", "Eduardo", "Enzo", "Fábio", "Felipe", "Fernando",
              "Gabriel", "Gustavo", "Heitor", "Henrique", "Igor", "João",
              "Jorge", "José", "Juliano", "Leonardo", "Lucas", "Luiz",
              "Marcelo", "Marcos", "Mateus", "Matheus", "Murilo", "Nícolas",
              "Otávio", "Paulo", "Pedro", "Rafael", "Renato", "Ricardo",
              "Roberto", "Rodrigo", "Samuel", "Sérgio", "Thiago", "Vinícius",
              "Vitor", "Wesley", "Yuri"]
SOBRENOMES = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira",
              "Alves", "Pereira", "Lima", "Gomes", "Ribeiro", "Carvalho",
              "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa",
              "Rocha", "Dias", "Nascimento", "Andrade", "Moreira", "Nunes",
              "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos",
              "Gonçalves", "Santana", "Teixeira", "Correia", "Cavalcante",
              "Monteiro", "Moura", "Bastos", "Pinto", "Farias", "Aguiar"]

CIDADES = [("São Luís", "MA", 0.34), ("São José de Ribamar", "MA", 0.12),
           ("Paço do Lumiar", "MA", 0.07), ("Imperatriz", "MA", 0.07),
           ("Timon", "MA", 0.05), ("Natal", "RN", 0.05),
           ("Fortaleza", "CE", 0.05), ("Teresina", "PI", 0.04),
           ("Recife", "PE", 0.04), ("Salvador", "BA", 0.04),
           ("Brasília", "DF", 0.04), ("Campinas", "SP", 0.03),
           ("Belo Horizonte", "MG", 0.03), ("Rio de Janeiro", "RJ", 0.03)]

ESCOLARIDADE_POR_NIVEL = {
    "Estagio": ["Ensino Médio completo", "Ensino Técnico completo",
                "Superior incompleto"],
    "Assistente": ["Ensino Médio completo", "Ensino Técnico completo",
                   "Superior incompleto", "Superior completo"],
    "Operacional": ["Ensino Médio completo", "Ensino Técnico completo",
                    "Superior incompleto"],
    "Junior": ["Ensino Técnico completo", "Superior incompleto",
               "Superior completo"],
    "Pleno": ["Superior completo", "Pós-graduação", "Superior incompleto"],
    "Senior": ["Superior completo", "Pós-graduação", "Mestrado"],
    "Coordenacao": ["Superior completo", "Pós-graduação", "Mestrado"],
    "Gerencia": ["Superior completo", "Pós-graduação", "Mestrado"],
}

ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)",
                 "Viúvo(a)", "Solteiro(a)", "Casado(a)"]
TURNOS = ["Integral", "Meio período", "Manhã", "Tarde", "Noturno"]
MOTIVOS_SAIDA = ["Pedido de demissão", "Pedido de demissão",
                 "Pedido de demissão", "Acordo entre as partes",
                 "Demissão sem justa causa",
                 "Desligamento por reestruturação",
                 "Término de contrato de estágio", "Aposentadoria"]
MOTIVO_AFASTAMENTO = ["Atestado médico", "Licença maternidade",
                      "Licença paternidade", "Licença-saúde",
                      "Afastamento sem vencimento"]

# ------------------------------------------------------------------- campos

COLUNAS = [
    "matricula", "nome", "email", "escolaridade", "data_nascimento", "idade",
    "sexo", "estado_civil", "cidade", "uf", "setor", "cargo", "nivel",
    "gestor_matricula", "tipo_contrato", "jornada_horas", "turno",
    "data_admissao", "data_desligamento", "tempo_de_empresa_anos", "status",
    "motivo_desligamento", "tipo_afastamento", "salario_base", "adicional",
    "percentual_adicional", "salario_total", "salario_referencia_mercado",
    "posicionamento_salarial", "plano_saude", "vale_alimentacao",
    "vale_transporte", "dependentes", "dias_afastamento_9m", "faltas_9m",
    "horas_treinamento_9m", "nota_desempenho", "risco_turnover",
    "subordinados_diretos", "tamanho_equipe",
]


# ------------------------------------------------------------------ utilidades

def titulo(t):
    print()
    print("=" * 74)
    print(" " + t)
    print("=" * 74)


def fmt(valor, casas=2):
    """Formata no padrão brasileiro: 1.234,56"""
    return ("{:,.%df}" % casas).format(valor).replace(",", "\x00") \
        .replace(".", ",").replace("\x00", ".")


def inteiro(valor):
    return "{:,}".format(int(round(valor))).replace(",", ".")


def sem_acento(texto):
    for de, para in (("á", "a"), ("à", "a"), ("ã", "a"), ("â", "a"),
                     ("é", "e"), ("ê", "e"), ("í", "i"), ("ó", "o"),
                     ("õ", "o"), ("ô", "o"), ("ú", "u"), ("ü", "u"),
                     ("ç", "c")):
        texto = texto.replace(de, para)
    return texto.encode("ascii", "ignore").decode("ascii")


def distribuir(total, pesos):
    """Reparte `total` itens em partes inteiras segundo os pesos.

    Usa o método do maior resto: a soma das partes fecha exatamente com o
    total. É o que impede o quadro de ter 199 ou 201 pessoas.
    """
    soma = float(sum(pesos))
    bruto = [total * p / soma for p in pesos]
    partes = [int(x) for x in bruto]
    resto = total - sum(partes)
    ordem = sorted(range(len(pesos)), key=lambda i: bruto[i] - partes[i],
                   reverse=True)
    for i in range(resto):
        partes[ordem[i]] += 1
    return partes


def data_nascimento(ano, mes, dia):
    """Corrige 29 de fevereiro em anos não bissextos."""
    bissexto = ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0)
    ultimo = [31, 29 if bissexto else 28, 31, 30, 31, 30, 31, 31, 30, 31,
              30, 31][mes - 1]
    return date(ano, mes, min(dia, ultimo))


def idade_em(nasc, ref):
    return ref.year - nasc.year - ((ref.month, ref.day) < (nasc.month, nasc.day))


def posicao_salarial(salario, referencia):
    if salario < referencia * 0.92:
        return "Abaixo da mediana"
    if salario > referencia * 1.08:
        return "Acima da mediana"
    return "Na mediana"


# ----------------------------------------------------------- geração da base

def montar_cargos(rng):
    cargos = []
    for nome_setor, pessoas, _perc_fem, tabela in AREAS:
        contagens = distribuir(pessoas, [c[4] for c in tabela])
        for (cargo, nivel, s_min, s_max, _p), qtd in zip(tabela, contagens):
            for _ in range(qtd):
                cargos.append({
                    "setor": nome_setor,
                    "cargo": cargo,
                    "nivel": nivel,
                    "s_min": s_min,
                    "s_max": s_max,
                    "referencia": (s_min + s_max) / 2.0,
                })
    return cargos


def gerar_pessoa(rng, cargo, matricula, usados_email, perc_fem):
    nivel = cargo["nivel"]
    (idade_min, idade_max), (casa_min, casa_max) = PERFIL_NIVEL[nivel]

    sexo = "F" if rng.random() < perc_fem else "M"
    primeiro = rng.choice(PRENOMES_F if sexo == "F" else PRENOMES_M)
    segundo = rng.choice(PRENOMES_M if sexo == "F" else PRENOMES_F) \
        if rng.random() < 0.45 else None
    sobrenome = rng.choice(SOBRENOMES)
    sobrenome2 = rng.choice(SOBRENOMES) if rng.random() < 0.50 else None
    nome = " ".join(p for p in (primeiro, segundo, sobrenome, sobrenome2) if p)

    base_email = "%s.%s" % (sem_acento(primeiro).lower(),
                            sem_acento(sobrenome).lower())
    email = base_email + "@ygmusica.com.br"
    seq = 2
    while email in usados_email:
        email = "%s%d@ygmusica.com.br" % (base_email, seq)
        seq += 1
    usados_email.add(email)

    nomes, ufs, pesos = zip(*CIDADES)
    i = rng.choices(range(len(nomes)), weights=pesos)[0]
    cidade, uf = nomes[i], ufs[i]

    admissao = REFERENCIA - timedelta(days=int(rng.uniform(casa_min, casa_max) * 365))
    admissao += timedelta(days=rng.randint(-40, 40))
    if admissao > REFERENCIA:
        admissao = REFERENCIA - timedelta(days=rng.randint(10, 320))
    idade_ingresso = rng.randint(idade_min, idade_max)
    nasc = data_nascimento(admissao.year - idade_ingresso,
                           admissao.month, admissao.day)
    if idade_em(nasc, admissao) < 18:
        nasc = data_nascimento(admissao.year - 18, admissao.month, admissao.day)

    salario = round(rng.uniform(cargo["s_min"], cargo["s_max"]) / 10.0) * 10
    tem_adicional = cargo["setor"] in SETORES_COM_ADICIONAL and \
        nivel in ("Operacional", "Assistente", "Junior", "Pleno")
    adicional = "Sim" if tem_adicional else "Não"
    pct_adicional = rng.choice([10, 12, 20, 25]) if tem_adicional else 0
    valor_adicional = round(salario * pct_adicional / 100.0)
    horas_extra = 0 if nivel == "Estagio" else (
        int(rng.triangular(0, 18, 2)) if rng.random() < 0.45 else 0)

    afastado = rng.random() < 0.07
    afastamento = rng.choice(MOTIVO_AFASTAMENTO) if afastado else ""

    turno = "Integral" if nivel in ("Estagio", "Assistente", "Operacional") \
        else rng.choices(TURNOS, weights=[80, 10, 10, 10, 10])[0]
    jornada = 20 if nivel == "Estagio" else (
        30 if turno == "Meio período" else
        40 if cargo["setor"] in ("Estúdio e Áudio", "Eventos e Shows") else 44)

    if nivel == "Estagio":
        contrato = "Estagiário"
    elif nivel in ("Pleno", "Senior") and rng.random() < 0.03:
        contrato = "Pessoa jurídica"
    elif nivel in ("Assistente", "Operacional") and rng.random() < 0.06:
        contrato = "Aprendiz"
    else:
        contrato = "CLT"

    estagio = nivel == "Estagio"
    d9 = 0 if afastado or rng.random() < 0.42 else int(rng.triangular(0, 40, 1))
    faltas = 0 if rng.random() < 0.35 else int(rng.triangular(0, 14, 0))
    horas_treino = 0 if estagio else int(rng.triangular(0, 60, 6) * (
        1.0 if nivel in ("Pleno", "Senior", "Coordenacao", "Gerencia") else 0.55))
    nota = round(min(5.0, max(1.0, rng.gauss(3.5, 0.75))), 1)

    return {
        "matricula": matricula,
        "nome": nome,
        "email": email,
        "escolaridade": rng.choice(ESCOLARIDADE_POR_NIVEL[nivel]),
        "data_nascimento": nasc.strftime("%d/%m/%Y"),
        "idade": idade_em(nasc, REFERENCIA),
        "sexo": sexo,
        "estado_civil": rng.choice(ESTADOS_CIVIS),
        "cidade": cidade,
        "uf": uf,
        "setor": cargo["setor"],
        "cargo": cargo["cargo"],
        "nivel": nivel,
        "gestor_matricula": "",
        "tipo_contrato": contrato,
        "jornada_horas": jornada,
        "turno": turno,
        "data_admissao": admissao.strftime("%d/%m/%Y"),
        "data_desligamento": "",
        "tempo_de_empresa_anos": round((REFERENCIA - admissao).days / 365.25, 1),
        "status": "Afastado" if afastado else "Ativo",
        "motivo_desligamento": "",
        "tipo_afastamento": afastamento,
        "salario_base": salario,
        "adicional": adicional,
        "percentual_adicional": pct_adicional,
        "salario_total": salario + valor_adicional + horas_extra * 55,
        "salario_referencia_mercado": round(cargo["referencia"]),
        "posicionamento_salarial": posicao_salarial(salario, cargo["referencia"]),
        "plano_saude": "Não" if estagio and rng.random() < 0.8 else "Sim",
        "vale_alimentacao": "Não" if estagio else "Sim",
        "vale_transporte": "Sim" if jornada >= 40 and not estagio else "Não",
        "dependentes": int(rng.triangular(0, 5, 0)),
        "dias_afastamento_9m": d9,
        "faltas_9m": faltas,
        "horas_treinamento_9m": horas_treino,
        "nota_desempenho": nota,
        "risco_turnover": "",
        "subordinados_diretos": 0,
        "tamanho_equipe": 0,
        "_admissao": admissao,
    }


def distribuir_gestao(pessoas):
    """Monta a hierarquia de cada setor e fecha o tamanho das equipes.

    Onde existe coordinator, quem não é gestão fica sob o coordenador e o
    coordenador sob o gerente. Em setor pequeno, com só um gerente, ele
    lidera a equipe diretamente; onde não existe gerente, o coordenador é o
    topo da área.     Cada pessoa sem cargo de gestão entra na equipe de um único superior, e
    a soma de `subordinados_diretos` fecha exatamente com o número de pessoas
    que têm algum superior. `tamanho_equipe` soma também quem vem depois do
    coordenador, para o gerente aparecer com o tamanho real da sua área.
    """
    for nome_setor, _qtd, _perc_fem, _tabela in AREAS:
        do_setor = [p for p in pessoas if p["setor"] == nome_setor]
        gerentes = [p for p in do_setor if p["nivel"] == "Gerencia"]
        coordenadores = [p for p in do_setor if p["nivel"] == "Coordenacao"]
        demais = [p for p in do_setor
                  if p["nivel"] not in ("Gerencia", "Coordenacao")]
        if not demais:
            continue

        for g, c in zip(gerentes, coordenadores):
            c["gestor_matricula"] = g["matricula"]

        # O coordenador comanda a equipe; sem coordenador, comanda o gerente.
        chefes = coordenadores or gerentes
        i = 0
        for c, q in zip(chefes, distribuir(len(demais), [1] * len(chefes))):
            c["subordinados_diretos"] = q
            for p in demais[i:i + q]:
                p["gestor_matricula"] = c["matricula"]
            i += q

    for g in [p for p in pessoas if p["nivel"] == "Gerencia"]:
        g["tamanho_equipe"] = g["subordinados_diretos"] + sum(
            p["subordinados_diretos"] for p in pessoas
            if p["gestor_matricula"] == g["matricula"])
    for p in pessoas:
        if p["nivel"] == "Coordenacao":
            p["tamanho_equipe"] = p["subordinados_diretos"]


def aplicar_desligamentos(rng, pessoas):
    """Desliga parte do quadro dentro da janela de janeiro a setembro de 2026.

    A data de desligamento vem primeiro. Se ela cair antes da admissão, a
    admissão é recuada para ficar de 60 a 900 dias antes da saída. Sem isso
    apareceria gente admitida e desligada no mesmo dia.
    """
    for p in rng.sample(pessoas, 47):
        saida = INICIO_MOVIMENTO + timedelta(
            days=rng.randint(0, (REFERENCIA - INICIO_MOVIMENTO).days))
        if p["_admissao"] >= saida - timedelta(days=60):
            p["_admissao"] = saida - timedelta(days=rng.randint(60, 900))
            p["data_admissao"] = p["_admissao"].strftime("%d/%m/%Y")
        p["data_desligamento"] = saida.strftime("%d/%m/%Y")
        p["tempo_de_empresa_anos"] = round(
            (saida - p["_admissao"]).days / 365.25, 1)
        p["status"] = "Desligado"
        p["motivo_desligamento"] = rng.choice(MOTIVOS_SAIDA)
        p["tipo_afastamento"] = ""
        p["dias_afastamento_9m"] = 0
        p["nota_desempenho"] = round(min(5.0, max(1.0, p["nota_desempenho"]
                                                 - rng.triangular(0, 1.2, 0))), 1)
    return pessoas


def calcular_risco(pessoas):
    """Risco de turnover a partir de tempo de casa, nota, salário e ausência."""
    for p in pessoas:
        pontos = 0
        if p["tempo_de_empresa_anos"] < 1:
            pontos += 3
        elif p["tempo_de_empresa_anos"] < 2:
            pontos += 2
        elif p["tempo_de_empresa_anos"] > 8:
            pontos -= 1
        if p["nota_desempenho"] < 2.5:
            pontos += 2
        elif p["nota_desempenho"] >= 4.0:
            pontos -= 1
        if p["posicionamento_salarial"] == "Abaixo da mediana":
            pontos += 2
        elif p["posicionamento_salarial"] == "Acima da mediana":
            pontos -= 1
        if p["dias_afastamento_9m"] > 20:
            pontos += 1
        if p["tipo_contrato"] == "Pessoa jurídica":
            pontos += 1
        p["risco_turnover"] = "Alto" if pontos >= 4 else (
            "Médio" if pontos >= 2 else "Baixo")
    return pessoas


def gerar_base(semente):
    rng = random.Random(semente)
    usados_email = set()
    pessoas = []
    cargos = montar_cargos(rng)
    for i, cargo in enumerate(cargos, start=1):
        perc_fem = dict((a[0], a[2]) for a in AREAS)[cargo["setor"]]
        pessoas.append(gerar_pessoa(rng, cargo, "YG%04d" % (1000 + i),
                                    usados_email, perc_fem))
    distribuir_gestao(pessoas)
    aplicar_desligamentos(rng, pessoas)
    return calcular_risco(pessoas)


# ----------------------------------------------------------------- indicadores

def percentual(parte, todo):
    return 100.0 * parte / todo if todo else 0.0


def mediana(valores):
    s = sorted(valores)
    n = len(s)
    if n == 0:
        return 0.0
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0


def indicadores(pessoas):
    ativos = [p for p in pessoas if p["status"] != "Desligado"]
    afastados = [p for p in ativos if p["status"] == "Afastado"]
    desligados = [p for p in pessoas if p["status"] == "Desligado"]
    head_medio = len(ativos) + len(desligados) / 2.0

    return {
        "total": len(pessoas),
        "ativos": len(ativos),
        "em_atividade": len(ativos) - len(afastados),
        "afastados": len(afastados),
        "desligados": len(desligados),
        "head_medio": head_medio,
        "turnover": percentual(len(desligados), head_medio) * (12.0 / MESES_PERIODO),
        "absenteismo": percentual(sum(p["dias_afastamento_9m"] for p in ativos),
                                  len(ativos) * DIAS_UTEIS),
        "frequencia": percentual(sum(p["faltas_9m"] for p in ativos),
                                 len(ativos) * DIAS_UTEIS),
        "sal_medio": sum(p["salario_total"] for p in ativos) / len(ativos),
        "sal_mediana": mediana([p["salario_total"] for p in ativos]),
        "sal_min": min(p["salario_total"] for p in ativos),
        "sal_max": max(p["salario_total"] for p in ativos),
        "folha_mensal": sum(p["salario_total"] for p in ativos),
        "tempo_medio": sum(p["tempo_de_empresa_anos"] for p in ativos) / len(ativos),
        "idade_media": sum(p["idade"] for p in ativos) / len(ativos),
        "treino_medio": sum(p["horas_treinamento_9m"] for p in ativos) / len(ativos),
        "gestores": sum(1 for p in pessoas
                        if p["nivel"] in ("Coordenacao", "Gerencia")),
        "nao_gestores": sum(1 for p in pessoas
                            if p["nivel"] not in ("Coordenacao", "Gerencia")),
        "pct_mulheres": percentual(sum(1 for p in ativos if p["sexo"] == "F"),
                                   len(ativos)),
    }


def por_setor(pessoas):
    ativos = [p for p in pessoas if p["status"] != "Desligado"]
    desligados = [p for p in pessoas if p["status"] == "Desligado"]
    linhas = []
    for nome_setor, _p, _f, _t in AREAS:
        a = [p for p in ativos if p["setor"] == nome_setor]
        d = [p for p in desligados if p["setor"] == nome_setor]
        if not a and not d:
            continue
        head = len(a) + len(d) / 2.0
        linhas.append({
            "setor": nome_setor,
            "quadro_total": len(a) + len(d),
            "ativos": len(a),
            "desligados_9m": len(d),
            "participacao": percentual(len(a) + len(d), len(pessoas)),
            "turnover_anualizado": percentual(len(d), head) * (12.0 / MESES_PERIODO),
            "salario_medio": sum(p["salario_total"] for p in a) / len(a),
            "salario_mediano": mediana([p["salario_total"] for p in a]),
            "tempo_de_casa_medio": sum(p["tempo_de_empresa_anos"] for p in a) / len(a),
            "absenteismo": percentual(sum(p["dias_afastamento_9m"] for p in a),
                                      len(a) * DIAS_UTEIS),
            "pct_mulheres": percentual(sum(1 for p in a if p["sexo"] == "F"), len(a)),
            "pct_risco_alto": percentual(sum(1 for p in a
                                             if p["risco_turnover"] == "Alto"), len(a)),
        })
    return sorted(linhas, key=lambda x: -x["quadro_total"])


# -------------------------------------------------------------------- gravação

def gravar_base(pessoas):
    os.makedirs(DIR_ENTREGAS, exist_ok=True)
    with open(ARQ_BASE, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUNAS, delimiter=";",
                           extrasaction="ignore")
        w.writeheader()
        for p in pessoas:
            linha = dict(p)
            for k in ("salario_base", "salario_total",
                      "salario_referencia_mercado"):
                linha[k] = fmt(linha[k])
            linha["percentual_adicional"] = "%d" % linha["percentual_adicional"]
            linha["nota_desempenho"] = fmt(linha["nota_desempenho"], 1)
            linha["tempo_de_empresa_anos"] = fmt(linha["tempo_de_empresa_anos"], 1)
            w.writerow(linha)
    return ARQ_BASE


def gravar_resumo(linhas):
    os.makedirs(DIR_ENTREGAS, exist_ok=True)
    with open(ARQ_RESUMO, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()), delimiter=";")
        w.writeheader()
        for l in linhas:
            linha = dict(l)
            for k in ("participacao", "turnover_anualizado", "absenteismo",
                      "pct_mulheres", "pct_risco_alto"):
                linha[k] = fmt(linha[k], 1)
            for k in ("salario_medio", "salario_mediano", "tempo_de_casa_medio"):
                linha[k] = fmt(linha[k], 2)
            w.writerow(linha)
    return ARQ_RESUMO


def coletar_indicadores(pessoas, ind):
    """Indicadores em lista de dicionários, na ordem em que aparecem no relatório.

    Cada linha carrega junto o cálculo, porque número sem fórmula escrita
    não pode ser conferido por quem lê.
    """
    ativos = [p for p in pessoas if p["status"] != "Desligado"]
    desligados = [p for p in pessoas if p["status"] == "Desligado"]
    custo_mensal = ind["folha_mensal"] * (1 + ENCARGOS)
    risco_alto = sum(1 for p in ativos if p["risco_turnover"] == "Alto")
    saidas_voluntarias = sum(
        1 for p in desligados
        if p["motivo_desligamento"] in ("Pedido de demissão",
                                        "Acordo entre as partes"))
    return [
        {"indicador": "Quadro de pessoal", "valor": "%d" % ind["total"],
         "unidade": "funcionários",
         "como_foi_calculado": "contagem de linhas da base"},
        {"indicador": "Funcionários ativos", "valor": "%d" % ind["ativos"],
         "unidade": "funcionários",
         "como_foi_calculado": "status diferente de Desligado, incluindo "
                               "afastados"},
        {"indicador": "Funcionários em atividade", "valor": "%d" % ind["em_atividade"],
         "unidade": "funcionários",
         "como_foi_calculado": "ativos menos os afastados no momento"},
        {"indicador": "Afastados no momento", "valor": "%d" % ind["afastados"],
         "unidade": "funcionários",
         "como_foi_calculado": "status igual a Afastado"},
        {"indicador": "Desligados no período",
         "valor": "%d" % ind["desligados"], "unidade": "funcionários",
         "como_foi_calculado": "data de desligamento entre %s e %s"
                               % (INICIO_MOVIMENTO.strftime("%d/%m/%Y"),
                                  REFERENCIA.strftime("%d/%m/%Y"))},
        {"indicador": "Rotatividade anualizada", "valor": fmt(ind["turnover"], 1),
         "unidade": "percentual",
         "como_foi_calculado": "desligados ÷ quadro médio × (12 ÷ %d meses)"
                               % MESES_PERIODO},
        {"indicador": "Absenteísmo", "valor": fmt(ind["absenteismo"], 2),
         "unidade": "percentual",
         "como_foi_calculado": "dias de afastamento ÷ (ativos × %d dias úteis)"
                               % DIAS_UTEIS},
        {"indicador": "Frequência de faltas", "valor": fmt(ind["frequencia"], 2),
         "unidade": "percentual",
         "como_foi_calculado": "faltas ÷ (ativos × %d dias úteis)" % DIAS_UTEIS},
        {"indicador": "Salário total médio", "valor": "R$ " + fmt(ind["sal_medio"]),
         "unidade": "reais por mês",
         "como_foi_calculado": "média do salário total dos ativos"},
        {"indicador": "Salário total mediano",
         "valor": "R$ " + fmt(ind["sal_mediana"]), "unidade": "reais por mês",
         "como_foi_calculado": "mediana do salário total dos ativos"},
        {"indicador": "Salário total mínimo",
         "valor": "R$ " + fmt(ind["sal_min"]), "unidade": "reais por mês",
         "como_foi_calculado": "menor salário total entre os ativos"},
        {"indicador": "Salário total máximo",
         "valor": "R$ " + fmt(ind["sal_max"]), "unidade": "reais por mês",
         "como_foi_calculado": "maior salário total entre os ativos"},
        {"indicador": "Folha mensal", "valor": "R$ " + inteiro(ind["folha_mensal"]),
         "unidade": "reais por mês",
         "como_foi_calculado": "soma do salário total dos ativos"},
        {"indicador": "Custo mensal estimado",
         "valor": "R$ " + inteiro(custo_mensal), "unidade": "reais por mês",
         "como_foi_calculado": "folha × (1 + %.0f%% de encargos, hipótese)"
                               % (ENCARGOS * 100)},
        {"indicador": "Custo anual estimado",
         "valor": "R$ " + inteiro(custo_mensal * 13), "unidade": "reais por ano",
         "como_foi_calculado": "custo mensal × 13 (12 meses mais 13º salário)"},
        {"indicador": "Tempo de casa médio", "valor": fmt(ind["tempo_medio"], 1),
         "unidade": "anos",
         "como_foi_calculado": "média dos anos desde a admissão, entre os ativos"},
        {"indicador": "Idade média", "valor": fmt(ind["idade_media"], 1),
         "unidade": "anos",
         "como_foi_calculado": "média das idades em %s, entre os ativos"
                               % REFERENCIA.strftime("%d/%m/%Y")},
        {"indicador": "Treinamento médio", "valor": fmt(ind["treino_medio"], 1),
         "unidade": "horas no período",
         "como_foi_calculado": "média das horas de treinamento no período"},
        {"indicador": "Posições de gestão", "valor": "%d" % ind["gestores"],
         "unidade": "funcionários",
         "como_foi_calculado": "nível Coordenação ou Gerência"},
        {"indicador": "Mulheres no quadro ativo", "valor": fmt(ind["pct_mulheres"], 1),
         "unidade": "percentual",
         "como_foi_calculado": "ativos com sexo F ÷ ativos × 100"},
        {"indicador": "Risco alto de turnover", "valor": "%d" % risco_alto,
         "unidade": "funcionários",
         "como_foi_calculado": "ativos com escore de risco igual a Alto"},
        {"indicador": "Saídas voluntárias no período",
         "valor": "%d" % saidas_voluntarias, "unidade": "funcionários",
         "como_foi_calculado": "pedido de demissão mais acordo entre as partes"},
        {"indicador": "Saídas involuntárias no período",
         "valor": "%d" % (ind["desligados"] - saidas_voluntarias),
         "unidade": "funcionários",
         "como_foi_calculado": "desligamentos menos as saídas voluntárias"},
        {"indicador": "Rotatividade voluntária anualizada",
         "valor": fmt(percentual(saidas_voluntarias, ind["head_medio"])
                      * (12.0 / MESES_PERIODO), 1), "unidade": "percentual",
         "como_foi_calculado": "saídas voluntárias ÷ quadro médio × (12 ÷ %d)"
                               % MESES_PERIODO},
        {"indicador": "Rotatividade involuntária anualizada",
         "valor": fmt(percentual(ind["desligados"] - saidas_voluntarias,
                                 ind["head_medio"]) * (12.0 / MESES_PERIODO), 1),
         "unidade": "percentual",
         "como_foi_calculado": "saídas involuntárias ÷ quadro médio × (12 ÷ %d)"
                               % MESES_PERIODO},
    ]


def gravar_indicadores(linhas):
    os.makedirs(DIR_ENTREGAS, exist_ok=True)
    with open(ARQ_INDICADORES, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["indicador", "valor", "unidade",
                                          "como_foi_calculado"],
                           delimiter=";")
        w.writeheader()
        w.writerows(linhas)
    return ARQ_INDICADORES


def gravar_distribuicoes(linhas):
    os.makedirs(DIR_ENTREGAS, exist_ok=True)
    with open(ARQ_DISTRIBUICOES, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["tema", "base_de_calculo", "categoria",
                                          "funcionarios", "participacao_pct"],
                           delimiter=";")
        w.writeheader()
        w.writerows(linhas)
    return ARQ_DISTRIBUICOES


def faixa(valor, cortes, rotulos):
    for corte, rotulo in zip(cortes, rotulos):
        if valor < corte:
            return rotulo
    return rotulos[-1]


FAIXAS_ET = ["Até 24", "25 a 34", "35 a 44", "45 a 54", "55 ou mais"]
FAIXAS_CASA = ["Menos de 1 ano", "1 a 2 anos", "3 a 4 anos", "5 a 9 anos",
               "10 anos ou mais"]


def coletar_distribuicoes(pessoas, ind):
    """Monta a lista de distribuições usada pelo relatório e pelo CSV.

    Cada item traz o tema, o denominador, as categorias na ordem em que
    devem aparecer e a contagem. O relatório e o CSV saem daqui, então os
    dois nunca podem divergir.
    """
    ativos = [p for p in pessoas if p["status"] != "Desligado"]
    desligados = [p for p in pessoas if p["status"] == "Desligado"]
    tot, ati = ind["total"], ind["ativos"]

    def et(p):
        return faixa(p["idade"], [25, 35, 45, 55], FAIXAS_ET)

    def casa(p):
        return faixa(p["tempo_de_empresa_anos"], [1, 3, 5, 10], FAIXAS_CASA)

    return [
        {"tema": "Nivel", "base": "Quadro completo", "denominador": tot,
         "categorias": [(NIVEIS_ROTULO[k], k) for k in NIVEIS],
         "contagem": Counter(p["nivel"] for p in pessoas)},
        {"tema": "Cargo", "base": "Quadro completo", "denominador": tot,
         "categorias": [("%s (%s)" % (c, NIVEIS_ROTULO[n]), (c, n))
                        for (c, n), _ in Counter(
                            (p["cargo"], p["nivel"]) for p in pessoas
                        ).most_common()],
         "contagem": Counter((p["cargo"], p["nivel"]) for p in pessoas)},
        {"tema": "Tipo de contrato", "base": "Quadro completo",
         "denominador": tot, "categorias": None,
         "contagem": Counter(p["tipo_contrato"] for p in pessoas)},
        {"tema": "Turno", "base": "Quadro completo", "denominador": tot,
         "categorias": None, "contagem": Counter(p["turno"] for p in pessoas)},
        {"tema": "Jornada semanal", "base": "Quadro completo",
         "denominador": tot,
         "categorias": [("%d horas" % k, k) for k in sorted(
             set(p["jornada_horas"] for p in pessoas))],
         "contagem": Counter(p["jornada_horas"] for p in pessoas)},
        {"tema": "Faixa etaria", "base": "Quadro ativo", "denominador": ati,
         "categorias": [(k, k) for k in FAIXAS_ET],
         "contagem": Counter(et(p) for p in ativos)},
        {"tema": "Tempo de casa", "base": "Quadro ativo", "denominador": ati,
         "categorias": [(k, k) for k in FAIXAS_CASA],
         "contagem": Counter(casa(p) for p in ativos)},
        {"tema": "Sexo", "base": "Quadro ativo", "denominador": ati,
         "categorias": [("Feminino", "F"), ("Masculino", "M")],
         "contagem": Counter(p["sexo"] for p in ativos)},
        {"tema": "Escolaridade", "base": "Quadro ativo", "denominador": ati,
         "categorias": None,
         "contagem": Counter(p["escolaridade"] for p in ativos)},
        {"tema": "Posicionamento salarial", "base": "Quadro ativo",
         "denominador": ati,
         "categorias": [(k, k) for k in ("Abaixo da mediana", "Na mediana",
                                         "Acima da mediana")],
         "contagem": Counter(p["posicionamento_salarial"] for p in ativos)},
        {"tema": "Risco de turnover", "base": "Quadro ativo",
         "denominador": ati,
         "categorias": [(k, k) for k in ("Baixo", "Médio", "Alto")],
         "contagem": Counter(p["risco_turnover"] for p in ativos)},
        {"tema": "Motivo do desligamento", "base": "Desligados no periodo",
         "denominador": ind["desligados"], "categorias": None,
         "contagem": Counter(p["motivo_desligamento"] for p in desligados)},
    ]


def linhas_distribuicoes(dists):
    """Achata a lista de distribuições em linhas prontas para CSV e tabela."""
    linhas = []
    for d in dists:
        cats = d["categorias"] or [(k, k) for k, _ in d["contagem"].most_common()]
        for rotulo, chave in cats:
            v = d["contagem"].get(chave, 0)
            linhas.append({
                "tema": d["tema"],
                "base_de_calculo": d["base"],
                "categoria": rotulo,
                "funcionarios": v,
                "participacao_pct": fmt(percentual(v, d["denominador"]), 1),
            })
    return linhas


SUFIXO_UNIDADE = {"percentual": "%", "anos": " anos", "funcionários": "",
                  "reais por mês": "", "reais por ano": "",
                  "horas no período": " horas"}


def valor_com_unidade(linha):
    sufixo = SUFIXO_UNIDADE.get(linha["unidade"], "")
    return linha["valor"] + sufixo


def tabela_distribuicao(L, titulo_txt, linhas, tema):
    sel = [x for x in linhas if x["tema"] == tema]
    L.append("")
    L.append("### %s" % titulo_txt)
    L.append("")
    L.append("| Categoria | Funcionários | Participação |")
    L.append("|---|---|---|")
    for x in sel:
        L.append("| %s | %d | %s%% |" % (x["categoria"], x["funcionarios"],
                                         x["participacao_pct"]))


def gravar_relatorio(pessoas, ind, setores, ind_linhas, dist_linhas):
    ativos = [p for p in pessoas if p["status"] != "Desligado"]
    desligados = [p for p in pessoas if p["status"] == "Desligado"]
    custo_mensal = ind["folha_mensal"] * (1 + ENCARGOS)
    custo_anual = custo_mensal * 13
    topo = sorted(ativos, key=lambda p: -p["salario_total"])[:8]
    por_tema = {}
    for x in dist_linhas:
        por_tema.setdefault(x["tema"], []).append(x)
    risco_alto = por_tema["Risco de turnover"][2]["funcionarios"]
    valor_ind = dict((x["indicador"], valor_com_unidade(x)) for x in ind_linhas)

    L = []
    a = L.append

    a("# Relatório de Recursos Humanos — %s" % EMPRESA)
    a("")
    a("Base simulada de **%d funcionários** | posição em **%s** | movimentação "
      "de **%s** a **%s** (%d meses, %d dias úteis)."
      % (ind["total"], REFERENCIA.strftime("%d/%m/%Y"),
         INICIO_MOVIMENTO.strftime("%d/%m/%Y"),
         REFERENCIA.strftime("%d/%m/%Y"), MESES_PERIODO, DIAS_UTEIS))
    a("")
    a("Todos os números deste relatório também estão em CSV, na pasta "
      "`entregas`: base completa (`funcionarios-yg.csv`), agregado por setor "
      "(`resumo-por-setor.csv`), indicadores (`indicadores-rh-yg.csv`) e "
      "distribuições (`distribuicoes-rh-yg.csv`). O relatório é gerado a partir "
      "da mesma função que gera os CSV, então os dois não podem divergir.")
    a("")
    a("> **Dados fictícios.** Nenhum dado pessoal real foi usado: não há CPF, "
      "nome de pessoa real nem contato de ninguém. Gerado por "
      "`simular_rh_yg.py` com semente fixa, o que torna a base reproduzível "
      "e conferível.")
    a("")

    a("## 1. Resumo executivo")
    a("")
    a("| Indicador | Valor | Unidade | Como foi calculado |")
    a("|---|---|---|---|")
    for linha in ind_linhas:
        a("| %s | %s | %s | %s |" % (linha["indicador"],
                                      valor_com_unidade(linha),
                                      linha["unidade"],
                                      linha["como_foi_calculado"]))
    a("")

    a("## 2. Composição por setor")
    a("")
    a("| Setor | Quadro | Part. | Deslig. 9m | Rotat. anual. | Salário médio "
      "| Mediano | Casa (anos) | Absent. | Mulheres | Risco alto |")
    a("|---|---|---|---|---|---|---|---|---|---|---|")
    for s in setores:
        a("| %s | %d | %s%% | %d | %s%% | R$ %s | R$ %s | %s | %s%% | %s%% "
          "| %s%% |"
          % (s["setor"], s["quadro_total"], fmt(s["participacao"], 1),
             s["desligados_9m"], fmt(s["turnover_anualizado"], 1),
             fmt(s["salario_medio"]), fmt(s["salario_mediano"]),
             fmt(s["tempo_de_casa_medio"], 1), fmt(s["absenteismo"], 2),
             fmt(s["pct_mulheres"], 1), fmt(s["pct_risco_alto"], 1)))
    a("| **Total** | **%d** | **100,0%%** | **%d** | **%s%%** | **R$ %s** | "
      "**R$ %s** | **%s** | **%s%%** | **%s%%** | **%s%%** |"
      % (ind["total"], ind["desligados"], fmt(ind["turnover"], 1),
         fmt(ind["sal_medio"]), fmt(ind["sal_mediana"]),
         fmt(ind["tempo_medio"], 1), fmt(ind["absenteismo"], 2),
         fmt(ind["pct_mulheres"], 1),
         fmt(percentual(risco_alto, ind["ativos"]), 1)))
    a("")

    a("## 3. Números por nível e por cargo")
    a("")
    tabela_distribuicao(L, "3.1 Por nível (quadro completo)", dist_linhas,
                        "Nivel")
    a("")
    tabela_distribuicao(L, "3.2 Por cargo e nível", dist_linhas, "Cargo")
    a("")

    a("## 4. Contratos, jornada e turno")
    a("")
    tabela_distribuicao(L, "4.1 Tipo de contrato (quadro completo)",
                        dist_linhas, "Tipo de contrato")
    tabela_distribuicao(L, "4.2 Turno", dist_linhas, "Turno")
    tabela_distribuicao(L, "4.3 Jornada semanal", dist_linhas, "Jornada semanal")
    a("")

    a("## 5. Perfil do quadro ativo")
    a("")
    tabela_distribuicao(L, "5.1 Faixa etária", dist_linhas, "Faixa etaria")
    tabela_distribuicao(L, "5.2 Tempo de casa", dist_linhas, "Tempo de casa")
    tabela_distribuicao(L, "5.3 Sexo", dist_linhas, "Sexo")
    tabela_distribuicao(L, "5.4 Escolaridade", dist_linhas, "Escolaridade")
    tabela_distribuicao(L, "5.5 Posicionamento salarial frente à referência de mercado",
                        dist_linhas, "Posicionamento salarial")
    a("")
    a("A referência de mercado de cada cargo é o ponto médio da faixa salarial "
      "definida no quadro organizacional do script. \"Abaixo da mediana\" é "
      "menos de 92% do ponto médio; \"Acima da mediana\", mais de 108%.")
    a("")

    a("## 6. Saídas e risco de rotatividade")
    a("")
    tabela_distribuicao(L, "6.1 Motivo do desligamento", dist_linhas,
                        "Motivo do desligamento")
    a("")
    a("| Indicador | Valor |")
    a("|---|---|")
    a("| Desligamentos no período | %s |" % valor_ind["Desligados no período"])
    a("| Saídas voluntárias (pedido de demissão e acordo) | %s |"
      % valor_ind["Saídas voluntárias no período"])
    a("| Saídas involuntárias (demissão, reestruturação, fim de contrato) "
      "| %s |" % valor_ind["Saídas involuntárias no período"])
    a("| Rotatividade voluntária | %s ao ano |"
      % valor_ind["Rotatividade voluntária anualizada"])
    a("| Rotatividade involuntária | %s ao ano |"
      % valor_ind["Rotatividade involuntária anualizada"])
    a("")
    a("Sair por pedido próprio e sair por demissão não são o mesmo problema. A "
      "primeira costuma indicar salário, cargo ou ambiente; a segunda, uma "
      "decisão de custo da empresa. Misturar as duas esconde a causa.")
    a("")
    tabela_distribuicao(L, "6.2 Risco de turnover por escore", dist_linhas,
                        "Risco de turnover")
    a("")
    a("O escore soma pontos por tempo de casa curto, nota de desempenho baixa, "
      "salário abaixo da mediana, ausência longa e contrato como pessoa "
      "jurídica. Quatro pontos ou mais é risco alto. Não é modelo preditivo: "
      "é uma regra de leitura para priorizar conversa de retenção.")
    a("")

    a("## 7. Maiores salários do quadro ativo")
    a("")
    a("| Matrícula | Setor | Cargo | Salário total | Referência | Posicionamento |")
    a("|---|---|---|---|---|---|")
    for p in topo:
        a("| %s | %s | %s (%s) | R$ %s | R$ %s | %s |"
          % (p["matricula"], p["setor"], p["cargo"], NIVEIS_ROTULO[p["nivel"]],
              fmt(p["salario_total"]), inteiro(p["salario_referencia_mercado"]),
             p["posicionamento_salarial"]))
    a("")

    a("## 8. Quanto custa trocar uma pessoa")
    a("")
    demissao = sum(p["salario_total"] for p in desligados) / len(desligados)
    custo_sub = demissao * 0.45 + ind["sal_medio"] * 0.6
    a("| Item | Valor | Hipótese |")
    a("|---|---|---|")
    a("| Custo médio de um desligado | R$ %s | salário total médio de quem "
      "saiu no período |" % fmt(demissao))
    a("| Custo de rescisão | R$ %s | 45%% do salário: aviso prévio proporcional "
      "+ férias + 13º + multa de 40%% sobre o saldo do FGTS |"
      % fmt(demissao * 0.45))
    a("| Custo de reposição | R$ %s | 60%% do salário médio da empresa (R$ %s), "
      "referente a recrutamento e treinamento da vaga |"
      % (fmt(ind["sal_medio"] * 0.6), fmt(ind["sal_medio"])))
    a("| Custo total por substituição | R$ %s | rescisão + reposição |"
      % fmt(custo_sub))
    a("| Custo do turnover do período | R$ %s | custo por substituição × %d "
      "desligamentos |" % (inteiro(custo_sub * ind["desligados"]), ind["desligados"]))
    a("")
    a("O tempo até a vaga voltar a produzir não entra na conta. Se cada "
      "substituto leva quatro meses para atingir a produtividade anterior, o "
      "custo por substituição sobe e o cálculo acima subestima o impacto.")
    a("")

    a("## 9. O que esta base não permite afirmar")
    a("")
    a("- **Os números são simulados.** Nenhuma conclusão aqui descreve a YG "
      "ou o mercado de trabalho real.")
    a("- **A base é uma fotografia, não uma série.** Há uma única data de "
      "referência. Sem histórico mensal não dá para calcular rotatividade "
      "mensal, absenteísmo por mês nem evolução da folha.")
    a("- **O período é de %d meses, não de 12.** A anualização usa 12/%d e "
      "pressupõe ritmo constante de desligamento, o que quase nunca acontece: "
      "as dispensas se concentram em janeiro, fevereiro e julho."
      % (MESES_PERIODO, MESES_PERIODO))
    a("- **O custo de encargos é uma hipótese única de %.0f%%.** O custo real "
      "depende do regime de contratação, do RAT da empresa, do learning e do "
      "estado." % (ENCARGOS * 100))
    a("- **Turnover não mede qualidade de gestão.** Um mercado de trabalho "
      "aquecido afasta mais gente mesmo sem a empresa ter piorado.")
    a("- **Sexo, idade e turnover não devem ser lidos como causa.** A base foi "
      "construída com percentuais escolhidos à mão para o exercício; repetir "
      "essa leitura em dado real é erro metodológico.")
    a("- **Faltam dados que mudam a decisão:** clima organizacional, horas "
      "extras por pessoa, plano de saúde, custo por artista contratado, "
      "absenteísmo por causa (acidente, doença mental) e histórico de "
      "promoções.")
    a("")

    a("## 10. Perguntas que esta base responde")
    a("")
    a("1. Qual setor tem rotatividade anualizada acima da média da empresa?")
    a("2. O salário médio do setor está acima ou abaixo da mediana geral?")
    a("3. Quantas pessoas abaixo da mediana de mercado há no setor com maior "
      "risco alto de turnover?")
    a("4. O absenteísmo do setor com mais gente é compatível com a jornada "
      "registrada?")
    a("5. O grau de gerência é compatível com a estrutura de cargos?")
    a("6. Quanto custa, em folha, cada um dos três maiores setores?")
    a("")

    a("## 11. Como reproduzir")
    a("")
    a("```")
    a("python simular_rh_yg.py          # semente %d" % SEMENTE_PADRAO)
    a("python simular_rh_yg.py 77       # outra semente, outra base")
    a("```")
    a("")
    a("Com a mesma semente, o script devolve a mesma base, linha a linha. "
      "Trocar a semente muda nomes, datas e valores, mas mantém as 200 "
      "pessoas, os 14 setores e a mesma lógica de distribuição.")
    a("")
    a("---")
    a("")
    a("Nome e matrícula do aluno: ______________________________")
    a("")
    a("Declaração de uso de inteligência artificial: ______________")
    a("")

    os.makedirs(DIR_ENTREGAS, exist_ok=True)
    with open(ARQ_RELATORIO, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    return ARQ_RELATORIO


# ---------------------------------------------------------------------- main

def main():
    args = sys.argv[1:]
    try:
        semente = int(args[0]) if args else SEMENTE_PADRAO
    except ValueError:
        print("A semente precisa ser um número inteiro. Ex.: python "
              "simular_rh_yg.py 77")
        return 1

    titulo("SIMULAÇÃO DE RH - %s" % EMPRESA)
    pessoas = gerar_base(semente)
    ind = indicadores(pessoas)
    setores = por_setor(pessoas)
    ind_linhas = coletar_indicadores(pessoas, ind)
    dist_linhas = linhas_distribuicoes(coletar_distribuicoes(pessoas, ind))

    base = gravar_base(pessoas)
    resumo = gravar_resumo(setores)
    ind_csv = gravar_indicadores(ind_linhas)
    dist_csv = gravar_distribuicoes(dist_linhas)
    relatorio = gravar_relatorio(pessoas, ind, setores, ind_linhas, dist_linhas)

    print()
    print("Quadro simulado:         %d funcionários" % ind["total"])
    print("Ativos (sem desligados): %d" % ind["ativos"])
    print("Afastados no momento:    %d" % ind["afastados"])
    print("Em atividade:            %d" % ind["em_atividade"])
    print("Desligados (jan a set):  %d" % ind["desligados"])
    print("Setores:                 %d" % len(setores))
    print("Rotatividade anualizada: %s%%" % fmt(ind["turnover"], 1))
    print("Absenteísmo:             %s%%" % fmt(ind["absenteismo"], 2))
    print("Salário total médio:     R$ %s" % fmt(ind["sal_medio"]))
    print("Salário total mediano:   R$ %s" % fmt(ind["sal_mediana"]))
    print("Folha mensal:            R$ %s" % inteiro(ind["folha_mensal"]))
    print("Tempo de casa médio:     %s anos" % fmt(ind["tempo_medio"], 1))
    print()
    print("Arquivos gravados na pasta " + DIR_ENTREGAS + ":")
    print("  %-28s %d linhas, %d colunas"
          % (base, len(pessoas), len(COLUNAS)))
    print("  %-28s %d setores" % (resumo, len(setores)))
    print("  %-28s %d indicadores" % (ind_csv, len(ind_linhas)))
    print("  %-28s %d categorias" % (dist_csv, len(dist_linhas)))
    print("  %s" % relatorio)
    print()
    print("Confira a consistência:")
    print("  %d linhas de dados + 1 cabeçalho em %s" % (ind["total"], base))
    print("  a soma de quadro_total em %s deve dar %d"
          % (resumo, ind["total"]))
    print("  a soma de subordinados_diretos em %s deve dar %d, que é o "
          "quadro sem cargo de gestão" % (base, ind["nao_gestores"]))
    print()
    print("Todos os dados são fictícios (Lei nº 13.709/2018 — LGPD).")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        sys.exit(main())
    except BrokenPipeError:
        sys.exit(0)
    except KeyboardInterrupt:
        print()
        print("Interrompido.")
        sys.exit(1)
