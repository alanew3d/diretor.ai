// api/claude.js — Proxy seguro para Claude API
// A chave ANTHROPIC_API_KEY fica APENAS no servidor Vercel
// O browser nunca tem acesso a ela

import Anthropic from '@anthropic-ai/sdk';
import { getSupabase, getUserFromToken, cors } from './_supabase.js';

const PLAN_LIMITS = {
  free:          { decisions: 3,    mentors: 3 },
  iniciado:      { decisions: 5,    mentors: 3 },
  diretor:       { decisions: 999,  mentors: 5 },
  grande_mestre: { decisions: 9999, mentors: 8 },
};

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // — Auth —
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Login necessário' });

  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });

  // — Perfil e limites —
  const supabase = getSupabase();
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('plan, decisions_used, decisions_month')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    return res.status(404).json({ error: 'Perfil não encontrado' });
  }

  const planLimits = PLAN_LIMITS[profile.plan] || PLAN_LIMITS.free;

  // — Reset mensal automático —
  const currentMonth = new Date().getMonth();
  if (profile.decisions_month !== currentMonth) {
    await supabase.from('profiles').update({
      decisions_used: 0,
      decisions_month: currentMonth,
    }).eq('id', user.id);
    profile.decisions_used = 0;
  }

  // — Verificar limite —
  if (profile.decisions_used >= planLimits.decisions) {
    return res.status(402).json({
      error: `Limite de ${planLimits.decisions} decisões/mês atingido.`,
      upgrade: true,
      plan: profile.plan,
    });
  }

  // — Chamar Claude API —
  const { system, message, model } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem obrigatória' });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 700,
      system: system || 'Você é um mentor estratégico. Responda em português brasileiro.',
      messages: [{ role: 'user', content: message }],
    });

    // — Incrementar uso —
    await supabase.from('profiles').update({
      decisions_used: profile.decisions_used + 1,
    }).eq('id', user.id);

    // — Salvar no histórico —
    const { mentor, question, area } = req.body;
    if (question) {
      await supabase.from('decisions').insert({
        user_id: user.id,
        question: question.substring(0, 500),
        mentor_name: mentor || '',
        area: area || '',
        response: response.content[0].text.substring(0, 1000),
      });
    }

    return res.status(200).json({
      content: response.content[0].text,
      usage: {
        used: profile.decisions_used + 1,
        limit: planLimits.decisions,
      },
    });

  } catch (err) {
    console.error('Claude API error:', err);
    if (err.status === 401) return res.status(500).json({ error: 'Chave Claude inválida. Contate o suporte.' });
    return res.status(500).json({ error: 'Erro ao processar com IA. Tente novamente.' });
  }
}
