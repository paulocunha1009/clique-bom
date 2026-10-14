# Clique Bom — resumo das melhorias

Resumo em linguagem simples do que foi feito no Clique Bom, para apresentação ao grupo de pesquisa.

## Em uma frase

O Clique Bom continua sendo um jogo simples, que roda no navegador sem servidor. Agora ele **mede o movimento com muito mais detalhe**, oferece **novas formas de jogar** para pessoas com diferentes necessidades motoras, **protege os dados dos alunos** e funciona bem no **celular, tablet e computador**.

## O que mudou, etapa por etapa

| Etapa | O que foi feito | Por que importa |
|---|---|---|
| 1. Configuração de cada partida | Cada partida guarda o tamanho real da figura, o tamanho mínimo, o modo de jogo, as opções de acessibilidade e o dispositivo usado (mouse, toque, caneta ou teclado), detectado automaticamente. | Permite comparar partidas feitas nas mesmas condições. O relatório avisa quando as condições foram diferentes. |
| 2. Medir melhor o movimento | Registra o caminho do cursor (a cada ~20 ms), onde foi cada clique, o tempo de reação, o tempo de movimento, a eficiência do caminho e os índices da Lei de Fitts (ISO 9241-411). | Dá ao profissional medidas objetivas da qualidade do movimento, e não só de acertos e tempo. |
| 3. Destaque de ajuda | A figura pisca depois de 2, 5 ou 10 segundos (ou nunca). O jogo registra se cada acerto veio antes ou depois da ajuda. | Mostra a evolução da autonomia: acertar sem precisar da ajuda. |
| 4. Mais acessibilidade | Clique por permanência (cursor parado de 1 a 3 s), filtro de tremor, opção de contar o clique ao encostar ou ao soltar, margem invisível ao redor da figura, varredura por partes da tela com tecla de acionador e anúncios para leitores de tela. | Amplia quem consegue jogar: pessoas com tremor, pouca força, dificuldade de clicar ou que usam acionadores. |
| 5. Proteção dos dados (LGPD) | Modo profissional com PIN, backup e restauração em arquivo e orientação para usar apelido e código do participante no lugar do nome. | Alunos não acessam relatórios. Os dados podem ser guardados e levados a outro computador com segurança. |
| 6. Dificuldade adaptativa | Modo opcional em que a figura diminui depois de 3 acertos seguidos e aumenta depois de 2 erros, respeitando o tamanho mínimo. | Cada aluno joga no limite certo para ele. O "tamanho alcançado" vira uma medida de evolução da precisão. |
| 7. Nome, aplicativo e manual | Nome "Clique Bom" em todo lugar, ícone, instalação como aplicativo que funciona sem internet e um manual (README) em português. | Fica fácil de abrir na escola, mesmo com internet ruim. |
| 8. Planilha do grupo | Envio opcional do resumo de cada partida para uma Planilha Google do grupo, só com o código do participante e nunca com o nome. Há fila para quando estiver sem internet. | O grupo reúne os dados de várias escolas num só lugar. |
| 9. Celular e acessibilidade das telas | Relatório organizado em abas, partidas em cartões no celular, explicações em "O que é isso?" e áreas de toque grandes. | Professores consultam os resultados com facilidade em qualquer aparelho. |

## Os indicadores, em palavras simples

- **Precisão:** porcentagem de acertos entre as tentativas.
- **Tempo de reação:** quanto tempo a pessoa leva para começar a mover o cursor depois que a figura aparece.
- **Tempo de movimento:** quanto tempo leva do início do movimento até acertar.
- **Distância até o centro:** quão perto do meio da figura foi o clique.
- **Eficiência do caminho:** 100% significa que o cursor foi em linha reta até a figura.
- **Throughput (Lei de Fitts):** junta velocidade e precisão num número só. Quanto maior, mais eficiente.
- **Acertos sem precisar do destaque:** acertos feitos antes de a figura piscar.
- **Tamanho alcançado:** no modo adaptativo, o menor tamanho que a pessoa consegue acertar com regularidade.

> Os indicadores são **descritivos e não são diagnóstico**. Cansaço, atenção, dispositivo e configurações influenciam os resultados. Compare sempre a mesma pessoa, nas mesmas condições, ao longo do tempo.

## Como os dados ficam protegidos

- Os dados ficam **no navegador do computador da escola**. Nada vai para a internet, a menos que o profissional ative o envio para a planilha do grupo.
- Os relatórios, o backup e a exclusão de dados exigem o **PIN do modo profissional**. Ele tem um código de recuperação, que deve ser anotado em papel.
- Na pesquisa, o aluno aparece **só pelo código** (ex.: `ESC03-A07`). A lista que liga código e nome fica com o professor, fora do jogo.
- Os dados antigos foram **mantidos e convertidos automaticamente**. Nenhuma partida registrada antes das melhorias foi perdida.

## Como começar a usar

1. Abra o jogo pelo endereço publicado (ou com dois cliques no `index.html`).
2. Clique em **Histórico de resultados**, crie o **PIN** e **anote o código de recuperação**.
3. Em **Perfis dos jogadores**, cadastre cada aluno com **apelido** e **código do participante**.
4. Ajuste as **Configurações** de cada aluno e clique em **Iniciar jogo**.
5. Faça **backup** com frequência (Perfis → Exportar backup).

Detalhes completos estão no `README.md`. A configuração da planilha está em `apps-script/COMO-CONFIGURAR.md`.

## Cuidados e limitações

- Para usar os dados em pesquisa, é preciso o consentimento dos responsáveis, o assentimento dos alunos e o acompanhamento do Comitê de Ética (CEP).
- O PIN impede o acesso dos alunos, mas não é criptografia. Um técnico com acesso ao computador ainda consegue ler os dados.
- No toque na tela, não há cursor antes do toque. Por isso o tempo de reação e o caminho não são medidos nesse caso.
- O throughput usa uma adaptação da norma ISO 9241-411, porque as figuras aparecem em posições variadas.

## Sugestões de próximos passos

- Testar com alguns alunos e professores e ajustar os textos e os tempos padrão.
- Combinar no grupo um padrão de códigos de participante (por escola e por aluno).
- Validar os indicadores com profissionais (por exemplo, comparar com avaliações já usadas pelos terapeutas).

---
Projeto desenvolvido no contexto do Curso de Gamificação do EducaTec Ceará.
