import { cors, json, runAI } from './_ai.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { data, provider } = req.body || {};
  const fallback = fallbackTerritory(data || {});
  const result = await runAI({
    provider,
    system: 'Você é o módulo de Mapa Estratégico do diretor.ai. Analise o território de atuação de uma empresa e identifique oportunidades, ameaças, pontos fortes e ações concretas para os próximos 7 e 30 dias.',
    prompt: `Dados territoriais:\n${JSON.stringify(data || {}, null, 2)}`,
    schemaHint: 'Retorne somente JSON com: summary, strengths (array), weaknesses (array), opportunities (array), threats (array), priorityRegions (array), action7, action30, monitor (array).',
    fallback,
  });
  return json(res, 200, result);
}

function fallbackTerritory(data) {
  return {
    summary: `Análise territorial para ${data.business || 'seu negócio'} em ${data.city || 'sua região'}.`,
    strengths: [
      'Localização e presença estabelecida',
      'Base de clientes com relacionamento existente',
    ],
    weaknesses: [
      'Cobertura limitada em algumas sub-regiões',
      'Necessidade de dados mais precisos sobre concorrência',
    ],
    opportunities: [
      'Regiões com baixa cobertura da concorrência direta',
      'Demanda não atendida em segmentos específicos',
      'Parcerias com negócios complementares locais',
    ],
    threats: [
      'Concorrentes com maior estrutura ou histórico',
      'Sazonalidade e variações de fluxo na região',
    ],
    priorityRegions: [
      'Áreas com maior concentração de público-alvo',
      'Regiões com menor presença da concorrência',
    ],
    action7: 'Mapear os 3 principais concorrentes: preço, diferencial e fraqueza mais evidente.',
    action30: 'Escolher uma região descoberta e lançar oferta piloto com prazo e meta definidos.',
    monitor: ['Movimentação de concorrentes', 'Volume de buscas locais', 'Feedbacks de clientes sobre localização'],
  };
}
