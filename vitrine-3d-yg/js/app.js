/* ==========================================================================
   Vitrine 3D de lançamentos — YG Música e Entretenimento S.A.
   --------------------------------------------------------------------------
   Cena em Three.js: as capas ficam numa estante curva girando ao redor da
   câmera, e o lançamento escolhido voa para o centro da vitrine.

   A câmera é fixa. O que gira é o anel, por arraste do mouse, com inércia e
   giro automático. Essa escolha evita depender de controles de órbita e
   mantém a leitura igual em qualquer navegador.

   Carregado como script comum (sem módulos ES) para a página abrir com dois
   cliques, sem servidor: a biblioteca vendor/three.min.js é o build UMD do
   Three.js r149, o último com esse formato.
   ========================================================================== */

(function () {
  'use strict';

  var CATALOGO = window.CATALOGO_YG;
  var PALCO = document.getElementById('palco');
  var AVISO_CARREGANDO = document.getElementById('carregando');
  var AVISO_SEM_WEBGL = document.getElementById('sem-webgl');

  if (!CATALOGO || !window.THREE) {
    AVISO_CARREGANDO.hidden = true;
    AVISO_SEM_WEBGL.hidden = false;
    return;
  }

  var PRODUTOS = CATALOGO.produtos;

  /* ------------------------------------------------------------- utilidades */

  var TA = window.THREE;

  function moeda(centavos) {
    return (centavos / 100).toLocaleString('pt-BR', {
      style: 'currency', currency: 'BRL'
    });
  }

  function hms(segundos) {
    var m = Math.floor(segundos / 60);
    var s = Math.floor(segundos % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function hsl(h, s, l) {
    return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
  }

  function escapar(texto) {
    return String(texto).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function statusCurto(status) {
    return { 'Disponível': 'Disp.', 'Pré-venda': 'Pré-v.', 'Esgotado': 'Esgot.' }[status] || status;
  }

  /* ------------------------------------------------------- estado da vitrine */

  var filtro = { busca: '', tipo: '', status: '', genero: '' };
  var visiveis = [];
  var selecionado = null;
  var itens = [];
  var itensPorId = {};

  var reduzirMovimento = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- cenário */

  var renderer;
  try {
    renderer = new TA.WebGLRenderer({ canvas: PALCO, antialias: true });
  } catch (erro) {
    AVISO_CARREGANDO.hidden = true;
    AVISO_SEM_WEBGL.hidden = false;
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputEncoding = TA.sRGBEncoding;
  renderer.toneMapping = TA.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = TA.PCFSoftShadowMap;

  var scene = new TA.Scene();
  scene.fog = new TA.Fog(0x070a14, 11, 40);

  var camera = new TA.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0.4, 0);

  /* ---------------------------------------------------------------- texturas */

  function canvasDe(lado) {
    var c = document.createElement('canvas');
    c.width = c.height = lado;
    return c;
  }

  function marcarTextura(textura) {
    textura.encoding = TA.sRGBEncoding;
    textura.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return textura;
  }

  function sorteio(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function seedDo(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) {
      h = (h ^ texto.charCodeAt(i)) * 16777619;
    }
    return Math.abs(h >>> 0);
  }

  var FORMAS = {
    'círculos': function (g, lado, h, rnd) {
      for (var i = 0; i < 7; i++) {
        g.beginPath();
        g.globalAlpha = 0.18 + rnd() * 0.3;
        g.fillStyle = hsl(h + i * 9, 70, 62);
        g.arc(rnd() * lado, rnd() * lado, lado * (0.05 + rnd() * 0.22), 0, Math.PI * 2);
        g.fill();
      }
    },
    'ondas': function (g, lado, h, rnd) {
      g.lineWidth = lado * 0.035;
      for (var i = 0; i < 9; i++) {
        g.beginPath();
        g.globalAlpha = 0.3 + rnd() * 0.35;
        g.strokeStyle = hsl(h + i * 7, 75, 60);
        var y = (i + 0.5) * lado / 9;
        g.moveTo(0, y);
        for (var x = 0; x <= lado; x += lado / 24) {
          g.lineTo(x, y + Math.sin((x / lado) * Math.PI * (2 + i * 0.3)) * lado * 0.05);
        }
        g.stroke();
      }
    },
    'linhas': function (g, lado, h, rnd) {
      g.save();
      g.translate(lado / 2, lado / 2);
      g.rotate(rnd() * Math.PI);
      g.translate(-lado, -lado);
      for (var i = 0; i < 14; i++) {
        g.globalAlpha = 0.16 + rnd() * 0.3;
        g.fillStyle = hsl(h + i * 11, 72, 58);
        g.fillRect(0, i * lado * 0.14, lado * 2, lado * 0.05);
      }
      g.restore();
    },
    'triângulos': function (g, lado, h, rnd) {
      for (var i = 0; i < 6; i++) {
        g.beginPath();
        g.globalAlpha = 0.2 + rnd() * 0.28;
        g.fillStyle = hsl(h + i * 13, 72, 60);
        g.moveTo(rnd() * lado, rnd() * lado);
        g.lineTo(rnd() * lado, rnd() * lado);
        g.lineTo(rnd() * lado, rnd() * lado);
        g.closePath();
        g.fill();
      }
    },
    'grade': function (g, lado, h, rnd) {
      var passo = lado / 9;
      for (var x = 0; x < 9; x++) {
        for (var y = 0; y < 9; y++) {
          g.globalAlpha = 0.2 + rnd() * 0.5;
          g.fillStyle = hsl(h + x * 5 + y * 3, 70, 60);
          g.beginPath();
          g.arc(passo * (x + 0.5), passo * (y + 0.5), passo * (0.1 + rnd() * 0.3), 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  };

  function desenharCapa(produto, lado, comTexto) {
    lado = lado || 512;
    var c = canvasDe(lado);
    var g = c.getContext('2d');
    var capa = produto.capa;
    var rnd = sorteio(seedDo(produto.id));

    var fundo = g.createLinearGradient(0, 0, lado, lado);
    fundo.addColorStop(0, hsl(capa.h1, 64, 48));
    fundo.addColorStop(1, hsl(capa.h2, 58, 20));
    g.fillStyle = fundo;
    g.fillRect(0, 0, lado, lado);

    g.save();
    (FORMAS[capa.forma] || FORMAS['círculos'])(g, lado, capa.h3, rnd);
    g.restore();

    var vinheta = g.createRadialGradient(lado / 2, lado / 2, lado * 0.2, lado / 2, lado / 2, lado * 0.78);
    vinheta.addColorStop(0, 'rgba(0,0,0,0)');
    vinheta.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = vinheta;
    g.fillRect(0, 0, lado, lado);

    if (comTexto) {
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(0, lado * 0.7, lado, lado * 0.3);
      g.textAlign = 'left';
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.font = '600 ' + Math.round(lado * 0.032) + 'px Arial, sans-serif';
      g.fillText(produto.artista.toUpperCase(), lado * 0.06, lado * 0.775);
      g.font = '700 ' + Math.round(lado * 0.062) + 'px Georgia, serif';
      g.fillText(cortar(produto.titulo, 16), lado * 0.06, lado * 0.865);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.font = '500 ' + Math.round(lado * 0.028) + 'px Arial, sans-serif';
      g.fillText(produto.tipo + ' · ' + produto.genero, lado * 0.06, lado * 0.935);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.font = '800 ' + Math.round(lado * 0.045) + 'px Arial, sans-serif';
      g.fillText('YG', lado * 0.86, lado * 0.935);
    }

    return c;
  }

  function texturaCapa(produto, lado, comTexto) {
    return marcarTextura(new TA.CanvasTexture(desenharCapa(produto, lado, comTexto)));
  }

  function cortar(texto, limite) {
    return texto.length > limite ? texto.slice(0, limite - 1) + '…' : texto;
  }

  function texturaContracapa(produto) {
    var lado = 512;
    var c = canvasDe(lado);
    var g = c.getContext('2d');
    g.fillStyle = hsl(produto.capa.h1, 22, 11);
    g.fillRect(0, 0, lado, lado);

    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = '700 26px Georgia, serif';
    g.fillText(cortar(produto.titulo, 20), 34, 74);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.font = '500 20px Arial, sans-serif';
    g.fillText(produto.artista + ' · ' + produto.id, 34, 108);

    g.strokeStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.moveTo(34, 132);
    g.lineTo(lado - 34, 132);
    g.stroke();

    g.font = '500 19px Arial, sans-serif';
    produto.faixas.slice(0, 11).forEach(function (faixa, i) {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillText((faixa.numero < 10 ? '0' : '') + faixa.numero, 34, 176 + i * 30);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillText(cortar(faixa.titulo, 24), 76, 176 + i * 30);
      g.textAlign = 'right';
      g.fillText(hms(faixa.duracao_seg), lado - 34, 176 + i * 30);
      g.textAlign = 'left';
    });

    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fillRect(lado - 150, lado - 116, 116, 74);
    g.fillStyle = 'rgba(0,0,0,0.55)';
    for (var i = 0; i < 34; i++) {
      var largura = 1 + (i % 4);
      g.fillRect(lado - 143 + i * 3.2, lado - 108, largura, 58);
    }
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.font = '800 30px Arial, sans-serif';
    g.fillText('YG', 34, lado - 44);
    g.font = '500 16px Arial, sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillText('Simulado para uso didático', 34, lado - 22);

    return marcarTextura(new TA.CanvasTexture(c));
  }

  function texturaHalo() {
    var lado = 256;
    var c = canvasDe(lado);
    var g = c.getContext('2d');
    var brilho = g.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2);
    brilho.addColorStop(0, 'rgba(255,255,255,0.85)');
    brilho.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    brilho.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = brilho;
    g.fillRect(0, 0, lado, lado);
    return new TA.CanvasTexture(c);
  }

  function texturaCéu() {
    var c = document.createElement('canvas');
    c.width = 8;
    c.height = 256;
    var g = c.getContext('2d');
    var fundo = g.createLinearGradient(0, 0, 0, 256);
    fundo.addColorStop(0, '#0d1030');
    fundo.addColorStop(0.5, '#080a18');
    fundo.addColorStop(1, '#03040a');
    g.fillStyle = fundo;
    g.fillRect(0, 0, 8, 256);
    return new TA.CanvasTexture(c);
  }

  /* ------------------------------------------------------------------- luzes */

  scene.add(new TA.HemisphereLight(0x9fb0ff, 0x0a0a14, 0.6));

  var luzPrincipal = new TA.DirectionalLight(0xffffff, 1.4);
  luzPrincipal.position.set(5, 10, 6);
  luzPrincipal.castShadow = true;
  luzPrincipal.shadow.mapSize.set(2048, 2048);
  luzPrincipal.shadow.camera.left = -13;
  luzPrincipal.shadow.camera.right = 13;
  luzPrincipal.shadow.camera.top = 13;
  luzPrincipal.shadow.camera.bottom = -13;
  luzPrincipal.shadow.camera.near = 1;
  luzPrincipal.shadow.camera.far = 40;
  luzPrincipal.shadow.bias = -0.0012;
  scene.add(luzPrincipal);

  var luzLateral = new TA.DirectionalLight(0x4ad9ff, 0.4);
  luzLateral.position.set(-7, 3, -5);
  scene.add(luzLateral);

  var luzPalco = new TA.PointLight(0xffffff, 0, 16, 2);
  luzPalco.position.set(0.4, 0.9, -4.2);
  scene.add(luzPalco);

  /* ---------------------------------------------------------------- cenário */

  var ceu = new TA.Mesh(
    new TA.SphereGeometry(55, 24, 16),
    new TA.MeshBasicMaterial({ map: texturaCéu(), side: TA.BackSide, fog: false, depthWrite: false })
  );
  scene.add(ceu);

  var chao = new TA.Mesh(
    new TA.CircleGeometry(26, 64),
    new TA.MeshStandardMaterial({ color: 0x090b14, roughness: 0.5, metalness: 0.4 })
  );
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -2.7;
  chao.receiveShadow = true;
  scene.add(chao);

  var haloChao = new TA.Mesh(
    new TA.RingGeometry(5.4, 9.5, 96),
    new TA.MeshBasicMaterial({
      color: 0x2b1b52, transparent: true, opacity: 0.5,
      blending: TA.AdditiveBlending, depthWrite: false, side: TA.DoubleSide
    })
  );
  haloChao.rotation.x = -Math.PI / 2;
  haloChao.position.y = -2.66;
  scene.add(haloChao);

  var anel = new TA.Group();
  scene.add(anel);

  /* ------------------------------------------------------- palco e vinil */

  var palco = new TA.Group();
  palco.visible = false;
  scene.add(palco);

  var haloPalco = new TA.Mesh(
    new TA.PlaneGeometry(8.4, 8.4),
    new TA.MeshBasicMaterial({
      map: texturaHalo(), transparent: true, opacity: 0,
      blending: TA.AdditiveBlending, depthWrite: false
    })
  );
  haloPalco.position.set(0.3, 0.5, -6.4);
  palco.add(haloPalco);

  var vinil = new TA.Group();
  vinil.position.set(1.95, 0.45, -5.3);
  palco.add(vinil);

  var disco = new TA.Mesh(
    new TA.CylinderGeometry(0.98, 0.98, 0.022, 64),
    new TA.MeshStandardMaterial({ color: 0x0b0b12, roughness: 0.32, metalness: 0.6 })
  );
  disco.rotation.x = Math.PI / 2;
  disco.castShadow = true;
  vinil.add(disco);

  var rotulo = new TA.Mesh(
    new TA.CircleGeometry(0.36, 48),
    new TA.MeshBasicMaterial({ transparent: true })
  );
  rotulo.position.z = 0.012;
  vinil.add(rotulo);

  /* --------------------------------------------------------------- catálogo */

  var LADO_CAPA = 2.4;
  var FUNDO_CAPA = 0.16;

  function criarItem(produto, indice) {
    var grupo = new TA.Group();

    var arteFrente = texturaCapa(produto, 512, true);
    var arteTras = texturaContracapa(produto);

    var frente = new TA.MeshStandardMaterial({
      map: arteFrente,
      emissiveMap: arteFrente,
      emissive: 0xffffff,
      emissiveIntensity: 0.16,
      roughness: 0.74,
      metalness: 0.05,
      transparent: true
    });
    var tras = new TA.MeshStandardMaterial({
      map: arteTras,
      emissiveMap: arteTras,
      emissive: 0xffffff,
      emissiveIntensity: 0.12,
      roughness: 0.8,
      metalness: 0.04,
      transparent: true
    });
    var lateral = new TA.MeshStandardMaterial({
      color: 0x14151f, roughness: 0.7, metalness: 0.15, transparent: true
    });

    var capa = new TA.Mesh(
      new TA.BoxGeometry(LADO_CAPA, LADO_CAPA, FUNDO_CAPA),
      [lateral, lateral, lateral, lateral, frente, tras]
    );
    capa.castShadow = true;
    grupo.add(capa);

    var item = {
      produto: produto,
      grupo: grupo,
      materiais: [frente, tras, lateral],
      indice: indice,
      pos: new TA.Vector3(),
      posAlvo: new TA.Vector3(),
      rotAlvo: 0,
      rotAtual: 0,
      escala: 1,
      escalaAlvo: 1,
      tom: new TA.Color(hsl(produto.capa.h1, 60, 55)),
      opacidade: 0,
      opacidadeAlvo: 0,
      visivel: false,
      pairando: false,
      fase: indice * 0.7,
      yaw: 0,
      pitch: 0
    };
    capa.userData.item = item;
    itensPorId[produto.id] = item;
    return item;
  }

  itens = PRODUTOS.map(criarItem);
  itens.forEach(function (item) { anel.add(item.grupo); });

  /* ------------------------------------------------------ disposição no anel */

  function dispor(lista) {
    var n = lista.length;
    if (!n) return;

    var linhas = n <= 9 ? 1 : (n <= 18 ? 2 : 3);
    var porLinha = Math.ceil(n / linhas);
    var escala = linhas === 1 ? 1 : (linhas === 2 ? 0.86 : 0.72);
    var vao = (LADO_CAPA + 0.5) * escala;
    var passo = Math.min(0.42, 2.9 / Math.max(1, porLinha - 1));
    var raio = vao / passo;
    var altura = (LADO_CAPA + 0.45) * escala;
    var topo = altura * (linhas - 1) / 2 + 0.4;

    lista.forEach(function (produto, i) {
      var item = itensPorId[produto.id];
      var linha = Math.floor(i / porLinha);
      var j = i % porLinha;
      var angulo = (j - (porLinha - 1) / 2) * passo;
      item.posAlvo.set(
        Math.sin(angulo) * raio,
        topo - linha * altura,
        -Math.cos(angulo) * raio
      );
      item.rotAlvo = angulo;
      item.escalaAlvo = escala;
    });
  }

  function atualizarFiltro() {
    var termo = filtro.busca;
    visiveis = PRODUTOS.filter(function (p) {
      if (filtro.tipo && p.tipo !== filtro.tipo) return false;
      if (filtro.status && p.status !== filtro.status) return false;
      if (filtro.genero && p.genero !== filtro.genero) return false;
      if (!termo) return true;
      var alvo = (p.titulo + ' ' + p.artista + ' ' + p.genero + ' ' + p.selo).toLowerCase();
      return alvo.indexOf(termo) >= 0;
    });

    itens.forEach(function (item) {
      item.visivel = visiveis.indexOf(item.produto) >= 0;
      if (!item.visivel) {
        item.pairando = false;
        if (item.produto !== selecionado) item.opacidadeAlvo = 0;
      }
    });

    dispor(visiveis);

    if (selecionado && visiveis.indexOf(selecionado) < 0) fechar();
    else if (selecionado) {
      var emDestaque = itensPorId[selecionado.id];
      emDestaque.posAlvo.set(-0.95, 0.5, -5.2);
      emDestaque.rotAlvo = 0;
      emDestaque.escalaAlvo = 1.3;
    }

    visiveis.forEach(function (p) {
      itensPorId[p.id].opacidadeAlvo = p === selecionado ? 1 : 0.45;
    });

    desenharLista();
  }

  /* ---------------------------------------------------------- interface DOM */

  var elLista = document.getElementById('lista');
  var elContagem = document.getElementById('contagem');
  var elResumo = document.getElementById('resumo-catalogo');
  var elBusca = document.getElementById('busca');
  var elTipo = document.getElementById('filtro-tipo');
  var elStatus = document.getElementById('filtro-status');
  var elGenero = document.getElementById('filtro-genero');
  var elLimpar = document.getElementById('limpar-filtros');
  var elDetalhe = document.getElementById('painel-detalhe');
  var elBotaoPainel = document.getElementById('botao-painel');
  var elPainelLateral = document.getElementById('painel-lateral');
  var elFechar = document.getElementById('fechar-detalhe');

  function gradienteMiniatura(p) {
    return 'linear-gradient(135deg, ' + hsl(p.capa.h1, 64, 48) + ', ' +
      hsl(p.capa.h2, 58, 24) + ')';
  }

  function desenharLista() {
    if (!visiveis.length) {
      elLista.innerHTML = '<li class="vazio">Nenhum lançamento bate com o ' +
        'filtro. Tente limpar a busca.</li>';
    } else {
      elLista.innerHTML = visiveis.map(function (p) {
        var atual = selecionado && selecionado.id === p.id;
        return '<li><button class="item" type="button" data-id="' + p.id + '"' +
          (atual ? ' aria-current="true"' : '') + '>' +
          '<span class="item-cor" style="background:' + gradienteMiniatura(p) + '"></span>' +
          '<span class="item-texto"><strong>' + escapar(p.titulo) + '</strong>' +
          '<span>' + escapar(p.artista) + ' · ' + escapar(p.tipo) + '</span></span>' +
          '<span class="etiqueta" data-status="' + p.status + '">' +
          statusCurto(p.status) + '</span></button></li>';
      }).join('');
    }

    elContagem.textContent = visiveis.length === PRODUTOS.length
      ? PRODUTOS.length + ' lançamentos'
      : visiveis.length + ' de ' + PRODUTOS.length + ' lançamentos';
  }

  var elArtista = document.getElementById('detalhe-artista');
  var elTitulo = document.getElementById('detalhe-titulo');
  var elSelo = document.getElementById('detalhe-selo');
  var elEtiquetas = document.getElementById('detalhe-etiquetas');
  var elDescricao = document.getElementById('detalhe-descricao');
  var elNumeros = document.getElementById('detalhe-numeros');
  var elPrecoDigital = document.getElementById('preco-digital');
  var elPrecoFisico = document.getElementById('preco-fisico');
  var elObservacao = document.getElementById('detalhe-observacao');
  var elFaixas = document.getElementById('detalhe-faixas');
  var elNFaixas = document.getElementById('detalhe-n-faixas');
  var elCapaMiniatura = document.getElementById('capa-miniatura');
  var botoesCompra = document.querySelectorAll('.botao-compra');

  function desenharDetalhe(p) {
    elArtista.textContent = p.artista;
    elTitulo.textContent = p.titulo;
    elSelo.textContent = p.selo + ' · ' + p.formato + ' · ' + p.id;
    elEtiquetas.innerHTML = ['tipo:' + p.tipo, 'genero:' + p.genero,
      'status:' + p.status].map(function (par) {
      var partes = par.split(':');
      return '<span class="chip"' + (partes[0] === 'status'
        ? ' data-status="' + partes[1] + '"' : '') + '>' +
        escapar(partes[1]) + '</span>';
    }).join('');

    elDescricao.textContent = p.descricao;
    elNumeros.innerHTML = [
      ['Lançamento', p.data_lancamento],
      ['Duração', hms(p.duracao_total_seg)],
      ['Faixas', String(p.faixas.length)],
      ['Estoque', p.estoque ? p.estoque + ' un.' : '—']
    ].map(function (par) {
      return '<div><dt>' + par[0] + '</dt><dd>' + escapar(par[1]) + '</dd></div>';
    }).join('');

    elPrecoDigital.textContent = moeda(p.preco_digital);
    elPrecoFisico.textContent = moeda(p.preco_fisico);
    elObservacao.textContent = p.observacao;
    elNFaixas.textContent = String(p.faixas.length);
    elFaixas.innerHTML = p.faixas.map(function (f) {
      return '<li><span>' + escapar(f.titulo) + '</span><time>' +
        hms(f.duracao_seg) + '</time></li>';
    }).join('');

    elCapaMiniatura.innerHTML = '';
    elCapaMiniatura.appendChild(molduraDe(p));

    var semEstoque = p.status === 'Esgotado';
    Array.prototype.forEach.call(botoesCompra, function (botao) {
      botao.disabled = semEstoque;
      delete botao.dataset.original;
      botao.textContent = semEstoque
        ? 'Indisponível'
        : (botao.dataset.compra === 'fisico' ? 'Comprar físico' : 'Comprar digital');
    });

    elDetalhe.hidden = false;
  }

  function molduraDe(p) {
    return desenharCapa(p, 192, true);
  }

  /* ------------------------------------------------- abrir e fechar vitrine */

  var rotacaoAlvo = 0;

  function girarAte(anguloNoAnel) {
    var voltas = Math.round((anel.rotation.y + anguloNoAnel) / (Math.PI * 2));
    rotacaoAlvo = -anguloNoAnel + voltas * Math.PI * 2;
  }

  function abrir(p) {
    if (selecionado === p) return;
    if (visiveis.indexOf(p) < 0) return;
    if (selecionado) fechar(true);
    selecionado = p;

    var item = itensPorId[p.id];
    var anguloNoAnel = item.rotAlvo;
    scene.attach(item.grupo);
    item.rotAlvo = 0;
    item.posAlvo.set(-0.95, 0.5, -5.2);
    item.escalaAlvo = 1.3;
    item.yaw = 0;
    item.pitch = 0;
    girarAte(anguloNoAnel);

    itens.forEach(function (outro) {
      outro.opacidadeAlvo = outro === item ? 1 : 0.45;
    });

    if (rotulo.material.map) rotulo.material.map.dispose();
    rotulo.material.map = texturaCapa(p, 256, false);
    rotulo.material.needsUpdate = true;
    haloPalco.material.color.set(hsl(p.capa.h3, 70, 55));
    luzPalco.color.copy(item.tom);
    palco.visible = true;

    desenharDetalhe(p);
    desenharLista();
    var botao = elLista.querySelector('[data-id="' + p.id + '"]');
    if (botao) botao.scrollIntoView({ block: 'nearest' });
  }

  function fechar(silencioso) {
    if (!selecionado) return;
    var item = itensPorId[selecionado.id];
    anel.attach(item.grupo);
    item.escalaAlvo = 1;
    palco.visible = false;
    selecionado = null;
    dispor(visiveis);
    itens.forEach(function (outro) {
      outro.opacidadeAlvo = outro.visivel ? 1 : 0;
    });
    if (!silencioso) {
      elDetalhe.hidden = true;
      desenharLista();
    }
  }

  /* ------------------------------------------------------------ interação */

  var raycaster = new TA.Raycaster();
  var ponteiro = new TA.Vector2();
  var arrastando = false;
  var moveu = false;
  var inicioX = 0;
  var inicioY = 0;
  var inicioTempo = 0;
  var ultimoX = 0;
  var ultimoY = 0;
  var velocidade = 0;
  var itemSobre = null;

  function itemNoPonteiro(evento) {
    var caixa = PALCO.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - caixa.left) / caixa.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - caixa.top) / caixa.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, camera);

    var alvos = [];
    itens.forEach(function (item) {
      if (item.opacidade > 0.5 && item.produto !== selecionado) alvos.push(item.grupo);
    });
    var acertos = raycaster.intersectObjects(alvos, true);
    return acertos.length ? acertos[0].object.userData.item : null;
  }

  PALCO.addEventListener('pointerdown', function (e) {
    arrastando = true;
    moveu = false;
    inicioX = ultimoX = e.clientX;
    inicioY = ultimoY = e.clientY;
    inicioTempo = performance.now();
    velocidade = 0;
    PALCO.classList.add('arrastando');
    try {
      PALCO.setPointerCapture(e.pointerId);
    } catch (erro) { /* navegador sem captura: o arraste segue sem ela */ }
  });

  PALCO.addEventListener('pointermove', function (e) {
    if (arrastando) {
      var dx = e.clientX - ultimoX;
      var dy = e.clientY - ultimoY;
      if (Math.abs(e.clientX - inicioX) > 6 || Math.abs(e.clientY - inicioY) > 6) {
        moveu = true;
      }
      if (selecionado) {
        var item = itensPorId[selecionado.id];
        item.yaw += dx * 0.009;
        item.pitch = Math.max(-0.6, Math.min(0.6, item.pitch + dy * 0.005));
      } else {
        anel.rotation.y += dx * 0.005;
        rotacaoAlvo = anel.rotation.y;
        velocidade = dx * 0.005;
      }
      ultimoX = e.clientX;
      ultimoY = e.clientY;
      return;
    }

    var item = itemNoPonteiro(e);
    if (item !== itemSobre) {
      if (itemSobre) itemSobre.pairando = false;
      itemSobre = item;
      if (itemSobre) itemSobre.pairando = true;
      PALCO.classList.toggle('apontando', !!itemSobre);
    }
  });

  function soltar(e) {
    if (!arrastando) return;
    arrastando = false;
    PALCO.classList.remove('arrastando');
    try {
      if (PALCO.hasPointerCapture(e.pointerId)) PALCO.releasePointerCapture(e.pointerId);
    } catch (erro) { /* nada a liberar */ }

    if (e.type === 'pointerup' && !moveu && performance.now() - inicioTempo < 600) {
      if (selecionado) {
        fechar();
        return;
      }
      var item = itemNoPonteiro(e);
      if (item) {
        abrir(item.produto);
        return;
      }
    }
    if (!selecionado) rotacaoAlvo = anel.rotation.y;
  }

  PALCO.addEventListener('pointerup', soltar);
  PALCO.addEventListener('pointercancel', soltar);
  PALCO.addEventListener('pointerleave', function () {
    if (itemSobre) itemSobre.pairando = false;
    itemSobre = null;
  });

  PALCO.addEventListener('wheel', function (e) {
    if (!selecionado) return;
    if (elDetalhe.contains(e.target) || elPainelLateral.contains(e.target)) return;
    e.preventDefault();
    var item = itensPorId[selecionado.id];
    item.escalaAlvo = Math.max(0.75, Math.min(1.7, item.escalaAlvo - e.deltaY * 0.0012));
  }, { passive: false });

  elLista.addEventListener('click', function (e) {
    var botao = e.target.closest('.item');
    if (!botao) return;
    var produto = PRODUTOS.filter(function (p) { return p.id === botao.dataset.id; })[0];
    if (!produto) return;
    if (selecionado === produto) fechar();
    else abrir(produto);
  });

  elFechar.addEventListener('click', function () { fechar(); });

  Array.prototype.forEach.call(botoesCompra, function (botao) {
    botao.addEventListener('click', function () {
      var original = botao.dataset.original || botao.textContent;
      botao.dataset.original = original;
      botao.textContent = 'Demonstração';
      window.setTimeout(function () {
        if (botao.textContent === 'Demonstração') botao.textContent = original;
      }, 1400);
    });
  });

  elBusca.addEventListener('input', function () {
    filtro.busca = elBusca.value.trim().toLowerCase();
    atualizarFiltro();
  });
  elTipo.addEventListener('change', function () { filtro.tipo = elTipo.value; atualizarFiltro(); });
  elStatus.addEventListener('change', function () { filtro.status = elStatus.value; atualizarFiltro(); });
  elGenero.addEventListener('change', function () { filtro.genero = elGenero.value; atualizarFiltro(); });

  elLimpar.addEventListener('click', function () {
    filtro = { busca: '', tipo: '', status: '', genero: '' };
    elBusca.value = '';
    elTipo.value = '';
    elStatus.value = '';
    elGenero.value = '';
    atualizarFiltro();
    elBusca.focus();
  });

  elBotaoPainel.addEventListener('click', function () {
    var aberto = elPainelLateral.classList.toggle('aberto');
    elBotaoPainel.setAttribute('aria-expanded', aberto ? 'true' : 'false');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (selecionado) fechar();
      return;
    }
    if (e.key === '/' && document.activeElement !== elBusca) {
      e.preventDefault();
      elBusca.focus();
      return;
    }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

    e.preventDefault();
    var passo = e.key === 'ArrowRight' ? 1 : -1;
    if (!visiveis.length) return;

    if (selecionado) {
      var i = visiveis.indexOf(selecionado);
      var proximo = visiveis[(i + passo + visiveis.length) % visiveis.length];
      abrir(proximo);
    } else {
      anel.rotation.y += passo * 0.35;
      rotacaoAlvo = anel.rotation.y;
      velocidade = 0;
    }
  });

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  /* -------------------------------------------------------------- animação */

  var relogio = new TA.Clock();
  var tempo = 0;

  function anguloProximo(atual, alvo, passo) {
    var d = Math.atan2(Math.sin(alvo - atual), Math.cos(alvo - atual));
    return atual + d * passo;
  }

  function liso(velocidadeLocal, dt) {
    return 1 - Math.exp(-velocidadeLocal * dt);
  }

  function quadro() {
    var dt = Math.min(relogio.getDelta(), 0.05);
    tempo += dt;

    if (!selecionado) {
      if (!arrastando) {
        if (Math.abs(velocidade) > 0.00005) {
          anel.rotation.y += velocidade;
          rotacaoAlvo = anel.rotation.y;
          velocidade *= Math.pow(0.06, dt);
        } else if (!reduzirMovimento) {
          anel.rotation.y += 0.055 * dt;
          rotacaoAlvo = anel.rotation.y;
        }
      }
      anel.rotation.y = anguloProximo(anel.rotation.y, rotacaoAlvo, liso(4, dt));
    }

    var itemSelecionado = selecionado ? itensPorId[selecionado.id] : null;

    itens.forEach(function (item) {
      var k = liso(6, dt);
      item.pos.lerp(item.posAlvo, k);
      item.rotAtual = anguloProximo(item.rotAtual, item.rotAlvo, k);
      item.escala += (item.escalaAlvo - item.escala) * k;
      item.opacidade += (item.opacidadeAlvo - item.opacidade) * k;

      if (item === itemSelecionado) {
        item.grupo.position.copy(item.pos);
        item.grupo.rotation.set(item.pitch, item.rotAtual + item.yaw, 0);
        item.grupo.visible = true;
      } else {
        var balanco = reduzirMovimento ? 0 : Math.sin(tempo * 0.7 + item.fase) * 0.035;
        var altura = item.pairando ? 0.16 : 0;
        item.grupo.position.set(item.pos.x, item.pos.y + balanco + altura, item.pos.z);
        item.grupo.rotation.set(0, item.rotAtual, 0);
        item.grupo.visible = item.opacidade > 0.015 || item.pairando;
        if (itemSelecionado) {
          item.yaw = 0;
          item.pitch = 0;
        }
      }

      item.grupo.scale.setScalar(item.escala * (item.pairando && item !== itemSelecionado ? 1.06 : 1));

      var alpha = Math.max(0, Math.min(1, item.opacidade));
      for (var i = 0; i < item.materiais.length; i++) {
        item.materiais[i].opacity = alpha;
      }
    });

    if (itemSelecionado) {
      itemSelecionado.yaw += reduzirMovimento ? 0 : 0.0022;
      vinil.rotation.z += 0.55 * dt;
      haloPalco.material.opacity += (0.5 - haloPalco.material.opacity) * liso(5, dt);
      luzPalco.intensity += (0.9 - luzPalco.intensity) * liso(5, dt);
    } else {
      haloPalco.material.opacity += (0 - haloPalco.material.opacity) * liso(5, dt);
      luzPalco.intensity += (0 - luzPalco.intensity) * liso(5, dt);
    }

    haloChao.material.opacity = 0.35 + 0.12 * Math.sin(tempo * 0.5);

    renderer.render(scene, camera);
    window.requestAnimationFrame(quadro);
  }

  /* ------------------------------------------------------------------ início */

  (function comecar() {
    var tipos = CATALOGO.tipos || [];
    var generos = [];
    var statuses = [];
    PRODUTOS.forEach(function (p) {
      if (tipos.indexOf(p.tipo) < 0) tipos.push(p.tipo);
      if (generos.indexOf(p.genero) < 0) generos.push(p.genero);
      if (statuses.indexOf(p.status) < 0) statuses.push(p.status);
    });

    tipos.forEach(function (v) {
      elTipo.insertAdjacentHTML('beforeend',
        '<option value="' + escapar(v) + '">' + escapar(v) + '</option>');
    });
    generos.sort().forEach(function (v) {
      elGenero.insertAdjacentHTML('beforeend',
        '<option value="' + escapar(v) + '">' + escapar(v) + '</option>');
    });
    statuses.forEach(function (v) {
      elStatus.insertAdjacentHTML('beforeend',
        '<option value="' + escapar(v) + '">' + escapar(v) + '</option>');
    });

    elResumo.textContent = PRODUTOS.length + ' lançamentos · ' +
      PRODUTOS.reduce(function (s, p) { return s + p.faixas.length; }, 0) +
      ' faixas · ' +
      new Set(PRODUTOS.map(function (p) { return p.artista; })).size +
      ' artistas';

    atualizarFiltro();
    quadro();

    window.requestAnimationFrame(function () {
      AVISO_CARREGANDO.classList.add('oculto');
      window.setTimeout(function () { AVISO_CARREGANDO.hidden = true; }, 500);
    });
  })();

})();
