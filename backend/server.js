const express = require('express');
const app = express();
app.use(express.json());

// A chave API deve ser definida no painel do Render
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();

  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ erro: "Erro: DEEPSEEK_API_KEY não configurada no servidor." });
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
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
                     "Responda em português de Moçambique, de forma clara e objectiva. " +
                     "Cite a lei, decreto ou regulamento aplicável sempre que possível. " +
                     "Termine sempre recomendando a consulta a um advogado para casos específicos."
          },
          { role: "user", content: pergunta }
        ],
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro no DeepSeek:", data);
      return res.status(response.status).json({
        erro: `Erro da IA (DeepSeek): ${data.error ? data.error.message : "Erro desconhecido"}`
      });
    }

    const texto = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "O DeepSeek não devolveu conteúdo.";

    res.json({ resposta: texto });

  } catch (e) {
    console.error("Erro no backend:", e);
    res.status(500).json({ erro: "Erro interno no servidor: " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz backend (DeepSeek) ativo.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend DeepSeek na porta ${PORT}`));
