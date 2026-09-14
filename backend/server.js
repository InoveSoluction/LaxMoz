const express = require('express');
let FirecrawlApp = require('firecrawl');
if (FirecrawlApp.default) FirecrawlApp = FirecrawlApp.default;

const app = express();
app.use(express.json());

// Chaves de API (Configurar no painel do Render)
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();

  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  if (!FIRECRAWL_API_KEY || !DEEPSEEK_API_KEY) {
    return res.status(500).json({
      erro: "Configuração incompleta: Defina FIRECRAWL_API_KEY e DEEPSEEK_API_KEY no painel do Render."
    });
  }

  try {
    console.log(`[Firecrawl] Pesquisando legislação para: ${pergunta}...`);

    // 1. Pesquisa Web com Firecrawl para obter a base legal real
    const searchResponse = await firecrawl.search(pergunta + " Moçambique legislação penalidade multa", {
      limit: 3,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true
      }
    });

    const contextoWeb = searchResponse.success && searchResponse.data.length > 0
      ? searchResponse.data.map(d => `Fonte: ${d.url}\nConteúdo: ${d.markdown}`).join("\n\n")
      : "Não foi encontrado contexto web específico na pesquisa. Use seu conhecimento da lei de Moçambique.";

    console.log("[DeepSeek] Gerando explicação baseada nos resultados...");

    // 2. Processamento com DeepSeek (IA)
    const aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Você é um assistente jurídico especialista em Direito de Moçambique. " +
                     "Sua tarefa é analisar o CONTEXTO WEB fornecido e explicar ao usuário as penalidades e multas. " +
                     "REGRAS DE RESPOSTA:\n" +
                     "1. NÃO use caracteres de formatação Markdown como #, *, _, ou [ ]. O texto deve ser puro e limpo.\n" +
                     "2. Responda em português de Moçambique.\n" +
                     "3. Seja direto sobre a multa e a pena.\n" +
                     "4. Cite a lei ou código aplicável (ex: Código da Estrada, Código Penal).\n" +
                     "5. Termine sempre com: 'Aconselha-se a consulta de um advogado para analisar o caso concreto.'"
          },
          {
            role: "user",
            content: `CONTEXTO PESQUISADO:\n${contextoWeb}\n\nPERGUNTA: ${pergunta}`
          }
        ],
        stream: false
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error("Erro DeepSeek:", data);
      return res.status(aiResponse.status).json({
        erro: `Erro da IA (DeepSeek): ${data.error ? data.error.message : "Erro na API"}`
      });
    }

    const respostaFinal = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "Não foi possível gerar a explicação.";

    res.json({ resposta: respostaFinal });

  } catch (e) {
    console.error("Erro no processamento:", e);
    res.status(500).json({ erro: "Erro ao processar consulta: " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz Backend (Firecrawl + DeepSeek) ativo.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
