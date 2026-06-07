const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const clientes = require('./clientes.json');

let sock;

async function conectarWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

 sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('📱 Escanea este QR con tu WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) conectarWhatsApp();
    }

 if (connection === 'open') {
      console.log('✅ WhatsApp conectado');
      iniciarScheduler();
	  setTimeout(() => enviarPrueba(), 3000); // ← prueba inmediata

    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Escuchar respuestas de clientes
  sock.ev.on('messages.upsert', ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const texto = msg.message.conversation ||
                  msg.message.extendedTextMessage?.text || '';

    manejarRespuesta(from, texto.toLowerCase());
  });
}

async function enviarNotificacion(cliente) {
  const jid = `${cliente.telefono}@s.whatsapp.net`;

  const mensaje = `📋 *Recordatorio de pago*\n\n` +
    `Hola ${cliente.nombre}, tu pago vence el día *${cliente.vencimiento}* de este mes.\n\n` +
    `¿Cómo deseas proceder? Responde con:\n` +
    `✅ *1* — Ya realicé el pago\n` +
    `📅 *2* — Necesito más tiempo\n` +
    `❓ *3* — Tengo una pregunta`;

  await sock.sendMessage(jid, { text: mensaje });
  console.log(`📤 Notificación enviada a ${cliente.nombre}`);
}

function manejarRespuesta(from, texto) {
  if (texto.includes('1') || texto.includes('pagué') || texto.includes('pague')) {
    sock.sendMessage(from, {
      text: '✅ ¡Por favor envia comprobante de pago y verficaremos. 🙌'
    });
  } else if (texto.includes('2') || texto.includes('tiempo') || texto.includes('plazo')) {
    sock.sendMessage(from, {
      text: '📅 Entendido. Hemos aplazado tu pago un dia .'
    });
  } else if (texto.includes('3') || texto.includes('pregunta') || texto.includes('consulta')) {
    sock.sendMessage(from, {
      text: '❓ Con gusto te ayudamos. Escribe tu pregunta y un asesor te responderá pronto.'
    });
  }
}

function iniciarScheduler() {
  // Se ejecuta el día 1 de cada mes a las 9:00 AM
  cron.schedule('0 9 1 * *', async () => {
    console.log('🔔 Enviando notificaciones mensuales...');
    for (const cliente of clientes) {
      await enviarNotificacion(cliente);
      // Espera 3 segundos entre mensajes para evitar bloqueos
      await new Promise(r => setTimeout(r, 3000));
    }
  });

  console.log('⏰ Scheduler activo — notificaciones el día 1 de cada mes a las 9AM');
}
// Para prueba inmediata (comenta esto en producción)
async function enviarPrueba() {
  console.log('🧪 Enviando mensajes de prueba...');
  for (const cliente of clientes) {
    await enviarNotificacion(cliente);
    await new Promise(r => setTimeout(r, 3000));
  }
}

conectarWhatsApp();
