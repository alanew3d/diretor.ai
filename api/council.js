import { cors, fallbackCouncil, json, runAI } from './_ai.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { question, advisors, diagnosis, provider } = req.body || {};
  const fallback = fallbackCouncil(question || '', advisors || []);
  const result = await runAI({
    provider,
    system: 'Você é o Conselho Estratégico do diretor.ai. Use as perspectivas escolhidas como inteligências estratégicas, não como curiosidade histórica.',
    prompt: `Pergunta ou decisão:\n${question || ''}\n\nPerspectivas escolhidas:\n${JSON.stringify(advisors || [], null, 2)}\n\nDiagnóstico:\n${JSON.stringify(diagnosis || {}, null, 2)}`,
    schemaHint: 'Retorne somente JSON com: responses (array de objetos {name,response}) e conclusion. Cada resposta deve ser prática, estratégica e curta.',
    fallback,
  });
  return json(res, 200, result);
}
