// Backend do LaxMoz — proxy seguro entre a app Android e a IA.
// Corre em Node.js. A chave da API fica só aqui (variável de ambiente),
// nunca dentro do APK.

const express = require('express');
const app = express();
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // definir no painel do Render
const MODEL = "claude-sonnet-4-6";

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();
  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  try {
    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: "Você é um assistente jurídico. Responda em português de Moçambique, " +
                "de forma clara e objectiva, citando a lei, decreto ou regulamento aplicável " +
                "quando souber. Use a busca na web para confirmar se há alterações recentes " +
                "à legislação antes de responder. Termine sempre a recomendar confirmação com " +
                "um advogado para casos concretos.",
        messages: [{ role: "user", content: pergunta }],
        tools: [{ type: "web_search_20250305", name: "web_search" }]
      })
    });

    const data = await resposta.json();

    const texto = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    res.json({ resposta: texto || "Não foi possível gerar resposta." });

  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: "Erro interno ao consultar a IA." });
  }
});

app.get('/', (req, res) => res.send('LaxMoz backend a funcionar.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LaxMoz backend na porta ${PORT}`));
