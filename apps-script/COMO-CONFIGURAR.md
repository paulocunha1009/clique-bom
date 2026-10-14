# Como ligar o Clique Bom à Planilha Google do grupo

Este passo a passo é feito **uma única vez** por alguém do grupo de pesquisa. Leva uns 10 minutos. Depois, cada professor só precisa colar no jogo o **endereço** e a **chave** gerados aqui.

> **Antes de começar:**
> - Use a **conta institucional** do Google (ex.: `@prof.ce.gov.br`), não um Gmail pessoal.
> - Garanta que há **autorização** para usar os dados: consentimento dos responsáveis, assentimento do aluno e orientações do Comitê de Ética.
> - A planilha recebe **só o código do participante**, nunca o nome ou apelido.

---

## Passo 1 — Criar a planilha
1. Abra o Google Drive com a conta institucional.
2. Clique em **Novo → Planilhas Google**.
3. Dê um nome, por exemplo: `Clique Bom — Pesquisa`.
4. Compartilhe **somente** com as pessoas do grupo de pesquisa.

## Passo 2 — Colar o script
1. Na planilha, clique em **Extensões → Apps Script**.
2. Apague todo o texto que aparecer no editor.
3. Abra o arquivo `Codigo.gs` (que está nesta mesma pasta), copie **tudo** e cole no editor.
4. Procure a linha:
   ```
   const CHAVE_DO_PROJETO = 'TROQUE-ESTA-CHAVE';
   ```
   e troque `TROQUE-ESTA-CHAVE` por uma **chave longa e difícil de adivinhar**, por exemplo `cb-2026-k9f3x7q2m8w4`. Mantenha as aspas.
5. Clique no ícone de **disquete** (Salvar).

> **Atenção:** a chave verdadeira fica **só no Google** e com os professores. Não a coloque nos arquivos do jogo nem no GitHub.

## Passo 3 — Publicar o receptor
1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. Na engrenagem ao lado de "Selecionar tipo", escolha **App da Web**.
3. Preencha:
   - **Descrição:** `Receptor Clique Bom`
   - **Executar como:** *Eu* (a sua conta)
   - **Quem pode acessar:** *Qualquer pessoa*
   (Isso é necessário para o jogo conseguir enviar sem login. Só envios com a **chave** correta são aceitos.)
4. Clique em **Implantar** e depois em **Autorizar acesso**. Escolha a sua conta. Se aparecer "O Google não verificou este app", clique em **Avançado → Acessar (não seguro)**. O aviso aparece porque o script foi criado por você mesmo.
5. Copie o **URL do app da Web**. Ele termina em `/exec`, por exemplo:
   `https://script.google.com/macros/s/AKfycb…/exec`

## Passo 4 — Configurar no jogo (cada professor)
1. No Clique Bom, abra **Histórico de resultados** (pede o PIN).
2. Desça até **Planilha do grupo de pesquisa**.
3. Cole o **endereço** (Passo 3) e a **chave do projeto** (Passo 2).
4. Se quiser, preencha **Escola/turma** (ex.: `ESC03`).
5. Clique em **Testar conexão**. Deve aparecer "Conexão funcionando!".
6. Marque **Enviar automaticamente os resumos das partidas** e clique em **Salvar configuração**.
7. Para mandar também as partidas que já existiam, clique em **Enviar também as partidas antigas**.

Pronto! A cada partida terminada, uma linha nova aparece na aba **Partidas** da planilha.

---

## Perguntas frequentes

**Um aluno não aparece na planilha.**
Ele precisa ter **código do participante**. Em **Perfis dos jogadores → Editar**, dê um código e depois clique em "Enviar também as partidas antigas".

**Estava sem internet. Perdi os dados?**
Não. As partidas ficam numa fila no computador e são enviadas quando a internet volta, ou pelo botão **Enviar pendentes agora**.

**Apareceu uma partida repetida?**
Não deve acontecer: a planilha ignora partidas com o mesmo **Código da partida**.

**Mudei o script. Preciso fazer algo?**
Sim: em **Implantar → Gerenciar implantações**, edite a implantação atual e escolha **Nova versão**. O endereço continua o mesmo.

**Quero trocar a chave.**
Troque no script, publique uma nova versão e avise os professores para colar a nova chave no jogo.

**O que vai para a planilha?**
Uma linha por partida, com as mesmas colunas do "Exportar relatório CSV", **menos o apelido**, e mais "Escola/turma", "Identificador do computador" (um código aleatório do computador) e "Recebido em". Cliques e trajetórias **não** vão. Eles ficam no computador e saem pelos botões de exportar CSV.
