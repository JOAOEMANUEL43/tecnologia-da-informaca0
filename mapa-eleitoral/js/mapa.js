(function () {
  "use strict";

  const MAPA = window.MAPA_MA_2026;
  const MALHA = window.MALHA_MA;

  if (!MAPA || !MALHA) {
    document.getElementById("mapa").innerHTML =
      '<p style="padding:24px;font-family:Arial,sans-serif">Dados oficiais ainda não disponíveis.</p>';
    return;
  }

  const CARGO_LABELS = {
    presidente: "Presidente",
    governador: "Governador",
    senador: "Senador",
    "deputado-federal": "Deputado Federal",
    "deputado-estadual": "Deputado Estadual",
  };

  const CARGO_ORDER = [
    "presidente",
    "governador",
    "senador",
    "deputado-federal",
    "deputado-estadual",
  ];

  const TURNO_LABELS = {
    1: "1º turno",
    2: "2º turno",
  };

  const VISUALIZACOES = [
    { id: "brancos", label: "Votos brancos" },
    { id: "nulos", label: "Votos nulos" },
    { id: "validos", label: "Votos válidos" },
    { id: "comparecimento", label: "Comparecimento" },
    { id: "abstencoes", label: "Abstenções" },
    { id: "candidato", label: "Votos do candidato" },
  ];

  const PALETA = ["#fff6d5", "#f8e28c", "#d7e5a4", "#95cd9c", "#3fa06d", "#0b5d3f"];
  const COR_SEM_DADOS = "#d6ddd5";

  const CARGOS = CARGO_ORDER.filter(function (cargo) {
    return Boolean(MAPA.cargos[cargo]);
  });

  const cargoInicial = CARGOS.indexOf("governador") >= 0 ? "governador" : CARGOS[0];
  const turnoInicial = (MAPA.cargos[cargoInicial] && MAPA.cargos[cargoInicial].turnos[0]) || 1;

  const estado = {
    cargo: cargoInicial,
    turno: turnoInicial,
    visualizacao: "brancos",
    candidatoId: null,
    partido: null,
    selecionado: null,
    busca: "",
  };

  const municipiosPorCodigo = new Map(
    MAPA.municipios.map(function (municipio) {
      return [municipio.codigoIbge, municipio];
    }),
  );

  const el = {
    cargo: document.getElementById("filtro-cargo"),
    turno: document.getElementById("filtro-turno"),
    partido: document.getElementById("filtro-partido"),
    candidato: document.getElementById("filtro-candidato"),
    visualizacao: document.getElementById("filtro-visualizacao"),
    limparFiltros: document.getElementById("limpar-filtros"),
    busca: document.getElementById("busca-municipio"),
    limparBusca: document.getElementById("limpar-busca"),
    sugestoes: document.getElementById("sugestoes-municipios"),
    avisoCandidato: document.getElementById("aviso-candidato"),
    mapa: document.getElementById("mapa"),
    mapaRecorte: document.getElementById("mapa-recorte"),
    legenda: document.getElementById("legenda"),
    painel: document.getElementById("painel"),
    notaFonte: document.getElementById("nota-fonte"),
  };

  let mapaLeaflet = null;
  let camada = null;
  let valoresAtuais = {};
  let maxAtual = 0;
  let faixasAtuais = [];
  let rotuloAtual = "Votos brancos";
  let detalheAtual = "";

  function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    return new Intl.NumberFormat("pt-BR").format(value);
  }

  function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    return (
      new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value) + "%"
    );
  }

  function formatCompact(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    if (Math.abs(value) >= 1000000) {
      return (
        (value / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi"
      );
    }
    if (Math.abs(value) >= 1000) {
      return (
        (value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil"
      );
    }
    return formatNumber(value);
  }

  function percentual(parte, total) {
    return total > 0 ? Math.round((parte / total) * 10000) / 100 : null;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (caractere) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[caractere];
    });
  }

  function normalizar(texto) {
    return String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function getCandidatos() {
    const cargo = MAPA.cargos[estado.cargo];
    return (cargo && cargo.candidatosPorTurno[String(estado.turno)]) || [];
  }

  function getPartidos(candidatos) {
    return Array.from(
      new Set(
        candidatos
          .map(function (candidato) {
            return candidato.partido;
          })
          .filter(Boolean),
      ),
    ).sort(function (a, b) {
      return a.localeCompare(b, "pt-BR");
    });
  }

  function getDados(municipio) {
    const cargo = municipio.cargos[estado.cargo];
    if (!cargo) return undefined;
    return cargo[String(estado.turno)];
  }

  function getCandidatoMunicipioVotos(municipio, candidatoId) {
    const dados = getDados(municipio);
    if (!dados) return null;
    const encontrado = dados.candidatos.find(function (par) {
      return par[0] === candidatoId;
    });
    return encontrado ? encontrado[1] : 0;
  }

  function getValorVisualizacao(municipio) {
    const dados = getDados(municipio);
    if (!dados) return null;

    switch (estado.visualizacao) {
      case "brancos":
        return dados.metricas.brancos;
      case "nulos":
        return dados.metricas.nulos;
      case "validos":
        return dados.metricas.validos;
      case "comparecimento":
        return dados.metricas.comparecimento;
      case "abstencoes":
        return dados.metricas.abstencoes;
      case "candidato":
        return estado.candidatoId
          ? getCandidatoMunicipioVotos(municipio, estado.candidatoId)
          : null;
      default:
        return null;
    }
  }

  function corParaValor(valor, max) {
    if (valor === null || !Number.isFinite(valor) || max <= 0) {
      return COR_SEM_DADOS;
    }
    const passo = max / PALETA.length;
    const indice = Math.min(PALETA.length - 1, Math.max(0, Math.floor(valor / passo)));
    return PALETA[indice];
  }

  function construirEscala(valores) {
    const numeros = valores.filter(function (valor) {
      return valor !== null && Number.isFinite(valor);
    });
    const max = numeros.length > 0 ? Math.max.apply(null, numeros) : 0;
    const passo = max > 0 ? max / PALETA.length : 0;
    const faixas = max > 0
      ? PALETA.map(function (cor, indice) {
          return {
            min: passo * indice,
            max: passo * (indice + 1),
            cor: cor,
          };
        })
      : [];
    return { max: max, faixas: faixas };
  }

  function normalizarEstado() {
    if (CARGOS.indexOf(estado.cargo) < 0) estado.cargo = cargoInicial;

    const cargo = MAPA.cargos[estado.cargo];
    const turnos = (cargo && cargo.turnos) || [1];
    if (turnos.indexOf(estado.turno) < 0) estado.turno = turnos[0] || 1;

    const candidatos = getCandidatos();
    const partidos = getPartidos(candidatos);

    if (estado.partido && partidos.indexOf(estado.partido) < 0) {
      estado.partido = null;
    }

    if (estado.candidatoId) {
      const candidato = candidatos.find(function (item) {
        return item.id === estado.candidatoId;
      });
      if (!candidato || (estado.partido && candidato.partido !== estado.partido)) {
        estado.candidatoId = null;
      }
    }

    if (estado.visualizacao === "candidato" && !estado.candidatoId) {
      estado.visualizacao = "brancos";
    }

    if (estado.selecionado && !municipiosPorCodigo.has(estado.selecionado)) {
      estado.selecionado = null;
    }
  }

  function renderControles() {
    el.cargo.innerHTML = CARGOS.map(function (cargo) {
      return '<option value="' + cargo + '">' + escapeHTML(CARGO_LABELS[cargo]) + "</option>";
    }).join("");
    el.cargo.value = estado.cargo;

    const turnos = (MAPA.cargos[estado.cargo] && MAPA.cargos[estado.cargo].turnos) || [1];
    el.turno.innerHTML = turnos.map(function (turno) {
      return '<option value="' + turno + '">' + escapeHTML(TURNO_LABELS[turno]) + "</option>";
    }).join("");
    el.turno.value = String(estado.turno);

    const candidatos = getCandidatos();
    const partidos = getPartidos(candidatos);
    el.partido.innerHTML =
      '<option value="">Todos os partidos</option>' +
      partidos.map(function (partido) {
        return '<option value="' + escapeHTML(partido) + '">' + escapeHTML(partido) + "</option>";
      }).join("");
    el.partido.value = estado.partido || "";

    const candidatosFiltrados = estado.partido
      ? candidatos.filter(function (candidato) {
          return candidato.partido === estado.partido;
        })
      : candidatos;

    el.candidato.innerHTML =
      '<option value="">Todos os candidatos</option>' +
      candidatosFiltrados.map(function (candidato) {
        return (
          '<option value="' + escapeHTML(candidato.id) + '">' +
          escapeHTML(candidato.nome) + " (" + escapeHTML(candidato.partido) + ") · " +
          escapeHTML(candidato.numero) +
          "</option>"
        );
      }).join("");
    el.candidato.value = estado.candidatoId || "";

    el.visualizacao.innerHTML = VISUALIZACOES.map(function (opcao) {
      const desabilitada = opcao.id === "candidato" && !estado.candidatoId;
      return (
        '<option value="' + opcao.id + '"' + (desabilitada ? " disabled" : "") + ">" +
        escapeHTML(opcao.label) +
        "</option>"
      );
    }).join("");
    el.visualizacao.value = estado.visualizacao;

    el.avisoCandidato.hidden = !(
      !estado.candidatoId && estado.visualizacao === "candidato"
    );
  }

  function renderSugestoes() {
    const termo = normalizar(estado.busca.trim());
    if (termo.length < 2) {
      el.sugestoes.hidden = true;
      el.busca.setAttribute("aria-expanded", "false");
      return;
    }

    const sugestoes = MAPA.municipios
      .filter(function (municipio) {
        return normalizar(municipio.nome).indexOf(termo) >= 0;
      })
      .sort(function (a, b) {
        const aComeca = normalizar(a.nome).indexOf(termo) === 0 ? 0 : 1;
        const bComeca = normalizar(b.nome).indexOf(termo) === 0 ? 0 : 1;
        return aComeca - bComeca || a.nome.localeCompare(b.nome, "pt-BR");
      })
      .slice(0, 8);

    if (sugestoes.length === 0) {
      el.sugestoes.innerHTML =
        '<p class="sugestao--vazia">Nenhum município encontrado.</p>';
    } else {
      el.sugestoes.innerHTML = sugestoes.map(function (municipio) {
        const selecionado = municipio.codigoIbge === estado.selecionado;
        return (
          '<button type="button" class="sugestao" role="option" data-codigo="' +
          escapeHTML(municipio.codigoIbge) +
          '" aria-selected="' + (selecionado ? "true" : "false") + '">' +
          "<span>" + escapeHTML(municipio.nome) + "</span>" +
          "<small>" + escapeHTML(municipio.codigoIbge) + "</small>" +
          "</button>"
        );
      }).join("");

      Array.prototype.forEach.call(
        el.sugestoes.querySelectorAll("button[data-codigo]"),
        function (botao) {
          botao.addEventListener("mousedown", function (event) {
            event.preventDefault();
          });
          botao.addEventListener("click", function () {
            const codigo = botao.getAttribute("data-codigo");
            const municipio = municipiosPorCodigo.get(codigo);
            if (!municipio) return;
            estado.busca = municipio.nome;
            el.busca.value = municipio.nome;
            el.limparBusca.hidden = false;
            el.sugestoes.hidden = true;
            el.busca.setAttribute("aria-expanded", "false");
            selecionarMunicipio(codigo, true);
          });
        },
      );
    }

    el.sugestoes.hidden = false;
    el.busca.setAttribute("aria-expanded", "true");
  }

  function renderLegenda() {
    const configuracao =
      VISUALIZACOES.find(function (item) {
        return item.id === estado.visualizacao;
      }) || VISUALIZACOES[0];

    const candidato = estado.candidatoId
      ? getCandidatos().find(function (item) {
          return item.id === estado.candidatoId;
        })
      : null;

    rotuloAtual =
      estado.visualizacao === "candidato" && candidato
        ? configuracao.label + " — " + candidato.nome
        : configuracao.label;

    detalheAtual =
      estado.visualizacao === "candidato" && candidato
        ? candidato.partido + " · " + candidato.numero
        : CARGO_LABELS[estado.cargo] + " · " + TURNO_LABELS[estado.turno];

    let html =
      '<p class="legenda__rotulo">Legenda</p>' +
      '<p class="legenda__titulo">' + escapeHTML(rotuloAtual) + "</p>" +
      '<p class="legenda__detalhe">' + escapeHTML(detalheAtual) + "</p>";

    if (faixasAtuais.length > 0) {
      html += "<ul>";
      faixasAtuais
        .slice()
        .reverse()
        .forEach(function (faixa) {
          const minimo = Math.round(faixa.min);
          const maximo = Math.round(faixa.max);
          html +=
            "<li>" +
            '<span class="legenda__cor" style="background-color:' + faixa.cor + '"></span>' +
            '<span title="' + escapeHTML(formatNumber(minimo) + " a " + formatNumber(maximo)) + '">' +
            escapeHTML(formatCompact(minimo) + " – " + formatCompact(maximo)) +
            "</span></li>";
        });
      html += "</ul>";
    } else {
      html += '<p class="legenda__nota">Sem valores para colorir neste recorte.</p>';
    }

    html +=
      '<div class="legenda__sem-dados">' +
      '<span class="legenda__cor" style="background-color:' + COR_SEM_DADOS + '"></span>' +
      "<span>Sem dados oficiais</span>" +
      "</div>" +
      '<p class="legenda__nota">Escala linear de 0 ao maior valor do recorte.' +
      (maxAtual > 0 ? " Máximo: " + escapeHTML(formatNumber(Math.round(maxAtual))) + "." : "") +
      "</p>";

    el.legenda.innerHTML = html;
  }

  function getTopCandidatos(municipio, candidatos, limite) {
    const dados = getDados(municipio);
    if (!dados) return [];
    const porId = new Map(
      candidatos.map(function (candidato) {
        return [candidato.id, candidato];
      }),
    );
    return dados.candidatos
      .map(function (par) {
        const candidato = porId.get(par[0]);
        if (!candidato) return null;
        return Object.assign({}, candidato, {
          votosMunicipio: par[1],
          pctMunicipio: percentual(par[1], dados.metricas.validos),
        });
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return (
          b.votosMunicipio - a.votosMunicipio ||
          a.nome.localeCompare(b.nome, "pt-BR")
        );
      })
      .slice(0, limite);
  }

  function renderPainel() {
    const municipio = estado.selecionado
      ? municipiosPorCodigo.get(estado.selecionado)
      : null;

    if (!municipio) {
      el.painel.className = "painel painel--vazio";
      el.painel.innerHTML =
        '<span class="painel__icone" aria-hidden="true">⌖</span>' +
        "<h2>Selecione um município</h2>" +
        "<p>Clique em um município no mapa ou use a busca para ver eleitorado, comparecimento, abstenção, brancos, nulos e os candidatos mais votados.</p>";
      return;
    }

    const dados = getDados(municipio);
    const candidatos = getCandidatos();
    const candidatosFiltrados = estado.partido
      ? candidatos.filter(function (candidato) {
          return candidato.partido === estado.partido;
        })
      : candidatos;

    let html =
      '<div class="painel__cabecalho">' +
      "<p>Painel do município</p>" +
      "<h2>" + escapeHTML(municipio.nome) + "</h2>" +
      '<div class="painel__codigos">' +
      "<span>IBGE " + escapeHTML(municipio.codigoIbge) + "</span>" +
      "<span>TSE " + escapeHTML(municipio.codigoTse) + "</span>" +
      "</div></div>";

    if (!dados) {
      html +=
        '<div class="painel__vazio-dados">Dados oficiais ainda não disponíveis para este cargo e turno no município.</div>';
      el.painel.className = "painel";
      el.painel.innerHTML = html;
      return;
    }

    const metricas = dados.metricas;
    const valor = valoresAtuais[municipio.codigoIbge];
    const candidatoSelecionado = estado.candidatoId
      ? candidatos.find(function (candidato) {
          return candidato.id === estado.candidatoId;
        })
      : null;
    const votosCandidato = candidatoSelecionado
      ? getCandidatoMunicipioVotos(municipio, candidatoSelecionado.id)
      : null;
    const pctCandidato =
      votosCandidato !== null && metricas.validos > 0
        ? percentual(votosCandidato, metricas.validos)
        : null;
    const topCandidatos = getTopCandidatos(municipio, candidatosFiltrados, 5);
    const candidatoNoTop = topCandidatos.some(function (candidato) {
      return candidato.id === (candidatoSelecionado && candidatoSelecionado.id);
    });

    let contexto = "Sem dados oficiais";
    if (valor !== null) {
      if (estado.visualizacao === "abstencoes") {
        contexto = formatPercent(percentual(valor, metricas.aptos)) + " dos eleitores aptos";
      } else if (estado.visualizacao === "comparecimento") {
        contexto = formatPercent(metricas.comparecimentoPct) + " dos eleitores aptos";
      } else if (estado.visualizacao === "validos") {
        contexto = "Total de votos válidos do cargo e turno";
      } else if (estado.visualizacao === "candidato") {
        contexto = formatPercent(pctCandidato) + " dos votos válidos do cargo";
      } else {
        contexto = formatPercent(percentual(valor, metricas.comparecimento)) + " do comparecimento";
      }
    }

    const rotuloVisualizacao =
      (VISUALIZACOES.find(function (item) {
        return item.id === estado.visualizacao;
      }) || VISUALIZACOES[0]).label;

    html += '<div class="painel__corpo">';
    html +=
      '<div class="painel__destaque">' +
      "<p>" + escapeHTML(rotuloVisualizacao) +
      (estado.visualizacao === "candidato" && candidatoSelecionado
        ? " · " + escapeHTML(candidatoSelecionado.nome)
        : "") +
      "</p>" +
      "<strong>" + escapeHTML(formatNumber(valor)) + "</strong>" +
      "<span>" + escapeHTML(contexto) + "</span>" +
      "</div>";

    html +=
      '<dl class="painel__metricas">' +
      "<div><dt>Eleitorado</dt><dd>" + escapeHTML(formatNumber(metricas.aptos)) + "</dd></div>" +
      "<div><dt>Comparecimento</dt><dd>" + escapeHTML(formatNumber(metricas.comparecimento)) +
      "<small>" + escapeHTML(formatPercent(metricas.comparecimentoPct)) + "</small></dd></div>" +
      "<div><dt>Abstenção</dt><dd>" + escapeHTML(formatNumber(metricas.abstencoes)) +
      "<small>" + escapeHTML(formatPercent(metricas.abstencoesPct)) + "</small></dd></div>" +
      "<div><dt>Votos válidos</dt><dd>" + escapeHTML(formatNumber(metricas.validos)) + "</dd></div>" +
      '<div><dt>Brancos</dt><dd class="valor-ouro">' + escapeHTML(formatNumber(metricas.brancos)) +
      "<small>" + escapeHTML(formatPercent(metricas.brancosPct)) + "</small></dd></div>" +
      "<div><dt>Nulos</dt><dd>" + escapeHTML(formatNumber(metricas.nulos)) +
      "<small>" + escapeHTML(formatPercent(metricas.nulosPct)) + "</small></dd></div>" +
      "</dl>";

    if (candidatoSelecionado && !candidatoNoTop) {
      html +=
        '<div class="painel__candidato">' +
        "<p>Candidato selecionado</p>" +
        "<strong>" + escapeHTML(candidatoSelecionado.nome) +
        ' <span style="font-weight:600;color:rgba(11,31,58,.55)">(' +
        escapeHTML(candidatoSelecionado.partido) + ")</span></strong>" +
        "<span>" + escapeHTML(formatNumber(votosCandidato)) + " votos · " +
        escapeHTML(formatPercent(pctCandidato)) + " dos válidos</span>" +
        "</div>";
    }

    html +=
      '<div><div class="painel__topo">' +
      "<h3>" + escapeHTML(estado.partido ? "Principais candidatos · " + estado.partido : "Principais candidatos") + "</h3>" +
      "<span>Top 5</span></div>";

    if (topCandidatos.length > 0) {
      html += '<ol class="painel__lista">';
      topCandidatos.forEach(function (candidato, indice) {
        const destacado = candidato.id === (candidatoSelecionado && candidatoSelecionado.id);
        html +=
          "<li" + (destacado ? ' class="destacado"' : "") + ">" +
          '<span class="painel__posicao">' + (indice + 1) + "</span>" +
          '<div class="painel__nome"><strong>' + escapeHTML(candidato.nome) + "</strong>" +
          "<span>" + escapeHTML(candidato.partido) + "</span></div>" +
          '<div class="painel__votos"><strong>' + escapeHTML(formatNumber(candidato.votosMunicipio)) + "</strong>" +
          "<span>" + escapeHTML(formatPercent(candidato.pctMunicipio)) + "</span></div>" +
          "</li>";
      });
      html += "</ol>";
    } else {
      html += '<p class="painel__rodape" style="border:0;margin-top:8px;padding:0">Sem candidatos com votos registrados para este recorte.</p>';
    }

    html +=
      "</div>" +
      '<p class="painel__rodape">Brancos e nulos: % do comparecimento. Abstenção: % dos aptos. Candidatos: % dos votos válidos do cargo e turno. Fonte: TSE.</p>' +
      "</div>";

    el.painel.className = "painel";
    el.painel.innerHTML = html;
  }

  function renderSelo() {
    el.mapaRecorte.textContent =
      CARGO_LABELS[estado.cargo] + " · " + TURNO_LABELS[estado.turno];
  }

  function renderNotaFonte() {
    const timestamps = (MAPA.meta && MAPA.meta.timestamps) || {};
    const geracao = timestamps.dtGeracao ? " gerados em " + timestamps.dtGeracao : "";
    const observacao = (MAPA.meta && MAPA.meta.observacao) || "";
    el.notaFonte.innerHTML =
      "<strong>Fonte:</strong> TSE — arquivos de votação de 2026" +
      escapeHTML(geracao) +
      ". Malha municipal do IBGE. " +
      escapeHTML(observacao);
  }

  function renderTudo() {
    normalizarEstado();

    const valores = {};
    MAPA.municipios.forEach(function (municipio) {
      valores[municipio.codigoIbge] = getValorVisualizacao(municipio);
    });
    valoresAtuais = valores;

    const escala = construirEscala(Object.keys(valores).map(function (codigo) {
      return valores[codigo];
    }));
    maxAtual = escala.max;
    faixasAtuais = escala.faixas;

    renderControles();
    renderLegenda();
    renderSelo();
    renderNotaFonte();
    renderMapa();
    renderPainel();
  }

  function estiloFeature(feature) {
    const codigo = feature && feature.properties ? feature.properties.codarea : "";
    const valor = codigo ? valoresAtuais[codigo] : null;
    const ativo = codigo === estado.selecionado;
    return {
      fillColor: corParaValor(valor === undefined ? null : valor, maxAtual),
      fillOpacity: 0.92,
      color: ativo ? "#061426" : "#ffffff",
      weight: ativo ? 2.6 : 0.7,
      opacity: 1,
    };
  }

  function tooltipHTML(props, valor) {
    return (
      '<div class="municipio-tooltip">' +
      "<strong>" + escapeHTML(props.nome) + "</strong>" +
      "<span>" + escapeHTML(rotuloAtual) + ": " + escapeHTML(formatNumber(valor)) + "</span>" +
      "<span>Clique para abrir o painel</span>" +
      "</div>"
    );
  }

  function renderMapa() {
    if (!camada) return;
    camada.eachLayer(function (layer) {
      if (!layer.feature || !layer.feature.properties) return;
      const props = layer.feature.properties;
      const valor = valoresAtuais[props.codarea];
      layer.setStyle(estiloFeature(layer.feature));
      layer.setTooltipContent(tooltipHTML(props, valor === undefined ? null : valor));
    });
  }

  function focarMunicipio(codigo) {
    const feature = MALHA.features.find(function (item) {
      return item.properties && item.properties.codarea === codigo;
    });
    if (!feature) return;
    const bounds = L.geoJSON(feature).getBounds();
    if (bounds.isValid()) {
      mapaLeaflet.flyToBounds(bounds, {
        padding: [48, 48],
        maxZoom: 9,
        duration: 0.65,
      });
    }
  }

  function selecionarMunicipio(codigo, focar) {
    estado.selecionado = codigo;
    if (focar) focarMunicipio(codigo);
    renderTudo();
  }

  function limparFiltros() {
    estado.cargo = cargoInicial;
    estado.turno = turnoInicial;
    estado.visualizacao = "brancos";
    estado.candidatoId = null;
    estado.partido = null;
    estado.selecionado = null;
    estado.busca = "";
    el.busca.value = "";
    el.limparBusca.hidden = true;
    el.sugestoes.hidden = true;
    el.busca.setAttribute("aria-expanded", "false");
    if (camada) {
      const bounds = camada.getBounds();
      if (bounds.isValid()) {
        mapaLeaflet.fitBounds(bounds, { padding: [24, 24] });
      }
    }
    renderTudo();
  }

  function inicializarMapa() {
    mapaLeaflet = L.map("mapa", {
      center: [-5.2, -45.4],
      zoom: 6,
      minZoom: 5,
      maxZoom: 11,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: "topright" }).addTo(mapaLeaflet);
    L.control.scale({ position: "bottomright", imperial: false }).addTo(mapaLeaflet);

    camada = L.geoJSON(MALHA, {
      style: estiloFeature,
      onEachFeature: function (feature, layer) {
        const props = feature.properties || {};
        const codigo = props.codarea;
        layer.bindTooltip(
          tooltipHTML(props, valoresAtuais[codigo] === undefined ? null : valoresAtuais[codigo]),
          {
            sticky: true,
            direction: "top",
            opacity: 1,
            className: "municipio-tooltip",
          },
        );

        layer.on({
          mouseover: function () {
            layer.setStyle({ weight: 2, color: "#f2c94c", fillOpacity: 1 });
            if (layer.bringToFront) layer.bringToFront();
          },
          mouseout: function () {
            layer.setStyle(estiloFeature(feature));
          },
          click: function () {
            selecionarMunicipio(codigo, false);
          },
        });
      },
    }).addTo(mapaLeaflet);

    const bounds = camada.getBounds();
    if (bounds.isValid()) {
      mapaLeaflet.fitBounds(bounds, { padding: [24, 24] });
    }
  }

  function ligarEventos() {
    el.cargo.addEventListener("change", function (event) {
      const novoCargo = event.target.value;
      estado.cargo = novoCargo;
      const turnos = (MAPA.cargos[novoCargo] && MAPA.cargos[novoCargo].turnos) || [1];
      estado.turno = turnos[0] || 1;
      estado.partido = null;
      estado.candidatoId = null;
      if (estado.visualizacao === "candidato") estado.visualizacao = "brancos";
      renderTudo();
    });

    el.turno.addEventListener("change", function (event) {
      estado.turno = Number(event.target.value);
      estado.partido = null;
      estado.candidatoId = null;
      if (estado.visualizacao === "candidato") estado.visualizacao = "brancos";
      renderTudo();
    });

    el.partido.addEventListener("change", function (event) {
      estado.partido = event.target.value || null;
      if (estado.candidatoId) {
        const candidato = getCandidatos().find(function (item) {
          return item.id === estado.candidatoId;
        });
        if (estado.partido && candidato && candidato.partido !== estado.partido) {
          estado.candidatoId = null;
          if (estado.visualizacao === "candidato") estado.visualizacao = "brancos";
        }
      }
      renderTudo();
    });

    el.candidato.addEventListener("change", function (event) {
      estado.candidatoId = event.target.value || null;
      if (estado.candidatoId) {
        estado.visualizacao = "candidato";
      } else if (estado.visualizacao === "candidato") {
        estado.visualizacao = "brancos";
      }
      renderTudo();
    });

    el.visualizacao.addEventListener("change", function (event) {
      const valor = event.target.value;
      if (valor === "candidato" && !estado.candidatoId) {
        estado.visualizacao = "brancos";
      } else {
        estado.visualizacao = valor;
      }
      renderTudo();
    });

    el.busca.addEventListener("input", function (event) {
      estado.busca = event.target.value;
      el.limparBusca.hidden = !estado.busca;
      renderSugestoes();
    });

    el.busca.addEventListener("focus", function () {
      if (estado.busca.trim().length >= 2) renderSugestoes();
    });

    el.busca.addEventListener("blur", function () {
      window.setTimeout(function () {
        el.sugestoes.hidden = true;
        el.busca.setAttribute("aria-expanded", "false");
      }, 140);
    });

    el.limparBusca.addEventListener("click", function () {
      estado.busca = "";
      el.busca.value = "";
      el.limparBusca.hidden = true;
      el.sugestoes.hidden = true;
      el.busca.setAttribute("aria-expanded", "false");
      el.busca.focus();
    });

    el.limparFiltros.addEventListener("click", limparFiltros);

    document.addEventListener("click", function (event) {
      if (!event.target.closest(".busca-area")) {
        el.sugestoes.hidden = true;
        el.busca.setAttribute("aria-expanded", "false");
      }
    });
  }

  inicializarMapa();
  ligarEventos();
  renderTudo();
})();
