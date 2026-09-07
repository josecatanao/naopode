# Plano de evolucao multiplayer

## Resumo do estado atual

O app hoje funciona como uma partida local em um celular. Ele ja possui um modo de fiscal remoto usando Supabase Realtime ou BroadcastChannel local, mas esse modo apenas espelha a carta para um segundo aparelho e permite marcar "Nao pode".

Essa base ajuda, mas ainda nao representa uma sala completa. Nao existe identidade persistida por jogador, lista de conectados, controle de papeis por participante, historico da partida ou recuperacao confiavel se alguem recarregar o celular.

## Problema imediato: piscadas na tela

A causa mais provavel das piscadas era a remontagem completa da tela remota a cada atualizacao de estado. Em vez de atualizar apenas cronometro, jogador e carta, o app recriava o HTML inteiro do fiscal. Isso reiniciava animacoes e parecia um reload visual.

A correcao inicial e manter a tela remota montada e atualizar somente os elementos que mudam.

## Produto alvo

1. Uma pessoa cria uma partida.
2. Essa pessoa cadastra times e jogadores.
3. O app gera link e QR Code.
4. Cada convidado abre o link e escolhe "quem e voce".
5. Cada celular recebe uma tela adequada ao seu papel.
6. O jogador da vez ve a carta completa.
7. Os outros veem placar, tempo, rodada e resultado, sem ver as palavras proibidas.
8. Um ou mais fiscais podem marcar "Nao pode".

## Modelo de papeis

- `host`: cria e controla a partida.
- `player`: jogador identificado pelo nome cadastrado.
- `actor`: jogador da vez, ve a carta completa.
- `teammate`: participante do mesmo time, acompanha sem ver a carta.
- `opponent`: adversario, acompanha placar e pode fiscalizar se a regra permitir.
- `spectator`: pessoa sem nome escolhido, apenas acompanha.

## Backend recomendado

Supabase deve deixar de ser apenas um canal de broadcast e passar a guardar o estado da partida.

Tabelas sugeridas:

- `matches`: sala, codigo, configuracoes, status e rodada atual.
- `teams`: times da partida.
- `players`: nomes, time, token de sessao e status online.
- `rounds`: jogador da vez, carta, inicio, fim e resultado.
- `events`: acertou, pulou, nao pode, pausa, retomada e ajustes manuais.

Realtime continua sendo usado para avisar os celulares quando algo muda.

## Fases

### Fase 1: estabilidade

- Reduzir re-render completo durante a partida.
- Garantir que timer, carta e placar sejam atualizados de forma pontual.
- Evitar listeners duplicados ao entrar e sair de salas.
- Validar em dois celulares ou duas abas.

### Fase 2: sala com identidade

- Renomear "Fiscal remoto" para "Partida online".
- Criar lobby com link e QR Code.
- Tela de entrada perguntando "Quem e voce?".
- Guardar a escolha do jogador no navegador.
- Mostrar lista de conectados no host.

### Fase 3: telas por papel

- Jogador da vez ve carta completa.
- Outros jogadores veem placar, tempo, equipe da vez e resultados.
- Fiscal ve botao de "Nao pode".
- Host pode pausar, retomar, corrigir placar e encerrar.

### Fase 4: persistencia real

- Criar tabelas no Supabase.
- Salvar estado da partida no banco.
- Recuperar partida apos refresh.
- Impedir conflitos quando dois celulares tentam controlar a mesma rodada.

### Fase 5: polimento

- Convite compartilhavel com mensagem pronta.
- QR Code no lobby e durante pausas.
- Indicador de conexao por jogador.
- Tratamento de queda de internet.
- Historico final por jogador e por time.

## Decisao recomendada

O proximo passo mais seguro e terminar a Fase 1 e depois implementar a Fase 2. Construir todas as fases de uma vez tende a misturar regra de jogo, interface e sincronizacao, aumentando muito o risco de regressao.

## Progresso atual

- Fase 1 iniciada: a tela conectada deixou de ser remontada inteira a cada atualizacao remota.
- Fase 2 iniciada: o modo foi apresentado como "Partida online", o lobby mostra link, QR Code, times e jogadores.
- Fase 2 iniciada: quem entra pelo link ve a tela "Quem e voce?" e escolhe um jogador ou entra como espectador.
- Fase 3 iniciada: o celular do jogador da vez ve a carta; os outros veem placar/status; adversarios podem fiscalizar.

Ainda falta persistir a identidade no Supabase, listar participantes realmente conectados por nome e salvar a partida em tabelas para recuperar estado apos refresh.
