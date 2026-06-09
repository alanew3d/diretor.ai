import { cors, json, runAI } from './_ai.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { materialId, materialName, diagnosis, final, scenario, adversary, provider } = req.body || {};

  const context = {
    diagnosis: diagnosis?.result || diagnosis,
    final,
    scenario: scenario?.result || scenario,
    adversary,
  };

  const fallback = localMaterial(materialId, materialName, context);

  const result = await runAI({
    provider,
    system: `Você é o gerador de materiais estratégicos do diretor.ai. Crie materiais executivos claros, diretos e acionáveis baseados nos dados de diagnóstico e análise fornecidos. Escreva em português brasileiro.`,
    prompt: `Material solicitado: ${materialName} (ID: ${materialId})\n\nContexto:\n${JSON.stringify(context, null, 2)}`,
    schemaHint: `Retorne somente JSON com: content (string com o material completo formatado, usando quebras de linha para organização).`,
    fallback,
  });

  return json(res, 200, result);
}

function localMaterial(id, name, ctx) {
  const diag = ctx.diagnosis || {};
  const fin = ctx.final || {};
  const now = new Date().toLocaleDateString('pt-BR');

  const templates = {
    executive: `RESUMO EXECUTIVO — diretor.ai
Data: ${now}
==============================

SITUAÇÃO ATUAL:
${diag.mainDiagnosis || '[preencha o diagnóstico]'}

${diag.summary || ''}

DECISÃO CRÍTICA:
${diag.urgentDecisions?.[0] || '[identificar no diagnóstico]'}

RISCO PRINCIPAL:
${diag.dangerousRisk || '[identificar no diagnóstico]'}

OPORTUNIDADE PRINCIPAL:
${diag.clearOpportunity || '[identificar no diagnóstico]'}

PRÓXIMO PASSO:
${diag.nextStep || fin.recommendation || '[gerar decisão final]'}

---
Gerado por diretor.ai — https://diretor.ai
Este documento é estratégico e estimativo. Valide decisões financeiras, fiscais e jurídicas com profissionais responsáveis.`,

    action_plan: `PLANO DE AÇÃO — diretor.ai
Data: ${now}
============================

DECISÃO:
${diag.urgentDecisions?.[0] || '[preencha o diagnóstico]'}

PLANO — 7 DIAS:
${(fin.next7 || ['1. Definir hipótese central', '2. Escolher métrica de sucesso', '3. Executar primeiro teste']).map((s, i) => `${i + 1}. ${s}`).join('\n')}

PLANO — 30 DIAS:
${(fin.next30 || ['1. Revisar resultados da semana 1', '2. Ajustar oferta', '3. Escalar o que funcionou']).map((s, i) => `${i + 1}. ${s}`).join('\n')}

MÉTRICAS A ACOMPANHAR:
${(fin.metrics || ['Margem', 'CAC', 'Conversão', 'Runway de caixa']).map(m => `- ${m}`).join('\n')}

O QUE NÃO FAZER:
${(fin.avoid || ['Contratar antes de validar', 'Aumentar complexidade prematuramente']).map(a => `- ${a}`).join('\n')}

---
Gerado por diretor.ai — https://diretor.ai`,

    swot: `MATRIZ SWOT — diretor.ai
Data: ${now}
========================

FORÇAS (Strengths):
- [listar pontos fortes internos]
- [o que a empresa faz bem]

FRAQUEZAS (Weaknesses):
- [listar pontos fracos internos]
- ${diag.dangerousRisk ? 'Risco identificado: ' + diag.dangerousRisk : '[áreas de melhoria]'}

OPORTUNIDADES (Opportunities):
- ${diag.clearOpportunity || '[oportunidades do mercado]'}
- [outros fatores externos favoráveis]

AMEAÇAS (Threats):
- [concorrência e fatores externos desfavoráveis]
- [riscos do mercado e contexto]

---
Gerado por diretor.ai — https://diretor.ai`,

    checklist: `CHECKLIST OPERACIONAL — diretor.ai
Data: ${now}
====================================

PREPARAÇÃO:
[ ] Decisão documentada e comunicada à equipe
[ ] Responsável definido para cada ação
[ ] Prazos estabelecidos

EXECUÇÃO:
[ ] Hipótese central definida por escrito
[ ] Métrica de sucesso clara e mensurável
[ ] Recursos necessários identificados
[ ] Riscos principais mapeados
[ ] Primeiro passo concreto executado

MONITORAMENTO:
[ ] Data de revisão semanal agendada
[ ] Dashboard ou planilha de métricas atualizado
[ ] Critério de parada definido (se não funcionar em X dias, ajustar)

---
Gerado por diretor.ai — https://diretor.ai`,
  };

  const content = templates[id] || `${name}\n${'='.repeat(name.length)}\n\n${diag.mainDiagnosis || 'Preencha o diagnóstico primeiro para um material personalizado.'}\n\n---\nGerado por diretor.ai — https://diretor.ai`;
  return { content };
}
