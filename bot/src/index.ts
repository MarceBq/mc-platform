import { createBot } from 'mineflayer'
import { pathfinder, Movements, goals } from 'mineflayer-pathfinder'


const bot = createBot({
  host: process.env.MC_HOST ?? 'localhost',
  port: Number(process.env.MC_PORT ?? 25565),
  username: process.env.BOT_NAME ?? 'Agente01',
  auth: 'offline',
  version: '26.1',
})

// Le agregamos al bot la capacidad de calcular rutas
bot.loadPlugin(pathfinder)

bot.once('spawn', () => {
  // Reglas de movimiento (guardrails): qué puede y qué no puede hacer al moverse
  const movimientos = new Movements(bot)
  movimientos.canDig = false          // no rompe bloques para abrirse paso
  movimientos.allow1by1towers = false // no construye pilares para subir
  bot.pathfinder.setMovements(movimientos)

  console.log('[bot] Entré al mundo')
  bot.chat('Hola! Soy Agente01. Comandos: hola, posicion, mira, ven, ir <x> <y> <z>, para')
})

// HABILIDAD: caminar hasta unas coordenadas
async function irA(x: number, y: number, z: number): Promise<void> {
  // GoalNear: llegar a 1 bloque de distancia del objetivo
  await bot.pathfinder.goto(new goals.GoalNear(x, y, z, 1))
}

// Lo que el bot "ve" a su alrededor
interface Entorno {
  posicion: { x: number; y: number; z: number }
  esDeDia: boolean
  vida: number
  hambre: number
  bloques: Record<string, {
    cantidad: number
    visibles: number
    masCercano: { x: number; y: number; z: number; distancia: number }
  }> // nombre del bloque → cantidad
  entidades: { nombre: string; tipo: string; distancia: number }[]
}

// HABILIDAD: percibir el entorno en un radio dado
function percibirEntorno(radio = 16): Entorno {
  const pos = bot.entity.position

  // Solo nos interesan bloques útiles, no tierra ni piedra común
  const esInteresante = (nombre: string) =>
    nombre.endsWith('_log') ||
    nombre.endsWith('_ore') ||
    ['water', 'lava', 'chest', 'crafting_table', 'furnace'].includes(nombre)

  const posiciones = bot.findBlocks({
    matching: (bloque) => esInteresante(bloque.name),
    maxDistance: radio,
    count: 500,
  })

  // Contar cuántos hay de cada tipo
  const bloques: Entorno['bloques'] = {}
  for (const p of posiciones) {
    const bloque = bot.blockAt(p)
    if (!bloque) continue

    const distancia = Math.round(p.distanceTo(pos))

    // Si es el primero de su tipo, crear su registro
    const info = (bloques[bloque.name] ??= {
      cantidad: 0,
      visibles: 0,
      masCercano: { x: p.x, y: p.y, z: p.z, distancia },
    })

    info.cantidad++
    if (bot.canSeeBlock(bloque)) info.visibles++
    if (distancia < info.masCercano.distancia) {
      info.masCercano = { x: p.x, y: p.y, z: p.z, distancia }
    }
  }

  const entidades = Object.values(bot.entities)
    .filter((e) => e !== bot.entity && e.position.distanceTo(pos) <= radio)
    .map((e) => ({
      nombre: e.username ?? e.name ?? 'desconocido',
      tipo: e.type,
      distancia: Math.round(e.position.distanceTo(pos)),
    }))
    .sort((a, b) => a.distancia - b.distancia)

  return {
    posicion: { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) },
    esDeDia: bot.time.isDay,
    vida: Math.round(bot.health),
    hambre: bot.food,
    bloques,
    entidades,
  }
}

interface Inventario {
  items: { nombre: string; cantidad: number }[]
  enMano: string | null
  espaciosLibres: number
}

// HABILIDAD: revisar el inventario
function verInventario(): Inventario {
  // Sumar todas las pilas del mismo tipo (ej: 64 + 6 troncos = 70)
  const totales: Record<string, number> = {}
  for (const item of bot.inventory.items()) {
    totales[item.name] = (totales[item.name] ?? 0) + item.count
  }

  return {
    items: Object.entries(totales)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad),
    enMano: bot.heldItem?.name ?? null,
    espaciosLibres: bot.inventory.emptySlotCount(),
  }
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
    } else if (comando === 'mira') {
      const e = percibirEntorno()
      console.log('[percepcion]', JSON.stringify(e, null, 2))

      const bloquesTxt =
        Object.entries(e.bloques)
          .map(([nombre, i]) => `${nombre} x${i.cantidad} (${i.visibles} visibles, el mas cercano a ${i.masCercano.distancia}m)`)
          .join(', ') || 'nada especial'
      const entidadesTxt =
        e.entidades.slice(0, 5).map((x) => `${x.nombre} (${x.distancia}m)`).join(', ') || 'nadie'

      bot.chat(`${e.esDeDia ? 'Es de dia' : 'Es de noche'}. Vida ${e.vida}/20, hambre ${e.hambre}/20`)
      bot.chat(`Bloques: ${bloquesTxt}`.slice(0, 250))
      bot.chat(`Cerca: ${entidadesTxt}`.slice(0, 250))
    } else if (comando === 'inventario') {
      const inv = verInventario()
      console.log('[inventario]', JSON.stringify(inv, null, 2))

      const itemsTxt = inv.items.map((i) => `${i.nombre} x${i.cantidad}`).join(', ') || 'vacio'
      bot.chat(`Llevo: ${itemsTxt}`.slice(0, 250))
      bot.chat(`En mano: ${inv.enMano ?? 'nada'}. Espacios libres: ${inv.espaciosLibres}`)
    }
  } catch (err) {
    bot.chat(`No pude hacerlo: ${(err as Error).message}`)
  }
})

bot.on('kicked', (reason) => console.log('[bot] Expulsado:', reason))
bot.on('error', (err) => console.error('[bot] Error:', err))
bot.on('end', () => console.log('[bot] Desconectado'))