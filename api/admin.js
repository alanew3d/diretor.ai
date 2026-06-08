// api/admin.js — Painel admin: gerenciar usuários, ver uso, ativar planos
import { getSupabase, getUserFromToken, cors } from './_supabase.js';

const PLAN_LIMITS = {
  free: 3, iniciado: 5, diretor: 999, grande_mestre: 9999
};

async function isAdmin(token) {
  if (!token) return false;
  const user = await getUserFromToken(token);
  if (!user) return false;
  if (user.email === process.env.ADMIN_EMAIL) return true;
  const supabase = getSupabase();
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin';
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!await isAdmin(token)) return res.status(403).json({ error: 'Acesso restrito ao admin' });

  const supabase = getSupabase();
  const { action } = req.query;

  // GET /api/admin?action=users
  if (req.method === 'GET' && action === 'users') {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, plan, decisions_used, decisions_limit, role, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ users: data });
  }

  // GET /api/admin?action=stats
  if (req.method === 'GET' && action === 'stats') {
    const [usersRes, decisionsRes] = await Promise.all([
      supabase.from('profiles').select('plan'),
      supabase.from('decisions').select('id', { count: 'exact' }),
    ]);
    const plans = { free: 0, iniciado: 0, diretor: 0, grande_mestre: 0 };
    (usersRes.data || []).forEach(u => { plans[u.plan] = (plans[u.plan] || 0) + 1; });
    const mrr = (plans.iniciado * 97) + (plans.diretor * 197) + (plans.grande_mestre * 497);
    return res.status(200).json({
      total_users: (usersRes.data || []).length,
      total_decisions: decisionsRes.count || 0,
      plans,
      mrr_estimate: mrr,
    });
  }

  // POST /api/admin?action=set_plan
  if (req.method === 'POST' && action === 'set_plan') {
    const { user_id, user_email, plan } = req.body;
    if (!plan) return res.status(400).json({ error: 'plan obrigatório' });
    const limit = PLAN_LIMITS[plan] || 3;
    let query = supabase.from('profiles').update({
      plan, decisions_limit: limit, decisions_used: 0
    });
    if (user_id) query = query.eq('id', user_id);
    else if (user_email) query = query.eq('email', user_email);
    else return res.status(400).json({ error: 'user_id ou user_email obrigatório' });
    const { error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, message: `Plano ${plan} ativado` });
  }

  // POST /api/admin?action=reset_usage
  if (req.method === 'POST' && action === 'reset_usage') {
    const { user_id } = req.body;
    const { error } = await supabase.from('profiles').update({
      decisions_used: 0, decisions_month: new Date().getMonth()
    }).eq('id', user_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // POST /api/admin?action=set_admin
  if (req.method === 'POST' && action === 'set_admin') {
    const { user_id } = req.body;
    const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', user_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  // DELETE /api/admin?action=delete_user
  if (req.method === 'DELETE' && action === 'delete_user') {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });
    await supabase.from('decisions').delete().eq('user_id', user_id);
    await supabase.from('profiles').delete().eq('id', user_id);
    const { error } = await supabase.auth.admin.deleteUser(user_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: `Ação inválida: ${action}` });
}
