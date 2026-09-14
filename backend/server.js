const express = require('express');
let FirecrawlApp = require('firecrawl');
if (FirecrawlApp.default) FirecrawlApp = FirecrawlApp.default;

const app = express();
app.use(express.json());

// Chave do Firecrawl (Configurar no painel do Render)
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

const firecrawl = new FirecrawlApp({
  apiKey: FIRECRAWL_API_KEY
});

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();

  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  if (!FIRECRAWL_API_KEY) {
    return res.status(500).json({
      erro: "Configuração incompleta: Defina FIRECRAWL_API_KEY no painel do Render."
    });
  }

  try {
    console.log(`A pesquisar legislação para: ${pergunta}...`);

    // O Firecrawl agora é o responsável por trazer a informação bruta da web
    const searchResponse = await firecrawl.search(pergunta + " Moçambique legislação", {
      limit: 2,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true
      }
    });

    if (searchResponse.success && searchResponse.data.length > 0) {
      // Formata os resultados da web para serem exibidos no app
      const resultados = searchResponse.data.map((d, i) => {
        return `[FONTE ${i+1}: ${d.metadata.title || 'Legislação'}]\nURL: ${d.url}\n\n${d.markdown.substring(0, 2000)}...`;
      }).join("\n\n---\n\n");

      res.json({
        resposta: "Resultados encontrados na pesquisa jurídica em tempo real:\n\n" + resultados
      });
    } else {
      res.json({
        resposta: "Não foram encontrados documentos ou leis recentes na web sobre este assunto em Moçambique."
      });
    }

  } catch (e) {
    console.error("Erro no Firecrawl:", e);
    res.status(500).json({ erro: "Erro ao pesquisar na web: " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz Backend (Apenas Firecrawl) ativo.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend a correr na porta ${PORT}`));
