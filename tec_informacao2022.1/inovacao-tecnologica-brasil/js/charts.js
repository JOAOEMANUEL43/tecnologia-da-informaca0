/* =========================================================================
   Gráficos — SVG e HTML puros, sem bibliotecas externas.
   Expõe window.Graficos com formatadores e construtores de visualizações.
   ========================================================================= */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ----------------------------- Formatadores ---------------------------- */
  var formatos = {
    num: function (v) {
      return v == null || isNaN(v) ? '—' : nf0.format(v);
    },
    dec: function (v, casas) {
      if (v == null || isNaN(v)) return '—';
      if (casas === 0) return nf0.format(v);
      if (casas === 2) return nf2.format(v);
      return nf1.format(v);
    },
    pct: function (v, casas) {
      if (v == null || isNaN(v)) return '—';
      return formatos.dec(v, casas == null ? 1 : casas) + '%';
    },
    pp: function (v, casas) {
      if (v == null || isNaN(v)) return '—';
      var sinal = v > 0 ? '+' : v < 0 ? '−' : '';
      return sinal + formatos.dec(Math.abs(v), casas == null ? 1 : casas) + ' p.p.';
    },
    /* Recebe valores em milhares de reais, como publicados pelo SIDRA. */
    moeda: function (milhares, casas) {
      if (milhares == null || isNaN(milhares)) return '—';
      var reais = milhares * 1000;
      var c = casas == null ? 1 : casas;
      if (Math.abs(reais) >= 1e9) return 'R$ ' + formatos.dec(reais / 1e9, c) + ' bi';
      if (Math.abs(reais) >= 1e6) return 'R$ ' + formatos.dec(reais / 1e6, c) + ' mi';
      return 'R$ ' + nf0.format(reais);
    },
    bi: function (milhares, casas) {
      if (milhares == null || isNaN(milhares)) return '—';
      return formatos.dec((milhares * 1000) / 1e9, casas == null ? 1 : casas);
    }
  };

  /* ------------------------------- Utilidades ---------------------------- */
  function escapar(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escalaBonita(max, min, ticks) {
    min = min == null ? 0 : min;
    ticks = ticks || 4;
    if (!isFinite(max) || max <= min) max = min + 1;
    var bruto = (max - min) / ticks;
    var mag = Math.pow(10, Math.floor(Math.log10(bruto)));
    var norm = bruto / mag;
    var passo = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    return {
      min: Math.floor(min / passo) * passo,
      max: Math.ceil(max / passo) * passo,
      passo: passo
    };
  }

  function svgEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        el.setAttribute(k, attrs[k]);
      });
    }
    return el;
  }

  /* -------------------------------- Dica --------------------------------- */
  var dicaEl = null;

  function obterDica() {
    if (!dicaEl) dicaEl = document.getElementById('dica');
    if (!dicaEl) {
      dicaEl = document.createElement('div');
      dicaEl.id = 'dica';
      dicaEl.className = 'dica';
      dicaEl.setAttribute('role', 'tooltip');
      document.body.appendChild(dicaEl);
    }
    return dicaEl;
  }

  function mostrarDica(html, x, y) {
    var el = obterDica();
    el.innerHTML = html;
    el.classList.add('ativa');
    el.setAttribute('aria-hidden', 'false');
    var r = el.getBoundingClientRect();
    var margem = 14;
    var px = x + margem;
    var py = y + margem;
    if (px + r.width > window.innerWidth - 10) px = x - r.width - margem;
    if (py + r.height > window.innerHeight - 10) py = y - r.height - margem;
    el.style.left = Math.max(8, px) + 'px';
    el.style.top = Math.max(8, py) + 'px';
  }

  function esconderDica() {
    if (!dicaEl) return;
    dicaEl.classList.remove('ativa');
    dicaEl.setAttribute('aria-hidden', 'true');
  }

  function linhaDica(nome, cor, valor) {
    return '<span class="dica__linha"><i style="background:' + cor + '"></i>' +
      escapar(nome) + '<b>' + escapar(valor) + '</b></span>';
  }

  /* --------------------------- Redimensionamento ------------------------- */
  function montarResponsivo(alvo, desenhar) {
    if (alvo.__graficoObs) alvo.__graficoObs.disconnect();
    var ultimaLargura = 0;

    function executar(largura) {
      if (largura < 60) return;
      if (Math.abs(largura - ultimaLargura) < 2) return;
      ultimaLargura = largura;
      desenhar(largura);
    }

    if (typeof ResizeObserver === 'function') {
      var obs = new ResizeObserver(function (entradas) {
        executar(Math.round(entradas[0].contentRect.width));
      });
      obs.observe(alvo);
      alvo.__graficoObs = obs;
    }

    var inicial = Math.round(alvo.clientWidth || alvo.parentNode.clientWidth || 720);
    ultimaLargura = 0;
    executar(inicial);
  }

  /* ------------------------------ Legenda -------------------------------- */
  function legenda(alvo, series, comoLinha) {
    if (!alvo) return;
    alvo.innerHTML = series.map(function (s) {
      return '<span class="legenda__item"><i class="legenda__cor' +
        (comoLinha ? ' legenda__cor--linha' : '') +
        '" style="--cor:' + s.cor + '"></i>' + escapar(s.nome) + '</span>';
    }).join('');
  }

  /* ------------------------------- Linha --------------------------------- */
  function linha(alvo, o) {
    if (!alvo) return;
    var dados = o.dados || [];
    var series = o.series || [];
    var fmt = o.formato || formatos.num;
    var fmtEixo = o.formatoEixo || fmt;
    if (!dados.length || !series.length) {
      alvo.innerHTML = '<p class="painel__nota">Sem dados para exibir.</p>';
      return;
    }

    var aria = o.rotulo || ('Série histórica: ' + series.map(function (s) {
      return s.nome + ' — ' + dados.map(function (d) {
        return d.rotulo + ': ' + fmt(d[s.chave]);
      }).join(', ');
    }).join('; '));

    montarResponsivo(alvo, function (W) {
      var compacto = W < 560;
      var H = Math.max(280, Math.min(430, Math.round(W * 0.5)));
      var m = { t: 24, r: compacto ? 14 : 24, b: 42, l: compacto ? 46 : 62 };
      var largura = W - m.l - m.r;
      var altura = H - m.t - m.b;
      var n = dados.length;

      var valores = [];
      series.forEach(function (s) {
        dados.forEach(function (d) {
          if (typeof d[s.chave] === 'number') valores.push(d[s.chave]);
        });
      });
      if (!valores.length) {
        alvo.innerHTML = '<p class="painel__nota">Sem dados para exibir.</p>';
        return;
      }

      var escala = escalaBonita(Math.max.apply(null, valores), Math.min.apply(null, [0].concat(valores)), 4);
      var x = function (i) {
        return n === 1 ? m.l + largura / 2 : m.l + (i * largura) / (n - 1);
      };
      var y = function (v) {
        return m.t + altura - ((v - escala.min) / (escala.max - escala.min)) * altura;
      };

      var partes = [];
      partes.push('<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
        '" class="grafico-linha" role="img" aria-label="' + escapar(aria) + '">');

      /* Grade e eixo Y */
      var t = escala.min;
      var idx = 0;
      while (t <= escala.max + escala.passo / 2) {
        var yy = y(t);
        partes.push('<line class="lc-grade" x1="' + m.l + '" y1="' + yy.toFixed(1) +
          '" x2="' + (m.l + largura) + '" y2="' + yy.toFixed(1) + '"/>');
        partes.push('<text class="lc-eixo" x="' + (m.l - 10) + '" y="' + (yy + 4).toFixed(1) +
          '" text-anchor="end">' + escapar(fmtEixo(t)) + '</text>');
        t += escala.passo;
        idx++;
        if (idx > 12) break;
      }

      /* Rótulos do eixo X */
      dados.forEach(function (d, i) {
        partes.push('<text class="lc-rotulo" x="' + x(i).toFixed(1) + '" y="' + (m.t + altura + 26) +
          '" text-anchor="middle">' + escapar(String(d.rotulo)) + '</text>');
      });

      /* Áreas e linhas */
      series.forEach(function (s, si) {
        var pontos = dados.map(function (d, i) {
          return { x: x(i), y: y(d[s.chave]) };
        });
        if (o.area !== false && si === 0) {
          var area = 'M ' + pontos[0].x.toFixed(1) + ' ' + y(escala.min).toFixed(1);
          pontos.forEach(function (p) { area += ' L ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1); });
          area += ' L ' + pontos[pontos.length - 1].x.toFixed(1) + ' ' + y(escala.min).toFixed(1) + ' Z';
          partes.push('<path class="lc-area" d="' + area + '" style="fill:' + s.cor + '"/>');
        }
        var d = pontos.map(function (p, i) {
          return (i === 0 ? 'M ' : 'L ') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
        }).join(' ');
        partes.push('<path class="lc-traco" d="' + d + '" style="stroke:' + s.cor +
          ';--atraso:' + (si * 160) + 'ms"/>');
      });

      /* Pontos fixos */
      series.forEach(function (s, si) {
        dados.forEach(function (d, i) {
          partes.push('<circle class="lc-ponto" cx="' + x(i).toFixed(1) + '" cy="' + y(d[s.chave]).toFixed(1) +
            '" r="3.2" style="fill:' + s.cor + ';animation-delay:' + (600 + si * 120 + i * 60) + 'ms"/>');
        });
      });

      /* Camada de foco */
      partes.push('<g class="lc-foco"><line class="lc-foco-linha" x1="0" y1="' + m.t +
        '" x2="0" y2="' + (m.t + altura) + '"/>');
      series.forEach(function (s) {
        partes.push('<circle class="lc-foco-ponto" r="4.6" cx="0" cy="0" style="fill:' + s.cor + '"/>');
      });
      partes.push('</g>');
      partes.push('<rect class="lc-zona" x="' + m.l + '" y="' + m.t + '" width="' + largura +
        '" height="' + altura + '"/>');
      partes.push('</svg>');

      alvo.innerHTML = partes.join('');

      var svg = alvo.querySelector('svg');
      var foco = alvo.querySelector('.lc-foco');
      var focoLinha = alvo.querySelector('.lc-foco-linha');
      var focoPontos = alvo.querySelectorAll('.lc-foco-ponto');
      var zona = alvo.querySelector('.lc-zona');
      var ativo = -1;

      function posicionar(i) {
        if (i < 0 || i >= n) return;
        ativo = i;
        var px = x(i);
        focoLinha.setAttribute('x1', px);
        focoLinha.setAttribute('x2', px);
        series.forEach(function (s, si) {
          focoPontos[si].setAttribute('cx', px);
          focoPontos[si].setAttribute('cy', y(dados[i][s.chave]));
        });
        foco.classList.add('ativo');
      }

      function conteudo(i) {
        return '<strong>' + escapar(String(dados[i].rotulo)) + '</strong>' +
          series.map(function (s) {
            return linhaDica(s.nome, s.cor, fmt(dados[i][s.chave]));
          }).join('');
      }

      function indicePorEvento(ev) {
        var r = svg.getBoundingClientRect();
        var px = ((ev.clientX - r.left) / r.width) * W;
        var i = Math.round(((px - m.l) / largura) * (n - 1));
        return Math.max(0, Math.min(n - 1, i));
      }

      zona.addEventListener('pointermove', function (ev) {
        var i = indicePorEvento(ev);
        posicionar(i);
        mostrarDica(conteudo(i), ev.clientX, ev.clientY);
      });
      zona.addEventListener('pointerleave', function () {
        foco.classList.remove('ativo');
        ativo = -1;
        esconderDica();
      });

      svg.setAttribute('tabindex', '0');
      svg.addEventListener('keydown', function (ev) {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft' && ev.key !== 'Home' && ev.key !== 'End') return;
        ev.preventDefault();
        if (ev.key === 'Home') ativo = 0;
        else if (ev.key === 'End') ativo = n - 1;
        else ativo = Math.max(0, Math.min(n - 1, (ativo < 0 ? 0 : ativo) + (ev.key === 'ArrowRight' ? 1 : -1)));
        posicionar(ativo);
        var r = svg.getBoundingClientRect();
        var cx = r.left + (x(ativo) / W) * r.width;
        var cy = r.top + (y(dados[ativo][series[0].chave]) / H) * r.height;
        mostrarDica(conteudo(ativo), cx, cy);
      });
      svg.addEventListener('blur', function () {
        foco.classList.remove('ativo');
        ativo = -1;
        esconderDica();
      });
    });
  }

  /* -------------------------- Barras verticais --------------------------- */
  function barrasV(alvo, o) {
    if (!alvo) return;
    var dados = o.dados || [];
    var fmt = o.formato || formatos.num;
    var fmtEixo = o.formatoEixo || fmt;
    var cor = o.cor || 'var(--verde-claro)';
    if (!dados.length) {
      alvo.innerHTML = '<p class="painel__nota">Sem dados para exibir.</p>';
      return;
    }

    var aria = o.rotulo || ('Barras: ' + dados.map(function (d) {
      return d.rotulo + ': ' + fmt(d.valor);
    }).join(', '));

    montarResponsivo(alvo, function (W) {
      var compacto = W < 560;
      var H = Math.max(250, Math.min(380, Math.round(W * 0.44)));
      var m = { t: 34, r: compacto ? 10 : 20, b: 44, l: compacto ? 46 : 62 };
      var largura = W - m.l - m.r;
      var altura = H - m.t - m.b;
      var n = dados.length;
      var maximo = Math.max.apply(null, dados.map(function (d) { return d.valor; }));
      var escala = escalaBonita(maximo, 0, 4);
      var passo = largura / n;
      var bw = Math.min(96, passo * 0.52);

      var partes = [];
      partes.push('<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H +
        '" class="grafico-barras" role="img" aria-label="' + escapar(aria) + '">');

      var t = escala.min;
      var idx = 0;
      while (t <= escala.max + escala.passo / 2) {
        var yy = m.t + altura - ((t - escala.min) / (escala.max - escala.min)) * altura;
        partes.push('<line class="lc-grade" x1="' + m.l + '" y1="' + yy.toFixed(1) +
          '" x2="' + (m.l + largura) + '" y2="' + yy.toFixed(1) + '"/>');
        partes.push('<text class="lc-eixo" x="' + (m.l - 10) + '" y="' + (yy + 4).toFixed(1) +
          '" text-anchor="end">' + escapar(fmtEixo(t)) + '</text>');
        t += escala.passo;
        idx++;
        if (idx > 12) break;
      }

      dados.forEach(function (d, i) {
        var cx = m.l + passo * (i + 0.5);
        var alturaBarra = ((d.valor - escala.min) / (escala.max - escala.min)) * altura;
        var yy = m.t + altura - alturaBarra;
        partes.push('<rect class="bv-barra" data-i="' + i + '" x="' + (cx - bw / 2).toFixed(1) +
          '" y="' + yy.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(1, alturaBarra).toFixed(1) +
          '" rx="6" style="fill:' + (d.cor || cor) + ';--atraso:' + (i * 90) + 'ms"/>');
        partes.push('<text class="bv-valor" x="' + cx.toFixed(1) + '" y="' + (yy - 9).toFixed(1) +
          '" text-anchor="middle">' + escapar(fmt(d.valor)) + '</text>');
        partes.push('<text class="lc-rotulo" x="' + cx.toFixed(1) + '" y="' + (m.t + altura + 26) +
          '" text-anchor="middle">' + escapar(String(d.rotulo)) + '</text>');
      });

      partes.push('</svg>');
      alvo.innerHTML = partes.join('');

      var barras = alvo.querySelectorAll('.bv-barra');
      Array.prototype.forEach.call(barras, function (b) {
        var i = Number(b.getAttribute('data-i'));
        b.addEventListener('pointerenter', function (ev) {
          mostrarDica('<strong>' + escapar(String(dados[i].rotulo)) + '</strong>' +
            linhaDica(o.nomeSerie || 'Valor', dados[i].cor || cor, fmt(dados[i].valor)), ev.clientX, ev.clientY);
        });
        b.addEventListener('pointermove', function (ev) {
          mostrarDica('<strong>' + escapar(String(dados[i].rotulo)) + '</strong>' +
            linhaDica(o.nomeSerie || 'Valor', dados[i].cor || cor, fmt(dados[i].valor)), ev.clientX, ev.clientY);
        });
        b.addEventListener('pointerleave', esconderDica);
      });
    });
  }

  /* ------------------------ Barras horizontais --------------------------- */
  function barrasH(alvo, o) {
    if (!alvo) return;
    var itens = (o.itens || []).filter(function (i) { return i && i.valor != null; });
    if (!itens.length) {
      alvo.innerHTML = '<p class="painel__nota">Sem dados para exibir.</p>';
      return;
    }
    var fmt = o.formato || formatos.num;
    var max = o.max != null ? o.max : Math.max.apply(null, itens.map(function (i) { return i.valor; }));
    if (!max) max = 1;

    var html = itens.map(function (item, idx) {
      var pct = Math.max(0, Math.min(100, (item.valor / max) * 100));
      var cor = item.cor || o.cor || 'var(--verde-claro)';
      var dica = item.dica ? ' data-dica="' + escapar(item.dica) + '"' : '';
      var secundario = item.secundario
        ? '<span class="barras__secundario">' + escapar(item.secundario) + '</span>'
        : '';
      var alerta = item.alerta
        ? ' <span class="tag-alerta">base pequena</span>'
        : '';
      return '<div class="barras__item"' + dica + '>' +
        '<div class="barras__cabeca">' +
        '<span class="barras__rotulo">' + escapar(item.nome) + alerta + '</span>' +
        '<span class="barras__valor">' + escapar(fmt(item.valor)) + '</span>' +
        '</div>' +
        '<div class="barras__trilho"><span class="barras__preenchimento" style="--cor:' + cor +
        ';--atraso:' + Math.min(idx * 40, 420) + 'ms"></span></div>' +
        secundario +
        '</div>';
    }).join('');

    alvo.innerHTML = '<div class="barras">' + html + '</div>';

    requestAnimationFrame(function () {
      var preenchimentos = alvo.querySelectorAll('.barras__preenchimento');
      Array.prototype.forEach.call(preenchimentos, function (el, i) {
        var pct = Math.max(0, Math.min(100, (itens[i].valor / max) * 100));
        el.style.width = pct + '%';
      });
    });

    Array.prototype.forEach.call(alvo.querySelectorAll('.barras__item[data-dica]'), function (el) {
      var conteudo = el.getAttribute('data-dica');
      el.addEventListener('pointerenter', function (ev) { mostrarDica(conteudo, ev.clientX, ev.clientY); });
      el.addEventListener('pointermove', function (ev) { mostrarDica(conteudo, ev.clientX, ev.clientY); });
      el.addEventListener('pointerleave', esconderDica);
    });
  }

  /* --------------------------- Barras duplas ----------------------------- */
  function barrasDuplas(alvo, o) {
    if (!alvo) return;
    var itens = (o.itens || []).filter(function (i) { return i && (i.a != null || i.b != null); });
    var series = o.series || [];
    if (!itens.length || series.length < 2) {
      alvo.innerHTML = '<p class="painel__nota">Sem dados para exibir.</p>';
      return;
    }
    var fmt = o.formato || formatos.num;
    var max = Math.max.apply(null, itens.reduce(function (acc, i) {
      acc.push(i.a || 0, i.b || 0);
      return acc;
    }, []));
    if (!max) max = 1;

    var html = itens.map(function (item, idx) {
      var pa = Math.max(0, Math.min(100, ((item.a || 0) / max) * 100));
      var pb = Math.max(0, Math.min(100, ((item.b || 0) / max) * 100));
      var atraso = Math.min(idx * 40, 420);
      return '<div class="duplas__item">' +
        '<div class="duplas__cabeca">' +
        '<span class="duplas__rotulo">' + escapar(item.nome) + '</span>' +
        '<span class="duplas__valores">' +
        '<span style="--cor:' + series[0].cor + '">' + escapar(fmt(item.a)) + '</span>' +
        '<span style="--cor:' + series[1].cor + '">' + escapar(fmt(item.b)) + '</span>' +
        '</span></div>' +
        '<div class="duplas__trilhos">' +
        '<div class="duplas__trilho"><span class="duplas__barra" data-pct="' + pa +
        '" style="--cor:' + series[0].cor + ';--atraso:' + atraso + 'ms"></span></div>' +
        '<div class="duplas__trilho"><span class="duplas__barra" data-pct="' + pb +
        '" style="--cor:' + series[1].cor + ';--atraso:' + (atraso + 60) + 'ms"></span></div>' +
        '</div></div>';
    }).join('');

    alvo.innerHTML = '<div class="duplas">' + html + '</div>';

    requestAnimationFrame(function () {
      Array.prototype.forEach.call(alvo.querySelectorAll('.duplas__barra'), function (el) {
        el.style.width = el.getAttribute('data-pct') + '%';
      });
    });
  }

  /* ------------------------ Barras empilhadas ---------------------------- */
  function barrasEmpilhadas(alvo, o) {
    if (!alvo) return;
    var itens = o.itens || [];
    if (!itens.length) {
      alvo.innerHTML = '<p class="painel__nota">Sem dados para exibir.</p>';
      return;
    }
    var fmt = o.formato || formatos.num;
    var legendaItens = itens[0].segmentos || [];

    var html = itens.map(function (item) {
      var total = item.segmentos.reduce(function (s, seg) { return s + (seg.valor || 0); }, 0);
      var segmentos = item.segmentos.map(function (seg) {
        var pct = total ? (seg.valor / total) * 100 : 0;
        var mostrar = pct >= 11;
        return '<span class="empilhada__seg" data-pct="' + pct.toFixed(2) + '" style="background:' + seg.cor +
          ';color:' + (seg.texto || '#0a1a12') + '">' + (mostrar ? escapar(formatos.dec(pct, 1) + '%') : '') + '</span>';
      }).join('');
      return '<div class="empilhada">' +
        '<div class="empilhada__cabeca">' +
        '<span class="empilhada__rotulo">' + escapar(item.nome) + '</span>' +
        '<span class="empilhada__total">' + escapar(fmt(total)) + ' empresas</span>' +
        '</div>' +
        '<div class="empilhada__barra">' + segmentos + '</div>' +
        '</div>';
    }).join('');

    var legendaHtml = '<div class="empilhada__legenda">' + legendaItens.map(function (seg) {
      return '<span><i style="--cor:' + seg.cor + '"></i>' + escapar(seg.nome) + '</span>';
    }).join('') + '</div>';

    alvo.innerHTML = '<div class="empilhadas">' + html + '</div>' + legendaHtml;

    requestAnimationFrame(function () {
      Array.prototype.forEach.call(alvo.querySelectorAll('.empilhada__seg'), function (el) {
        el.style.width = el.getAttribute('data-pct') + '%';
      });
    });
  }

  /* -------------------------------- Rosca -------------------------------- */
  function rosca(alvo, o) {
    if (!alvo) return;
    var itens = (o.itens || []).filter(function (i) { return i && i.valor; });
    if (!itens.length) {
      alvo.innerHTML = '<p class="painel__nota">Sem dados para exibir.</p>';
      return;
    }
    var fmt = o.formato || formatos.num;
    var total = itens.reduce(function (s, i) { return s + i.valor; }, 0);
    var raio = 68;
    var circ = 2 * Math.PI * raio;
    var acumulado = 0;

    var segmentos = itens.map(function (item) {
      var frac = item.valor / total;
      var dash = Math.max(0, frac * circ - 2.5);
      var offset = -acumulado * circ;
      acumulado += frac;
      return '<circle class="rosca__seg" cx="100" cy="100" r="' + raio + '" fill="none" stroke="' + item.cor +
        '" stroke-width="24" stroke-dasharray="' + dash.toFixed(2) + ' ' + (circ - dash).toFixed(2) +
        '" stroke-dashoffset="' + offset.toFixed(2) + '" data-i="' + itens.indexOf(item) +
        '" transform="rotate(-90 100 100)"/>';
    }).join('');

    var centro = o.centro || { valor: fmt(total), rotulo: 'total' };

    var svg = '<svg viewBox="0 0 200 200" class="rosca__svg" role="img" aria-label="' +
      escapar(o.rotulo || itens.map(function (i) { return i.nome + ': ' + fmt(i.valor); }).join(', ')) + '">' +
      '<circle cx="100" cy="100" r="' + raio + '" fill="none" stroke="var(--trilho)" stroke-width="24"/>' +
      segmentos +
      '<text class="rosca__centro" x="100" y="101">' + escapar(centro.valor) + '</text>' +
      '<text class="rosca__centro-rotulo" x="100" y="120">' + escapar(centro.rotulo) + '</text>' +
      '</svg>';

    var legendaHtml = '<div class="rosca__legenda">' + itens.map(function (item) {
      return '<div class="rosca__item">' +
        '<span class="rosca__cor" style="--cor:' + item.cor + '"></span>' +
        '<div><p class="rosca__nome">' + escapar(item.nome) + '</p>' +
        '<p class="rosca__valor">' + escapar(fmt(item.valor)) + ' · ' +
        escapar(formatos.dec((item.valor / total) * 100, 1)) + '%</p></div>' +
        '</div>';
    }).join('') + '</div>';

    alvo.innerHTML = '<div class="rosca">' + svg + legendaHtml + '</div>';

    Array.prototype.forEach.call(alvo.querySelectorAll('.rosca__seg'), function (el) {
      var i = Number(el.getAttribute('data-i'));
      var item = itens[i];
      el.addEventListener('pointerenter', function (ev) {
        mostrarDica('<strong>' + escapar(item.nome) + '</strong>' +
          linhaDica(formatos.num(item.valor) + ' empresas',
            item.cor, formatos.dec((item.valor / total) * 100, 1) + '%'), ev.clientX, ev.clientY);
      });
      el.addEventListener('pointermove', function (ev) {
        mostrarDica('<strong>' + escapar(item.nome) + '</strong>' +
          linhaDica(formatos.num(item.valor) + ' empresas',
            item.cor, formatos.dec((item.valor / total) * 100, 1) + '%'), ev.clientX, ev.clientY);
      });
      el.addEventListener('pointerleave', esconderDica);
    });
  }

  /* ------------------------------- Medidor ------------------------------- */
  function medidor(alvo, o) {
    if (!alvo) return;
    var valor = o.valor == null ? 0 : o.valor;
    var max = o.max || 100;
    var frac = Math.max(0, Math.min(1, valor / max));
    var raio = 100;
    var cx = 130;
    var cy = 124;
    var comprimento = Math.PI * raio;
    var caminho = 'M ' + (cx - raio) + ' ' + cy + ' A ' + raio + ' ' + raio + ' 0 0 1 ' + (cx + raio) + ' ' + cy;
    var cor = o.cor || 'var(--lima)';

    alvo.innerHTML =
      '<div class="medidor__topo">' +
      '<svg viewBox="0 0 260 140" class="medidor__svg" role="img" aria-label="' +
      escapar(o.rotulo + ': ' + formatos.pct(valor)) + '">' +
      '<path d="' + caminho + '" class="medidor__trilho"/>' +
      '<path d="' + caminho + '" class="medidor__arco" style="stroke:' + cor +
      ';stroke-dasharray:' + comprimento.toFixed(2) +
      ';stroke-dashoffset:' + comprimento.toFixed(2) + '"/>' +
      '</svg>' +
      '<div class="medidor__centro"><span class="medidor__valor">' + escapar(formatos.pct(valor, 1)) + '</span></div>' +
      '</div>' +
      '<p class="medidor__rotulo">' + escapar(o.rotulo) + '</p>' +
      '<p class="medidor__detalhe">' + escapar(o.detalhe || '') + '</p>';

    var arco = alvo.querySelector('.medidor__arco');
    var alvoOffset = comprimento * (1 - frac);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        arco.style.strokeDashoffset = alvoOffset.toFixed(2);
      });
    });
  }

  window.Graficos = {
    formatos: formatos,
    escapar: escapar,
    mostrarDica: mostrarDica,
    esconderDica: esconderDica,
    legenda: legenda,
    linha: linha,
    barrasV: barrasV,
    barrasH: barrasH,
    barrasDuplas: barrasDuplas,
    barrasEmpilhadas: barrasEmpilhadas,
    rosca: rosca,
    medidor: medidor
  };
})();
