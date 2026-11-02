/* =========================================================================
   Lógica da página — estado, renderização, interações e atualização via API.
   ========================================================================= */
(function () {
  'use strict';

  var G = window.Graficos;
  var fmt = G.formatos;
  var esc = G.escapar;

  function $(seletor, contexto) {
    return (contexto || document).querySelector(seletor);
  }
  function $$(seletor, contexto) {
    return Array.prototype.slice.call((contexto || document).querySelectorAll(seletor));
  }

  var estado = {
    dados: window.SIDRA_SNAPSHOT || null,
    metrica: 'taxas',
    setor: 'todos',
    eco: 'fontes',
    obst: 'comparar',
    tabela: { busca: '', coluna: 'tema', dir: 1, linhas: [] },
    atualizando: false
  };

  if (!estado.dados) {
    var avisoFalha = document.createElement('div');
    avisoFalha.className = 'noscript';
    avisoFalha.textContent = 'Não foi possível carregar o snapshot de dados (dados/snapshot.js).';
    document.body.appendChild(avisoFalha);
    return;
  }

  var CORES = {
    verde: 'var(--verde-claro)',
    lima: 'var(--lima)',
    ambar: 'var(--ambar)',
    coral: 'var(--coral)',
    azul: 'var(--azul)'
  };

  var NOMES_TABELAS = {
    5453: 'Empresas, tipos de inovação e setores',
    5018: 'Série histórica e dispêndios',
    5464: 'Dispêndios por atividade inovativa',
    5458: 'Grau de novidade',
    5618: 'Novos produtos nas vendas',
    5643: 'Fontes de informação',
    5921: 'Cooperação para inovação',
    5924: 'Apoio do governo',
    5926: 'Obstáculos à inovação',
    5927: 'Inovação organizacional e de marketing',
    5928: 'Biotecnologia e nanotecnologia'
  };

  /* ------------------------------ Auxiliares ----------------------------- */
  function taxaInovacao(t) {
    return t && t.empresas ? (t.inovadoras / t.empresas) * 100 : null;
  }
  function taxaAmpla(t) {
    return t && t.empresas && t.inovadoras != null && t.apenasOrgMarketing != null
      ? ((t.inovadoras + t.apenasOrgMarketing) / t.empresas) * 100
      : null;
  }
  function variacao(atual, anterior) {
    if (atual == null || !anterior) return null;
    return (atual / anterior - 1) * 100;
  }
  function dataCurta(iso) {
    if (!iso) return '—';
    var partes = String(iso).slice(0, 10).split('-');
    if (partes.length !== 3) return String(iso);
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }
  function normalizarTexto(texto) {
    return String(texto == null ? '' : texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  function dicaLinha(rotulo, cor, valor) {
    return '<span class="dica__linha"><i style="background:' + cor + '"></i>' +
      esc(rotulo) + '<b>' + esc(valor) + '</b></span>';
  }

  /* ------------------------------- Medidores ----------------------------- */
  function renderMedidores() {
    var t = estado.dados.totais;
    var taxa = taxaInovacao(t);
    var ampla = taxaAmpla(t);
    var amplas = t.inovadoras != null && t.apenasOrgMarketing != null
      ? t.inovadoras + t.apenasOrgMarketing
      : null;

    G.medidor($('#medidor-produto'), {
      valor: taxa || 0,
      rotulo: 'Produto ou processo',
      detalhe: fmt.num(t.inovadoras) + ' empresas',
      cor: 'var(--lima)'
    });
    G.medidor($('#medidor-amplo'), {
      valor: ampla || 0,
      rotulo: 'Sentido amplo',
      detalhe: fmt.num(amplas) + ' empresas',
      cor: 'var(--ambar)'
    });
  }

  /* --------------------------------- KPIs -------------------------------- */
  function renderKpis() {
    var d = estado.dados;
    var t = d.totais;
    var serie = d.serie || [];
    var s17 = serie.filter(function (s) { return s.periodo === 2017; })[0] || serie[serie.length - 1] || {};
    var s14 = serie.filter(function (s) { return s.periodo === 2014; })[0] || serie[serie.length - 2] || {};

    var deltaTaxa = s17.taxa != null && s14.taxa != null ? s17.taxa - s14.taxa : null;
    var deltaGasto = variacao(s17.dispendios, s14.dispendios);
    var deltaPD = variacao(s17.pdInterno, s14.pdInterno);

    var cartoes = [
      {
        rotulo: 'Empresas pesquisadas',
        valor: fmt.num(t.empresas),
        nota: 'indústria, energia e serviços selecionados, com 10 ou mais pessoas ocupadas',
        cor: CORES.azul
      },
      {
        rotulo: 'Inovadoras em produto ou processo',
        valor: fmt.num(t.inovadoras),
        nota: fmt.pct(taxaInovacao(t), 1) + ' do total pesquisado',
        cor: CORES.verde,
        delta: deltaTaxa == null ? null : {
          texto: (deltaTaxa < 0 ? '−' : '+') + fmt.dec(Math.abs(deltaTaxa), 1) + ' p.p. vs 2014',
          classe: deltaTaxa < 0 ? 'kpi__delta--baixa' : 'kpi__delta--alta'
        }
      },
      {
        rotulo: 'Gasto em inovação',
        valor: fmt.moeda(t.dispendios),
        nota: fmt.pct(s17.intensidade, 2) + ' da receita líquida',
        cor: CORES.ambar,
        delta: deltaGasto == null ? null : {
          texto: (deltaGasto < 0 ? '−' : '+') + fmt.dec(Math.abs(deltaGasto), 1) + '% vs 2014',
          classe: deltaGasto < 0 ? 'kpi__delta--baixa' : 'kpi__delta--alta'
        }
      },
      {
        rotulo: 'P&D interno',
        valor: fmt.moeda(t.pdInterno),
        nota: fmt.pct(s17.intensidadePD, 2) + ' da receita líquida',
        cor: CORES.verde,
        delta: deltaPD == null ? null : {
          texto: (deltaPD < 0 ? '−' : '+') + fmt.dec(Math.abs(deltaPD), 1) + '% vs 2014',
          classe: deltaPD < 0 ? 'kpi__delta--baixa' : 'kpi__delta--alta'
        }
      },
      {
        rotulo: 'Apoio do governo',
        valor: fmt.pct(d.apoio.total / t.inovadoras * 100, 1),
        nota: fmt.num(d.apoio.total) + ' empresas usaram algum instrumento',
        cor: CORES.azul
      },
      {
        rotulo: 'Cooperação',
        valor: fmt.pct(d.cooperacao.total / t.inovadoras * 100, 1),
        nota: fmt.num(d.cooperacao.total) + ' empresas cooperaram com parceiros',
        cor: CORES.coral
      }
    ];

    $('#kpis').innerHTML = cartoes.map(function (c) {
      return '<article class="kpi" style="--cor-kpi:' + c.cor + '">' +
        '<p class="kpi__rotulo">' + esc(c.rotulo) + '</p>' +
        '<p class="kpi__valor">' + esc(c.valor) + '</p>' +
        '<p class="kpi__nota">' + esc(c.nota) + '</p>' +
        (c.delta ? '<span class="kpi__delta ' + c.delta.classe + '">' + esc(c.delta.texto) + '</span>' : '') +
        '</article>';
    }).join('');
  }

  /* ------------------------------- Evolução ------------------------------ */
  function renderEvolucao() {
    var d = estado.dados;
    var serie = d.serie || [];
    var grafico = $('#evolucao-grafico');
    var legendaEl = $('#evolucao-legenda');
    var nota = $('#evolucao-nota');
    if (!serie.length) return;

    var primeiro = serie[0];
    var ultimo = serie[serie.length - 1];

    if (estado.metrica === 'taxas') {
      G.legenda(legendaEl, [
        { nome: 'Produto ou processo', cor: CORES.verde },
        { nome: 'Sentido amplo (inclui organização e marketing)', cor: CORES.ambar }
      ], true);
      G.linha(grafico, {
        dados: serie.map(function (s) {
          return { rotulo: String(s.periodo), pp: s.taxa, ampla: s.taxaAmpla };
        }),
        series: [
          { chave: 'pp', nome: 'Produto ou processo', cor: CORES.verde },
          { chave: 'ampla', nome: 'Sentido amplo', cor: CORES.ambar }
        ],
        formato: function (v) { return fmt.pct(v, 1); },
        formatoEixo: function (v) { return fmt.dec(v, 0) + '%'; },
        rotulo: 'Taxa de inovação das empresas brasileiras entre 2008 e 2017, em produto ou processo e em sentido amplo.'
      });
      nota.textContent = 'A taxa de inovação em produto ou processo caiu ' +
        fmt.dec(Math.abs(ultimo.taxa - primeiro.taxa), 1) + ' pontos percentuais entre ' +
        primeiro.periodo + ' e ' + ultimo.periodo + '. No conceito amplo, a queda foi de ' +
        fmt.dec(Math.abs(ultimo.taxaAmpla - primeiro.taxaAmpla), 1) + ' pontos percentuais.';
    } else if (estado.metrica === 'gastos') {
      legendaEl.innerHTML = '';
      G.barrasV(grafico, {
        dados: serie.map(function (s) {
          return { rotulo: String(s.periodo), valor: s.dispendios == null ? null : (s.dispendios * 1000) / 1e9 };
        }),
        formato: function (v) { return 'R$ ' + fmt.dec(v, 1) + ' bi'; },
        formatoEixo: function (v) { return fmt.dec(v, 0); },
        nomeSerie: 'Dispêndio',
        cor: CORES.verde,
        rotulo: 'Dispêndio total em inovação, em bilhões de reais, por ano de referência.'
      });
      var crescimento = variacao(ultimo.dispendios, primeiro.dispendios);
      nota.textContent = 'Em valores nominais, o dispêndio total cresceu ' +
        fmt.dec(Math.abs(crescimento), 1) + '% entre ' + primeiro.periodo + ' e ' + ultimo.periodo +
        '. Na comparação com 2014, porém, caiu 17,4%. Os valores não são deflacionados.';
    } else {
      G.legenda(legendaEl, [
        { nome: 'Dispêndio total / receita', cor: CORES.verde },
        { nome: 'P&D interno / receita', cor: CORES.azul }
      ], true);
      G.linha(grafico, {
        dados: serie.map(function (s) {
          return { rotulo: String(s.periodo), total: s.intensidade, pd: s.intensidadePD };
        }),
        series: [
          { chave: 'total', nome: 'Dispêndio total / receita', cor: CORES.verde },
          { chave: 'pd', nome: 'P&D interno / receita', cor: CORES.azul }
        ],
        formato: function (v) { return fmt.pct(v, 2); },
        formatoEixo: function (v) { return fmt.dec(v, 1) + '%'; },
        area: false,
        rotulo: 'Intensidade de inovação: dispêndio total e P&D interno como proporção da receita líquida.'
      });
      nota.textContent = 'A intensidade de inovação recuou de ' + fmt.pct(primeiro.intensidade, 2) +
        ' para ' + fmt.pct(ultimo.intensidade, 2) + ' do faturamento. O esforço interno em P&D caiu de ' +
        fmt.pct(primeiro.intensidadePD, 2) + ' para ' + fmt.pct(ultimo.intensidadePD, 2) + '.';
    }
  }

  /* -------------------------------- Setores ------------------------------ */
  function renderSetores() {
    var d = estado.dados;
    var lista = (d.setores || []).filter(function (s) {
      return estado.setor === 'todos' || s.grupo === estado.setor;
    }).slice().sort(function (a, b) { return (b.taxa || 0) - (a.taxa || 0); });

    if (!lista.length) {
      $('#setores-grafico').innerHTML = '<p class="painel__nota">Nenhum setor neste recorte.</p>';
      return;
    }

    var cores = { 'Indústria': CORES.verde, 'Serviços': CORES.azul, 'Energia': CORES.ambar };
    G.legenda($('#setores-legenda'), [
      { nome: 'Indústria', cor: CORES.verde },
      { nome: 'Serviços', cor: CORES.azul },
      { nome: 'Energia', cor: CORES.ambar }
    ]);

    G.barrasH($('#setores-grafico'), {
      itens: lista.map(function (s) {
        return {
          nome: s.nome,
          valor: s.taxa,
          cor: cores[s.grupo] || CORES.verde,
          alerta: s.pequena,
          secundario: fmt.num(s.inovadoras) + ' inovadoras entre ' + fmt.num(s.empresas) + ' empresas',
          dica: '<strong>' + esc(s.nome) + '</strong>' +
            dicaLinha('Taxa de inovação', cores[s.grupo] || CORES.verde, fmt.pct(s.taxa, 1)) +
            dicaLinha('Inovadoras', cores[s.grupo] || CORES.verde, fmt.num(s.inovadoras)) +
            dicaLinha('Empresas', cores[s.grupo] || CORES.verde, fmt.num(s.empresas))
        };
      }),
      formato: function (v) { return fmt.pct(v, 1); }
    });

    var top = lista[0];
    var transformacao = (d.setores || []).filter(function (s) { return s.id === 'C'; })[0];
    var participacao = transformacao && d.totais.inovadoras
      ? (transformacao.inovadoras / d.totais.inovadoras) * 100
      : null;
    var ressalva = top.pequena
      ? ' — mas a base é pequena (' + fmt.num(top.empresas) + ' empresas), o que amplia a margem de variação'
      : '';
    $('#setores-insight').innerHTML = '<strong>' + esc(top.nome) + '</strong> lidera o recorte, com ' +
      esc(fmt.pct(top.taxa, 1)) + ' de taxa de inovação' + esc(ressalva) + '. As indústrias de transformação concentram ' +
      esc(fmt.num(transformacao ? transformacao.inovadoras : null)) + ' empresas inovadoras — ' +
      esc(fmt.pct(participacao, 1)) + ' de todas as inovadoras do país.';
  }

  /* --------------------------- Tipos e novidade -------------------------- */
  function renderTipos() {
    var d = estado.dados;
    var t = d.totais;
    var soProduto = t.produto != null && t.ambos != null ? t.produto - t.ambos : null;
    var soProcesso = t.processo != null && t.ambos != null ? t.processo - t.ambos : null;

    G.rosca($('#tipos-rosca'), {
      itens: [
        { nome: 'Produto e processo', valor: t.ambos, cor: CORES.verde },
        { nome: 'Somente processo', valor: soProcesso, cor: CORES.azul },
        { nome: 'Somente produto', valor: soProduto, cor: CORES.ambar }
      ],
      centro: { valor: fmt.num(t.inovadoras), rotulo: 'inovadoras' },
      formato: fmt.num,
      rotulo: 'Distribuição das empresas inovadoras entre produto, processo e ambos.'
    });

    var coresNovidade = [CORES.verde, CORES.ambar, CORES.coral];
    var textosNovidade = ['#f7f3e8', '#0a1a12', '#ffffff'];
    function segmentos(lista) {
      return (lista || []).map(function (item, i) {
        return {
          nome: item.nome,
          valor: item.valor,
          cor: coresNovidade[i],
          texto: textosNovidade[i]
        };
      });
    }

    G.barrasEmpilhadas($('#novidade-grafico'), {
      itens: [
        { nome: 'Produto', segmentos: segmentos(d.novidade.produto) },
        { nome: 'Processo', segmentos: segmentos(d.novidade.processo) }
      ],
      formato: fmt.num
    });

    var prod = d.novidade.produto || [];
    var proc = d.novidade.processo || [];
    var totalProd = prod.reduce(function (s, i) { return s + (i.valor || 0); }, 0);
    var totalProc = proc.reduce(function (s, i) { return s + (i.valor || 0); }, 0);
    $('#novidade-nota').textContent = 'A maior parte das inovações é nova apenas para a própria empresa: ' +
      fmt.pct(prod[0].valor / totalProd * 100, 1) + ' dos produtos e ' +
      fmt.pct(proc[0].valor / totalProc * 100, 1) + ' dos processos. Ser novo para o mundo é raro — ' +
      fmt.num(prod[2].valor) + ' empresas em produto e ' + fmt.num(proc[2].valor) + ' em processo.';

    G.barrasH($('#vendas-grafico'), {
      itens: (d.vendas || []).map(function (item) {
        return {
          nome: item.nome + ' das vendas',
          valor: item.valor,
          cor: CORES.verde,
          secundario: fmt.pct(item.valor / t.produto * 100, 1) + ' das empresas com inovação de produto',
          dica: '<strong>' + esc(item.nome) + ' das vendas</strong>' +
            dicaLinha('Empresas', CORES.verde, fmt.num(item.valor)) +
            dicaLinha('Participação', CORES.verde, fmt.pct(item.valor / t.produto * 100, 1))
        };
      }),
      formato: fmt.num,
      max: t.produto
    });
  }

  /* ------------------------------- Dispêndios ---------------------------- */
  function renderDispendios() {
    var d = estado.dados;
    var total = d.totais.dispendios;
    var itens = (d.dispendios || []).filter(function (i) { return i.valor != null; })
      .slice()
      .sort(function (a, b) { return b.valor - a.valor; });

    G.barrasH($('#dispendios-grafico'), {
      itens: itens.map(function (item) {
        var cor = item.nome === 'P&D interno' ? CORES.verde : 'var(--verde-2)';
        var pct = total ? (item.valor / total) * 100 : null;
        return {
          nome: item.nome,
          valor: item.valor,
          cor: cor,
          secundario: fmt.num(item.empresas) + ' empresas · ' + fmt.pct(pct, 1) + ' do gasto',
          dica: '<strong>' + esc(item.nome) + '</strong>' +
            dicaLinha('Valor', cor, fmt.moeda(item.valor)) +
            dicaLinha('Participação', cor, fmt.pct(pct, 1)) +
            dicaLinha('Empresas', cor, fmt.num(item.empresas))
        };
      }),
      formato: function (v) { return fmt.moeda(v); }
    });
  }

  /* ------------------------------ Ecossistema ---------------------------- */
  function renderEcossistema() {
    var d = estado.dados;
    var t = d.totais;
    var stat = $('#eco-stat');
    var grafico = $('#eco-grafico');
    var nota = $('#eco-nota');

    if (estado.eco === 'fontes') {
      var fontes = (d.fontes || []).filter(function (f) { return f.valor != null; })
        .slice().sort(function (a, b) { return b.valor - a.valor; });
      var topo = fontes[0];
      stat.innerHTML = '<span class="eco-stat__valor">' + esc(fmt.num(topo.valor)) + '</span>' +
        '<span class="eco-stat__texto">empresas atribuíram <strong>alta importância às redes de informação</strong> — ' +
        esc(fmt.pct(topo.valor / t.inovadoras * 100, 1)) + ' das inovadoras. É a fonte mais citada.</span>';

      G.barrasH(grafico, {
        itens: fontes.map(function (f) {
          var pct = (f.valor / t.inovadoras) * 100;
          return {
            nome: f.nome,
            valor: f.valor,
            cor: CORES.verde,
            dica: '<strong>' + esc(f.nome) + '</strong>' +
              dicaLinha('Empresas', CORES.verde, fmt.num(f.valor)) +
              dicaLinha('Das inovadoras', CORES.verde, fmt.pct(pct, 1))
          };
        }),
        formato: fmt.num
      });
      nota.textContent = 'Empresas que atribuíram alta importância a cada fonte de informação. ' +
        'Uma mesma empresa pode citar várias fontes.';
    } else if (estado.eco === 'cooperacao') {
      var coop = (d.cooperacao.itens || []).filter(function (i) { return i.valor != null; })
        .slice().sort(function (a, b) { return b.valor - a.valor; });
      stat.innerHTML = '<span class="eco-stat__valor">' + esc(fmt.num(d.cooperacao.total)) + '</span>' +
        '<span class="eco-stat__texto">empresas — <strong>' +
        esc(fmt.pct(d.cooperacao.total / t.inovadoras * 100, 1)) + ' das inovadoras</strong> — ' +
        'cooperaram com ao menos um parceiro para inovar.</span>';

      G.barrasH(grafico, {
        itens: coop.map(function (item) {
          var pct = (item.valor / d.cooperacao.total) * 100;
          return {
            nome: item.nome,
            valor: item.valor,
            cor: CORES.azul,
            dica: '<strong>' + esc(item.nome) + '</strong>' +
              dicaLinha('Empresas', CORES.azul, fmt.num(item.valor)) +
              dicaLinha('Dos cooperantes', CORES.azul, fmt.pct(pct, 1))
          };
        }),
        formato: fmt.num
      });
      nota.textContent = 'Empresas que atribuíram alta importância a cada tipo de parceiro. ' +
        'Total de empresas que cooperaram: ' + fmt.num(d.cooperacao.total) + '.';
    } else {
      var apoio = (d.apoio.itens || []).filter(function (i) { return i.valor != null; })
        .slice().sort(function (a, b) { return b.valor - a.valor; });
      stat.innerHTML = '<span class="eco-stat__valor">' + esc(fmt.num(d.apoio.total)) + '</span>' +
        '<span class="eco-stat__texto">empresas — <strong>' +
        esc(fmt.pct(d.apoio.total / t.inovadoras * 100, 1)) + ' das inovadoras</strong> — ' +
        'usaram algum instrumento de apoio público à inovação.</span>';

      G.barrasH(grafico, {
        itens: apoio.map(function (item) {
          var pct = (item.valor / d.apoio.total) * 100;
          return {
            nome: item.nome,
            valor: item.valor,
            cor: CORES.ambar,
            dica: '<strong>' + esc(item.nome) + '</strong>' +
              dicaLinha('Empresas', CORES.ambar, fmt.num(item.valor)) +
              dicaLinha('Dos apoiados', CORES.ambar, fmt.pct(pct, 1))
          };
        }),
        formato: fmt.num
      });
      nota.textContent = 'Empresas que utilizaram cada instrumento de apoio. ' +
        'Uma empresa pode usar mais de um mecanismo.';
    }
  }

  /* ------------------------------- Obstáculos ---------------------------- */
  function renderObstaculos() {
    var d = estado.dados;
    var inov = d.obstaculos.inovadoras;
    var nao = d.obstaculos.naoInovadoras;
    var legendaEl = $('#obst-legenda');
    var grafico = $('#obst-grafico');
    var nota = $('#obst-nota');

    if (estado.obst === 'comparar') {
      G.legenda(legendaEl, [
        { nome: 'Inovadoras', cor: CORES.verde },
        { nome: 'Não inovadoras', cor: CORES.coral }
      ]);
      var itens = inov.itens.map(function (item, i) {
        return {
          nome: item.nome,
          a: item.valor,
          b: nao.itens[i] ? nao.itens[i].valor : null
        };
      }).sort(function (a, b) { return (b.a + b.b) - (a.a + a.b); });

      G.barrasDuplas(grafico, {
        itens: itens,
        series: [
          { nome: 'Inovadoras', cor: CORES.verde },
          { nome: 'Não inovadoras', cor: CORES.coral }
        ],
        formato: fmt.num
      });
      nota.textContent = 'Empresas que atribuíram alta importância a cada obstáculo. ' +
        'Uma mesma empresa pode citar mais de um item.';
    } else if (estado.obst === 'inovadoras') {
      legendaEl.innerHTML = '';
      G.barrasH(grafico, {
        itens: inov.itens.filter(function (i) { return i.valor != null; })
          .slice().sort(function (a, b) { return b.valor - a.valor; })
          .map(function (item) {
            var pct = (item.valor / d.totais.inovadoras) * 100;
            return {
              nome: item.nome,
              valor: item.valor,
              cor: CORES.verde,
              dica: '<strong>' + esc(item.nome) + '</strong>' +
                dicaLinha('Empresas', CORES.verde, fmt.num(item.valor)) +
                dicaLinha('Das inovadoras', CORES.verde, fmt.pct(pct, 1))
            };
          }),
        formato: fmt.num
      });
      nota.textContent = fmt.num(inov.total) + ' empresas inovadoras (' +
        fmt.pct(inov.total / d.totais.inovadoras * 100, 1) +
        ') apontaram ao menos um obstáculo de alta importância.';
    } else {
      legendaEl.innerHTML = '';
      G.barrasH(grafico, {
        itens: nao.itens.filter(function (i) { return i.valor != null; })
          .slice().sort(function (a, b) { return b.valor - a.valor; })
          .map(function (item) {
            return {
              nome: item.nome,
              valor: item.valor,
              cor: CORES.coral,
              dica: '<strong>' + esc(item.nome) + '</strong>' +
                dicaLinha('Empresas', CORES.coral, fmt.num(item.valor))
            };
          }),
        formato: fmt.num
      });
      nota.textContent = fmt.num(nao.total) +
        ' empresas que não inovaram apontaram ao menos um obstáculo de alta importância.';
    }
  }

  /* ---------------------------- Além do produto -------------------------- */
  function renderAlem() {
    var d = estado.dados;
    var t = d.totais;
    var org = (d.organizacionais || []).filter(function (i) { return i.valor != null; })
      .slice().sort(function (a, b) { return b.valor - a.valor; });

    G.barrasH($('#alem-grafico'), {
      itens: org.map(function (item) {
        var pct = (item.valor / t.inovadoras) * 100;
        return {
          nome: item.nome,
          valor: item.valor,
          cor: CORES.azul,
          secundario: fmt.pct(pct, 1) + ' das inovadoras',
          dica: '<strong>' + esc(item.nome) + '</strong>' +
            dicaLinha('Empresas', CORES.azul, fmt.num(item.valor)) +
            dicaLinha('Das inovadoras', CORES.azul, fmt.pct(pct, 1))
        };
      }),
      formato: fmt.num
    });

    var bio = d.biotecnologia;
    var cartoes = [
      { rotulo: 'Biotecnologia', total: bio.biotecTotal, inovadoras: bio.biotecInovadoras, cor: CORES.verde },
      { rotulo: 'Nanotecnologia', total: bio.nanoTotal, inovadoras: bio.nanoInovadoras, cor: CORES.azul }
    ];

    $('#bio-cards').innerHTML = cartoes.map(function (c) {
      var pct = c.total ? (c.inovadoras / c.total) * 100 : 0;
      return '<div class="bio-card" style="--cor-bio:' + c.cor + '">' +
        '<p class="bio-card__rotulo">' + esc(c.rotulo) + '</p>' +
        '<p class="bio-card__valor">' + esc(fmt.num(c.total)) + '</p>' +
        '<p class="bio-card__nota">' + esc(fmt.num(c.inovadoras)) + ' inovadoras · ' +
        esc(fmt.pct(pct, 1)) + ' do total</p>' +
        '<div class="bio-card__barra"><span data-pct="' + pct.toFixed(1) + '"></span></div>' +
        '</div>';
    }).join('');

    requestAnimationFrame(function () {
      $$('#bio-cards .bio-card__barra span').forEach(function (el) {
        el.style.width = el.getAttribute('data-pct') + '%';
      });
    });
  }

  /* --------------------------------- Tabela ------------------------------ */
  function montarLinhas(d) {
    var linhas = [];
    function add(tema, indicador, valor, unidade, tabela) {
      if (valor == null || isNaN(valor)) return;
      linhas.push({
        tema: tema,
        indicador: indicador,
        valor: valor,
        unidade: unidade,
        tabela: tabela
      });
    }

    var t = d.totais;
    var taxa = taxaInovacao(t);
    var ampla = taxaAmpla(t);

    add('Panorama', 'Empresas no escopo da pesquisa', t.empresas, 'empresas', 5453);
    add('Panorama', 'Empresas com inovação em produto ou processo', t.inovadoras, 'empresas', 5453);
    add('Panorama', 'Taxa de inovação em produto ou processo', taxa, '%', 5453);
    add('Panorama', 'Empresas com inovação organizacional ou de marketing apenas', t.apenasOrgMarketing, 'empresas', 5018);
    add('Panorama', 'Taxa de inovação em sentido amplo', ampla, '%', 5018);
    add('Panorama', 'Empresas com projetos incompletos', t.projetosIncompletos, 'empresas', 5018);
    add('Panorama', 'Empresas com inovação de produto', t.produto, 'empresas', 5453);
    add('Panorama', 'Empresas com inovação de processo', t.processo, 'empresas', 5453);
    add('Panorama', 'Empresas com inovação de produto e processo', t.ambos, 'empresas', 5453);
    add('Panorama', 'Dispêndio total em inovação', t.dispendios, 'mil R$', 5018);
    add('Panorama', 'Receita líquida de vendas', t.receita, 'mil R$', 5018);
    add('Panorama', 'Intensidade de inovação (dispêndio / receita)', d.serie[3] ? d.serie[3].intensidade : null, '%', 5018);
    add('Panorama', 'P&D interno', t.pdInterno, 'mil R$', 5018);
    add('Panorama', 'Intensidade de P&D interno (P&D / receita)', d.serie[3] ? d.serie[3].intensidadePD : null, '%', 5018);
    add('Panorama', 'Empresas que realizaram dispêndios em inovação', t.empresasDispendios, 'empresas', 5018);
    add('Panorama', 'Empresas com P&D interno', t.empresasPD, 'empresas', 5018);

    (d.serie || []).forEach(function (s) {
      add('Série histórica', 'Taxa de inovação em produto ou processo (' + s.periodo + ')', s.taxa, '%', 5018);
      add('Série histórica', 'Taxa de inovação em sentido amplo (' + s.periodo + ')', s.taxaAmpla, '%', 5018);
      add('Série histórica', 'Empresas inovadoras (' + s.periodo + ')', s.inovadoras, 'empresas', 5018);
      add('Série histórica', 'Dispêndio em inovação (' + s.periodo + ')', s.dispendios, 'mil R$', 5018);
      add('Série histórica', 'Intensidade de inovação (' + s.periodo + ')', s.intensidade, '%', 5018);
      add('Série histórica', 'Intensidade de P&D interno (' + s.periodo + ')', s.intensidadePD, '%', 5018);
    });

    (d.setores || []).forEach(function (s) {
      add('Setores', s.nome + ' — taxa de inovação', s.taxa, '%', 5453);
      add('Setores', s.nome + ' — empresas inovadoras', s.inovadoras, 'empresas', 5453);
    });

    (d.dispendios || []).forEach(function (item) {
      add('Dispêndios', item.nome, item.valor, 'mil R$', 5464);
      add('Dispêndios', item.nome + ' — empresas', item.empresas, 'empresas', 5464);
    });

    ['produto', 'processo'].forEach(function (tipo) {
      ((d.novidade || {})[tipo] || []).forEach(function (item) {
        add('Grau de novidade', tipo.charAt(0).toUpperCase() + tipo.slice(1) + ' — ' + item.nome, item.valor, 'empresas', 5458);
      });
    });

    (d.vendas || []).forEach(function (item) {
      add('Vendas', 'Novos produtos: ' + item.nome + ' das vendas', item.valor, 'empresas', 5618);
    });

    (d.fontes || []).forEach(function (item) {
      add('Fontes de informação', item.nome, item.valor, 'empresas', 5643);
    });

    add('Cooperação', 'Empresas que cooperaram', d.cooperacao.total, 'empresas', 5921);
    (d.cooperacao.itens || []).forEach(function (item) {
      add('Cooperação', item.nome, item.valor, 'empresas', 5921);
    });

    add('Apoio do governo', 'Empresas com apoio público', d.apoio.total, 'empresas', 5924);
    (d.apoio.itens || []).forEach(function (item) {
      add('Apoio do governo', item.nome, item.valor, 'empresas', 5924);
    });

    add('Obstáculos', 'Inovadoras com obstáculo de alta importância', d.obstaculos.inovadoras.total, 'empresas', 5926);
    (d.obstaculos.inovadoras.itens || []).forEach(function (item) {
      add('Obstáculos', 'Inovadoras — ' + item.nome, item.valor, 'empresas', 5926);
    });
    add('Obstáculos', 'Não inovadoras com obstáculo de alta importância', d.obstaculos.naoInovadoras.total, 'empresas', 5926);
    (d.obstaculos.naoInovadoras.itens || []).forEach(function (item) {
      add('Obstáculos', 'Não inovadoras — ' + item.nome, item.valor, 'empresas', 5926);
    });

    (d.organizacionais || []).forEach(function (item) {
      add('Organizacional e marketing', item.nome, item.valor, 'empresas', 5927);
    });

    add('Tecnologias de fronteira', 'Empresas que usam biotecnologia', d.biotecnologia.biotecTotal, 'empresas', 5928);
    add('Tecnologias de fronteira', 'Empresas inovadoras que usam biotecnologia', d.biotecnologia.biotecInovadoras, 'empresas', 5928);
    add('Tecnologias de fronteira', 'Empresas que usam nanotecnologia', d.biotecnologia.nanoTotal, 'empresas', 5928);
    add('Tecnologias de fronteira', 'Empresas inovadoras que usam nanotecnologia', d.biotecnologia.nanoInovadoras, 'empresas', 5928);

    return linhas;
  }

  function exibirValor(linha) {
    if (linha.unidade === '%') return fmt.dec(linha.valor, 2) + '%';
    if (linha.unidade === 'mil R$') return 'R$ ' + fmt.num(linha.valor) + ' mil';
    return fmt.num(linha.valor);
  }

  function linhasFiltradas() {
    var busca = normalizarTexto(estado.tabela.busca);
    var linhas = estado.tabela.linhas.filter(function (linha) {
      if (!busca) return true;
      return normalizarTexto(linha.tema + ' ' + linha.indicador + ' ' + linha.unidade).indexOf(busca) !== -1;
    });

    var coluna = estado.tabela.coluna;
    var dir = estado.tabela.dir;
    linhas.sort(function (a, b) {
      var va = a[coluna];
      var vb = b[coluna];
      if (coluna === 'valor' || coluna === 'tabela') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
    return linhas;
  }

  function renderTabela() {
    var linhas = linhasFiltradas();
    var corpo = $('#tabela-corpo');
    var vazia = $('#tabela-vazia');

    corpo.innerHTML = linhas.map(function (linha) {
      return '<tr>' +
        '<td>' + esc(linha.tema) + '</td>' +
        '<td>' + esc(linha.indicador) + '</td>' +
        '<td class="num">' + esc(exibirValor(linha)) + '</td>' +
        '<td>' + esc(linha.unidade) + '</td>' +
        '<td class="num"><a href="https://sidra.ibge.gov.br/tabela/' + linha.tabela +
        '" target="_blank" rel="noopener">' + linha.tabela + '</a></td>' +
        '</tr>';
    }).join('');

    vazia.hidden = linhas.length > 0;
    $('#tabela-contagem').textContent = linhas.length + ' de ' + estado.tabela.linhas.length + ' indicadores';

    $$('#tabela thead th[data-coluna]').forEach(function (th) {
      var col = th.getAttribute('data-coluna');
      if (col === estado.tabela.coluna) {
        th.setAttribute('aria-sort', estado.tabela.dir === 1 ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('aria-sort');
      }
    });
  }

  function exportarCsv() {
    var linhas = linhasFiltradas();
    var cabecalho = ['Tema', 'Indicador', 'Valor', 'Unidade', 'Tabela SIDRA'];
    var dados = linhas.map(function (linha) {
      return [
        linha.tema,
        linha.indicador,
        String(linha.valor).replace('.', ','),
        linha.unidade,
        linha.tabela
      ];
    });

    function celula(v) {
      var s = String(v == null ? '' : v);
      if (/[";\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    }

    var texto = [cabecalho].concat(dados)
      .map(function (linha) { return linha.map(celula).join(';'); })
      .join('\r\n');

    var blob = new Blob(['\uFEFF' + texto], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'pintec-2017-indicadores.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    avisar('CSV exportado com ' + linhas.length + ' indicadores.');
  }

  /* ------------------------------ Metodologia ---------------------------- */
  function renderListaTabelas() {
    var lista = $('#lista-tabelas');
    if (!lista) return;
    lista.innerHTML = Object.keys(NOMES_TABELAS).map(function (numero) {
      return '<li><a href="https://sidra.ibge.gov.br/tabela/' + numero +
        '" target="_blank" rel="noopener">Tabela ' + numero + ' · ' +
        esc(NOMES_TABELAS[numero]) + '</a></li>';
    }).join('');
  }

  function renderRodape() {
    var meta = estado.dados.meta || {};
    $('#rodape-data').textContent = dataCurta(meta.geradoEm);
  }

  /* -------------------------------- Tema --------------------------------- */
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    var escuro = tema === 'escuro';
    var botao = $('#btn-tema');
    if (botao) {
      botao.setAttribute('aria-pressed', escuro ? 'true' : 'false');
      botao.setAttribute('aria-label', escuro ? 'Ativar tema claro' : 'Ativar tema escuro');
      botao.title = escuro ? 'Ativar tema claro' : 'Ativar tema escuro';
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', escuro ? '#0a1410' : '#f4efe3');
    try { localStorage.setItem('pintec-tema', tema); } catch (e) { /* sem armazenamento */ }
  }

  function alternarTema() {
    var atual = document.documentElement.getAttribute('data-tema');
    aplicarTema(atual === 'escuro' ? 'claro' : 'escuro');
  }

  /* -------------------------------- Status ------------------------------- */
  function definirStatus(texto, situacao, titulo) {
    var el = $('#status-api');
    if (!el) return;
    el.setAttribute('data-estado', situacao);
    el.querySelector('.status__texto').textContent = texto;
    el.title = titulo || texto;
  }

  var temporizadorAviso = null;
  function avisar(mensagem) {
    var el = $('#aviso');
    if (!el) return;
    el.textContent = mensagem;
    el.classList.add('ativo');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { el.classList.remove('ativo'); }, 4200);
  }

  function atualizarPelaApi(manual) {
    if (estado.atualizando || !window.Sidra) return;
    estado.atualizando = true;

    var botao = $('#btn-atualizar');
    if (botao) botao.classList.add('girando');
    definirStatus('Atualizando…', 'carregando', 'Consultando a API SIDRA');

    window.Sidra.atualizar(estado.dados).then(function (resultado) {
      if (resultado.ok === 0) {
        throw new Error('Nenhuma tabela respondeu');
      }

      estado.dados = resultado.dados;
      renderTudo();

      var agora = new Date();
      var hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      var completo = resultado.ok === resultado.total;

      definirStatus(
        completo ? 'Ao vivo · ' + hora : 'Parcial · ' + hora,
        'ao-vivo',
        resultado.ok + ' de ' + resultado.total + ' tabelas atualizadas pela API SIDRA em ' + agora.toLocaleString('pt-BR')
      );

      var metaAtualizacao = $('#meta-atualizacao');
      var metaNota = $('#meta-atualizacao-nota');
      if (metaAtualizacao) metaAtualizacao.textContent = 'API SIDRA';
      if (metaNota) {
        metaNota.textContent = 'Última consulta: ' + agora.toLocaleString('pt-BR') +
          ' · ' + resultado.ok + ' de ' + resultado.total + ' tabelas';
      }

      if (manual || !completo) {
        avisar(completo
          ? 'Dados atualizados pela API SIDRA (' + resultado.ok + ' tabelas).'
          : 'Atualização parcial: ' + resultado.ok + ' de ' + resultado.total + ' tabelas.');
      }
    }).catch(function (erro) {
      definirStatus('Offline · snapshot', 'erro',
        'Não foi possível consultar a API SIDRA. Exibindo o snapshot local. ' + (erro && erro.message ? erro.message : ''));
      var metaAtualizacao = $('#meta-atualizacao');
      var metaNota = $('#meta-atualizacao-nota');
      if (metaAtualizacao) metaAtualizacao.textContent = 'Snapshot local';
      if (metaNota) metaNota.textContent = 'API indisponível · usando a cópia local dos dados';
      if (manual) avisar('Não foi possível acessar a API. Os dados do snapshot local continuam válidos.');
    }).finally(function () {
      estado.atualizando = false;
      if (botao) botao.classList.remove('girando');
    });
  }

  /* -------------------------------- Abas --------------------------------- */
  function configurarAbas(id, aoSelecionar) {
    var grupo = document.getElementById(id);
    if (!grupo) return;
    var abas = $$('[role="tab"]', grupo);

    function selecionar(indice) {
      abas.forEach(function (aba, i) {
        var ativo = i === indice;
        aba.setAttribute('aria-selected', ativo ? 'true' : 'false');
        aba.tabIndex = ativo ? 0 : -1;
      });
      aoSelecionar(abas[indice].getAttribute('data-valor'));
    }

    abas.forEach(function (aba, i) {
      aba.addEventListener('click', function () { selecionar(i); });
      aba.addEventListener('keydown', function (ev) {
        var novo = null;
        if (ev.key === 'ArrowRight') novo = (i + 1) % abas.length;
        else if (ev.key === 'ArrowLeft') novo = (i - 1 + abas.length) % abas.length;
        else if (ev.key === 'Home') novo = 0;
        else if (ev.key === 'End') novo = abas.length - 1;
        if (novo != null) {
          ev.preventDefault();
          abas[novo].focus();
          selecionar(novo);
        }
      });
    });
  }

  function configurarChips(id, aoSelecionar) {
    var grupo = document.getElementById(id);
    if (!grupo) return;
    var chips = $$('.chip', grupo);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) {
          var ativo = c === chip;
          c.classList.toggle('chip--ativo', ativo);
          c.setAttribute('aria-pressed', ativo ? 'true' : 'false');
        });
        aoSelecionar(chip.getAttribute('data-valor'));
      });
    });
  }

  /* ------------------------------ Observadores --------------------------- */
  function configurarRevelacao() {
    var alvos = $$('.revelar');
    if (!('IntersectionObserver' in window)) {
      alvos.forEach(function (el) { el.classList.add('visivel'); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('visivel');
          obs.unobserve(entrada.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    alvos.forEach(function (el) { obs.observe(el); });
  }

  function configurarNavegacao() {
    var topo = $('#topo-site');
    var progresso = $('#progresso');

    function aoRolar() {
      var raiz = document.documentElement;
      var maximo = raiz.scrollHeight - raiz.clientHeight;
      var pct = maximo > 0 ? (raiz.scrollTop / maximo) * 100 : 0;
      if (progresso) progresso.style.width = pct + '%';
      if (topo) topo.classList.toggle('topo--compacto', raiz.scrollTop > 8);
    }
    window.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();

    var links = $$('.nav a');
    var secoes = links.map(function (link) {
      return document.querySelector(link.getAttribute('href'));
    }).filter(Boolean);

    if (!('IntersectionObserver' in window) || !secoes.length) return;
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        links.forEach(function (link) {
          link.classList.toggle('ativo', link.getAttribute('href') === '#' + entrada.target.id);
        });
      });
    }, { rootMargin: '-42% 0px -52% 0px', threshold: 0 });
    secoes.forEach(function (secao) { obs.observe(secao); });
  }

  /* --------------------------------- Render ------------------------------ */
  function renderTudo() {
    renderMedidores();
    renderKpis();
    renderEvolucao();
    renderSetores();
    renderTipos();
    renderDispendios();
    renderEcossistema();
    renderObstaculos();
    renderAlem();
    estado.tabela.linhas = montarLinhas(estado.dados);
    renderTabela();
    renderRodape();
  }

  /* --------------------------------- Início ------------------------------ */
  function iniciar() {
    aplicarTema(document.documentElement.getAttribute('data-tema') || 'claro');

    renderTudo();
    renderListaTabelas();
    configurarRevelacao();
    configurarNavegacao();

    configurarAbas('evolucao-abas', function (valor) {
      estado.metrica = valor;
      renderEvolucao();
    });
    configurarAbas('eco-abas', function (valor) {
      estado.eco = valor;
      renderEcossistema();
    });
    configurarChips('setores-filtros', function (valor) {
      estado.setor = valor;
      renderSetores();
    });
    configurarChips('obst-filtros', function (valor) {
      estado.obst = valor;
      renderObstaculos();
    });

    $('#btn-tema').addEventListener('click', alternarTema);

    var campoBusca = $('#tabela-busca');
    campoBusca.addEventListener('input', function () {
      estado.tabela.busca = campoBusca.value;
      renderTabela();
    });

    $$('#tabela thead th[data-coluna]').forEach(function (th) {
      th.addEventListener('click', function () {
        var coluna = th.getAttribute('data-coluna');
        if (estado.tabela.coluna === coluna) {
          estado.tabela.dir *= -1;
        } else {
          estado.tabela.coluna = coluna;
          estado.tabela.dir = (coluna === 'valor' || coluna === 'tabela') ? -1 : 1;
        }
        renderTabela();
      });
    });

    $('#btn-csv').addEventListener('click', exportarCsv);

    ['#btn-atualizar', '#btn-atualizar-2'].forEach(function (seletor) {
      var botao = $(seletor);
      if (botao) botao.addEventListener('click', function () { atualizarPelaApi(true); });
    });


    definirStatus('Snapshot local', 'local',
      'Valores do snapshot gerado em ' + dataCurta((estado.dados.meta || {}).geradoEm));

    setTimeout(function () { atualizarPelaApi(false); }, 700);
  }

  iniciar();
})();
