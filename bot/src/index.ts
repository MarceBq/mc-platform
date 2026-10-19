import { createBot } from 'mineflayer'

const bot = createBot({
  host: process.env.MC_HOST ?? 'localhost',
  port: Number(process.env.MC_PORT ?? 25565),
  username: process.env.BOT_NAME ?? 'Agente01',
  auth: 'offline',
  version: '26.1',
})


// Se ejecuta UNA vez, cuando el bot aparece en el mundo
bot.once('spawn', () => {
  console.log('[bot] Entré al mundo')
  bot.chat('Hola! Soy Agente01, el primer bot de mc-platform.')
})


// Se ejecuta CADA vez que alguien escribe en el chat
bot.on('chat', (username, message) => {
  if (username === bot.username) return // ignorar mis propios mensajes 

  console.log(`[chat] <${username}> ${message}`)

  if (message === 'hola') {
    bot.chat(`Hola, ${username}!`)
  }

  if (message === 'donde estas') {
    const pos = bot.entity.position
    bot.chat(`Estoy en x=${Math.round(pos.x)}, y=${Math.round(pos.y)}, z=${Math.round(pos.z)}`)
  }
})

// Registrar problemas para poder diagnosticarlos
bot.on('kicked', (reason) => console.log('[bot] Expulsado:', reason))
bot.on('error', (err) => console.error('[bot] Error:', err))
bot.on('end', () => console.log('[bot] Desconectado'))