# 🚀 Como Colocar Online (Deploy na Vercel)

## Passo a Passo

### 1. Criar conta na Vercel (grátis)
- Acesse: https://vercel.com
- Clique em "Sign Up"
- Pode entrar com GitHub, GitLab ou email

### 2. Instalar Git (se não tiver)
- Baixe em: https://git-scm.com/download/win
- Instale com as opções padrão

### 3. Criar conta no GitHub (se não tiver)
- Acesse: https://github.com
- Crie uma conta gratuita

### 4. Subir o projeto para o GitHub

Abra o CMD na pasta do projeto e execute:

```
cd "C:\Downloads\CLAUDE TESTE\LOTOFACIL"
git init
git add .
git commit -m "Lotofacil - Analise Avancada"
```

Depois crie um repositório no GitHub:
- Vá em https://github.com/new
- Nome: `lotofacil-analise`
- Clique "Create repository"
- Copie os comandos que aparecem e execute no CMD:

```
git remote add origin https://github.com/SEU-USUARIO/lotofacil-analise.git
git branch -M main
git push -u origin main
```

### 5. Conectar na Vercel

- Acesse https://vercel.com/new
- Clique "Import Git Repository"
- Selecione o repositório `lotofacil-analise`
- Configurações:
  - Framework Preset: **Vite**
  - Root Directory: **client**
  - Build Command: `npm run build`
  - Output Directory: `dist`
- Clique "Deploy"

### 6. Pronto!

A Vercel vai gerar um link tipo:
```
https://lotofacil-analise.vercel.app
```

Esse link funciona em qualquer celular, computador, tablet.
Compartilhe com seus clientes!

---

## 📱 Para instalar como app no celular:

1. Abra o link no Chrome do celular
2. Toque nos 3 pontinhos (menu)
3. Toque em "Instalar aplicativo" ou "Adicionar à tela inicial"
4. Pronto! Fica como um app na tela do celular

---

## 🔄 Para atualizar:

Sempre que fizer mudanças no código:
```
cd "C:\Downloads\CLAUDE TESTE\LOTOFACIL"
git add .
git commit -m "Atualização"
git push
```
A Vercel atualiza automaticamente em ~1 minuto.

---

## ⚙️ Domínio personalizado (opcional):

Se quiser um domínio tipo `lotofacil.com.br`:
1. Compre o domínio (Registro.br, GoDaddy, etc.)
2. Na Vercel, vá em Settings > Domains
3. Adicione seu domínio
4. Configure o DNS conforme instruções da Vercel

---

## 🌐 Configurar lotofacil.marcelomartinscorretor.com.br

### Na Vercel:
1. Acesse seu projeto na Vercel
2. Vá em **Settings** > **Domains**
3. Digite: `lotofacil.marcelomartinscorretor.com.br`
4. Clique **Add**

### No painel DNS do seu domínio (Registro.br, Cloudflare, etc.):
Adicione este registro:

```
Tipo:  CNAME
Nome:  lotofacil
Valor: cname.vercel-dns.com
TTL:   3600 (ou automático)
```

### Se usar Registro.br:
1. Acesse https://registro.br
2. Entre na sua conta
3. Clique no domínio `marcelomartinscorretor.com.br`
4. Vá em **DNS** > **Editar zona**
5. Adicione:
   - Tipo: **CNAME**
   - Nome: **lotofacil**
   - Dados: **cname.vercel-dns.com**
6. Salve

### Se usar Cloudflare:
1. Acesse https://dash.cloudflare.com
2. Selecione o domínio
3. Vá em **DNS** > **Records**
4. Clique **Add record**:
   - Type: **CNAME**
   - Name: **lotofacil**
   - Target: **cname.vercel-dns.com**
   - Proxy: **DNS only** (nuvem cinza)
5. Salve

### Aguarde:
- Propagação DNS leva de 5 minutos a 24 horas
- A Vercel gera SSL (HTTPS) automaticamente
- Depois de propagar, acesse: https://lotofacil.marcelomartinscorretor.com.br

---

## 💡 Dicas:

- O plano gratuito da Vercel suporta até 100GB de banda/mês (suficiente para milhares de acessos)
- As funções serverless têm timeout de 30s (suficiente para gerar jogos)
- Os dados são buscados da API da Caixa em tempo real
- O cache mantém os dados por ~5 minutos entre requisições
