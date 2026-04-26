console.log("🔥 CODIGO NUEVO CARGADO");
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require("axios");

require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const CANAL_CHAT = "army-gpt";
const CANAL_LOGS = "logs-armygpt";

// 🤖 CLIENTE
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🧠 MEMORIA
const memoria = new Map();

// 🛡️ ANTI-SPAM
const controlSpam = new Map();
const LIMITE = 10;
const VENTANA = 60 * 60 * 1000;
const BLOQUEO = 2 * 60 * 60 * 1000;

// ✅ READY
client.once("ready", () => {
  console.log(`✅ Bot listo como ${client.user.tag}`);
});

// ======================
// 💬 MENSAJES
// ======================
client.on("messageCreate", async (msg) => {
  try {
    if (msg.author.bot) return;
    if (msg.channel.name !== CANAL_CHAT) return;

    const userId = msg.author.id;
    const ahora = Date.now();

    // 🛡️ spam control
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

    // 🧠 memoria
    if (!memoria.has(userId)) memoria.set(userId, []);
    let historial = memoria.get(userId);

    if (historial.length > 10) historial.shift();

    historial.push({ role: "user", content: msg.content });

    // 🤖 IA
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
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

    // ⚠️ VALIDACIÓN (EVITA CRASH)
    if (!res?.data?.choices?.[0]?.message?.content) {
      console.log("Respuesta inválida:", res.data);
      return msg.reply("⚠️ Error con la IA");
    }

    const respuesta = res.data.choices[0].message.content;

    historial.push({ role: "assistant", content: respuesta });
    memoria.set(userId, historial);

    await msg.reply(respuesta);

    // 📜 LOGS
    const log = msg.guild.channels.cache.find(c => c.name === CANAL_LOGS);
    if (log) {
      log.send(`👤 ${msg.author.tag}\n💬 ${msg.content}\n🤖 ${respuesta}`);
    }

  } catch (err) {
    console.error("ERROR COMPLETO:", err);
    console.error("ERROR DATA:", err.response?.data || err.message);
    msg.reply("❌ Error.");
  }
});

// ======================
// ⚡ SLASH COMMANDS
// ======================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ask') {
    try {
      const pregunta = interaction.options.getString('pregunta');

      await interaction.deferReply();

      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openai/gpt-3.5-turbo",
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

      if (!res?.data?.choices?.[0]?.message?.content) {
        console.log("Respuesta inválida:", res.data);
        return interaction.editReply("⚠️ Error con la IA");
      }

      const respuesta = res.data.choices[0].message.content;

      await interaction.editReply(respuesta);

    } catch (err) {
      console.error("ERROR /ask:", err.response?.data || err.message);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ Error");
      } else {
        await interaction.reply("❌ Error");
      }
    }
  }

  if (interaction.commandName === 'clear') {
    try {
      await interaction.deferReply();

      const mensajes = await interaction.channel.messages.fetch({ limit: 100 });
      const botMessages = mensajes.filter(m => m.author.id === interaction.client.user.id);

      if (botMessages.size === 0) {
        return interaction.editReply("⚠️ No hay mensajes del bot");
      }

      await interaction.channel.bulkDelete(botMessages, true);

      await interaction.editReply("✅ Mensajes borrados");

    } catch (err) {
      console.error("ERROR /clear:", err);
      await interaction.editReply("❌ Error");
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
    return interaction.reply(`🖼️ Prompt: ${prompt}`);
  }
});

// 🚀 LOGIN
client.login(DISCORD_TOKEN);