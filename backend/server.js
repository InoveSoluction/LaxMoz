// Backend do LaxMoz — proxy seguro entre a app Android e a IA.
// Corre em Node.js. A chave da API fica só aqui (variável de ambiente),
// nunca dentro do APK.

const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
app.use(express.json());

// A chave API do Gemini deve ser definida no painel do Render
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.post('/consulta', async (req, res) => {
  const pergunta = (req.body.pergunta || "").trim();

  if (!pergunta) {
    return res.status(400).json({ erro: "Pergunta vazia." });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ erro: "Erro: GEMINI_API_KEY não configurada no servidor." });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = "Você é um assistente jurídico experiente em Moçambique. " +
                   "Responda em português de Moçambique, de forma clara e objectiva. " +
                   "Cite a lei, decreto ou regulamento aplicável sempre que possível. " +
                   "Seja preciso sobre o contexto legal moçambicano. " +
                   "Termine sempre recomendando a consulta a um advogado para casos específicos.\n\n" +
                   "Pergunta do utilizador: " + pergunta;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto = response.text();

    res.json({ resposta: texto || "O Gemini não conseguiu gerar uma resposta." });

  } catch (e) {
    console.error("Erro no Gemini:", e);
    res.status(500).json({ erro: "Erro ao consultar a IA (Gemini): " + e.message });
  }
});

app.get('/', (req, res) => res.send('LaxMoz backend (Gemini) ativo.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
