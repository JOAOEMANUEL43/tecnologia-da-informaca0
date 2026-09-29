# Vitrine 3D de lançamentos — YG Música e Entretenimento S.A.

Vitrine interativa em 3D do catálogo de lançamentos, feita em HTML, CSS e
JavaScript com Three.js. Tudo funciona abrindo um arquivo: não há build, não
há servidor e não há dependência de internet.

## Como abrir

Dê duplo clique em `index.html`. A página roda direto do disco (`file://`),
inclusive sem rede.

Se o navegador bloquear algo ao abrir do disco, sirva a pasta por HTTP:

```powershell
cd entregas
python -m http.server 8000
```

e acesse `http://localhost:8000`.

## Como usar

| Ação | Resultado |
| --- | --- |
| Arrastar com o mouse | Gira a estante de capas, com inércia e giro automático |
| Clicar numa capa | Abre o lançamento no centro da vitrine |
| Clicar no espaço vazio ou na capa aberta | Fecha o lançamento |
| Arrastar com um lançamento aberto | Gira a capa para ver frente, verso e espessura |
| Roda do mouse com o lançamento aberto | Aproxima e afasta a capa |
| <kbd>←</kbd> <kbd>→</kbd> | Troca de lançamento; sem seleção, gira a estante |
| <kbd>Esc</kbd> | Fecha o lançamento |
| <kbd>/</kbd> | Leva o cursor para a busca |
| Botão *Catálogo* | Abre e fecha a lista de lançamentos no celular |

O painel de detalhe traz artista, título, selo, formato, data, duração,
número de faixas, estoque, preços digital e físico, situação e a lista de
faixas. Os botões de compra são apenas demonstração: não envia pedido nem
cobra nada.

Busca e filtros (tipo, situação e gênero) mexem ao mesmo tempo na lista e na
estante 3D. A estante se reorganiza conforme o resultado: uma fileira com
poucos resultados, até três fileiras com o catálogo inteiro.

## Arquivos

```
entregas/
├── index.html               página: estrutura, painéis e ordem dos scripts
├── estilo.css               tema visual, painéis e responsividade
├── js/
│   └── app.js               cena Three.js, capas procedurais e interações
├── dados/
│   ├── catalogo-yg.js       catálogo em JS global (window.CATALOGO_YG)
│   ├── produtos-yg.csv      30 produtos, delimitador ";", UTF-8 com BOM
│   └── faixas-yg.csv        171 faixas, delimitador ";", UTF-8 com BOM
├── vendor/
│   └── three.min.js         Three.js r149, build UMD (594 KB)
└── LEIA-ME.md               este arquivo
```

O catálogo vai em `.js` e não em `.json` de propósito: abrir a página do disco
com `fetch()` é bloqueado pelo navegador, e assim o site funciona sem servidor
nenhum. O Three.js é o build UMD, o último com esse formato, para o mesmo
motivo.

## Como o catálogo foi gerado

Na pasta acima, `../gerar_catalogo.py` monta o catálogo de forma determinística
(semente padrão `2026`):

```powershell
cd ..
python gerar_catalogo.py        # catálogo padrão (semente 2026)
python gerar_catalogo.py 77     # outra semente, mesmo esquema
```

O único argumento aceito é a semente, e ela precisa ser um número inteiro.
Cada execução reescreve `dados/catalogo-yg.js`, `dados/produtos-yg.csv` e
`dados/faixas-yg.csv`. Duas execuções com a mesma semente produzem arquivos
idênticos, o que já foi conferido por hash.

As capas são desenhadas em canvas dentro do navegador, com formas e paletas
derivadas do id do produto: não há imagem no projeto.

## Atualizar esta cópia depois de mexer no projeto

`entregas/` é uma cópia dos arquivos da vitrine. Para republicar:

```powershell
cd ..
$e = "entregas"
Copy-Item index.html, estilo.css $e -Force
Remove-Item $e\js, $e\vendor, $e\dados -Recurse -Force
Copy-Item js, vendor, dados $e -Recurse -Force
```

## Dados

Todos os produtos, artistas, preços, datas e quantidades são fictícios, criados
para o exercício. A pasta de dados segue a Lei nº 13.709/2018 (LGPD): não há
dado de pessoa física e nenhuma informação real de cliente.

A situação de cada lançamento é definida por posição no catálogo, não por
sorteio: um a cada sete esgota, e o que tem data futura entra em pré-venda. O
catálogo sempre mostra os três estados, que é o que importa numa vitrine de
vendas.

## Requisitos

- Navegador com WebGL (Chrome, Edge, Firefox ou Safari atuais). Sem WebGL a
  página avisa em vez de quebrar.
- A cena não é leve: 30 capas com textura e sombra. Fica razoável porque usa
  Three.js puro, geometrias simples e texturas geradas uma única vez.
- Em máquina sem aceleração de hardware a rotação pode ficar lenta. O teclado
  e a lista continuam funcionando normalmente.
