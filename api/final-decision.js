import { cors, fallbackFinal, json, runAI } from './_ai.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { diagnosis, scenario, adversary, council, provider } = req.body || {};
  const result = await runAI({
    provider,
    system: 'Você é o diretor.ai na etapa Decisão Final. Cruze diagnóstico, cenários, crítica adversarial e conselho para recomendar uma decisão acionável.',
    prompt: `Dados para cruzamento:\nDiagnóstico:\n${JSON.stringify(diagnosis || {}, null, 2)}\n\nCenários:\n${JSON.stringify(scenario || {}, null, 2)}\n\nAdversário:\n${JSON.stringify(adversary || {}, null, 2)}\n\nConselho:\n${JSON.stringify(council || {}, null, 2)}`,
    schemaHint: 'Retorne somente JSON com: recommendation, why, risks (array), next7 (array), next30 (array), metrics (array), avoid (array), plan (array).',
    fallback: fallbackFinal(),
  });
  return json(res, 200, result);
}
