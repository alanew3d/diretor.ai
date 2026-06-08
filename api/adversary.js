import { cors, fallbackAdversary, json, runAI } from './_ai.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { decision, diagnosis, provider } = req.body || {};
  const fallback = fallbackAdversary(decision || '');
  const result = await runAI({
    provider,
    system: 'Você é o Modo Adversário do diretor.ai. Ataque decisões empresariais com rigor, sem ser destrutivo.',
    prompt: `Decisão a atacar:\n${decision || ''}\n\nDiagnóstico disponível:\n${JSON.stringify(diagnosis || {}, null, 2)}`,
    schemaHint: 'Retorne somente JSON com: title, risks (array de 7), questions (array de 5), wrong, premises (array), reduceRisk, verdict. O verdict deve ser executar, ajustar ou adiar.',
    fallback,
  });
  return json(res, 200, result);
}
