# Mapa eleitoral do Maranhão — versão HTML autônoma

Esta pasta contém uma versão HTML independente do mapa eleitoral dos 217
municípios do Maranhão. Ela usa os mesmos dados oficiais gerados pelo ETL do
projeto e pode ser aberta diretamente pelo navegador ou servida pela aplicação
Next.js em `/mapa-eleitoral/`.

## Arquivos

- `index.html` — estrutura da página.
- `css/estilo.css` — identidade visual e responsividade.
- `js/mapa.js` — filtros, mapa Leaflet, legenda e painel do município.
- `vendor/leaflet/` — Leaflet 1.9.4 e imagens necessárias, copiados de
  `node_modules/leaflet/dist/` para funcionamento local.
- `dados/mapa-ma-2026.js` — dados do TSE embutidos como JavaScript para permitir
  abrir o arquivo diretamente (`file://`) sem bloqueio de CORS.
- `dados/ma-municipios.js` — malha municipal do IBGE embutida como JavaScript.
- `dados/mapa-ma-2026.json` e `dados/ma-municipios.geojson` — cópias dos dados
  brutos para conferência e reutilização.

## Como abrir

Pela aplicação:

```text
http://localhost:3001/mapa-eleitoral
```

O endereço redireciona para o HTML estático em
`/mapa-eleitoral/index.html`.

Diretamente no sistema de arquivos:

```text
public/mapa-eleitoral/index.html
```

## Fonte dos dados

- TSE — Dados Abertos: https://dadosabertos.tse.jus.br/
- TSE — Resultados: https://resultados.tse.jus.br/
- IBGE — Malhas territoriais: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html
- IBGE — Localidades: https://servicodados.ibge.gov.br/api/v1/localidades/municipios
- TSE — Códigos oficiais de municípios: https://dadosabertos.tse.jus.br/dataset/codigos-oficiais-de-uf-e-municipios-segundo-o-tse-e-o-ibge

Os dados de 2026 são os arquivos oficiais disponíveis no momento da geração.
Consulte sempre o TSE para a apuração definitiva.
