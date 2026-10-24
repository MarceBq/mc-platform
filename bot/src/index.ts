import { createBot } from 'mineflayer'
import { pathfinder, Movements, goals } from 'mineflayer-pathfinder'


const bot = createBot({
  host: process.env.MC_HOST ?? 'localhost',
  port: Number(process.env.MC_PORT ?? 25565),
  username: process.env.BOT_NAME ?? 'Agente01',
  auth: 'offline',
  version: '26.1',
})

const movimientos = new Movements(bot)
movimientos.canDig = false // No puede romper bloques
movimientos.allow1by1towers = true // no construye torres de 1 bloque para subir

// Le agregamos al bot la capacidad de calcular rutas
bot.loadPlugin(pathfinder)

bot.once('spawn', () => {
  // Reglas de movimiento: qué puede romper, saltar, etc. (por defecto)
  bot.pathfinder.setMovements(new Movements(bot))
  console.log('[bot] Entré al mundo')
  bot.chat('Hola! Soy Agente01. Comandos: hola, posicion, ven, ir <x> <y> <z>, para')
})

// HABILIDAD: caminar hasta unas coordenadas
async function irA(x: number, y: number, z: number): Promise<void> {
  // GoalNear: llegar a 1 bloque de distancia del objetivo
  await bot.pathfinder.goto(new goals.GoalNear(x, y, z, 1))
}

bot.on('chat', async (username, message) => {
  if (username === bot.username) return
  console.log(`[chat] <${username}> ${message}`)

  // "ir 10 64 -20" → comando = "ir", args = ["10", "64", "-20"]
  const [comando, ...args] = message.trim().toLowerCase().split(/\s+/)

  try {
    if (comando === 'hola') {
      bot.chat(`Hola, ${username}!`)
    } else if (comando === 'posicion') {
      const p = bot.entity.position
      bot.chat(`Estoy en x=${Math.round(p.x)}, y=${Math.round(p.y)}, z=${Math.round(p.z)}`)
    } else if (comando === 'ven') {
      const jugador = bot.players[username]?.entity
      if (!jugador) {
        bot.chat('No te veo, estas muy lejos')
        return
      }
      const { x, y, z } = jugador.position
      bot.chat('Voy!')
      await irA(x, y, z)
      bot.chat('Llegue')
    } else if (comando === 'ir') {
      const [x, y, z] = args.map(Number)
      if (args.length !== 3 || [x, y, z].some(Number.isNaN)) {
        bot.chat('Uso: ir <x> <y> <z>')
        return
      }
      bot.chat(`Voy a ${x} ${y} ${z}`)
      await irA(x, y, z)
      bot.chat('Llegue')
    } else if (comando === 'para') {
      bot.pathfinder.stop()
      bot.chat('Me detuve')
    }
  } catch (err) {
    bot.chat(`No pude hacerlo: ${(err as Error).message}`)
  }
})

bot.on('kicked', (reason) => console.log('[bot] Expulsado:', reason))
bot.on('error', (err) => console.error('[bot] Error:', err))
bot.on('end', () => console.log('[bot] Desconectado'))