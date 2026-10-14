/**
 * =============================================================================
 * Clique Bom — receptor da Planilha Google do grupo de pesquisa (Etapa 8)
 * -----------------------------------------------------------------------------
 * Este código fica DENTRO da planilha (Extensões → Apps Script).
 * O jogo envia uma linha por partida. Este script:
 *   • confere a CHAVE DO PROJETO (só aceita envios do jogo configurado);
 *   • cria os cabeçalhos sozinho e acrescenta colunas novas no fim, se surgirem;
 *   • ignora partidas repetidas (pelo "Código da partida");
 *   • impede que textos virem fórmulas (proteção de segurança).
 * O jogo nunca envia o apelido do aluno, só o código do participante.
 * Passo a passo de instalação: arquivo COMO-CONFIGURAR.md, nesta mesma pasta.
 * =============================================================================
 */

// TROQUE pela chave do projeto (a mesma que será colada no jogo).
// Use algo longo e difícil de adivinhar, por exemplo: cb-2026-ESC-k9f3x7q2m8
const CHAVE_DO_PROJETO = 'TROQUE-ESTA-CHAVE';
const NOME_DA_ABA = 'Partidas';
const COLUNA_ID = 'Código da partida';

function doPost(e) {
  const trava = LockService.getScriptLock();
  trava.waitLock(30000); // evita que dois envios ao mesmo tempo baguncem a planilha
  try {
    const dados = JSON.parse(e.postData.contents);
    if (CHAVE_DO_PROJETO === 'TROQUE-ESTA-CHAVE') return responder({ ok: false, erro: 'chave-nao-configurada' });
    if (!dados || dados.chave !== CHAVE_DO_PROJETO) return responder({ ok: false, erro: 'chave-invalida' });
    if (dados.acao === 'teste') return responder({ ok: true, planilha: SpreadsheetApp.getActive().getName() });
    if (dados.acao !== 'partidas' || !Array.isArray(dados.colunas) || !Array.isArray(dados.linhas)) {
      return responder({ ok: false, erro: 'formato-invalido' });
    }
    // Recusa por segurança qualquer envio que traga o apelido do jogador.
    if (dados.colunas.indexOf('Jogador') !== -1) return responder({ ok: false, erro: 'apelido-nao-permitido' });

    const aba = obterAba();
    const cabecalho = garantirColunas(aba, dados.colunas);
    const posId = cabecalho.indexOf(COLUNA_ID);
    const jaExistem = new Set();
    if (aba.getLastRow() > 1) {
      aba.getRange(2, posId + 1, aba.getLastRow() - 1, 1).getValues().forEach(function (l) { jaExistem.add(String(l[0])); });
    }
    const recebidos = [];
    const novas = [];
    dados.linhas.forEach(function (linha) {
      const porNome = {};
      dados.colunas.forEach(function (nome, i) { porNome[nome] = seguro(linha[i]); });
      const id = String(porNome[COLUNA_ID] || '');
      if (!id) return;
      recebidos.push(id); // repetida ou nova, o jogo pode tirar da fila
      if (jaExistem.has(id)) return;
      jaExistem.add(id);
      porNome['Recebido em'] = new Date();
      novas.push(cabecalho.map(function (nome) { return porNome[nome] === undefined ? '' : porNome[nome]; }));
    });
    if (novas.length) aba.getRange(aba.getLastRow() + 1, 1, novas.length, cabecalho.length).setValues(novas);
    return responder({ ok: true, recebidos: recebidos, novas: novas.length });
  } catch (erro) {
    return responder({ ok: false, erro: String(erro) });
  } finally {
    trava.releaseLock();
  }
}

// Permite abrir o endereço no navegador para conferir se está publicado.
function doGet() {
  return responder({ ok: true, mensagem: 'Receptor do Clique Bom funcionando.' });
}

function obterAba() {
  const planilha = SpreadsheetApp.getActive();
  return planilha.getSheetByName(NOME_DA_ABA) || planilha.insertSheet(NOME_DA_ABA);
}

// Garante que todas as colunas enviadas existam (novas vão para o fim).
function garantirColunas(aba, colunas) {
  let cabecalho = aba.getLastColumn() > 0 ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String) : [];
  const faltam = colunas.concat(['Recebido em']).filter(function (c) { return cabecalho.indexOf(c) === -1; });
  if (faltam.length) {
    aba.getRange(1, cabecalho.length + 1, 1, faltam.length).setValues([faltam]).setFontWeight('bold');
    cabecalho = cabecalho.concat(faltam);
    aba.setFrozenRows(1);
  }
  return cabecalho;
}

// Textos que começam com = + - @ seriam lidos como fórmula: ganham um apóstrofo.
function seguro(valor) {
  if (typeof valor === 'string' && /^[=+\-@]/.test(valor)) return "'" + valor;
  return valor;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
