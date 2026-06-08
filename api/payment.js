// api/payment.js — Webhook Stripe + Mercado Pago
// Ao receber pagamento confirmado → libera plano automaticamente + envia email

import { getSupabase } from './_supabase.js';

const PLAN_CONFIG = {
  iniciado:      { decisions_limit: 5,    decisions_used: 0, name: 'Iniciado' },
  diretor:       { decisions_limit: 999,  decisions_used: 0, name: 'Diretor' },
  grande_mestre: { decisions_limit: 9999, decisions_used: 0, name: 'Grande Mestre' },
};

async function sendWelcomeEmail(email, planName) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'diretor.ai <ola@diretor.ai>',
      to: email,
      subject: `✓ Plano ${planName} ativado — diretor.ai`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
          <h2 style="color:#C8A84B;font-size:24px;margin-bottom:8px">diretor.ai</h2>
          <p style="color:#666;font-size:14px;margin-bottom:24px">Sistema de Decisão Estratégica</p>
          <h1 style="font-size:20px;color:#111">Plano ${planName} ativado! ✓</h1>
          <p style="color:#444;line-height:1.7">Seu acesso está liberado. Tome decisões melhores com perspectivas históricas, empresariais e criativas aplicadas ao seu desafio.</p>
          <a href="https://diretor.ai" style="display:inline-block;background:#C8A84B;color:#000;font-weight:700;padding:14px 28px;border-radius:8px;text-decoration:none;margin:20px 0">Acessar diretor.ai →</a>
          <p style="color:#999;font-size:12px;margin-top:24px">Precisa de ajuda? Responda este email ou fale pelo WhatsApp.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error('Email error:', e.message);
  }
}

async function activatePlan(email, planId) {
  const supabase = getSupabase();
  const config = PLAN_CONFIG[planId] || PLAN_CONFIG.iniciado;
  const { error } = await supabase
    .from('profiles')
    .update({
      plan: planId,
      decisions_limit: config.decisions_limit,
      decisions_used: 0,
      decisions_month: new Date().getMonth(),
    })
    .eq('email', email);
  if (error) console.error('Supabase update error:', error);
  return config;
}

// ─── STRIPE WEBHOOK ───
async function handleStripe(req, res) {
  let event;
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    return res.status(400).json({ error: 'Webhook inválido: ' + err.message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email || session.customer_details?.email;
    const planId = session.metadata?.plan_id || 'iniciado';
    if (email) {
      const config = await activatePlan(email, planId);
      await sendWelcomeEmail(email, config.name);
      console.log(`✓ Plano ${planId} ativado para ${email}`);
    }
  }
  return res.status(200).json({ received: true });
}

// ─── MERCADO PAGO WEBHOOK ───
async function handleMercadoPago(req, res) {
  const { type, data } = req.body;
  if (type !== 'payment') return res.status(200).json({ ok: true });
  try {
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.id}`,
      { headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }
    );
    const payment = await mpRes.json();
    if (payment.status === 'approved') {
      const email = payment.payer?.email;
      const planId = payment.metadata?.plan_id || payment.description?.toLowerCase().replace(' ', '_') || 'iniciado';
      if (email) {
        const config = await activatePlan(email, planId);
        await sendWelcomeEmail(email, config.name);
        console.log(`✓ MP: Plano ${planId} ativado para ${email}`);
      }
    }
  } catch (e) {
    console.error('MP error:', e.message);
  }
  return res.status(200).json({ ok: true });
}

// ─── ATIVAÇÃO MANUAL (pelo admin) ───
async function handleManual(req, res) {
  // Verificar token admin
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Não autorizado' });
  const { getSupabase: sb, getUserFromToken } = await import('./_supabase.js');
  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Token inválido' });
  // Verificar se é admin (email configurado ou role)
  const supabase = sb();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

  const { email, plan_id } = req.body;
  if (!email || !plan_id) return res.status(400).json({ error: 'email e plan_id obrigatórios' });
  const config = await activatePlan(email, plan_id);
  await sendWelcomeEmail(email, config.name);
  return res.status(200).json({ ok: true, message: `Plano ${config.name} ativado para ${email}` });
}

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://diretor.ai');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { provider } = req.query;

  if (req.method === 'POST' && provider === 'mp') return handleMercadoPago(req, res);
  if (req.method === 'POST' && provider === 'manual') return handleManual(req, res);
  if (req.method === 'POST') return handleStripe(req, res);

  return res.status(405).json({ error: 'Method not allowed' });
}

export const config = { api: { bodyParser: false } }; // Stripe needs raw body
