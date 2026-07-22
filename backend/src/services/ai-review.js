const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze a business and generate a comprehensive review report.
 * Uses GPT-4o to evaluate the business as a potential client for landing page services.
 */
async function analyzeBusiness(business, instagramData, retries = 3) {
    const prompt = buildPrompt(business, instagramData);

    for (let i = 0; i < retries; i++) {
        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Você é um analista de prospecção comercial especializado em identificar negócios locais que se beneficiariam de uma presença digital profissional (landing page / site). 
                        
Avalie o potencial do negócio com base nos dados fornecidos e gere um relatório detalhado em JSON.

Responda APENAS em JSON válido, sem markdown.`,
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
            });

            const analysis = JSON.parse(response.choices[0].message.content);

            return {
                suitabilityScore: Math.min(10, Math.max(1, analysis.suitabilityScore || 5)),
                summary: analysis.summary || '',
                approachSuggestion: analysis.approachSuggestion || '',
                fullAnalysis: analysis,
            };

        } catch (error) {
            console.error(`[AI Review] Attempt ${i + 1} failed:`, error.message);
            
            if (error.status === 429 || i === retries - 1) {
                throw new Error(`AI analysis failed (Status ${error.status || 'unknown'}): ${error.message}`);
            }
            
            const delay = Math.pow(2, i) * 1000;
            console.log(`[AI Review] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Build the prompt for GPT-4o based on available business data.
 */
function buildPrompt(business, instagramData) {
    let prompt = `Analise o seguinte negócio como potencial cliente para serviços de criação de landing page/site:\n\n`;

    prompt += `## Dados do Google\n`;
    prompt += `- Nome: ${business.name}\n`;
    prompt += `- Endereço: ${business.address || 'N/A'}\n`;
    prompt += `- Telefone: ${business.phone || 'N/A'}\n`;
    prompt += `- Categoria: ${business.category || 'N/A'}\n`;
    prompt += `- Avaliação: ${business.rating ? `${business.rating}/5 (${business.reviewCount || 0} avaliações)` : 'N/A'}\n`;
    prompt += `- Tem website: ${business.hasWebsite ? 'Sim' : 'Não'}\n`;
    prompt += `- Google Maps: ${business.googleMapsUrl || 'N/A'}\n`;
    prompt += `- Horário: ${business.openingHours || 'N/A'}\n\n`;

    if (instagramData) {
        prompt += `## Dados do Instagram\n`;
        prompt += `- Perfil: @${instagramData.handle} (${instagramData.url})\n`;
        prompt += `- Bio: ${instagramData.bio || 'N/A'}\n`;
        prompt += `- Seguidores: ${instagramData.followers || 'N/A'}\n`;
        prompt += `- Posts: ${instagramData.posts || 'N/A'}\n\n`;
    } else {
        prompt += `## Instagram\nNenhum perfil encontrado.\n\n`;
    }

    prompt += `## Responda em JSON com os seguintes campos:
{
    "suitabilityScore": <1-10, sendo 10 o mais adequado como cliente>,
    "summary": "<resumo de 2-3 frases sobre o negócio e seu potencial>",
    "strengths": ["<pontos fortes para abordagem>"],
    "challenges": ["<desafios ou objeções previstas>"],
    "approachSuggestion": "<sugestão detalhada de como abordar este negócio>",
    "estimatedBudget": "<estimativa do orçamento que o negócio poderia investir>",
    "priority": "<alta|média|baixa>",
    "businessType": "<tipo detalhado do negócio>",
    "targetAudience": "<público-alvo estimado do negócio>",
    "suggestedFeatures": ["<funcionalidades sugeridas para o site>"],
    "visualIdentitySuggestions": {
        "style": "<estilo visual sugerido>",
        "colors": ["<cores sugeridas em hex>"],
        "tone": "<tom de comunicação sugerido>"
    }
}`;

    return prompt;
}

module.exports = {
    analyzeBusiness,
};
