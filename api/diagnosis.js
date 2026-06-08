import { cors, fallbackDiagnosis, json, runAI } from './_ai.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { answers, provider } = req.body || {};
  const fallback = fallbackDiagnosis(answers || {});
  const result = await runAI({
    provider,
    system: 'Você é o diretor.ai, um sistema de decisão estratégica para empresários. Seja prático, direto e orientado a ação.',
    prompt: `Gere um diagnóstico estratégico com base nas respostas:\n${JSON.stringify(answers || {}, null, 2)}`,
    schemaHint: 'Retorne somente JSON com: mainDiagnosis, summary, urgentDecisions (array de 3), dangerousRisk, clearOpportunity, nextStep.',
    fallback,
  });
  return json(res, 200, result);
}
