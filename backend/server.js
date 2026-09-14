const express = require('express');
const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Função para tentar gerar conteúdo com um modelo específico
async function tryGenerate(modelName, pergunta) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [{
        text: "Você é um assistente jurídico experiente em Moçambique. Responda em português de Moçambique, de forma clara e objectiva. Cite a lei ou regulamento aplicável. Termine recomendando um advogado.\n\nPergunta: " + pergunta
      }]
    }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await response.json()
  };
}

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();
  if (!pergunta) return res.status(400).json({ erro: "Pergunta vazia." });
  if (!GEMINI_API_KEY) return res.status(500).json({ erro: "GEMINI_API_KEY não configurada." });

  try {
    console.log("A tentar modelo: gemini-1.5-flash...");
    let result = await tryGenerate("gemini-1.5-flash", pergunta);

    // Se falhar (404 ou outro), tenta o modelo Pro (1.0)
    if (!result.ok) {
      console.warn(`Flash falhou (${result.status}). A tentar gemini-pro...`);
      result = await tryGenerate("gemini-pro", pergunta);
    }

    if (!result.ok) {
      console.error("Todos os modelos falharam:", result.data);
      const msg = result.data.error ? result.data.error.message : "Erro desconhecido na IA";
      return res.status(result.status).json({ erro: `Erro da IA: ${msg}` });
    }

    const texto = result.data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.json({ resposta: texto || "A IA não devolveu texto." });

  } catch (e) {
    console.error("Erro no backend:", e);
    res.status(500).json({ erro: "Erro interno: " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz backend ativo.'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor na porta ${PORT}`));
