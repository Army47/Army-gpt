const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Haz una pregunta')
    .addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Borra tu memoria'),

  new SlashCommandBuilder()
    .setName('clearlogs')
    .setDescription('Borra logs'),

  new SlashCommandBuilder()
    .setName('imagen')
    .setDescription('Genera una imagen')
    .addStringOption(o => o.setName('prompt').setDescription('Describe la imagen').setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken("TU_TOKEN");

const CLIENT_ID = "546309765261951007";
const GUILD_ID = "1492177751342321765";

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Comandos listos");
})();
