# whatsapp-cobros

Bot de recordatorios de cobro por WhatsApp. Notifica a cada cliente el día anterior a su fecha de pago y el día del vencimiento con opciones de respuesta.

---

## Cómo funciona

Cada mañana a las 9:00 AM revisa qué clientes tienen vencimiento al día siguiente o ese mismo día:

- **Día anterior** → manda solo el recordatorio, sin opciones
- **Día del vencimiento** → manda el aviso con botones de respuesta (pagué / necesito tiempo / tengo una pregunta

---

## Requisitos

- Docker y Docker Compose
- Un número de WhatsApp (idealmente uno dedicado, no el personal)

---

## Instalación

```bash
git clone https://github.com/olarte18/whatsapp-cobros
cd whatsapp-cobros

```

Crea `clientes.json` con tus clientes reales, luego:

```bash
docker compose up -d --build
docker compose logs -f
```

La primera vez aparece un QR en los logs. Escanéalo desde WhatsApp > Dispositivos vinculados. La sesión queda guardada y no vuelve a pedir QR.

---

## Clientes

El archivo `clientes.json` no se sube al repo. Usa `clientes.ejemplo.json` como referencia:

```json
[
  {
    "nombre": "Juan Pérez",
    "telefono": "573001234567",
    "monto": "150.000",
    "vencimiento": 10,
    "mensaje": "Recuerda que mañana vence tu pago de YouTube Premium 📺"
  }
]
```

- `telefono` — con código de país, sin `+`, sin espacios
- `vencimiento` — día del mes como número entero, no string
- `mensaje` — opcional, si no se pone usa uno genérico

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Reiniciar
docker compose restart

# Detener
docker compose down
```

---

## Notas

- El delay entre mensajes es aleatorio entre 3 y 8 segundos para que no parezca spam
- Funciona bien para volúmenes pequeños (~10-50 clientes)
- Si cambias `clientes.json` no necesitas reconstruir la imagen, solo reiniciar el contenedor
