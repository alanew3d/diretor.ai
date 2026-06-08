// api/auth.js — Dados do usuário logado
import { getSupabase, getUserFromToken, cors } from './_supabase.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Não autorizado' });

  const user = await getUserFromToken(token);
  if (!user) return res.status(401).json({ error: 'Token inválido' });

  const supabase = getSupabase();

  // GET — buscar perfil completo
  if (req.method === 'GET') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: decisions } = await supabase
      .from('decisions')
      .select('question, mentor_name, area, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return res.status(200).json({ user, profile, decisions: decisions || [] });
  }

  // PATCH — atualizar perfil (nome, empresa)
  if (req.method === 'PATCH') {
    const { name, company } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (company) updates.company = company;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ profile: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
