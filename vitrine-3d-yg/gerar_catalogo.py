#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
 CATÁLOGO DE PRODUTOS DA YG MÚSICA E ENTRETENIMENTO S.A.
 30 lançamentos | álbuns, EPs e singles | dados fictícios
==============================================================================

O QUE ESTE ARQUIVO É
    Gera o catálogo de produtos (lançamentos) da gravadora YG, que a página 3D
    (index.html) apresenta. São dados simulados, do mesmo universo da
    simulação de RH entregue antes.

    A geração é DETERMINÍSTICA: a mesma semente devolve sempre o mesmo
    catálogo. Isso permite conferir item a item e comparar com a versão
    anterior sem que um número mude sozinho.

COMO USAR

    python gerar_catalogo.py           semente 2026
    python gerar_catalogo.py 77        outra semente, outro catálogo

SAÍDAS, em dados/
    catalogo-yg.js      catálogo pronto para a página (window.CATALOGO_YG)
    produtos-yg.csv     1 linha por produto
    faixas-yg.csv       1 linha por faixa

NADA DEPENDE DE BIBLIOTECA EXTERNA
    Só a biblioteca padrão do Python. Os CSV saem separados por ponto e
    vírgula e com acentuação, que é o que o Excel em português abre sem
    perguntar nada.
==============================================================================
"""

import csv
import json
import os
import random
import sys
from datetime import date, timedelta

SEMENTE_PADRAO = 2026
REFERENCIA = date(2026, 9, 30)
INICIO_LANCAMENTOS = date(2021, 1, 1)

DIR_DADOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dados")
ARQ_JS = os.path.join(DIR_DADOS, "catalogo-yg.js")
ARQ_PRODUTOS = os.path.join(DIR_DADOS, "produtos-yg.csv")
ARQ_FAIXAS = os.path.join(DIR_DADOS, "faixas-yg.csv")

EMPRESA = "YG Música e Entretenimento S.A."
TIPOS = ["Álbum", "EP", "Single"]

# -------------------------------------------------------------------- tabelas

SELOS = ["YG Music", "YG Urbano", "YG Clássicos", "YG Sertanejo", "YG Sessions"]

FORMATOS = ["Vinil 180 g", "CD", "Vinil colorido", "K7"]
# `formato` é sempre a edição física; o download entra à parte, em
# `preco_digital`. Single sai em 7 polegadas ou em cassete.
FORMATOS_POR_TIPO = {
    "Single": ["Vinil 7\"", "K7"],
}

# Observação de venda por formato físico, para o texto fazer sentido com o que
# aparece no preço.
OBSERVACAO_POR_FORMATO = {
    "Vinil 180 g": "Vinil de 180 g e download digital.",
    "Vinil colorido": "Edição colorida em vinil e download digital.",
    'Vinil 7"': "Download digital e vinil de 7 polegadas.",
    "CD": "CD e download digital.",
    "K7": "Cassete e download digital.",
}

STATUS = ["Disponível", "Pré-venda", "Esgotado"]

# gênero -> (peso no catálogo, menor duração de faixa, maior duração de faixa)
GENEROS = [
    ("MPB", 16, (180, 320)),
    ("Pop", 14, (170, 240)),
    ("Samba", 12, (190, 300)),
    ("Rap", 11, (150, 260)),
    ("Rock", 10, (200, 330)),
    ("Bossa Nova", 8, (190, 280)),
    ("Sertanejo", 8, (180, 250)),
    ("Funk", 7, (140, 200)),
    ("Eletrônico", 6, (210, 380)),
    ("Forró", 5, (170, 240)),
    ("Pagode", 5, (190, 260)),
    ("Gospel", 4, (200, 300)),
    ("Infantil", 4, (120, 200)),
]

ARTISTAS = [
    ("Luara Mendes", "MPB"),
    ("Tom Bastos", "MPB"),
    ("Clara Villela", "MPB"),
    ("Os Originais", "Samba"),
    ("Marta Cavalcante", "Samba"),
    ("Ciranda do Norte", "Forró"),
    ("MC Derick Zona", "Funk"),
    ("Bru Ferreira", "Funk"),
    ("Rafa Cordeiro", "Rap"),
    ("Sintaxe Urbana", "Rap"),
    ("Nathalia Prado", "Pop"),
    ("Verão Elétrico", "Pop"),
    ("Pedra Alta", "Rock"),
    ("Tuia", "Rock"),
    ("Helena Vasques", "Bossa Nova"),
    ("Duo Orla", "Bossa Nova"),
    ("João Vitor & Bruna", "Sertanejo"),
    ("Chico do Vale", "Sertanejo"),
    ("Prisma Sonoro", "Eletrônico"),
    ("DJ Kalebe", "Eletrônico"),
    ("Grupo Beira Rio", "Pagode"),
    ("Voz da Aliança", "Gospel"),
    ("Turma do Grilo Falante", "Infantil"),
    ("Solange Reis", "MPB"),
    ("Banda Farol Baixo", "Rock"),
    ("Nina Dourado", "Pop"),
    ("Em Canto & Prosa", "Samba"),
    ("Rebeca Antunes", "Gospel"),
    ("Trilha do Cerrado", "Sertanejo"),
    ("Coletivo Área 92", "Rap"),
]

PALAVRAS_TITULO = [
    "Cidade Submersa", "Meia-Noite", "Vento Solar", "Alta Fidelidade",
    "Mar de Dentro", "Fim de Tarde", "Luz de Neon", "Quarta-Feira",
    "Amanhã Cedo", "Sem Pressa", "Portas Abertas", "Superfície",
    "Norte", "Intervalo", "Correnteza", "Feito a Mão", "Ruído Branco",
    "Poeira de Estrada", "Sala de Espera", "Acesso Total", "Rota 12",
    "Pele e Osso", "Dentro do Peito", "Espelho d'Água", "Bem-Te-Vi",
    "Fogo Brando", "Linha de Frente", "Do Lado de Lá", "Campo Minado",
    "Agora ou Nunca", "Primeira Sessão", "Areia Fina", "Zona Leste",
    "Palavra Solta", "Estúdio 3", "Sinal Fechado", "Terra Firme",
    "Sob a Luz", "Mais Uma Volta", "Ponto de Fusão", "Enseada",
    "Voz de Dentro", "Hoje é Sempre", "Cais", "Vermelho Absoluto",
    "Cem Anos de Som", "Águas Raras", "Passo Largo", "Noite Inteira",
    "Contraluz",
]

PALAVRAS_FAIXA = [
    "Abertura", "Primeira Sessão", "Corredor", "Janela", "Fresta",
    "Sem Aviso", "Sinal Aberto", "Linha Torta", "Sal e Vento", "Amanhecer",
    "Interlúdio", "Ponte", "Refrão de Casa", "Volta e Meia", "Retrato",
    "Cinzas", "Temporada", "Outro Lado", "Vento Norte", "Cais Dois",
    "Amanhã", "Quase", "Nada Sério", "Direto ao Ponto", "Aos Poucos",
    "Um Tanto", "Fim do Expediente", "Madrugada", "Ponto Final",
    "Recomeço", "Passagem", "Distorção", "Beco", "Farol", "Miragem",
    "Terreno Batido", "Fita Verde", "Código", "Palco Vazio", "Encore",
]

MOTIVOS_ESGOTADO = [
    "Edição limitada de 300 cópias",
    "Prensagem esgotada no distribuidor",
    "Tiragem de colecionador",
]

DESCRICOES = [
    "Gravado ao vivo em três noites seguidas, sem overbus.",
    "Primeiro registro de estúdio da fase mais recente do artista.",
    "Projeto que cruza a tradição da faixa com a produção atual.",
    "Disco de transição, feito entre duas turnês.",
    "Aposta acústica sobre um repertório que já era conhecido.",
    "Produção da casa com convidados de fora do selo.",
    "Material pensado para tocar no rádio e no palco do mesmo jeito.",
    "Resultado de um ano de composição em residência no estúdio próprio.",
]

# preços em centavos, para o CSV sair com o valor exato e sem erro de arredondamento
PRECO = {
    "Álbum": {"digital": (2490, 3990, 10), "fisico": (14990, 27990, 500)},
    "EP": {"digital": (1490, 2290, 10), "fisico": (6990, 9990, 500)},
    "Single": {"digital": (490, 990, 10), "fisico": (2990, 3990, 10)},
}

N_FAIXAS = {"Álbum": (9, 14), "EP": (4, 6), "Single": (1, 3)}
FAIXAS_ESTOQUE = {"Álbum": (120, 2400), "EP": (80, 900), "Single": (30, 400)}
FORMAS_CAPA = ["círculos", "ondas", "linhas", "triângulos", "grade"]


# ------------------------------------------------------------------ utilidades

def distribuir(total, pesos):
    """Reparte `total` em partes inteiras pelo método do maior resto.

    A soma das partes fecha exatamente com o total, que é o que impede o
    catálogo de ter 29 ou 31 produtos.
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


def data_aleatoria(rng, inicio, fim):
    return inicio + timedelta(days=rng.randint(0, (fim - inicio).days))


def fmt(valor, casas=2):
    """Número no formato brasileiro: ponto de milhar e vírgula decimal."""
    texto = format(valor, ",.%df" % casas)
    return texto.replace(",", "\x00").replace(".", ",") \
        .replace("\x00", ".")


def hms(segundos):
    return "%d:%02d" % (segundos // 60, segundos % 60)


def tipo_do_lancamento(rng, genero):
    """Define o porte do lançamento a partir do gênero e da fase do artista."""
    rolagem = rng.random()
    if genero in ("Infantil", "Gospel", "Eletrônico"):
        return "EP" if rolagem < 0.55 else "Single"
    if genero in ("Funk", "Rap", "Pop"):
        return "Single" if rolagem < 0.5 else "Álbum"
    if rolagem < 0.22:
        return "Single"
    if rolagem < 0.45:
        return "EP"
    return "Álbum"


def gerar_id(tipo, numero):
    prefixo = {"Álbum": "ALB", "EP": "EP", "Single": "SGL"}[tipo]
    return "YG-%s-%04d" % (prefixo, numero)


# --------------------------------------------------------------- geração itens

def gerar_produto(rng, numero, artista, genero, tipo, titulos_usados):
    minimo, maximo = N_FAIXAS[tipo]

    titulo = rng.choice(PALAVRAS_TITULO)
    while titulo in titulos_usados:
        titulo = rng.choice(PALAVRAS_TITULO)
    titulos_usados.add(titulo)

    faixas = []
    nomes_usados = set()
    for n in range(1, rng.randint(minimo, maximo) + 1):
        # A faixa que fecha o disco leva o nome do disco.
        nome = titulo if n > 0 and rng.random() < 0.12 else \
            rng.choice(PALAVRAS_FAIXA)
        if nome in nomes_usados:
            nome = "%s (versão longa)" % nome
        nomes_usados.add(nome)
        faixas.append({"numero": n, "titulo": nome,
                       "duracao_seg": rng.randint(170, 330)})

    lancamento = data_aleatoria(rng, INICIO_LANCAMENTOS, REFERENCIA)
    if tipo == "Single" and rng.random() < 0.35:
        lancamento = REFERENCIA + timedelta(days=rng.randint(15, 120))

    h1 = rng.randrange(0, 360)
    return {
        "id": gerar_id(tipo, numero),
        "titulo": titulo,
        "artista": artista,
        "tipo": tipo,
        "genero": genero,
        "selo": rng.choice(SELOS),
        "formato": rng.choice(FORMATOS_POR_TIPO.get(tipo, FORMATOS)),
        "data_lancamento": lancamento.strftime("%d/%m/%Y"),
        "data_iso": lancamento.isoformat(),
        "faixas": faixas,
        "duracao_total_seg": sum(f["duracao_seg"] for f in faixas),
        "preco_digital": rng.randrange(*PRECO[tipo]["digital"]),
        "preco_fisico": rng.randrange(*PRECO[tipo]["fisico"]),
        "descricao": rng.choice(DESCRICOES),
        "capa": {
            "h1": h1,
            "h2": (h1 + rng.randrange(40, 200)) % 360,
            "h3": (h1 + rng.randrange(180, 320)) % 360,
            "forma": rng.choice(FORMAS_CAPA),
        },
    }


def aplicar_disponibilidade(produtos):
    """Define situação, estoque e observação de cada produto.

    A regra é por posição no catálogo, não por sorteio: um a cada sete
    lançamentos esgota, e o que tem data futura entra em pré-venda. Assim o
    catálogo sempre mostra os três estados, o que importa numa vitrine de
    vendas, e continua idêntico entre execuções.
    """
    for i, p in enumerate(produtos):
        futuro = p["data_iso"] > REFERENCIA.isoformat()
        if futuro:
            p["status"] = "Pré-venda"
            p["estoque"] = 500 + (i * 137) % 2500
            p["observacao"] = "Lançamento previsto para %s" % \
                p["data_lancamento"]
        elif (i + 1) % 7 == 0:
            p["status"] = "Esgotado"
            p["estoque"] = 0
            p["observacao"] = MOTIVOS_ESGOTADO[i % len(MOTIVOS_ESGOTADO)]
        else:
            p["status"] = "Disponível"
            minimo, maximo = FAIXAS_ESTOQUE[p["tipo"]]
            p["estoque"] = minimo + (i * 271) % (maximo - minimo)
            p["observacao"] = OBSERVACAO_POR_FORMATO[p["formato"]]
    return produtos


def gerar_catalogo(semente):
    rng = random.Random(semente)
    total = 30

    # Cada gênero recebe uma cota proporcional ao peso e cada artista fica
    # ligado a um gênero, o que evita catálogo com "% de MPB" em tudo.
    cotas = distribuir(total, [g[1] for g in GENEROS])
    por_genero = {}
    for artista, genero in ARTISTAS:
        por_genero.setdefault(genero, []).append(artista)

    produtos = []
    titulos_usados = set()
    numero = 1
    for (genero, _peso, _dur), cota in zip(GENEROS, cotas):
        candidatos = por_genero.get(genero, [])
        for i in range(cota):
            artista = candidatos[i % len(candidatos)]
            tipo = tipo_do_lancamento(rng, genero)
            produtos.append(gerar_produto(rng, numero, artista, genero, tipo,
                                          titulos_usados))
            numero += 1

    aplicar_disponibilidade(produtos)
    produtos.sort(key=lambda p: (p["data_iso"], p["id"]))
    return produtos


# ---------------------------------------------------------------------- saída

def gravar_js(produtos):
    """Grava o catálogo como JS global, que a página carrega por <script>.

    Um .js em vez de .json de propósito: abrir a página direto do disco
    (file://) com fetch() é bloqueado pelo navegador, e assim funciona sem
    servidor nenhum.
    """
    os.makedirs(DIR_DADOS, exist_ok=True)
    formatos = sorted({p["formato"] for p in produtos})
    pacote = {
        "empresa": EMPRESA,
        "referencia": REFERENCIA.strftime("%d/%m/%Y"),
        "moeda": "BRL",
        "tipos": TIPOS,
        "formatos": formatos,
        "produtos": produtos,
    }
    with open(ARQ_JS, "w", encoding="utf-8") as f:
        f.write("// Arquivo gerado por gerar_catalogo.py. Não editar à mão.\n")
        f.write("// Carregado pela página index.html.\n")
        f.write("window.CATALOGO_YG = ")
        json.dump(pacote, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    return ARQ_JS


def gravar_produtos_csv(produtos):
    os.makedirs(DIR_DADOS, exist_ok=True)
    campos = ["id", "titulo", "artista", "tipo", "genero", "selo", "formato",
              "data_lancamento", "status", "faixas", "duracao",
              "preco_digital", "preco_fisico", "estoque", "observacao"]
    with open(ARQ_PRODUTOS, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";")
        w.writeheader()
        for p in produtos:
            w.writerow({
                "id": p["id"],
                "titulo": p["titulo"],
                "artista": p["artista"],
                "tipo": p["tipo"],
                "genero": p["genero"],
                "selo": p["selo"],
                "formato": p["formato"],
                "data_lancamento": p["data_lancamento"],
                "status": p["status"],
                "faixas": len(p["faixas"]),
                "duracao": hms(p["duracao_total_seg"]),
                "preco_digital": "R$ " + fmt(p["preco_digital"] / 100.0),
                "preco_fisico": "R$ " + fmt(p["preco_fisico"] / 100.0),
                "estoque": p["estoque"],
                "observacao": p["observacao"],
            })
    return ARQ_PRODUTOS


def gravar_faixas_csv(produtos):
    os.makedirs(DIR_DADOS, exist_ok=True)
    campos = ["produto_id", "produto", "artista", "numero", "faixa", "duracao"]
    with open(ARQ_FAIXAS, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";")
        w.writeheader()
        for p in produtos:
            for faixa in p["faixas"]:
                w.writerow({
                    "produto_id": p["id"],
                    "produto": p["titulo"],
                    "artista": p["artista"],
                    "numero": faixa["numero"],
                    "faixa": faixa["titulo"],
                    "duracao": hms(faixa["duracao_seg"]),
                })
    return ARQ_FAIXAS


# ----------------------------------------------------------------------- main

def main():
    args = sys.argv[1:]
    try:
        semente = int(args[0]) if args else SEMENTE_PADRAO
    except ValueError:
        print("A semente precisa ser um número inteiro. "
              "Ex.: python gerar_catalogo.py 77")
        return 1

    print()
    print("=" * 74)
    print(" CATÁLOGO DE PRODUTOS - %s" % EMPRESA)
    print("=" * 74)
    print()

    produtos = gerar_catalogo(semente)
    js = gravar_js(produtos)
    csv_produtos = gravar_produtos_csv(produtos)
    csv_faixas = gravar_faixas_csv(produtos)

    por_tipo = {}
    por_status = {}
    por_genero = {}
    for p in produtos:
        por_tipo[p["tipo"]] = por_tipo.get(p["tipo"], 0) + 1
        por_status[p["status"]] = por_status.get(p["status"], 0) + 1
        por_genero[p["genero"]] = por_genero.get(p["genero"], 0) + 1

    n_faixas = sum(len(p["faixas"]) for p in produtos)
    artistas = len(set(p["artista"] for p in produtos))
    total = len(produtos)

    print("Produtos no catálogo:    %d" % total)
    print("Faixas somadas:          %d" % n_faixas)
    print("Artistas:                %d" % artistas)
    print("Gêneros:                 %d" % len(por_genero))
    print()
    print("Por tipo:   " + " | ".join("%s: %d" % (k, v)
                                      for k, v in sorted(por_tipo.items())))
    print("Por status: " + " | ".join("%s: %d" % (k, v)
                                      for k, v in sorted(por_status.items())))
    print()
    print("Preço digital médio: R$ %s"
          % fmt(sum(p["preco_digital"] for p in produtos) / 100.0 / total))
    print("Preço físico médio:  R$ %s"
          % fmt(sum(p["preco_fisico"] for p in produtos) / 100.0 / total))
    print()
    print("Arquivos gravados:")
    print("  " + js)
    print("  " + csv_produtos)
    print("  " + csv_faixas)
    print()
    print("Abra index.html para ver a vitrine 3D.")
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
