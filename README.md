# mc-platform

Plataforma de orquestación multi-agente con LLMs, validada en un entorno de simulación (Minecraft).

## Estado

- [x] Fase 1 — Infraestructura: VM Ubuntu Server (Hyper-V), red privada con Tailscale, Docker y servidor Paper
- [ ] Fase 2 — Bot + servidor MCP controlado por Claude
- [ ] Fase 3 — API + Postgres + registro de eventos
- [ ] Fase 4 — Dashboard en tiempo real

## Levantar el entorno

```bash
docker compose up -d
```