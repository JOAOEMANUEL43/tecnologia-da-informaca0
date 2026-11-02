# =====================================================================
#  Coleta os indicadores da PINTEC 2017 na API SIDRA (IBGE) e gera
#  o snapshot usado como fallback offline pela página.
#
#  Uso:  powershell -ExecutionPolicy Bypass -File .\dados\coletar.ps1
# =====================================================================

$ErrorActionPreference = 'Stop'
$base = 'https://servicodados.ibge.gov.br/api/v3/agregados'
$destino = Join-Path $PSScriptRoot 'snapshot.js'

function Get-Sidra {
    param([int]$Agregado, [string]$Periodos, [string]$Variaveis, [string]$Classificacao)

    $url = "$base/$Agregado/periodos/$Periodos/variaveis/$Variaveis" + '?localidades=N1[all]'
    if ($Classificacao) { $url += "&classificacao=$Classificacao" }

    for ($tentativa = 1; $tentativa -le 4; $tentativa++) {
        try {
            $wc = New-Object System.Net.WebClient
            $bytes = $wc.DownloadData($url)
            $texto = [Text.Encoding]::UTF8.GetString($bytes)
            return ($texto | ConvertFrom-Json)
        }
        catch {
            if ($tentativa -eq 4) { throw "Falha ao consultar $url : $($_.Exception.Message)" }
            Start-Sleep -Seconds (2 * $tentativa)
        }
    }
}

function Get-Rows {
    param($Json)

    $saida = @{}
    foreach ($variavel in $Json) {
        $linhas = New-Object System.Collections.ArrayList
        foreach ($resultado in $variavel.resultados) {
            $cats = @{}
            foreach ($classificacao in $resultado.classificacoes) {
                foreach ($prop in $classificacao.categoria.PSObject.Properties) {
                    $cats[[string]$classificacao.id] = [string]$prop.Name
                }
            }
            $vals = @{}
            foreach ($prop in $resultado.series[0].serie.PSObject.Properties) {
                $vals[[string]$prop.Name] = [string]$prop.Value
            }
            [void]$linhas.Add([pscustomobject]@{ cats = $cats; vals = $vals })
        }
        $saida[[string]$variavel.id] = $linhas
    }
    return $saida
}

function Find-Row {
    param($Linhas, [string]$Classe, [string]$Categoria)
    foreach ($linha in $Linhas) {
        if ($linha.cats.ContainsKey($Classe) -and $linha.cats[$Classe] -eq $Categoria) { return $linha }
    }
    return $null
}

function Num {
    param($Linha, [string]$Periodo = '2017')
    if ($null -eq $Linha) { return $null }
    $valor = $Linha.vals[$Periodo]
    if ([string]::IsNullOrWhiteSpace($valor) -or $valor -eq '...' -or $valor -eq '-' -or $valor -eq '..') { return $null }
    return [double]::Parse($valor, [Globalization.CultureInfo]::InvariantCulture)
}

function Round2 {
    param($Valor)
    if ($null -eq $Valor) { return $null }
    return [math]::Round([double]$Valor, 2)
}

Write-Host 'Consultando a API SIDRA...' -ForegroundColor Cyan

# ---------------------------------------------------------------------
# 1. Totais, tipos de inovação e dispêndios (tabelas 5453 e 5018)
# ---------------------------------------------------------------------
$d5453 = Get-Rows (Get-Sidra 5453 '2017' '630,5977,5982,5983,5984,5985,5986,5987,5988' '696[33413]')
$d5018 = Get-Rows (Get-Sidra 5018 '2008,2011,2014,2017' '630,5975,5976,5977,864,5978,5979,5980,5981' '696[33413]')

$totalEmpresas   = Num (Find-Row $d5453['630'] '696' '33413')
$inovadoras      = Num (Find-Row $d5453['5977'] '696' '33413')
$produto         = Num (Find-Row $d5453['5982'] '696' '33413')
$processo        = Num (Find-Row $d5453['5985'] '696' '33413')
$ambos           = Num (Find-Row $d5453['5988'] '696' '33413')
$prodNovoEmpresa = Num (Find-Row $d5453['5983'] '696' '33413')
$prodNovoMercado = Num (Find-Row $d5453['5984'] '696' '33413')
$procNovoEmpresa = Num (Find-Row $d5453['5986'] '696' '33413')
$procNovoMercado = Num (Find-Row $d5453['5987'] '696' '33413')

$apenasOrg       = Num (Find-Row $d5018['5976'] '696' '33413')
$incompletos     = Num (Find-Row $d5018['5975'] '696' '33413')
$dispendios      = Num (Find-Row $d5018['5979'] '696' '33413')
$receita         = Num (Find-Row $d5018['864'] '696' '33413')
$empresasDisp    = Num (Find-Row $d5018['5978'] '696' '33413')
$empresasPD      = Num (Find-Row $d5018['5980'] '696' '33413')
$pdInterno       = Num (Find-Row $d5018['5981'] '696' '33413')

# ---------------------------------------------------------------------
# 2. Série histórica (2008, 2011, 2014 e 2017)
# ---------------------------------------------------------------------
$serie = @()
$linhaEmpresas = Find-Row $d5018['630'] '696' '33413'
$linhaAmplas   = Find-Row $d5018['5976'] '696' '33413'
$linhaInov     = Find-Row $d5018['5977'] '696' '33413'
$linhaReceita  = Find-Row $d5018['864'] '696' '33413'
$linhaDisp     = Find-Row $d5018['5979'] '696' '33413'
$linhaPD       = Find-Row $d5018['5981'] '696' '33413'

foreach ($periodo in @('2008', '2011', '2014', '2017')) {
    $e = Num $linhaEmpresas $periodo
    $i = Num $linhaInov $periodo
    $a = Num $linhaAmplas $periodo
    $r = Num $linhaReceita $periodo
    $d = Num $linhaDisp $periodo
    $p = Num $linhaPD $periodo
    $serie += [ordered]@{
        periodo        = [int]$periodo
        empresas       = $e
        inovadoras     = $i
        apenasOrg      = $a
        amplas         = if ($null -ne $i -and $null -ne $a) { $i + $a } else { $null }
        taxa           = if ($null -ne $i -and $e) { Round2 (100 * $i / $e) } else { $null }
        taxaAmpla      = if ($null -ne $i -and $null -ne $a -and $e) { Round2 (100 * ($i + $a) / $e) } else { $null }
        receita        = $r
        dispendios     = $d
        pdInterno      = $p
        intensidade    = if ($null -ne $d -and $r) { Round2 (100 * $d / $r) } else { $null }
        intensidadePD  = if ($null -ne $p -and $r) { Round2 (100 * $p / $r) } else { $null }
    }
}

# ---------------------------------------------------------------------
# 3. Setores (tabela 5453, classificação 696)
# ---------------------------------------------------------------------
$setoresDef = @(
    @{ id = '62';   nome = 'Tecnologias da informação';           grupo = 'Serviços';   cat = '129403'; pequena = $false },
    @{ id = 'C';    nome = 'Indústrias de transformação';          grupo = 'Indústria';  cat = '129344'; pequena = $false },
    @{ id = '61';   nome = 'Telecomunicações';                     grupo = 'Serviços';   cat = '129402'; pequena = $false },
    @{ id = '63.1'; nome = 'Tratamento de dados e hospedagem';     grupo = 'Serviços';   cat = '129408'; pequena = $false },
    @{ id = '35';   nome = 'Eletricidade, gás e utilidades';       grupo = 'Energia';    cat = '129399'; pequena = $false },
    @{ id = '71';   nome = 'Arquitetura, engenharia e testes';     grupo = 'Serviços';   cat = '129409'; pequena = $false },
    @{ id = '58A';  nome = 'Edição, audiovisual e gravação';       grupo = 'Serviços';   cat = '129401'; pequena = $false },
    @{ id = 'B';    nome = 'Indústrias extrativas';                grupo = 'Indústria';  cat = '129343'; pequena = $false },
    @{ id = '72';   nome = 'Pesquisa e desenvolvimento científico'; grupo = 'Serviços';  cat = '129410'; pequena = $true  }
)

$dSetores = Get-Rows (Get-Sidra 5453 '2017' '630,5977' '696[all]')
$setores = @()
foreach ($s in $setoresDef) {
    $e = Num (Find-Row $dSetores['630'] '696' $s.cat)
    $i = Num (Find-Row $dSetores['5977'] '696' $s.cat)
    $setores += [ordered]@{
        id       = $s.id
        nome     = $s.nome
        grupo    = $s.grupo
        pequena  = $s.pequena
        empresas = $e
        inovadoras = $i
        taxa     = if ($null -ne $i -and $e) { Round2 (100 * $i / $e) } else { $null }
    }
}

# ---------------------------------------------------------------------
# 4. Dispêndios por atividade inovativa (tabela 5464)
# ---------------------------------------------------------------------
$dDisp = Get-Rows (Get-Sidra 5464 '2017' '5978,5979' '700[all]')
$dispDef = @(
    @{ cat = '33429'; nome = 'P&D interno' },
    @{ cat = '33430'; nome = 'P&D externo' },
    @{ cat = '33431'; nome = 'Outros conhecimentos externos' },
    @{ cat = '33432'; nome = 'Aquisição de software' },
    @{ cat = '33433'; nome = 'Máquinas e equipamentos' },
    @{ cat = '33434'; nome = 'Treinamento' },
    @{ cat = '33435'; nome = 'Introdução no mercado' },
    @{ cat = '33436'; nome = 'Projeto industrial e preparações' }
)
$dispendiosItens = @()
foreach ($d in $dispDef) {
    $dispendiosItens += [ordered]@{
        nome     = $d.nome
        empresas = Num (Find-Row $dDisp['5978'] '700' $d.cat)
        valor    = Num (Find-Row $dDisp['5979'] '700' $d.cat)
    }
}

# ---------------------------------------------------------------------
# 5. Grau de novidade (tabela 5458)
# ---------------------------------------------------------------------
$dNovidade = Get-Rows (Get-Sidra 5458 '2017' '5982,5985' '711[all]')
$novidade = [ordered]@{
    produto = @(
        [ordered]@{ nome = 'Novo para a empresa';          valor = Num (Find-Row $dNovidade['5982'] '711' '33535') },
        [ordered]@{ nome = 'Novo para o mercado nacional'; valor = Num (Find-Row $dNovidade['5982'] '711' '33538') },
        [ordered]@{ nome = 'Novo para o mundo';            valor = Num (Find-Row $dNovidade['5982'] '711' '33541') }
    )
    processo = @(
        [ordered]@{ nome = 'Novo para a empresa';          valor = Num (Find-Row $dNovidade['5985'] '711' '33535') },
        [ordered]@{ nome = 'Novo para o mercado nacional'; valor = Num (Find-Row $dNovidade['5985'] '711' '33538') },
        [ordered]@{ nome = 'Novo para o mundo';            valor = Num (Find-Row $dNovidade['5985'] '711' '33541') }
    )
}

# ---------------------------------------------------------------------
# 6. Participação dos novos produtos nas vendas (tabela 5618)
# ---------------------------------------------------------------------
$dVendas = Get-Rows (Get-Sidra 5618 '2017' '630,5982,6020,6021,6022' '696[33413]')
$vendas = @(
    [ordered]@{ nome = 'Menos de 10%';  valor = Num (Find-Row $dVendas['6020'] '696' '33413') },
    [ordered]@{ nome = '10% a 40%';     valor = Num (Find-Row $dVendas['6021'] '696' '33413') },
    [ordered]@{ nome = 'Mais de 40%';   valor = Num (Find-Row $dVendas['6022'] '696' '33413') }
)

# ---------------------------------------------------------------------
# 7. Fontes de informação com alta importância (tabela 5643)
# ---------------------------------------------------------------------
$dFontes = Get-Rows (Get-Sidra 5643 '2017' '5977' '714[all]|701[33438]')
$fontesDef = @(
    @{ cat = '33565'; nome = 'Departamento de P&D' },
    @{ cat = '33566'; nome = 'Outras áreas da empresa' },
    @{ cat = '33567'; nome = 'Outra empresa do grupo' },
    @{ cat = '33568'; nome = 'Fornecedores' },
    @{ cat = '33569'; nome = 'Clientes e consumidores' },
    @{ cat = '33570'; nome = 'Concorrentes' },
    @{ cat = '33571'; nome = 'Consultorias' },
    @{ cat = '33572'; nome = 'Universidades' },
    @{ cat = '33573'; nome = 'Institutos de pesquisa' },
    @{ cat = '33574'; nome = 'Centros de capacitação' },
    @{ cat = '33575'; nome = 'Certificadoras e laboratórios' },
    @{ cat = '33576'; nome = 'Conferências e publicações' },
    @{ cat = '33577'; nome = 'Feiras e exposições' },
    @{ cat = '33578'; nome = 'Redes de informação' }
)
$fontes = @()
foreach ($f in $fontesDef) {
    $fontes += [ordered]@{
        nome  = $f.nome
        valor = Num (Find-Row $dFontes['5977'] '714' $f.cat)
    }
}

# ---------------------------------------------------------------------
# 8. Cooperação com alta importância (tabela 5921)
# ---------------------------------------------------------------------
$dCoop = Get-Rows (Get-Sidra 5921 '2017' '6543' '726[all]|701[33438]')
$dCoopTotal = Get-Rows (Get-Sidra 5921 '2017' '6543' '726[39259]|701[0]')
$coopDef = @(
    @{ cat = '39259'; nome = 'Clientes' },
    @{ cat = '39260'; nome = 'Fornecedores' },
    @{ cat = '39261'; nome = 'Concorrentes' },
    @{ cat = '39262'; nome = 'Outra empresa do grupo' },
    @{ cat = '39263'; nome = 'Consultorias' },
    @{ cat = '39264'; nome = 'Universidades e institutos' },
    @{ cat = '39265'; nome = 'Centros de capacitação' },
    @{ cat = '39266'; nome = 'Certificadoras' }
)
$coopItens = @()
foreach ($c in $coopDef) {
    $coopItens += [ordered]@{
        nome  = $c.nome
        valor = Num (Find-Row $dCoop['6543'] '726' $c.cat)
    }
}
$cooperacao = [ordered]@{
    total = Num (Find-Row $dCoopTotal['6543'] '726' '39259')
    itens = $coopItens
}

# ---------------------------------------------------------------------
# 9. Apoio do governo (tabela 5924)
# ---------------------------------------------------------------------
$dApoio = Get-Rows (Get-Sidra 5924 '2017' '6544' '729[all]')
$apoioDef = @(
    @{ cat = '39280'; nome = 'Incentivo fiscal em P&D' },
    @{ cat = '39281'; nome = 'Lei da Informática' },
    @{ cat = '39282'; nome = 'Subvenção econômica' },
    @{ cat = '39283'; nome = 'Financiamento a P&D sem universidade' },
    @{ cat = '39284'; nome = 'Financiamento a P&D com universidade' },
    @{ cat = '39285'; nome = 'Financiamento para máquinas' },
    @{ cat = '39333'; nome = 'Bolsas RHAE/CNPq' },
    @{ cat = '39334'; nome = 'Capital de risco' },
    @{ cat = '40308'; nome = 'Compras públicas' },
    @{ cat = '39335'; nome = 'Outros' }
)
$apoioItens = @()
foreach ($a in $apoioDef) {
    $apoioItens += [ordered]@{
        nome  = $a.nome
        valor = Num (Find-Row $dApoio['6544'] '729' $a.cat)
    }
}
$apoio = [ordered]@{
    total = Num (Find-Row $dApoio['6544'] '729' '39279')
    itens = $apoioItens
}

# ---------------------------------------------------------------------
# 10. Obstáculos com alta importância (tabela 5926)
# ---------------------------------------------------------------------
$dObst = Get-Rows (Get-Sidra 5926 '2017' '6545,6546' '731[all]|701[33438]')
$dObstTotal = Get-Rows (Get-Sidra 5926 '2017' '6545,6546' '731[39287]|701[0]')
$obstDef = @(
    @{ cat = '39287'; nome = 'Riscos econômicos' },
    @{ cat = '39288'; nome = 'Custos elevados' },
    @{ cat = '39289'; nome = 'Falta de financiamento' },
    @{ cat = '39293'; nome = 'Rigidez organizacional' },
    @{ cat = '39294'; nome = 'Falta de pessoal qualificado' },
    @{ cat = '39295'; nome = 'Falta de informação sobre tecnologia' },
    @{ cat = '39296'; nome = 'Falta de informação sobre mercados' },
    @{ cat = '39297'; nome = 'Cooperação escassa' },
    @{ cat = '39298'; nome = 'Normas e regulamentações' },
    @{ cat = '39299'; nome = 'Baixa resposta dos consumidores' },
    @{ cat = '39300'; nome = 'Serviços técnicos escassos' },
    @{ cat = '39301'; nome = 'P&D centralizado em outra empresa' }
)
$obstInov = @()
$obstNao  = @()
foreach ($o in $obstDef) {
    $obstInov += [ordered]@{ nome = $o.nome; valor = Num (Find-Row $dObst['6546'] '731' $o.cat) }
    $obstNao  += [ordered]@{ nome = $o.nome; valor = Num (Find-Row $dObst['6545'] '731' $o.cat) }
}
$obstaculos = [ordered]@{
    inovadoras = [ordered]@{
        total = Num (Find-Row $dObstTotal['6546'] '731' '39287')
        itens = $obstInov
    }
    naoInovadoras = [ordered]@{
        total = Num (Find-Row $dObstTotal['6545'] '731' '39287')
        itens = $obstNao
    }
}

# ---------------------------------------------------------------------
# 11. Inovações organizacionais e de marketing (tabela 5927)
# ---------------------------------------------------------------------
$dOrg = Get-Rows (Get-Sidra 5927 '2017' '5977' '732[all]')
$orgDef = @(
    @{ cat = '39303'; nome = 'Técnicas de gestão' },
    @{ cat = '39304'; nome = 'Gestão ambiental' },
    @{ cat = '39305'; nome = 'Organização do trabalho' },
    @{ cat = '39306'; nome = 'Relações externas' },
    @{ cat = '39307'; nome = 'Estratégias de marketing' },
    @{ cat = '39308'; nome = 'Estética e design' }
)
$organizacionais = @()
foreach ($o in $orgDef) {
    $organizacionais += [ordered]@{
        nome  = $o.nome
        valor = Num (Find-Row $dOrg['5977'] '732' $o.cat)
    }
}

# ---------------------------------------------------------------------
# 12. Biotecnologia e nanotecnologia (tabela 5928)
# ---------------------------------------------------------------------
$dBio = Get-Rows (Get-Sidra 5928 '2017' '6547' '733[39309,39310,39315,39316]')
$biotecnologia = [ordered]@{
    biotecTotal       = Num (Find-Row $dBio['6547'] '733' '39309')
    biotecInovadoras  = Num (Find-Row $dBio['6547'] '733' '39310')
    nanoTotal         = Num (Find-Row $dBio['6547'] '733' '39315')
    nanoInovadoras    = Num (Find-Row $dBio['6547'] '733' '39316')
}

# ---------------------------------------------------------------------
# 13. Monta o snapshot
# ---------------------------------------------------------------------
$snapshot = [ordered]@{
    meta = [ordered]@{
        fonte       = 'IBGE — Pesquisa de Inovação (PINTEC 2017)'
        periodo     = 'Triênio 2015–2017'
        abrangencia = 'Brasil'
        geradoEm    = (Get-Date).ToString('yyyy-MM-dd')
        observacao  = 'A PINTEC 2017 é a edição mais recente disponível na API SIDRA. A PINTEC Semestral 2022 é uma estatística experimental com metodologia distinta e não integra esta base.'
        tabelas     = @(5453, 5018, 5464, 5458, 5618, 5643, 5921, 5924, 5926, 5927, 5928)
        api         = 'https://servicodados.ibge.gov.br/api/v3/agregados'
    }
    totais = [ordered]@{
        empresas          = $totalEmpresas
        inovadoras        = $inovadoras
        produto           = $produto
        processo          = $processo
        ambos             = $ambos
        prodNovoEmpresa   = $prodNovoEmpresa
        prodNovoMercado   = $prodNovoMercado
        procNovoEmpresa   = $procNovoEmpresa
        procNovoMercado   = $procNovoMercado
        apenasOrgMarketing = $apenasOrg
        projetosIncompletos = $incompletos
        dispendios        = $dispendios
        receita           = $receita
        empresasDispendios = $empresasDisp
        empresasPD        = $empresasPD
        pdInterno         = $pdInterno
    }
    serie          = $serie
    setores        = $setores
    dispendios     = $dispendiosItens
    novidade       = $novidade
    vendas         = $vendas
    fontes         = $fontes
    cooperacao     = $cooperacao
    apoio          = $apoio
    obstaculos     = $obstaculos
    organizacionais = $organizacionais
    biotecnologia  = $biotecnologia
}

$json = $snapshot | ConvertTo-Json -Depth 12
$js = "/* Snapshot gerado por dados/coletar.ps1 - fonte: API SIDRA/IBGE. */`nwindow.SIDRA_SNAPSHOT = $json;`n"
[IO.File]::WriteAllText($destino, $js, (New-Object Text.UTF8Encoding($false)))
Write-Host "Snapshot gravado em $destino" -ForegroundColor Green
