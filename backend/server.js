const express = require('express');
const { FirecrawlApp } = require('firecrawl');
const app = express();
app.use(express.json());

// Chaves de API (Configurar no painel do Render)
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// Inicializa o Firecrawl
const firecrawl = new FirecrawlApp({
  apiKey: FIRECRAWL_API_KEY
});

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();

  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  if (!FIRECRAWL_API_KEY || !DEEPSEEK_API_KEY) {
    return res.status(500).json({
      erro: "Configuração incompleta: Defina FIRECRAWL_API_KEY e DEEPSEEK_API_KEY no servidor."
    });
  }

  try {
    console.log(`A pesquisar contexto jurídico para: ${pergunta}...`);

    // 1. Usar Firecrawl para pesquisar na web a legislação de Moçambique
    const searchResponse = await firecrawl.search(pergunta + " legislação Moçambique", {
      limit: 2,
      scrapeOptions: { formats: ['markdown'] }
    });

    // 2. Extrair o conteúdo encontrado
    const contextoWeb = searchResponse.success && searchResponse.data.length > 0
      ? searchResponse.data.map(d => `Fonte: ${d.url}\nConteúdo: ${d.markdown}`).join("\n\n")
      : "Não foi encontrado contexto web recente.";

    console.log("Contexto web obtido. A consultar DeepSeek...");

    // 3. Enviar Pergunta + Contexto do Firecrawl para o DeepSeek
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
            content: "Você é um assistente jurídico experiente em Moçambique. " +
                     "Use o CONTEXTO WEB fornecido para responder com base na legislação mais actual. " +
                     "Se o contexto não for relevante, use o seu conhecimento geral da lei moçambicana. " +
                     "Responda em português de Moçambique. Cite artigos e leis. " +
                     "Termine sempre recomendando um advogado."
          },
          {
            role: "user",
            content: `CONTEXTO WEB:\n${contextoWeb}\n\nPERGUNTA: ${pergunta}`
          }
        ],
        stream: false
      })
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      return res.status(aiResponse.status).json({
        erro: `Erro da IA (DeepSeek): ${data.error ? data.error.message : "Erro desconhecido"}`
      });
    }

    const respostaFinal = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "Não foi possível gerar uma resposta.";

    res.json({ resposta: respostaFinal });

  } catch (e) {
    console.error("Erro no processamento:", e);
    res.status(500).json({ erro: "Erro interno no backend: " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz Backend (Firecrawl + DeepSeek) ativo.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend LaxMoz a correr na porta ${PORT}`));
