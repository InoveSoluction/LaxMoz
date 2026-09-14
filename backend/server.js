// Backend do LaxMoz — proxy seguro entre a app Android e a IA.
// Corre em Node.js. A chave da API fica só aqui (variável de ambiente),
// nunca dentro do APK.

const express = require('express');
const app = express();
app.use(express.json());

// A chave API do Gemini deve ser definida no painel do Render
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();

  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ erro: "Erro: GEMINI_API_KEY não configurada no servidor." });
  }

  try {
    // Usando v1beta que é mais flexível para modelos Flash no plano gratuito
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      contents: [{
        parts: [{
          text: "Você é um assistente jurídico experiente em Moçambique. " +
                "Responda em português de Moçambique, de forma clara e objectiva. " +
                "Cite a lei, decreto ou regulamento aplicável sempre que possível. " +
                "Seja preciso sobre o contexto legal moçambicano. " +
                "Termine sempre recomendando a consulta a um advogado para casos específicos.\n\n" +
                "Pergunta do utilizador: " + pergunta
        }]
      }]
    };

    const apiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error("Erro da API Gemini:", data);
      return res.status(apiResponse.status).json({
        erro: `Erro da IA (Gemini): ${data.error ? data.error.message : "Erro desconhecido"}`
      });
    }

    const texto = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]
      ? data.candidates[0].content.parts[0].text
      : "O Gemini não devolveu conteúdo.";

    res.json({ resposta: texto });

  } catch (e) {
    console.error("Erro no backend:", e);
    res.status(500).json({ erro: "Erro interno no servidor: " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz backend (Gemini) ativo.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
