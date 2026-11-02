/* =========================================================================
   Cliente da API SIDRA v3 (IBGE).
   Consulta as tabelas da PINTEC 2017 e devolve os dados no mesmo formato do
   snapshot local. Falhas parciais mantêm os valores já conhecidos.
   ========================================================================= */
(function () {
  'use strict';

  var BASE = 'https://servicodados.ibge.gov.br/api/v3/agregados';
  var TEMPO_LIMITE = 18000;

  var CATS_SETOR = {
    '62': '129403',
    'C': '129344',
    '61': '129402',
    '63.1': '129408',
    '35': '129399',
    '71': '129409',
    '58A': '129401',
    'B': '129343',
    '72': '129410'
  };

  var CATS_DISPENDIO = ['33429', '33430', '33431', '33432', '33433', '33434', '33435', '33436'];
  var CATS_FONTE = ['33565', '33566', '33567', '33568', '33569', '33570', '33571',
    '33572', '33573', '33574', '33575', '33576', '33577', '33578'];
  var CATS_COOP = ['39259', '39260', '39261', '39262', '39263', '39264', '39265', '39266'];
  var CATS_APOIO = ['39280', '39281', '39282', '39283', '39284', '39285', '39333', '39334', '40308', '39335'];
  var CATS_OBST = ['39287', '39288', '39289', '39293', '39294', '39295',
    '39296', '39297', '39298', '39299', '39300', '39301'];
  var CATS_ORG = ['39303', '39304', '39305', '39306', '39307', '39308'];
  var CATS_NOVIDADE = ['33535', '33538', '33541'];
  var CATS_VENDAS = ['6020', '6021', '6022'];

  /* ------------------------------ Requisição ----------------------------- */
  function consultar(agregado, periodos, variaveis, classificacao) {
    var url = BASE + '/' + agregado + '/periodos/' + periodos + '/variaveis/' + variaveis +
      '?localidades=N1[all]';
    if (classificacao) url += '&classificacao=' + classificacao;

    var controlador = typeof AbortController === 'function' ? new AbortController() : null;
    var temporizador = setTimeout(function () {
      if (controlador) controlador.abort();
    }, TEMPO_LIMITE);

    return fetch(url, {
      signal: controlador ? controlador.signal : undefined,
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    }).then(function (resposta) {
      if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
      return resposta.json();
    }).then(function (json) {
      return normalizar(json);
    }).finally(function () {
      clearTimeout(temporizador);
    });
  }

  function normalizar(json) {
    var saida = {};
    (json || []).forEach(function (variavel) {
      var linhas = [];
      (variavel.resultados || []).forEach(function (resultado) {
        var cats = {};
        (resultado.classificacoes || []).forEach(function (cl) {
          var categoria = cl.categoria || {};
          var chaves = Object.keys(categoria);
          if (chaves.length) cats[String(cl.id)] = String(chaves[0]);
        });
        var vals = {};
        var serie = resultado.series && resultado.series[0] && resultado.series[0].serie;
        if (serie) {
          Object.keys(serie).forEach(function (periodo) {
            vals[periodo] = serie[periodo];
          });
        }
        linhas.push({ cats: cats, vals: vals });
      });
      saida[String(variavel.id)] = linhas;
    });
    return saida;
  }

  function numero(bruto) {
    if (bruto == null) return null;
    var texto = String(bruto).trim();
    if (!texto || texto === '...' || texto === '-' || texto === '..' || texto === 'X') return null;
    var n = Number(texto.replace(',', '.'));
    return isFinite(n) ? n : null;
  }

  function valor(linhas, classe, categoria, periodo) {
    if (!linhas) return null;
    periodo = periodo || '2017';
    for (var i = 0; i < linhas.length; i++) {
      if (linhas[i].cats[classe] === categoria) return numero(linhas[i].vals[periodo]);
    }
    return null;
  }

  function arredondar(n, casas) {
    if (n == null) return null;
    var f = Math.pow(10, casas == null ? 2 : casas);
    return Math.round(n * f) / f;
  }

  /* ------------------------------- Consultas ----------------------------- */
  function tarefaTotais5453() {
    return consultar(5453, '2017', '630,5977,5982,5983,5984,5985,5986,5987,5988', '696[33413]')
      .then(function (d) {
        return {
          totais: {
            empresas: valor(d['630'], '696', '33413'),
            inovadoras: valor(d['5977'], '696', '33413'),
            produto: valor(d['5982'], '696', '33413'),
            processo: valor(d['5985'], '696', '33413'),
            ambos: valor(d['5988'], '696', '33413'),
            prodNovoEmpresa: valor(d['5983'], '696', '33413'),
            prodNovoMercado: valor(d['5984'], '696', '33413'),
            procNovoEmpresa: valor(d['5986'], '696', '33413'),
            procNovoMercado: valor(d['5987'], '696', '33413')
          }
        };
      });
  }

  function tarefaTotais5018() {
    return consultar(5018, '2008,2011,2014,2017', '630,5975,5976,5977,864,5978,5979,5980,5981', '696[33413]')
      .then(function (d) {
        var periodos = ['2008', '2011', '2014', '2017'];
        var serie = periodos.map(function (p) {
          var empresas = valor(d['630'], '696', '33413', p);
          var inovadoras = valor(d['5977'], '696', '33413', p);
          var apenasOrg = valor(d['5976'], '696', '33413', p);
          var receita = valor(d['864'], '696', '33413', p);
          var dispendios = valor(d['5979'], '696', '33413', p);
          var pdInterno = valor(d['5981'], '696', '33413', p);
          return {
            periodo: Number(p),
            empresas: empresas,
            inovadoras: inovadoras,
            apenasOrg: apenasOrg,
            amplas: inovadoras != null && apenasOrg != null ? inovadoras + apenasOrg : null,
            taxa: inovadoras != null && empresas ? arredondar((100 * inovadoras) / empresas) : null,
            taxaAmpla: inovadoras != null && apenasOrg != null && empresas
              ? arredondar((100 * (inovadoras + apenasOrg)) / empresas) : null,
            receita: receita,
            dispendios: dispendios,
            pdInterno: pdInterno,
            intensidade: dispendios != null && receita ? arredondar((100 * dispendios) / receita) : null,
            intensidadePD: pdInterno != null && receita ? arredondar((100 * pdInterno) / receita) : null
          };
        });

        return {
          serie: serie,
          totais: {
            apenasOrgMarketing: valor(d['5976'], '696', '33413'),
            projetosIncompletos: valor(d['5975'], '696', '33413'),
            dispendios: valor(d['5979'], '696', '33413'),
            receita: valor(d['864'], '696', '33413'),
            empresasDispendios: valor(d['5978'], '696', '33413'),
            empresasPD: valor(d['5980'], '696', '33413'),
            pdInterno: valor(d['5981'], '696', '33413')
          }
        };
      });
  }

  function tarefaSetores(base) {
    return consultar(5453, '2017', '630,5977', '696[all]').then(function (d) {
      return {
        setores: (base.setores || []).map(function (s) {
          var cat = CATS_SETOR[s.id];
          var empresas = valor(d['630'], '696', cat);
          var inovadoras = valor(d['5977'], '696', cat);
          return {
            id: s.id,
            nome: s.nome,
            grupo: s.grupo,
            pequena: s.pequena,
            empresas: empresas,
            inovadoras: inovadoras,
            taxa: inovadoras != null && empresas ? arredondar((100 * inovadoras) / empresas) : null
          };
        })
      };
    });
  }

  function tarefaDispendios(base) {
    return consultar(5464, '2017', '5978,5979', '700[all]').then(function (d) {
      return {
        dispendios: (base.dispendios || []).map(function (item, i) {
          var cat = CATS_DISPENDIO[i];
          return {
            nome: item.nome,
            empresas: valor(d['5978'], '700', cat),
            valor: valor(d['5979'], '700', cat)
          };
        })
      };
    });
  }

  function tarefaNovidade(base) {
    return consultar(5458, '2017', '5982,5985', '711[all]').then(function (d) {
      function conjunto(variavel) {
        return CATS_NOVIDADE.map(function (cat, i) {
          return {
            nome: base.novidade[variavel === '5982' ? 'produto' : 'processo'][i].nome,
            valor: valor(d[variavel], '711', cat)
          };
        });
      }
      return { novidade: { produto: conjunto('5982'), processo: conjunto('5985') } };
    });
  }

  function tarefaVendas(base) {
    return consultar(5618, '2017', '630,5982,6020,6021,6022', '696[33413]').then(function (d) {
      return {
        vendas: (base.vendas || []).map(function (item, i) {
          return { nome: item.nome, valor: valor(d[CATS_VENDAS[i]], '696', '33413') };
        })
      };
    });
  }

  function tarefaFontes(base) {
    return consultar(5643, '2017', '5977', '714[all]|701[33438]').then(function (d) {
      return {
        fontes: (base.fontes || []).map(function (item, i) {
          return { nome: item.nome, valor: valor(d['5977'], '714', CATS_FONTE[i]) };
        })
      };
    });
  }

  function tarefaCooperacao(base) {
    return Promise.all([
      consultar(5921, '2017', '6543', '726[all]|701[33438]'),
      consultar(5921, '2017', '6543', '726[39259]|701[0]')
    ]).then(function (res) {
      var d = res[0];
      var total = res[1];
      return {
        cooperacao: {
          total: valor(total['6543'], '726', '39259'),
          itens: (base.cooperacao.itens || []).map(function (item, i) {
            return { nome: item.nome, valor: valor(d['6543'], '726', CATS_COOP[i]) };
          })
        }
      };
    });
  }

  function tarefaApoio(base) {
    return consultar(5924, '2017', '6544', '729[all]').then(function (d) {
      return {
        apoio: {
          total: valor(d['6544'], '729', '39279'),
          itens: (base.apoio.itens || []).map(function (item, i) {
            return { nome: item.nome, valor: valor(d['6544'], '729', CATS_APOIO[i]) };
          })
        }
      };
    });
  }

  function tarefaObstaculos(base) {
    return Promise.all([
      consultar(5926, '2017', '6545,6546', '731[all]|701[33438]'),
      consultar(5926, '2017', '6545,6546', '731[39287]|701[0]')
    ]).then(function (res) {
      var d = res[0];
      var total = res[1];
      return {
        obstaculos: {
          inovadoras: {
            total: valor(total['6546'], '731', '39287'),
            itens: (base.obstaculos.inovadoras.itens || []).map(function (item, i) {
              return { nome: item.nome, valor: valor(d['6546'], '731', CATS_OBST[i]) };
            })
          },
          naoInovadoras: {
            total: valor(total['6545'], '731', '39287'),
            itens: (base.obstaculos.naoInovadoras.itens || []).map(function (item, i) {
              return { nome: item.nome, valor: valor(d['6545'], '731', CATS_OBST[i]) };
            })
          }
        }
      };
    });
  }

  function tarefaOrganizacionais(base) {
    return consultar(5927, '2017', '5977', '732[all]').then(function (d) {
      return {
        organizacionais: (base.organizacionais || []).map(function (item, i) {
          return { nome: item.nome, valor: valor(d['5977'], '732', CATS_ORG[i]) };
        })
      };
    });
  }

  function tarefaBiotecnologia() {
    return consultar(5928, '2017', '6547', '733[39309,39310,39315,39316]').then(function (d) {
      return {
        biotecnologia: {
          biotecTotal: valor(d['6547'], '733', '39309'),
          biotecInovadoras: valor(d['6547'], '733', '39310'),
          nanoTotal: valor(d['6547'], '733', '39315'),
          nanoInovadoras: valor(d['6547'], '733', '39316')
        }
      };
    });
  }

  /* ------------------------------- Mesclagem ----------------------------- */
  function mesclar(destino, origem) {
    Object.keys(origem).forEach(function (chave) {
      var v = origem[chave];
      if (v && typeof v === 'object' && !Array.isArray(v) &&
        destino[chave] && typeof destino[chave] === 'object' && !Array.isArray(destino[chave])) {
        mesclar(destino[chave], v);
      } else {
        destino[chave] = v;
      }
    });
  }

  /* ------------------------------ Atualização ---------------------------- */
  function atualizar(base) {
    var dados = JSON.parse(JSON.stringify(base));

    var tarefas = [
      { nome: 'Totais (5453)', executar: tarefaTotais5453 },
      { nome: 'Série histórica (5018)', executar: tarefaTotais5018 },
      { nome: 'Setores (5453)', executar: function () { return tarefaSetores(base); } },
      { nome: 'Dispêndios (5464)', executar: function () { return tarefaDispendios(base); } },
      { nome: 'Grau de novidade (5458)', executar: function () { return tarefaNovidade(base); } },
      { nome: 'Vendas (5618)', executar: function () { return tarefaVendas(base); } },
      { nome: 'Fontes (5643)', executar: function () { return tarefaFontes(base); } },
      { nome: 'Cooperação (5921)', executar: function () { return tarefaCooperacao(base); } },
      { nome: 'Apoio do governo (5924)', executar: function () { return tarefaApoio(base); } },
      { nome: 'Obstáculos (5926)', executar: function () { return tarefaObstaculos(base); } },
      { nome: 'Organizacionais (5927)', executar: function () { return tarefaOrganizacionais(base); } },
      { nome: 'Biotecnologia (5928)', executar: tarefaBiotecnologia }
    ];

    return Promise.allSettled(tarefas.map(function (t) { return t.executar(); }))
      .then(function (resultados) {
        var ok = 0;
        var erros = [];
        resultados.forEach(function (r, i) {
          if (r.status === 'fulfilled') {
            ok++;
            mesclar(dados, r.value);
          } else {
            erros.push(tarefas[i].nome);
          }
        });
        dados.meta = dados.meta || {};
        dados.meta.atualizadoEm = new Date().toISOString();
        return { dados: dados, ok: ok, total: tarefas.length, erros: erros };
      });
  }

  window.Sidra = {
    base: BASE,
    atualizar: atualizar,
    urlTabela: function (numeroTabela) {
      return 'https://sidra.ibge.gov.br/tabela/' + numeroTabela;
    }
  };
})();
