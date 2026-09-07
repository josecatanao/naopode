# Testes

Este projeto usa Playwright para validar os fluxos reais do app no navegador.

## Instalar

```sh
npm install
npx playwright install chromium
```

## Rodar todos os testes

```sh
npm run test:e2e
```

## Ver o navegador executando os testes

```sh
npm run test:e2e:headed
```

## Depurar passo a passo

```sh
npm run test:e2e:debug
```

## Abrir a interface visual do Playwright

```sh
npm run test:e2e:ui
```

## Atualizar screenshots-base

Use apenas quando a mudanca visual for intencional.

```sh
npm run test:e2e -- --project=mobile-chromium --update-snapshots
```

## Cobertura atual

- Fluxo local: abrir app, configurar partida, iniciar rodada, acertar, pular, pausar e retomar.
- Partida online: criar lobby, gerar codigo/link/QR e iniciar pelo lobby.
- Entrada de participante: escolher identidade, trocar jogador e entrar como espectador.
- Permissoes por papel: jogador da vez ve carta, adversario fiscaliza, espectador nao ve carta.
- Visual mobile: screenshots de home, configuracao, lobby, identidade e acompanhamento.
