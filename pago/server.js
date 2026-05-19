import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/ia', async (req, res) => {
  try {
    const { pregunta } = req.body;

    if (!pregunta || typeof pregunta !== 'string') {
      return res.status(400).json({ error: 'La pregunta es obligatoria' });
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres el asistente IA de MensualPay.'
        },
        {
          role: 'user',
          content: pregunta
        }
      ]
    });

    res.json({
      respuesta: response.choices[0].message.content
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Error con OpenAI'
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor activo en http://localhost:${port}`);
});
