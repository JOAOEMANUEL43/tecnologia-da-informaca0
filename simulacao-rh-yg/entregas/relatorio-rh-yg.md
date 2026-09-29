# Relatório de Recursos Humanos — YG Música e Entretenimento S.A.

Base simulada de **200 funcionários** | posição em **30/09/2026** | movimentação de **01/01/2026** a **30/09/2026** (9 meses, 188 dias úteis).

Todos os números deste relatório também estão em CSV, na pasta `entregas`: base completa (`funcionarios-yg.csv`), agregado por setor (`resumo-por-setor.csv`), indicadores (`indicadores-rh-yg.csv`) e distribuições (`distribuicoes-rh-yg.csv`). O relatório é gerado a partir da mesma função que gera os CSV, então os dois não podem divergir.

> **Dados fictícios.** Nenhum dado pessoal real foi usado: não há CPF, nome de pessoa real nem contato de ninguém. Gerado por `simular_rh_yg.py` com semente fixa, o que torna a base reproduzível e conferível.

## 1. Resumo executivo

| Indicador | Valor | Unidade | Como foi calculado |
|---|---|---|---|
| Quadro de pessoal | 200 | funcionários | contagem de linhas da base |
| Funcionários ativos | 153 | funcionários | status diferente de Desligado, incluindo afastados |
| Funcionários em atividade | 138 | funcionários | ativos menos os afastados no momento |
| Afastados no momento | 15 | funcionários | status igual a Afastado |
| Desligados no período | 47 | funcionários | data de desligamento entre 01/01/2026 e 30/09/2026 |
| Rotatividade anualizada | 35,5% | percentual | desligados ÷ quadro médio × (12 ÷ 9 meses) |
| Absenteísmo | 3,28% | percentual | dias de afastamento ÷ (ativos × 188 dias úteis) |
| Frequência de faltas | 1,59% | percentual | faltas ÷ (ativos × 188 dias úteis) |
| Salário total médio | R$ 4.769,43 | reais por mês | média do salário total dos ativos |
| Salário total mediano | R$ 3.330,00 | reais por mês | mediana do salário total dos ativos |
| Salário total mínimo | R$ 1.230,00 | reais por mês | menor salário total entre os ativos |
| Salário total máximo | R$ 21.530,00 | reais por mês | maior salário total entre os ativos |
| Folha mensal | R$ 729.723 | reais por mês | soma do salário total dos ativos |
| Custo mensal estimado | R$ 977.829 | reais por mês | folha × (1 + 34% de encargos, hipótese) |
| Custo anual estimado | R$ 12.711.775 | reais por ano | custo mensal × 13 (12 meses mais 13º salário) |
| Tempo de casa médio | 5,2 anos | anos | média dos anos desde a admissão, entre os ativos |
| Idade média | 36,9 anos | anos | média das idades em 30/09/2026, entre os ativos |
| Treinamento médio | 14,0 horas | horas no período | média das horas de treinamento no período |
| Posições de gestão | 28 | funcionários | nível Coordenação ou Gerência |
| Mulheres no quadro ativo | 39,9% | percentual | ativos com sexo F ÷ ativos × 100 |
| Risco alto de turnover | 7 | funcionários | ativos com escore de risco igual a Alto |
| Saídas voluntárias no período | 21 | funcionários | pedido de demissão mais acordo entre as partes |
| Saídas involuntárias no período | 26 | funcionários | desligamentos menos as saídas voluntárias |
| Rotatividade voluntária anualizada | 15,9% | percentual | saídas voluntárias ÷ quadro médio × (12 ÷ 9) |
| Rotatividade involuntária anualizada | 19,6% | percentual | saídas involuntárias ÷ quadro médio × (12 ÷ 9) |

## 2. Composição por setor

| Setor | Quadro | Part. | Deslig. 9m | Rotat. anual. | Salário médio | Mediano | Casa (anos) | Absent. | Mulheres | Risco alto |
|---|---|---|---|---|---|---|---|---|---|---|
| Produção Musical | 28 | 14,0% | 7 | 38,1% | R$ 6.005,48 | R$ 3.695,00 | 4,8 | 2,15% | 42,9% | 0,0% |
| Marketing e Comunicação | 22 | 11,0% | 6 | 42,1% | R$ 3.597,81 | R$ 3.010,00 | 3,8 | 4,75% | 56,2% | 0,0% |
| Estúdio e Áudio | 18 | 9,0% | 5 | 43,0% | R$ 5.343,15 | R$ 4.246,00 | 6,1 | 3,44% | 46,2% | 7,7% |
| Eventos e Shows | 18 | 9,0% | 4 | 33,3% | R$ 4.741,79 | R$ 3.219,50 | 4,4 | 1,63% | 14,3% | 14,3% |
| Logística e Serviços Gerais | 17 | 8,5% | 5 | 46,0% | R$ 3.258,92 | R$ 2.914,00 | 5,8 | 4,17% | 25,0% | 8,3% |
| Artistas e Repertório | 14 | 7,0% | 4 | 44,4% | R$ 4.592,00 | R$ 3.677,50 | 4,8 | 3,24% | 40,0% | 10,0% |
| Streaming e Distribuição | 14 | 7,0% | 1 | 9,9% | R$ 4.962,31 | R$ 4.560,00 | 5,6 | 3,31% | 38,5% | 0,0% |
| Tecnologia da Informação | 14 | 7,0% | 4 | 44,4% | R$ 5.864,00 | R$ 4.739,00 | 5,7 | 4,10% | 30,0% | 10,0% |
| Vendas e Licenciamento | 12 | 6,0% | 2 | 24,2% | R$ 5.113,00 | R$ 4.180,00 | 4,2 | 5,05% | 60,0% | 0,0% |
| Financeiro e Controladoria | 11 | 5,5% | 2 | 26,7% | R$ 4.043,33 | R$ 3.985,00 | 5,8 | 2,30% | 55,6% | 0,0% |
| Jurídico e Direitos Autorais | 9 | 4,5% | 3 | 53,3% | R$ 7.563,33 | R$ 5.185,00 | 8,9 | 2,30% | 0,0% | 0,0% |
| Composição e Royalties | 8 | 4,0% | 1 | 17,8% | R$ 3.790,71 | R$ 2.700,00 | 5,8 | 6,23% | 42,9% | 0,0% |
| Administrativo | 8 | 4,0% | 1 | 17,8% | R$ 3.939,29 | R$ 2.350,00 | 4,1 | 0,68% | 42,9% | 0,0% |
| Recursos Humanos | 7 | 3,5% | 2 | 44,4% | R$ 3.002,00 | R$ 3.170,00 | 5,8 | 2,66% | 60,0% | 20,0% |
| **Total** | **200** | **100,0%** | **47** | **35,5%** | **R$ 4.769,43** | **R$ 3.330,00** | **5,2** | **3,28%** | **39,9%** | **4,6%** |

## 3. Números por nível e por cargo


### 3.1 Por nível (quadro completo)

| Categoria | Funcionários | Participação |
|---|---|---|
| Estágio | 14 | 7,0% |
| Assistente | 31 | 15,5% |
| Operacional | 15 | 7,5% |
| Júnior | 33 | 16,5% |
| Pleno | 61 | 30,5% |
| Sênior | 18 | 9,0% |
| Coordenação | 13 | 6,5% |
| Gerência | 15 | 7,5% |


### 3.2 Por cargo e nível

| Categoria | Funcionários | Participação |
|---|---|---|
| Auxiliar de Serviços Gerais (Operacional) | 7 | 3,5% |
| Assistente de Produção (Assistente) | 5 | 2,5% |
| Técnico de Áudio (Pleno) | 5 | 2,5% |
| Analista de Marketing (Júnior) | 5 | 2,5% |
| Analista de Marketing (Pleno) | 5 | 2,5% |
| Produtor Musical (Pleno) | 4 | 2,0% |
| Editor de Áudio (Júnior) | 4 | 2,0% |
| Analista de A&R (Júnior) | 4 | 2,0% |
| Analista de A&R (Pleno) | 4 | 2,0% |
| Analista de Conteúdo Digital (Pleno) | 4 | 2,0% |
| Produtor de Eventos (Pleno) | 4 | 2,0% |
| Técnico de Som e Luz (Operacional) | 4 | 2,0% |
| Analista de TI (Pleno) | 4 | 2,0% |
| Produtor Musical (Sênior) | 3 | 1,5% |
| Estagiário de Produção (Estágio) | 3 | 1,5% |
| Mestre de Gravação (Sênior) | 3 | 1,5% |
| Técnico de Gravação (Pleno) | 3 | 1,5% |
| Técnico de Gravação (Júnior) | 3 | 1,5% |
| Assistente de Estúdio (Assistente) | 3 | 1,5% |
| Designer (Pleno) | 3 | 1,5% |
| Analista de Direitos Digitais (Sênior) | 3 | 1,5% |
| Assistente de Operações (Assistente) | 3 | 1,5% |
| Executivo de Contas (Pleno) | 3 | 1,5% |
| Montador de Palco (Assistente) | 3 | 1,5% |
| Advogado (Sênior) | 3 | 1,5% |
| Analista de Royalties (Pleno) | 3 | 1,5% |
| Analista Financeiro (Pleno) | 3 | 1,5% |
| Analista Financeiro (Júnior) | 3 | 1,5% |
| Analista de TI (Júnior) | 3 | 1,5% |
| Analista de Logística (Júnior) | 3 | 1,5% |
| Motorista (Operacional) | 3 | 1,5% |
| Analista Administrativo (Pleno) | 3 | 1,5% |
| Assistente Administrativo (Assistente) | 3 | 1,5% |
| Supervisor de Produção (Coordenação) | 2 | 1,0% |
| Gerente de Produção (Gerência) | 2 | 1,0% |
| Estagiário de Estúdio (Estágio) | 2 | 1,0% |
| Coordenador de Estúdio (Coordenação) | 2 | 1,0% |
| Coordenador de A&R (Coordenação) | 2 | 1,0% |
| Assistente de Artista (Assistente) | 2 | 1,0% |
| Gerente de Repertório (Gerência) | 2 | 1,0% |
| Editor de Vídeo (Júnior) | 2 | 1,0% |
| Assistente de Marketing (Assistente) | 2 | 1,0% |
| Estagiário de Marketing (Estágio) | 2 | 1,0% |
| Gerente de Marketing (Gerência) | 2 | 1,0% |
| Suporte a Artistas (Pleno) | 2 | 1,0% |
| Coordenador de Distribuição (Coordenação) | 2 | 1,0% |
| Executivo de Contas (Sênior) | 2 | 1,0% |
| Analista de Licenciamento (Pleno) | 2 | 1,0% |
| Assistente Comercial (Assistente) | 2 | 1,0% |
| Estagiário Comercial (Estágio) | 2 | 1,0% |
| Coordenador de Produção de Evento (Coordenação) | 2 | 1,0% |
| Analista de Eventos (Júnior) | 2 | 1,0% |
| Estagiário de Produção de Evento (Estágio) | 2 | 1,0% |
| Analista Jurídico (Pleno) | 2 | 1,0% |
| Assistente Jurídico (Assistente) | 2 | 1,0% |
| Analista de Royalties (Júnior) | 2 | 1,0% |
| Assistente de Composição (Assistente) | 2 | 1,0% |
| Contador (Sênior) | 2 | 1,0% |
| Assistente Financeiro (Assistente) | 2 | 1,0% |
| Analista de RH (Pleno) | 2 | 1,0% |
| Analista de RH (Júnior) | 2 | 1,0% |
| Desenvolvedor de Software (Sênior) | 2 | 1,0% |
| Suporte Técnico (Assistente) | 2 | 1,0% |
| Analista de Suprimentos (Pleno) | 2 | 1,0% |
| Operador de Áudio (Pleno) | 1 | 0,5% |
| Gerente de Estúdio (Gerência) | 1 | 0,5% |
| Social Media (Pleno) | 1 | 0,5% |
| Gerente de Vendas (Gerência) | 1 | 0,5% |
| Gerente de Eventos (Gerência) | 1 | 0,5% |
| Estágio Jurídico (Estágio) | 1 | 0,5% |
| Gerente Jurídico (Gerência) | 1 | 0,5% |
| Coordenador de Repartição (Coordenação) | 1 | 0,5% |
| Gerente Financeiro (Gerência) | 1 | 0,5% |
| Recrutador (Pleno) | 1 | 0,5% |
| Estágio de RH (Estágio) | 1 | 0,5% |
| Gerente de RH (Gerência) | 1 | 0,5% |
| Estagiário de TI (Estágio) | 1 | 0,5% |
| Coordenador de TI (Coordenação) | 1 | 0,5% |
| Gerente de TI (Gerência) | 1 | 0,5% |
| Coordenador de Logística (Coordenação) | 1 | 0,5% |
| Gerente de Logística (Gerência) | 1 | 0,5% |
| Recepcionista (Operacional) | 1 | 0,5% |
| Gerente Administrativo (Gerência) | 1 | 0,5% |

## 4. Contratos, jornada e turno


### 4.1 Tipo de contrato (quadro completo)

| Categoria | Funcionários | Participação |
|---|---|---|
| CLT | 181 | 90,5% |
| Estagiário | 14 | 7,0% |
| Aprendiz | 3 | 1,5% |
| Pessoa jurídica | 2 | 1,0% |

### 4.2 Turno

| Categoria | Funcionários | Participação |
|---|---|---|
| Integral | 151 | 75,5% |
| Noturno | 15 | 7,5% |
| Manhã | 13 | 6,5% |
| Meio período | 12 | 6,0% |
| Tarde | 9 | 4,5% |

### 4.3 Jornada semanal

| Categoria | Funcionários | Participação |
|---|---|---|
| 20 horas | 14 | 7,0% |
| 30 horas | 12 | 6,0% |
| 40 horas | 32 | 16,0% |
| 44 horas | 142 | 71,0% |

## 5. Perfil do quadro ativo


### 5.1 Faixa etária

| Categoria | Funcionários | Participação |
|---|---|---|
| Até 24 | 21 | 13,7% |
| 25 a 34 | 51 | 33,3% |
| 35 a 44 | 44 | 28,8% |
| 45 a 54 | 24 | 15,7% |
| 55 ou mais | 13 | 8,5% |

### 5.2 Tempo de casa

| Categoria | Funcionários | Participação |
|---|---|---|
| Menos de 1 ano | 18 | 11,8% |
| 1 a 2 anos | 28 | 18,3% |
| 3 a 4 anos | 32 | 20,9% |
| 5 a 9 anos | 58 | 37,9% |
| 10 anos ou mais | 17 | 11,1% |

### 5.3 Sexo

| Categoria | Funcionários | Participação |
|---|---|---|
| Feminino | 61 | 39,9% |
| Masculino | 92 | 60,1% |

### 5.4 Escolaridade

| Categoria | Funcionários | Participação |
|---|---|---|
| Superior incompleto | 43 | 28,1% |
| Superior completo | 38 | 24,8% |
| Ensino Técnico completo | 24 | 15,7% |
| Pós-graduação | 21 | 13,7% |
| Mestrado | 16 | 10,5% |
| Ensino Médio completo | 11 | 7,2% |

### 5.5 Posicionamento salarial frente à referência de mercado

| Categoria | Funcionários | Participação |
|---|---|---|
| Abaixo da mediana | 46 | 30,1% |
| Na mediana | 67 | 43,8% |
| Acima da mediana | 40 | 26,1% |

A referência de mercado de cada cargo é o ponto médio da faixa salarial definida no quadro organizacional do script. "Abaixo da mediana" é menos de 92% do ponto médio; "Acima da mediana", mais de 108%.

## 6. Saídas e risco de rotatividade


### 6.1 Motivo do desligamento

| Categoria | Funcionários | Participação |
|---|---|---|
| Pedido de demissão | 17 | 36,2% |
| Desligamento por reestruturação | 9 | 19,1% |
| Demissão sem justa causa | 9 | 19,1% |
| Término de contrato de estágio | 5 | 10,6% |
| Acordo entre as partes | 4 | 8,5% |
| Aposentadoria | 3 | 6,4% |

| Indicador | Valor |
|---|---|
| Desligamentos no período | 47 |
| Saídas voluntárias (pedido de demissão e acordo) | 21 |
| Saídas involuntárias (demissão, reestruturação, fim de contrato) | 26 |
| Rotatividade voluntária | 15,9% ao ano |
| Rotatividade involuntária | 19,6% ao ano |

Sair por pedido próprio e sair por demissão não são o mesmo problema. A primeira costuma indicar salário, cargo ou ambiente; a segunda, uma decisão de custo da empresa. Misturar as duas esconde a causa.


### 6.2 Risco de turnover por escore

| Categoria | Funcionários | Participação |
|---|---|---|
| Baixo | 104 | 68,0% |
| Médio | 42 | 27,5% |
| Alto | 7 | 4,6% |

O escore soma pontos por tempo de casa curto, nota de desempenho baixa, salário abaixo da mediana, ausência longa e contrato como pessoa jurídica. Quatro pontos ou mais é risco alto. Não é modelo preditivo: é uma regra de leitura para priorizar conversa de retenção.

## 7. Maiores salários do quadro ativo

| Matrícula | Setor | Cargo | Salário total | Referência | Posicionamento |
|---|---|---|---|---|---|
| YG1135 | Jurídico e Direitos Autorais | Gerente Jurídico (Gerência) | R$ 21.530,00 | R$ 17.500 | Acima da mediana |
| YG1126 | Eventos e Shows | Gerente de Eventos (Gerência) | R$ 19.770,00 | R$ 16.000 | Acima da mediana |
| YG1028 | Produção Musical | Gerente de Produção (Gerência) | R$ 18.820,00 | R$ 15.500 | Acima da mediana |
| YG1175 | Tecnologia da Informação | Gerente de TI (Gerência) | R$ 18.480,00 | R$ 17.000 | Na mediana |
| YG1108 | Vendas e Licenciamento | Gerente de Vendas (Gerência) | R$ 18.160,00 | R$ 14.500 | Acima da mediana |
| YG1003 | Produção Musical | Produtor Musical (Sênior) | R$ 15.480,00 | R$ 12.500 | Acima da mediana |
| YG1046 | Estúdio e Áudio | Gerente de Estúdio (Gerência) | R$ 15.010,00 | R$ 13.500 | Acima da mediana |
| YG1002 | Produção Musical | Produtor Musical (Sênior) | R$ 13.175,00 | R$ 12.500 | Na mediana |

## 8. Quanto custa trocar uma pessoa

| Item | Valor | Hipótese |
|---|---|---|
| Custo médio de um desligado | R$ 5.910,87 | salário total médio de quem saiu no período |
| Custo de rescisão | R$ 2.659,89 | 45% do salário: aviso prévio proporcional + férias + 13º + multa de 40% sobre o saldo do FGTS |
| Custo de reposição | R$ 2.861,66 | 60% do salário médio da empresa (R$ 4.769,43), referente a recrutamento e treinamento da vaga |
| Custo total por substituição | R$ 5.521,55 | rescisão + reposição |
| Custo do turnover do período | R$ 259.513 | custo por substituição × 47 desligamentos |

O tempo até a vaga voltar a produzir não entra na conta. Se cada substituto leva quatro meses para atingir a produtividade anterior, o custo por substituição sobe e o cálculo acima subestima o impacto.

## 9. O que esta base não permite afirmar

- **Os números são simulados.** Nenhuma conclusão aqui descreve a YG ou o mercado de trabalho real.
- **A base é uma fotografia, não uma série.** Há uma única data de referência. Sem histórico mensal não dá para calcular rotatividade mensal, absenteísmo por mês nem evolução da folha.
- **O período é de 9 meses, não de 12.** A anualização usa 12/9 e pressupõe ritmo constante de desligamento, o que quase nunca acontece: as dispensas se concentram em janeiro, fevereiro e julho.
- **O custo de encargos é uma hipótese única de 34%.** O custo real depende do regime de contratação, do RAT da empresa, do learning e do estado.
- **Turnover não mede qualidade de gestão.** Um mercado de trabalho aquecido afasta mais gente mesmo sem a empresa ter piorado.
- **Sexo, idade e turnover não devem ser lidos como causa.** A base foi construída com percentuais escolhidos à mão para o exercício; repetir essa leitura em dado real é erro metodológico.
- **Faltam dados que mudam a decisão:** clima organizacional, horas extras por pessoa, plano de saúde, custo por artista contratado, absenteísmo por causa (acidente, doença mental) e histórico de promoções.

## 10. Perguntas que esta base responde

1. Qual setor tem rotatividade anualizada acima da média da empresa?
2. O salário médio do setor está acima ou abaixo da mediana geral?
3. Quantas pessoas abaixo da mediana de mercado há no setor com maior risco alto de turnover?
4. O absenteísmo do setor com mais gente é compatível com a jornada registrada?
5. O grau de gerência é compatível com a estrutura de cargos?
6. Quanto custa, em folha, cada um dos três maiores setores?

## 11. Como reproduzir

```
python simular_rh_yg.py          # semente 2026
python simular_rh_yg.py 77       # outra semente, outra base
```

Com a mesma semente, o script devolve a mesma base, linha a linha. Trocar a semente muda nomes, datas e valores, mas mantém as 200 pessoas, os 14 setores e a mesma lógica de distribuição.

---

Nome e matrícula do aluno: ______________________________

Declaração de uso de inteligência artificial: ______________
