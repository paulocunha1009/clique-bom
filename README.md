# Clique Bom

Jogo digital acessível para **estimular e acompanhar habilidades motoras** de pessoas com deficiência, pensado para o Atendimento Educacional Especializado (AEE), terapeutas ocupacionais e outros profissionais.

O jogador seleciona figuras geométricas na tela, usando mouse, toque, teclado, um acionador (botão adaptado) ou deixando o cursor parado sobre a figura. O jogo dá pontos e medalhas e registra indicadores de desempenho para o acompanhamento profissional.

> **Importante:** o Clique Bom é um recurso educacional e de observação. Os indicadores **não são diagnóstico** e não substituem avaliação clínica nem o julgamento de profissionais habilitados.

---

## 1. Como abrir o jogo

### Jeito 1 — No próprio computador (mais simples)
1. Copie a pasta inteira do jogo para o computador.
2. Dê **dois cliques** no arquivo `index.html`.
3. O jogo abre no navegador. **Não precisa de internet.**

Use Chrome, Edge ou Firefox atualizados.

### Jeito 2 — Por um endereço na internet (permite instalar como aplicativo)
Quando o jogo é publicado em um endereço `https://`, ele pode ser **instalado** no computador, tablet ou celular e passa a **abrir sem internet** depois da primeira visita.

- **Instalar no computador (Chrome/Edge):** abra o endereço e clique no ícone de instalar, na barra de endereço, ou em Menu ⋮ → "Instalar Clique Bom".
- **Instalar no Android:** Menu ⋮ → "Adicionar à tela inicial" ou "Instalar aplicativo".
- **Instalar no iPhone/iPad (Safari):** botão Compartilhar → "Adicionar à Tela de Início".

**Como publicar gratuitamente (GitHub Pages):**
1. Crie uma conta em github.com (de preferência com o e-mail institucional).
2. Crie um repositório novo (por exemplo, `clique-bom`) e envie todos os arquivos desta pasta, usando o botão "Add file → Upload files".
3. No repositório, vá em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)` e salve.
4. Em alguns minutos o jogo estará em `https://SEU-USUARIO.github.io/clique-bom/`.

> Atenção: cada endereço guarda seus próprios dados. Os dados do jogo aberto com duplo clique **não aparecem** no endereço publicado, e vice-versa. Para levar dados de um para o outro, use o **backup** (seção 6).

---

## 2. Primeiros passos

1. **Crie o PIN do modo profissional.** Na primeira vez que abrir **Histórico de resultados**, o jogo pede para criar um PIN de 4 a 8 números. Em seguida ele mostra um **código de recuperação**: **anote em papel** e guarde longe dos alunos. É a única forma de criar um novo PIN se você esquecer o atual.
2. **Cadastre os jogadores** em **Perfis dos jogadores**:
   - Use um **apelido** (ex.: "Estrela"), **não o nome completo**.
   - Preencha o **código do participante** (ex.: `ESC03-A07` = escola 3, aluno 7). É ele que identifica o aluno na pesquisa.
   - Guarde a lista que liga código e nome **fora do jogo**, em local seguro.
3. **Ajuste as Configurações** de cada jogador (seção 3). Elas ficam salvas separadamente para cada perfil.
4. Clique em **Iniciar jogo**.

---

## 3. Configurações de acessibilidade

| Configuração | O que faz |
|---|---|
| **Tamanho mínimo do alvo** | Impede que as figuras fiquem menores que Normal (60 px), Grande (112 px) ou Extragrande (148 px). |
| **Alto contraste** | Cores fortes, em preto e branco, para facilitar a visualização. |
| **Reduzir animações** | Tira o efeito piscante e outros movimentos da tela. |
| **Manter alvo no centro** | A figura aparece sempre no mesmo lugar. |
| **Destaque de ajuda** | Se a pessoa demorar, a figura ganha uma borda que pisca, depois de 2, 5 ou 10 segundos. Também pode ser desligado. |
| **Filtro de tremor** | Ignora cliques ou toques repetidos em menos de 0,3, 0,5 ou 1 segundo. Os ignorados **não contam como erro**. |
| **Margem invisível** | Aumenta a área que conta como acerto (10, 20 ou 40 px) sem mudar o desenho. |

### Modos de interação
- **Direto:** mouse, toque ou teclado (Enter/Espaço com a figura em foco). Você escolhe se o clique conta **ao soltar** (padrão) ou **ao encostar**.
- **Permanência:** a pessoa deixa o cursor (ou o dedo) parado sobre a figura por 1, 2 ou 3 segundos. Um **anel verde** vai se completando. Neste modo, o botão do mouse não conta.
- **Varredura automática:** a área de jogo é dividida em partes, destacadas uma de cada vez com "▶ Agora". A pessoa aperta **Espaço**, **Enter** ou uma **tecla extra** (para acionadores) quando a parte com a figura estiver destacada. Pausar, Reiniciar e Encerrar ficam em **"Opções do jogo"**.

### Modo de dificuldade (escolhido pelo profissional, pede o PIN)
- **Fases (padrão):** 6 fases. As figuras diminuem de 160 px para 60 px e a quantidade de figuras aumenta (3, 5, 7, 10, 12 e 15).
- **Adaptativo:** rodadas de 10 figuras. Depois de **3 acertos seguidos**, a figura fica 10% menor. Depois de **2 erros seguidos**, fica 15% maior na hora. Ela nunca passa do tamanho mínimo. A fase do modo padrão fica guardada.

---

## 4. O que significa cada indicador

Os indicadores aparecem em **Histórico de resultados** (pede o PIN). Compare sempre **a mesma pessoa, com a mesma configuração e o mesmo dispositivo**, ao longo do tempo.

### Indicadores gerais
| Indicador | O que significa |
|---|---|
| **Pontos** | 10 pontos por figura acertada. |
| **Acertos / Tentativas** | Figuras acertadas / total de ações (acertos + erros). |
| **Precisão** | Porcentagem de acertos entre as tentativas. |
| **Tempo ativo** | Tempo de jogo, sem contar pausas nem os momentos em que a aba estava escondida. |
| **Média por alvo** | Tempo médio entre a figura aparecer e ser acertada. Também são mostrados o menor e o maior tempo. |
| **Ritmo (acertos por minuto)** | Quantos acertos por minuto de tempo ativo. |
| **Fases concluídas** | Partidas em que a meta foi atingida. |
| **Acertos sem precisar do destaque** | Porcentagem de acertos feitos **antes** de a figura piscar. Um aumento pode indicar mais autonomia para encontrar a figura. |
| **Ignorados pelo filtro de tremor** | Ações repetidas que o filtro descartou. Muitos ignorados podem indicar que vale aumentar o intervalo do filtro. |
| **Tamanho alcançado (adaptativo)** | Tamanho da figura ao fim da rodada adaptativa. Quanto menor, mais precisão a pessoa demonstrou. |

### Indicadores de movimento
Medidos com mouse ou caneta. No **toque**, só valem a distância até o centro, o índice de dificuldade e o throughput. No **teclado e na varredura**, nenhum deles se aplica.

| Indicador | O que significa |
|---|---|
| **Distância do clique até o centro** | Distância entre o ponto clicado e o meio da figura. Quanto menor, mais preciso foi o clique. |
| **Distância dos erros até o centro** | Nos cliques fora da figura, a que distância do meio eles caíram. Mostra se os erros passam perto ou longe. |
| **Tempo de reação** | Tempo entre a figura aparecer e o cursor começar a se mexer (mais de 3 px). Mostra a rapidez para perceber e iniciar a ação. |
| **Tempo de movimento** | Tempo entre começar a mexer o cursor e acertar a figura. No modo Permanência, o tempo parado sobre a figura não entra. |
| **Eficiência do caminho** | Distância em linha reta ÷ distância realmente percorrida. 100% = foi direto até a figura. Valores menores indicam desvios ou correções. |
| **Índice de dificuldade (bits)** | Quanto cada figura era difícil de alcançar, juntando distância e tamanho, pela Lei de Fitts: ID = log₂(distância ÷ largura + 1). Quanto maior, mais difícil. |
| **Throughput (bits/s)** | Junta velocidade e precisão num só número, pela Lei de Fitts (ISO 9241-411). Quanto maior, mais eficiente o movimento. |

**Como o throughput é calculado:** para cada partida, o jogo mede o deslocamento de cada clique em relação ao centro, na direção do movimento, e calcula a **largura efetiva** (4,133 × desvio-padrão). Depois calcula o índice de dificuldade efetivo e divide pela média do tempo. Com menos de 5 figuras válidas, usa o tamanho real da figura no lugar da largura efetiva, e o relatório avisa isso. Como as figuras aparecem em posições variadas, trata-se de uma **adaptação** do procedimento da norma, que usa distâncias fixas. Com **alvo fixo no centro**, a Lei de Fitts não se aplica, porque o cursor já está sobre a figura.

### Cuidados ao interpretar
Cansaço, atenção, familiaridade com o jogo, tamanho das figuras, dispositivo e recursos de acessibilidade influenciam os resultados. Uma melhora ou piora isolada não deve ser lida automaticamente como evolução ou regressão. O relatório avisa quando as partidas comparadas usaram configurações diferentes.

---

## 5. Relatórios e exportações

Em **Histórico de resultados**, escolha o jogador e a dificuldade no topo. O relatório é dividido em **abas**, que funcionam bem no celular, no tablet e no computador:

| Aba | O que mostra |
|---|---|
| 📋 **Resumo** | Os principais números e a análise do período em texto. Em cada indicador, toque em **"O que é isso?"** para ver a explicação. |
| 🖱️ **Movimento** | Os indicadores de movimento (distância do centro, reação, eficiência, Lei de Fitts). |
| 📊 **Gráficos** | As últimas 10 partidas. Use **"Qual gráfico ver?"** para mostrar um gráfico de cada vez. |
| 📝 **Partidas** | Uma linha por partida (no celular, um cartão por partida), 10 de cada vez. "Mais números", "Movimento" e "Configuração" abrem ao tocar. |
| 💾 **Exportar** | Arquivos CSV, envio para a planilha do grupo e a opção de apagar o histórico. |

O jogo lembra a última aba aberta. No teclado, as setas trocam de aba.

Recursos do relatório:

- **Ver caminho do cursor:** desenho de cada partida com as figuras numeradas, o caminho do cursor, os acertos (●) e os cliques fora (✕).
- **Exportar relatório CSV:** uma linha por partida, com resultados, configuração usada, indicadores de movimento e código do participante.
- **Exportar cada clique (CSV):** uma linha por clique, certo ou errado, com posição, distância ao centro, tempos e índices.
- **Exportar trajetórias do cursor (CSV):** uma linha por ponto do caminho do cursor (amostras a cada ~20 ms).

Os arquivos CSV usam ponto e vírgula (`;`) e abrem no Excel, no LibreOffice e no Google Planilhas. As posições são em pixels, a partir do canto superior esquerdo da área de jogo.

---

## 6. Proteção dos dados (LGPD)

- **Onde ficam os dados:** no navegador do computador onde o jogo foi usado. Nada é enviado para a internet, a não ser que o profissional ligue o envio para a planilha do grupo (veja abaixo).
- **Planilha do grupo de pesquisa (opcional, desligada por padrão):** em **Histórico de resultados → Planilha do grupo de pesquisa**, o profissional pode ligar o envio de **um resumo por partida** para uma Planilha Google. Vai **só o código do participante**, nunca o apelido. Perfis sem código não são enviados, e cliques e trajetórias não saem do computador. Sem internet, as partidas esperam numa fila. Para configurar a planilha, siga [apps-script/COMO-CONFIGURAR.md](apps-script/COMO-CONFIGURAR.md).
- **Modo profissional com PIN:** relatórios, backup, edição e exclusão de perfis e apagamento de histórico pedem o PIN. O modo se desliga sozinho após 15 minutos sem uso. Depois de 5 erros de PIN, é preciso esperar 30 segundos.
- **Limite do PIN:** ele impede o acesso dos alunos, mas **não é criptografia**. Uma pessoa com conhecimento técnico e acesso ao computador ainda consegue ler os dados do navegador.
- **Backup:** em **Perfis dos jogadores**, use **Exportar backup** (um perfil) ou **Exportar backup de todos os perfis**. Guarde o arquivo `.json` em local seguro, como o Drive institucional ou um pendrive guardado. Para restaurar ou levar a outro computador, use **Importar backup**.
- **Cuidado:** limpar os dados do navegador apaga os dados do jogo. Faça backups com frequência.
- **Pesquisa:** para usar os dados em pesquisa, obtenha o consentimento dos responsáveis e o assentimento do aluno e siga as orientações do Comitê de Ética.

---

## 7. Medalhas (15)

- **Precisão:** concluir uma fase com 70%, 85% e 100% de precisão (3).
- **Tempo:** concluir com média de até 15, 10 e 5 segundos por figura (3). São opcionais e nunca impedem o avanço.
- **Fases:** concluir as fases 2, 4 e 6 do modo de fases (3).
- **Participação:** primeira conclusão, concluir após 5 erros, 5 e 10 conclusões, jogar em 3 dias diferentes e somar 100 acertos (6).

As medalhas ficam salvas para cada perfil, na tela **Minhas medalhas**. Partidas antigas podem desbloquear medalhas retroativamente. O histórico guarda as 50 partidas mais recentes de cada perfil, e as medalhas já conquistadas continuam mesmo depois que a partida sai do histórico.

---

## 8. Para quem cuida da parte técnica

**Tecnologias:** HTML5, CSS3 e JavaScript puro, sem frameworks, sem servidor e sem dependências externas. Figuras em SVG.

### Arquivos
| Arquivo | Função |
|---|---|
| `index.html` | Todas as telas e janelas. |
| `assets/css/style.css` | Aparência, alto contraste e animações. |
| `assets/js/dados.js` | Versão do formato dos dados, cópia de segurança e migração automática. |
| `assets/js/movimento.js` | Registro de trajetórias e cliques, cálculos (Fitts) e banco IndexedDB. |
| `assets/js/relatorio-movimento.js` | Indicadores de movimento, gráficos, desenho do caminho e CSVs detalhados. |
| `assets/js/interface.js` | Abas do Histórico, cartões com "O que é isso?", escolha de gráfico e lista de partidas aos poucos. |
| `assets/js/acionamento.js` | Regra de acerto, modos Direto, Permanência e Varredura, filtro de tremor e margem. |
| `assets/js/protecao.js` | PIN, modo profissional e backup JSON. |
| `assets/js/adaptativo.js` | Dificuldade adaptativa. |
| `assets/js/planilha.js` | Envio dos resumos para a Planilha Google (fila e reenvio). |
| `apps-script/Codigo.gs` | Código que fica dentro da Planilha Google e recebe os dados. |
| `assets/js/script.js` | Perfis, fases, partidas, histórico, preferências e medalhas. |
| `sw.js`, `manifest.webmanifest`, `assets/icons/` | PWA: instalação e funcionamento sem internet. |

### Onde os dados ficam
- **LocalStorage:** as chaves `jogo-cliques-*` foram mantidas das versões anteriores, para não perder dados.
  - `jogo-cliques-perfis-v1`: lista de perfis (`id`, `name`, `codigo`).
  - `jogo-cliques-perfil-ativo-v1`: perfil selecionado.
  - `jogo-cliques-dados-perfil-v1:<id>:<campo>`: `phase`, `history` (até 50 partidas), `preferences`, `badges`.
  - `cliquebom-versao-dados`: versão do formato (atual: **4**).
  - `cliquebom-copia-seguranca-v1`: cópia automática feita antes da migração dos dados antigos.
  - `cliquebom-pin`: resumo do PIN e do código de recuperação (PBKDF2-SHA-256 com sal). O PIN nunca é guardado como texto.
  - `cliquebom-planilha`: configuração do envio para a planilha (endereço, chave, escola e identificador aleatório do computador).
  - `cliquebom-fila-envio`: partidas aguardando envio para a planilha.
- **IndexedDB** (`cliquebom`, tabela `detalhesPartidas`): detalhes de cada partida (cliques, trajetórias e métricas por figura), sem limite de partidas.

### Versões do formato dos dados
1. Original, sem campo de versão.
2. Cada partida ganha `v`, `id` e `config`. Partidas antigas recebem `config: null`.
3. `motor` (indicadores de movimento) e `destaque` (antes e depois do destaque).
4. `modoDificuldade`, `adaptativo` e `tremorIgnorados`. No modo adaptativo, `phase = null`.

A migração é automática ao abrir o jogo. Campos que faltam em partidas antigas aparecem como "—".

### Publicar uma versão nova (PWA)
O service worker serve a cópia guardada e busca a nova em segundo plano. A versão nova aparece **na abertura seguinte**. Ao publicar mudanças, aumente `CACHE_VERSAO` em `sw.js` (ex.: `clique-bom-v2`) para descartar a cópia antiga. Isso **não apaga** os dados dos alunos.

### Testar localmente com servidor
Abrir com duplo clique funciona, mas o PWA só funciona em `http(s)`. Para testar o PWA:

```bash
python -m http.server 8765
```

Depois abra `http://localhost:8765`.

---

## 9. Limitações conhecidas
- Os dados ficam em um único navegador. Use o backup para não perdê-los.
- A varredura funciona na tela do jogo. Os menus são usados com Tab e Enter.
- No toque, não há cursor antes do toque. Por isso tempo de reação, trajetória e eficiência do caminho não são medidos.
- No modo Permanência, não há cliques errados. No modo adaptativo, a figura então só diminui, sempre respeitando o mínimo.
- O throughput é uma adaptação da norma ISO 9241-411 para figuras em posições variadas.

Projeto desenvolvido no contexto do Curso de Gamificação do **EducaTec Ceará**.
