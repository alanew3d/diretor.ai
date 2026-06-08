const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-latest';
const DEFAULT_OPENAI_MODEL = 'gpt-4.1';

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function json(res, status, body) {
  res.status(status).json(body);
}

export function getProvider(requestedProvider) {
  const provider = (requestedProvider || process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  if (provider === 'openai') return 'openai';
  if (provider === 'fallback') return 'fallback';
  return 'anthropic';
}

export async function runAI({ provider, system, prompt, schemaHint, fallback }) {
  const selected = getProvider(provider);
  if (selected === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    try {
      return await runAnthropic({ system, prompt, schemaHint });
    } catch (error) {
      console.error('Anthropic error:', error.message);
    }
  }
  if (selected === 'openai' && process.env.OPENAI_API_KEY) {
    try {
      return await runOpenAI({ system, prompt, schemaHint });
    } catch (error) {
      console.error('OpenAI error:', error.message);
    }
  }
  return { provider: 'fallback', result: fallback };
}

async function runAnthropic({ system, prompt, schemaHint }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 1400,
      temperature: 0.4,
      system: system || 'Você é um diretor estratégico para empresários. Responda em português brasileiro.',
      messages: [{ role: 'user', content: `${prompt}\n\n${schemaHint || ''}` }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}`);
  const data = await response.json();
  return parseAIText(data.content?.[0]?.text, 'anthropic');
}

async function runOpenAI({ system, prompt, schemaHint }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system || 'Você é um diretor estratégico para empresários. Responda em português brasileiro.' },
        { role: 'user', content: `${prompt}\n\n${schemaHint || ''}` },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
  const data = await response.json();
  return parseAIText(data.choices?.[0]?.message?.content, 'openai');
}

function parseAIText(text = '', provider) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    return { provider, result: JSON.parse(cleaned) };
  } catch {
    return { provider, result: { message: cleaned || 'IA respondeu sem conteúdo.' } };
  }
}

export function fallbackDiagnosis(answers = {}) {
  const problem = answers.problem || 'crescimento';
  const runway = answers.runway || '';
  const fragileCash = problem === 'caixa' || runway.includes('Menos') || runway.includes('1 a 3') || answers.margin === 'Não sei';
  return {
    mainDiagnosis: fragileCash
      ? 'A prioridade estratégica é proteger caixa, margem e foco antes de acelerar.'
      : 'A prioridade estratégica é transformar a decisão adiada em um teste mensurável.',
    summary: `O contexto aponta pressão em ${problem}. A empresa precisa reduzir incerteza e escolher uma ação de alto impacto para os próximos 7 dias.`,
    urgentDecisions: [
      'Definir a decisão que não pode continuar adiada',
      'Escolher uma métrica de sucesso para os próximos 7 dias',
      'Pausar iniciativas que consomem caixa ou foco sem gerar aprendizado',
    ],
    dangerousRisk: fragileCash
      ? 'Crescer sem conhecer margem, runway e limite de perda.'
      : 'Confundir planejamento com progresso e manter a empresa sem direção clara.',
    clearOpportunity: 'Usar o problema atual para simplificar oferta, canal e execução.',
    nextStep: 'Rodar um teste pequeno, com responsável, métrica e data de corte.',
  };
}

export function fallbackAdversary(decision = '') {
  return {
    title: 'Ataque estratégico à decisão',
    risks: [
      'A decisão pode estar baseada em desejo interno, não em evidência externa.',
      'O custo real de execução pode ser maior do que o previsto.',
      'A equipe pode não ter foco suficiente para executar sem dispersão.',
      'O caixa pode piorar antes de qualquer retorno aparecer.',
      'O canal escolhido pode não ser previsível.',
      'A proposta de valor pode não ser forte o suficiente para mudar comportamento.',
      'A decisão pode esconder um problema anterior de posicionamento, margem ou operação.',
    ],
    questions: [
      'Qual premissa, se estiver errada, derruba toda a decisão?',
      'Qual é o limite máximo de perda aceitável?',
      'Qual evidência em 14 dias provaria que vale continuar?',
      'O que será pausado para abrir foco?',
      'Quem será responsável por execução e medição?',
    ],
    wrong: `A decisão "${decision}" pode aumentar complexidade antes de provar retorno, criando custo fixo e distração.`,
    premises: ['Demanda real existe', 'CAC será sustentável', 'Margem suporta o plano', 'Equipe consegue executar'],
    reduceRisk: 'Execute uma versão menor, com limite de investimento, métrica de sucesso e data de corte.',
    verdict: 'AJUSTAR: avance apenas com um teste controlado antes de comprometer caixa relevante.',
  };
}

export function fallbackCouncil(question = '', advisors = []) {
  const selected = advisors.length ? advisors : [{ name: 'Conselho Estratégico' }];
  return {
    responses: selected.map((advisor) => ({
      name: advisor.name,
      response: `Para a decisão "${question.slice(0, 120)}", minha orientação é separar convicção de evidência. Defina uma hipótese, um limite de perda e uma métrica que indique continuar, ajustar ou parar.`,
    })),
    conclusion: 'O conselho recomenda executar uma versão menor e mensurável da decisão, protegendo caixa e foco.',
  };
}

export function fallbackFinal() {
  return {
    recommendation: 'Executar uma versão menor e mensurável da decisão, com limite claro de caixa e data de corte.',
    why: 'Essa é a melhor decisão agora porque reduz incerteza sem paralisar a empresa nem apostar tudo em premissas não provadas.',
    risks: ['Caixa insuficiente', 'Falta de foco', 'Canal sem previsibilidade', 'Métrica errada'],
    next7: ['Definir hipótese central', 'Escolher métrica de sucesso', 'Executar teste com clientes reais'],
    next30: ['Revisar resultados', 'Ajustar oferta', 'Escalar somente o que comprovou retorno'],
    metrics: ['Margem', 'CAC', 'Conversão', 'Runway', 'Receita incremental'],
    avoid: ['Contratar antes de validar', 'Aumentar complexidade', 'Trocar estratégia semanalmente'],
    plan: [
      'Dia 1: escrever decisão, premissas e limite de perda',
      'Dias 2 a 5: testar com clientes reais',
      'Dia 7: decidir continuar, ajustar ou adiar',
      'Dia 30: dobrar aposta apenas se a métrica comprovar',
    ],
  };
}
