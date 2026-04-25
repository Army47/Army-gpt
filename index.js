const { Client, GatewayIntentBits } = require('discord.js');
const axios = require("axios");

// 🔑 CONFIGURA

require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CANAL_CHAT = "army-gpt";
const CANAL_LOGS = "logs-armygpt";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🧠 Memoria
const memoria = new Map();

// 🛡️ Anti-spam
const controlSpam = new Map();
const LIMITE = 10;
const VENTANA = 60 * 60 * 1000;
const BLOQUEO = 2 * 60 * 60 * 1000;

client.on("clientReady", () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
});

// ======================
// 💬 MENSAJES
// ======================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
if (msg.channel.name !== CANAL_CHAT) return;
  try {
   
    const userId = msg.author.id;
    const ahora = Date.now();

    if (!controlSpam.has(userId)) {
      controlSpam.set(userId, { mensajes: [], bloqueadoHasta: 0 });
    }

    const data = controlSpam.get(userId);

    if (ahora < data.bloqueadoHasta) {
      return msg.reply("⛔ Estás bloqueado por spam.");
    }

    data.mensajes = data.mensajes.filter(t => ahora - t < VENTANA);
    data.mensajes.push(ahora);

    if (data.mensajes.length > LIMITE) {
      data.bloqueadoHasta = ahora + BLOQUEO;
      return msg.reply("🚫 Límite superado.");
    }

    if (!memoria.has(userId)) memoria.set(userId, []);
    let historial = memoria.get(userId);

    if (historial.length > 10) historial.shift();

    historial.push({ role: "user", content: msg.content });

    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3-8b-instruct",
        messages: historial
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://localhost",
          "X-Title": "Army GPT Bot",
          "Content-Type": "application/json"
        }
      }
    );

    const respuesta = res.data.choices[0].message.content;

    historial.push({ role: "assistant", content: respuesta });
    memoria.set(userId, historial);

    await msg.reply(respuesta);

    const log = msg.guild.channels.cache.find(c => c.name === CANAL_LOGS);
    if (log) {
      log.send(`👤 ${msg.author.tag}\n💬 ${msg.content}\n🤖 ${respuesta}`);
    }

  } catch (err) {
    console.error("ERROR msg:", err);
    msg.reply("❌ Error.");
  }
});

// ======================
// ⚡ SLASH COMMANDS
// ======================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  if (interaction.commandName === 'ask') {
    try {
      const pregunta = interaction.options.getString('pregunta');
      const preguntaLower = pregunta.toLowerCase();

      if (
        preguntaLower.includes("quien te creo") ||
        preguntaLower.includes("quien es tu creador") ||
        preguntaLower.includes("de quien eres") ||
        preguntaLower.includes("quien te hizo")
      ) {
        return interaction.editReply("👑 Mi creador es Army");
      }
      await interaction.deferReply();

      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "meta-llama/llama-3-8b-instruct",
          messages: [{ role: "user", content: pregunta }]
        },
        {
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://localhost",
            "X-Title": "Army GPT Bot",
            "Content-Type": "application/json"
          }
        }
      );

      const respuesta = res.data.choices[0].message.content;

      await interaction.editReply(respuesta);

    } catch (err) {
      console.error("ERROR /ask:", err.response?.data || err.message);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ " + (err.response?.data?.error?.message || (err.response?.data?.error?.message || err.message)));
      } else {
        await interaction.reply("❌ " + (err.response?.data?.error?.message || err.message));
      }
    }
  }

  if (interaction.commandName === 'clear') {
    try {
      const channel = interaction.channel;

const mensajes = await channel.messages.fetch({ limit: 100 });

// ✅ solo UNA declaración y bien hecha
const botMessages = mensajes.filter(m => m.author.id === interaction.client.user.id);

console.log("Mensajes del bot:", botMessages.size);

      console.log("Mensajes del bot:", botMessages.size);

      if (botMessages.size === 0) {
        return interaction.editReply("⚠️ No hay mensajes del bot para borrar");
      }

      await channel.bulkDelete(botMessages.map(m => m), true);

      await interaction.editReply("✅ Mensajes borrados");

    } catch (err) {
      console.error("ERROR /clear:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ Error al borrar mensajes");
      } else {
        await interaction.reply("❌ Error al borrar mensajes");
      }
    }
  }

  if (interaction.commandName === 'clearlogs') {
  const canal = interaction.guild.channels.cache.find(c => c.name === CANAL_LOGS);
  if (!canal) return interaction.reply("❌ Canal no encontrado.");

  const mensajes = await canal.messages.fetch({ limit: 100 });
  await canal.bulkDelete(mensajes, true);

  return interaction.reply("🗑️ Logs borrados.");
}

if (interaction.commandName === 'imagen') {
  const prompt = interaction.options.getString('prompt');
  return interaction.reply(`🖼️ (modo gratis)\nPrompt: ${prompt}`);
}
});

client.login(DISCORD_TOKEN);
model: "..."