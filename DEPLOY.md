# diretor.ai — Deploy Completo
# Deploy via GitHub + Vercel

## Tempo total: ~90 minutos

---

## PRÉ-REQUISITOS (contas já criadas = 0 min)
- GitHub: já tem ✓
- Vercel: já tem ✓
- Criar agora (grátis):
  - supabase.com
  - resend.com
  - console.anthropic.com (se não tiver)

---

## PASSO 1 — Supabase (15 min)

1. app.supabase.com → New Project
   - Name: diretor-ai
   - Region: South America (São Paulo)
   - Database Password: gerar e salvar

2. SQL Editor → New Query → colar TODO o conteúdo de `supabase_setup.sql` → Run
   Deve mostrar "Success" sem erros

3. Settings → API → anotar:
   - Project URL  →  SUPABASE_URL
   - anon public key  →  SUPABASE_ANON_KEY (vai no HTML)
   - service_role key  →  SUPABASE_SERVICE_KEY (vai no Vercel, nunca no HTML)

4. Authentication → Settings:
   - Site URL: https://diretor.ai
   - Redirect URLs: https://diretor.ai, https://diretor.ai/*

---

## PASSO 2 — Editar index.html (2 min)

Abrir index.html, encontrar as linhas:

  const SUPABASE_URL = 'https://SEUPROJETO.supabase.co';   ← substituir
  const SUPABASE_ANON_KEY = 'SUAANON_KEY_AQUI';             ← substituir

Colar os valores do Passo 1 item 3.

---

## PASSO 3 — GitHub (5 min)

Opção A — Interface web (mais fácil):
1. github.com → New repository → diretor-ai → Private → Create
2. Upload files → arrastar toda a pasta diretor-ai/
3. Commit changes

Opção B — Terminal:
  cd diretor-ai/
  git init && git add .
  git commit -m "diretor.ai v1.0"
  git branch -M main
  git remote add origin https://github.com/SEUUSUARIO/diretor-ai.git
  git push -u origin main

---

## PASSO 4 — Vercel (10 min)

1. vercel.com → New Project → Import Git Repository → diretor-ai
2. Framework Preset: Other
3. Root Directory: ./  (deixar padrão)
4. Build & Output Settings: deixar tudo em branco
5. Environment Variables — adicionar uma a uma:

   ANTHROPIC_API_KEY         = coloque_sua_chave_anthropic_aqui
   OPENAI_API_KEY            = coloque_sua_chave_openai_aqui
   AI_PROVIDER               = anthropic
   ANTHROPIC_MODEL           = claude-3-5-sonnet-latest
   OPENAI_MODEL              = gpt-4.1
   STRIPE_SECRET_KEY         = coloque_sua_chave_stripe_aqui
   STRIPE_WEBHOOK_SECRET     = coloque_seu_webhook_secret_aqui
   MERCADOPAGO_ACCESS_TOKEN  = coloque_seu_token_mercadopago_aqui
   ADMIN_PASSWORD            = troque_esta_senha

6. Deploy → aguardar ~2 min

7. Settings → Domains → Add → diretor.ai
   Seguir instruções de DNS no seu registrador

---

## PASSO 5 — Ativar sua conta como admin (2 min)

1. Acessar diretor.ai → Criar conta com seu email
2. Supabase → Table Editor → profiles → encontrar sua linha
3. Editar coluna `role` → digitar `admin` → Save
4. Agora você acessa o Admin com sua conta normal

---

## PASSO 6 — Stripe (15 min)

1. dashboard.stripe.com → Products → Add Product
   Criar 3 produtos com preço recorrente mensal:
   - Iniciado: BRL 97,00/mês
   - Diretor: BRL 197,00/mês
   - Grande Mestre: BRL 497,00/mês

2. Para cada produto → Payment Links → Create link
   Em cada link: Metadata → Add metadata:
   Key: plan_id  |  Value: iniciado (ou diretor ou grande_mestre)

3. Copiar os 3 links → Admin do site → Pagamentos → colar

4. Developers → Webhooks → Add endpoint:
   URL: https://diretor.ai/api/payment
   Eventos: checkout.session.completed
   → Copiar Signing secret → Vercel → STRIPE_WEBHOOK_SECRET → Redeploy

---

## PASSO 7 — Mercado Pago (10 min)

1. mercadopago.com.br/developers → Suas integrações → Criar aplicação
2. Credenciais de produção → Access Token → copiar → Vercel MP_ACCESS_TOKEN
3. Cobranças → Links de pagamento → criar 3 links (R$97, R$197, R$497)
   Em cada link, no campo descrição colocar o plan_id: iniciado/diretor/grande_mestre
4. Copiar links → Admin → Pagamentos → salvar
5. IPN/Webhooks: https://diretor.ai/api/payment?provider=mp

---

## PASSO 8 — Email Resend (5 min)

1. resend.com → API Keys → Create API Key → copiar → Vercel RESEND_API_KEY
2. Domains → Add Domain → diretor.ai
3. Seguir instruções DNS (adicionar TXT e MX records)
4. Após verificar, emails serão enviados de: ola@diretor.ai

---

## FLUXO AUTOMÁTICO APÓS DEPLOY

  Usuário se registra no site
         ↓
  Perfil criado no Supabase (trigger automático)
         ↓
  Usuário clica "Assinar Diretor" → Stripe Payment Link
         ↓
  Pagamento aprovado → Stripe webhook → /api/payment
         ↓
  Supabase: plan=diretor, decisions_limit=999
         ↓
  Resend envia email de boas-vindas
         ↓
  Usuário faz login → Claude API via /api/claude (chave segura)
         ↓
  Limite verificado no servidor → impossível burlar

---

## ATIVAÇÃO MANUAL (pós-comprovante WhatsApp)

No Admin do site:
  Admin → Usuários → encontrar email → dropdown Plano → selecionar → salva no Supabase

Ou via API (para automatizar):
  POST https://diretor.ai/api/admin?action=set_plan
  Headers: Authorization: Bearer SEU_TOKEN_ADMIN
  Body: { "user_email": "cliente@email.com", "plan": "diretor" }

---

## DESENVOLVIMENTO LOCAL (opcional)

  npm install -g vercel
  cp .env.example .env.local
  # preencher .env.local com as chaves
  vercel dev
  # site em http://localhost:3000

---

## ESTRUTURA DO PROJETO

  diretor-ai/
  ├── index.html              ← site completo (208KB)
  ├── api/
  │   ├── _supabase.js        ← helper compartilhado
  │   ├── claude.js           ← proxy Claude (chave no servidor)
  │   ├── auth.js             ← perfil do usuário logado
  │   ├── payment.js          ← webhooks Stripe + MP + ativação manual
  │   └── admin.js            ← API do painel admin
  ├── supabase_setup.sql      ← executar no Supabase SQL Editor
  ├── vercel.json             ← config do Vercel
  ├── package.json            ← dependências npm
  ├── .env.example            ← template de variáveis
  └── DEPLOY.md               ← este arquivo

