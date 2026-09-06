# Configurar Supabase Realtime

Este projeto usa Supabase apenas como canal em tempo real entre o celular principal e o celular do fiscal.

Nao e necessario criar tabela para o modo simples. O jogo usa Realtime Broadcast em canais publicos com nomes como `room:4827`.

## 1. Criar projeto

1. Acesse https://supabase.com
2. Crie um projeto.
3. Abra Project Settings > API.
4. Copie:
   - Project URL
   - publishable key

## 2. Preencher o arquivo

Edite `supabase-config.js`:

```js
window.NAO_PODE_SUPABASE = {
  url: "https://SEU_PROJETO.supabase.co",
  publishableKey: "SUA_PUBLISHABLE_KEY",
  publicAppUrl: "https://seu-jogo.netlify.app"
};
```

`publicAppUrl` precisa ser a URL publica onde o jogo esta hospedado. O QR Code usa essa URL para abrir a tela do fiscal em outro celular.

## 3. Hospedar gratuitamente

Opcoes simples:

- Netlify: arraste a pasta do projeto para o deploy.
- Vercel: importe a pasta/projeto.
- GitHub Pages: publique os arquivos estaticos.
- Supabase Storage nao e a melhor opcao para site estatico; prefira uma das opcoes acima.

Depois do deploy, atualize `publicAppUrl` com a URL final.

## 4. Testar

1. Abra o jogo na URL publica.
2. Ative "Fiscal em outro celular" na configuracao da partida.
3. Comece a partida.
4. Leia o QR Code com outro celular.
5. Entre como fiscal.

Se `supabase-config.js` estiver vazio, o jogo volta automaticamente ao modo local, que serve apenas para teste em abas do mesmo navegador.
