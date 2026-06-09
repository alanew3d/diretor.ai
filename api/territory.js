import { cors, json, runAI } from './_ai.js';

/**
 * Território API — Análise de Cobertura e Oportunidades
 *
 * Arquitetura preparada para integrações futuras:
 *   Google Maps JavaScript API    → GOOGLE_MAPS_API_KEY
 *   Google Places API             → GOOGLE_PLACES_API_KEY
 *   Google Geocoding API          → GOOGLE_GEOCODING_API_KEY
 *   Google Distance Matrix / Routes API → GOOGLE_ROUTES_API_KEY
 *   Mapbox                        → MAPBOX_TOKEN
 *   OpenStreetMap / Nominatim     → sem chave (respeitar rate limits)
 *
 * No MVP: análise estratégica via IA com dados inseridos manualmente.
 * Nunca expor chaves de mapa no frontend — todas as chamadas passam aqui.
 */

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { data, provider } = req.body || {};
  const fallback = fallbackTerritory(data || {});

  const competitorSummary =
    data?.competitorData?.length
      ? `Concorrentes cadastrados:\n${data.competitorData.map((c, i) => `  ${i + 1}. ${c.name} — região: ${c.region || 'N/I'} — fraqueza: ${c.weakness || 'N/I'} — força: ${c.strength || 'N/I'}`).join('\n')}`
      : 'Nenhum concorrente cadastrado manualmente.';

  const opportunitySummary =
    data?.opportunityData?.length
      ? `Oportunidades cadastradas:\n${data.opportunityData.map((o, i) => `  ${i + 1}. ${o.name} — tipo: ${o.type || 'N/I'} — potencial: ${o.potential || 'N/I'}`).join('\n')}`
      : 'Nenhuma oportunidade cadastrada manualmente.';

  const markerSummary =
    data?.markers?.length
      ? `Marcadores no mapa: ${data.markers.map(m => `${m.label} (${m.type})`).join(', ')}`
      : 'Sem marcadores no mapa.';

  const result = await runAI({
    provider,
    system: `Você é o módulo de Análise Territorial do diretor.ai. Gere um Relatório de Cobertura e Oportunidades detalhado, prático e orientado a ação para o empresário. Use linguagem direta, sem jargão excessivo. Responda em português brasileiro.`,
    prompt: `Dados territoriais:
Endereço/base: ${data?.address || 'não informado'}
Cidade/região: ${data?.city || 'não informado'}
Tipo de negócio: ${data?.business || 'não informado'}
Tipo de operação: ${data?.operationType || 'não informado'}
Raio de atendimento: ${data?.radiusKm || 10} km
Tempo máximo de deslocamento: ${data?.travelTime || 30} min
Concorrentes (percepção): ${data?.competitors || 'não informado'}
Clientes/região estimados: ${data?.customers || 'não informado'}
Observações: ${data?.notes || 'nenhuma'}

${competitorSummary}

${opportunitySummary}

${markerSummary}`,
    schemaHint: `Retorne SOMENTE JSON com exatamente estas chaves:
{
  "summary": "string — resumo geral da área analisada (2-3 frases)",
  "coverage": "string — análise do raio de cobertura e o que ele significa para este tipo de operação",
  "strongRegions": ["array de strings — regiões ou características mais fortes"],
  "weakRegions": ["array de strings — regiões ou características mais fracas"],
  "competition": "string — análise da concorrência com base nos dados fornecidos",
  "marketGaps": ["array de strings — falhas e lacunas do mercado local"],
  "logisticsOpp": ["array de strings — oportunidades logísticas identificadas"],
  "expansionRec": "string — recomendação específica de expansão territorial",
  "commercialRec": "string — recomendação comercial para a região",
  "mediaRec": "string — recomendação de mídia e comunicação local",
  "risks": ["array de strings — riscos identificados no território"],
  "nextData": ["array de strings — próximos dados necessários para análise mais precisa"]
}`,
    fallback,
  });

  return json(res, 200, result);
}

const OP_LABELS = {
  loja: 'loja física',
  delivery: 'delivery',
  servico: 'serviço local',
  clinica: 'clínica / consultório',
  logistica: 'logística',
  distribuicao: 'distribuição',
  b2b: 'atendimento B2B',
  expansao: 'expansão territorial',
};

function fallbackTerritory(data) {
  const biz = data.business || 'seu negócio';
  const city = data.city || 'sua região';
  const radius = data.radiusKm || 10;
  const opType = OP_LABELS[data.operationType] || data.operationType || 'operação';
  const hasComp = data.competitorData?.length > 0;

  return {
    summary: `Análise territorial de ${biz} em ${city} — raio de ${radius} km (${opType}).`,
    coverage: `O raio de ${radius} km define a área primária de captação para ${opType}. Para operações presenciais, clientes tendem a vir de 60-70% dessa área. Para delivery e logística, o raio pode ser estendido com custo operacional maior.`,
    strongRegions: [
      'Região imediatamente adjacente à base — maior familiaridade e menor custo de aquisição',
      'Bairros com clientes existentes — base de indicação natural',
      'Áreas com menor saturação de concorrentes diretos',
    ],
    weakRegions: [
      'Regiões periféricas ao raio definido — alto custo de aquisição e entrega',
      'Áreas com concorrentes consolidados e fidelidade alta',
      'Zonas com baixo fluxo de público-alvo ou acesso logístico difícil',
    ],
    competition: hasComp
      ? `Foram cadastrados ${data.competitorData.length} concorrente(s). As fraquezas identificadas são os principais pontos de entrada para capturar clientes insatisfeitos. Priorize abordar públicos que reclamam do que o concorrente não entrega.`
      : 'Sem dados de concorrência cadastrados. Mapear 3 concorrentes diretos com preço, diferencial e fraqueza é a próxima ação mais importante para qualificar a análise.',
    marketGaps: [
      'Regiões com demanda identificada sem oferta adequada ou com qualidade inferior',
      'Faixas de preço ou serviço não cobertas pelos concorrentes atuais',
      'Segmentos de cliente ignorados pela concorrência (ex: atendimento premium, delivery noturno, serviço B2B)',
    ],
    logisticsOpp: [
      'Concentração de clientes em 2-3 bairros próximos — otimiza rota e custo',
      'Parcerias com negócios complementares reduzem custo de aquisição',
      `Ponto de apoio estratégico na região de maior demanda pode ampliar o alcance sem aumentar custo fixo`,
    ],
    expansionRec: `Para ${opType} em ${city}, a expansão mais segura é a contígua: ampliar o raio em 2-5 km por vez, validando demanda antes de comprometer estrutura. Teste com uma oferta específica para a nova região antes de abrir ponto ou contratar equipe.`,
    commercialRec: `Priorize canais locais com menor custo: indicação de clientes existentes, Google Meu Negócio otimizado com fotos e respostas a avaliações, e parcerias com negócios complementares. O custo de aquisição por indicação é 3-5x menor que mídia paga.`,
    mediaRec: `Mídia local recomendada: Google Ads com segmentação geográfica de ${radius} km, Instagram com geolocalização de posts, grupos locais de WhatsApp ou Facebook, e OOH (panfletos, parcerias) em pontos de alto fluxo. Invista em reviews no Google Maps — impacto direto em buscas locais.`,
    risks: [
      'Saturação da área central se a concorrência se intensificar',
      'Dependência de um único bairro ou canal de captação',
      'Expansão prematura antes de validar demanda na nova região',
      'Custo logístico crescente se o raio for ampliado sem planejamento de rota',
    ],
    nextData: [
      'Pesquisa de origem de clientes atuais por bairro (pergunta simples no atendimento)',
      'Dados do Google Meu Negócio: de onde vêm as buscas por região',
      'Endereços dos últimos 50 clientes para mapear concentração real',
      'Volume de buscas locais por palavra-chave via Google Keyword Planner',
      'Lista de concorrentes com avaliação e número de reviews no Google Maps',
      'Integração futura: Google Places API para mapeamento automático de concorrentes',
    ],
  };
}
