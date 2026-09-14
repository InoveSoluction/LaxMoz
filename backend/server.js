// Backend do LaxMoz — proxy seguro entre a app Android e a IA.
// Corre em Node.js. A chave da API fica só aqui (variável de ambiente),
// nunca dentro do APK.

const express = require('express');
const app = express();
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-3-5-sonnet-20241022";

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();
  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ erro: "Configuração incompleta: ANTHROPIC_API_KEY não definida no servidor." });
  }

  try {
    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
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
                "quando souber. Termine sempre a recomendar confirmação com " +
                "um advogado para casos concretos.",
        messages: [{ role: "user", content: pergunta }]
      })
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Erro da API Anthropic:", data);
      return res.status(apiResponse.status).json({
        erro: `Erro da IA: ${data.error ? data.error.message : "Desconhecido"}`
      });
    }

    const texto = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");

    res.json({ resposta: texto || "A IA não retornou conteúdo." });

  } catch (e) {
    console.error("Erro no backend:", e);
    res.status(500).json({ erro: "Erro interno ao consultar a IA: " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz backend a funcionar.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LaxMoz backend na porta ${PORT}`));
