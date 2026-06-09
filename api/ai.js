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

  if (task === 'game') {
    const { moves, diagnosis } = req.body || {};
    const result = await runAI({
      provider,
      system: 'Você é um estrategista de negócios. Analise movimentos estratégicos e recomende a sequência ideal com base no contexto.',
      prompt: `Movimentos selecionados:\n${JSON.stringify(moves || [], null, 2)}\n\nDiagnóstico:\n${JSON.stringify(diagnosis || {}, null, 2)}`,
      schemaHint: 'Retorne JSON com: analysis (string), sequence (array de strings com os movimentos em ordem recomendada), firstStep (string).',
      fallback: {
        analysis: 'Os movimentos selecionados precisam ser sequenciados por prioridade de caixa e foco estratégico.',
        sequence: ['Primeiro: o movimento de menor custo e maior retorno imediato', 'Segundo: defesa para proteger o que já funciona', 'Terceiro: expansão após validação'],
        firstStep: 'Comece pelo movimento com menor risco e prazo mais curto.',
      },
    });
    return json(res, 200, result);
  }

  if (task === 'agent') {
    const { agentId, agentName, diagnosis, final: finalDecision } = req.body || {};
    const result = await runAI({
      provider,
      system: `Você é o ${agentName} do diretor.ai. Gere orientações práticas, passo a passo, checklist e um texto copiável para ajudar o empresário a executar a decisão.`,
      prompt: `Agente: ${agentName}\nDiagnóstico: ${JSON.stringify(diagnosis || {}, null, 2)}\nDecisão final: ${JSON.stringify(finalDecision || {}, null, 2)}`,
      schemaHint: 'Retorne JSON com: action (string descrevendo a orientação principal), steps (array de strings), checklist (array de strings), copyable (string com texto pronto para usar).',
      fallback: {
        action: `O ${agentName} recomenda: defina uma hipótese clara, escolha a ferramenta mais simples e execute o primeiro passo em até 24 horas.`,
        steps: ['Mapear a situação atual com dados reais', 'Escolher a ação de menor custo e maior impacto', 'Definir responsável e prazo', 'Medir o resultado em 7 dias'],
        checklist: ['Objetivo claro?', 'Responsável definido?', 'Prazo estabelecido?', 'Métrica de sucesso?', 'Primeiro passo concreto?'],
        copyable: `Objetivo: [descrever]\nResponsável: [nome]\nPrazo: [data]\nMétrica de sucesso: [o que provaria que funcionou]\nPrimeiro passo: [ação concreta em até 24h]`,
      },
    });
    return json(res, 200, result);
  }

  if (task === 'research') {
    const { data: researchData } = req.body || {};
    const result = await runAI({
      provider,
      system: 'Você analisa a rotina operacional de empresas e identifica gargalos, oportunidades de automação e agentes recomendados.',
      prompt: `Dados da empresa:\n${JSON.stringify(researchData || {}, null, 2)}`,
      schemaHint: 'Retorne JSON com: summary, bottlenecks (array), automations (array), agents (array), integrations (array).',
      fallback: {
        summary: 'A empresa possui processos manuais que podem ser otimizados com automações simples.',
        bottlenecks: ['Comunicação manual com clientes', 'Relatórios sem fonte de dados integrada'],
        automations: ['Respostas automáticas para perguntas frequentes', 'Relatório semanal automatizado'],
        agents: ['Agente de Atendimento', 'Agente de Rotina'],
        integrations: ['CRM simples', 'Ferramenta de automação de WhatsApp'],
      },
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
