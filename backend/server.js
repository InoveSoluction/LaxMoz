const express = require('express');
const Groq = require('groq-sdk');
let FirecrawlApp = require('firecrawl');
if (FirecrawlApp.default) FirecrawlApp = FirecrawlApp.default;

const app = express();
app.use(express.json());

// Chaves de API (Configurar no painel do Render)
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
const groq = new Groq({ apiKey: GROQ_API_KEY });

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();

  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  if (!FIRECRAWL_API_KEY || !GROQ_API_KEY) {
    return res.status(500).json({
      erro: "Configuração incompleta: Defina FIRECRAWL_API_KEY e GROQ_API_KEY no painel do Render."
    });
  }

  try {
    console.log(`A pesquisar legislação e penalidades para: ${pergunta}...`);

    // 1. Pesquisa Web com Firecrawl
    const searchResponse = await firecrawl.search(pergunta + " Moçambique legislação penalidade multa", {
      limit: 3,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true
      }
    });

    const contextoWeb = searchResponse.success && searchResponse.data.length > 0
      ? searchResponse.data.map(d => `Fonte: ${d.url}\nConteúdo: ${d.markdown}`).join("\n\n")
      : "Não foi encontrado contexto web específico. Responda com base no seu conhecimento geral da lei moçambicana.";

    console.log("Contexto obtido. A gerar explicação com Groq...");

    // 2. Processamento com Groq (IA)
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Você é um assistente jurídico especialista em Direito de Moçambique. " +
                   "Sua tarefa é ler o CONTEXTO WEB fornecido e explicar ao usuário as penalidades e multas aplicáveis. " +
                   "REGRAS DE FORMATAÇÃO:\n" +
                   "1. NÃO use símbolos de Markdown como #, *, _, ou [ ].\n" +
                   "2. Use uma linguagem clara e direta em português de Moçambique.\n" +
                   "3. Identifique claramente a multa (valor ou critérios) e a pena (prisão, apreensão, etc).\n" +
                   "4. Cite a lei ou código (Ex: Código da Estrada, Código Penal).\n" +
                   "5. Organize a resposta em parágrafos curtos.\n" +
                   "6. Termine sempre com: 'Aconselha-se a consulta de um advogado para analisar o caso concreto.'"
        },
        {
          role: "user",
          content: `CONTEXTO PESQUISADO NA WEB:\n${contextoWeb}\n\nPERGUNTA DO CIDADÃO: ${pergunta}`
        }
      ],
      model: "llama-3.1-70b-versatile", // Modelo potente e rápido da Groq
      temperature: 0.2,
    });

    const respostaFinal = completion.choices[0]?.message?.content || "Não foi possível gerar uma explicação detalhada.";

    res.json({ resposta: respostaFinal });

  } catch (e) {
    console.error("Erro no processamento:", e);
    res.status(500).json({ erro: "Erro ao processar consulta: " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz Backend (Firecrawl + Groq) ativo.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor a correr na porta ${PORT}`));
