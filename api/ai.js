import { cors, fallbackFinal, json, runAI } from './_ai.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { task, message, data, provider } = req.body || {};

  if (task === 'test') {
    const result = await runAI({
      provider,
      system: 'Você testa a conexão de IA do diretor.ai.',
      prompt: message || 'Responda com uma frase curta confirmando conexão.',
      schemaHint: 'Retorne JSON: {"message":"texto curto","providerStatus":"ok"}.',
      fallback: { message: 'Fallback local funcionando.', providerStatus: 'fallback' },
    });
    return json(res, 200, result);
  }

  if (task === 'scenario') {
    const result = await runAI({
      provider,
      system: 'Você é um diretor financeiro e estratégico. Compare cenários de crescimento com linguagem objetiva.',
      prompt: `Compare este cenário de negócio:\n${JSON.stringify(data || {}, null, 2)}`,
      schemaHint: 'Retorne JSON com: potencial, risco, velocidade, necessidadeCaixa, complexidade, recommendation.',
      fallback: fallbackScenario(data || {}),
    });
    return json(res, 200, result);
  }

  const result = await runAI({
    provider,
    system: 'Você é um diretor estratégico para empresários.',
    prompt: message || JSON.stringify(req.body || {}),
    schemaHint: 'Retorne JSON quando possível.',
    fallback: fallbackFinal(),
  });
  return json(res, 200, result);
}

function fallbackScenario(data) {
  if (data.scenario === 'a') {
    return {
      potencial: 'Alto',
      risco: 'Alto',
      velocidade: 'Alta',
      necessidadeCaixa: 'Alta',
      complexidade: 'Média/Alta',
      recommendation: 'Crescer com investimento só faz sentido se CAC, margem e payback já estiverem provados.',
    };
  }
  if (data.scenario === 'b') {
    return {
      potencial: 'Médio',
      risco: 'Baixo/Médio',
      velocidade: 'Baixa',
      necessidadeCaixa: 'Baixa',
      complexidade: 'Média',
      recommendation: 'Crescimento orgânico é mais seguro para caixa, mas exige consistência semanal e métrica de canal.',
    };
  }
  return {
    potencial: 'Médio',
    risco: 'Baixo',
    velocidade: 'Média',
    necessidadeCaixa: 'Reduzida',
    complexidade: 'Alta no curto prazo',
    recommendation: 'Cortar custos antes de crescer é recomendado quando runway está curto ou margem não está clara.',
  };
}
