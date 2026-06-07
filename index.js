const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const cron = require('node-cron');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

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
     // setTimeout(() => enviarPrueba(), 3000); // ← comentar en producción
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const texto = msg.message.conversation ||
                  msg.message.extendedTextMessage?.text || '';

    manejarRespuesta(from, texto.toLowerCase());
  });
}

async function enviarRecordatorio(cliente) {
  const jid = `${cliente.telefono}@s.whatsapp.net`;

  const mensajePersonalizado = cliente.mensaje ||
    `Recuerda que mañana vence tu pago mensual 🔔`;

  const mensaje = `📋 *Recordatorio de pago*\n\n` +
    `Hola ${cliente.nombre}` +
    `📅Tu servicio de Youtube vence el: *${cliente.fecha} de este mes*`;

  await sock.sendMessage(jid, { text: mensaje });
  console.log(`🔔 Recordatorio enviado a ${cliente.nombre}`);
}

async function enviarCobranza(cliente) {
  const jid = `${cliente.telefono}@s.whatsapp.net`;

  const mensaje = `📋 *Aviso de pago*\n\n` +
    `Hola ${cliente.nombre}, hoy vence tu pago de Youtube.\n\n` +
    `¿Cómo deseas proceder? Responde con:\n` +
    `✅ *1* — Ya realicé el pago\n` +
    `📅 *2* — Necesito más tiempo\n` +
    `❓ *3* — Tengo una pregunta`;

  await sock.sendMessage(jid, { text: mensaje });
  console.log(`💰 Cobranza enviada a ${cliente.nombre}`);
}

function manejarRespuesta(from, texto) {
  if (texto.includes('1') || texto.includes('pagué') || texto.includes('pague')) {
    sock.sendMessage(from, {
      text: '✅ Por favor envía comprobante de pago y verificaremos. 🙌'
    });
  } else if (texto.includes('2') || texto.includes('tiempo') || texto.includes('plazo')) {
    sock.sendMessage(from, {
      text: '📅 Entendido. Hemos aplazado tu pago un día.'
    });
  } else if (texto.includes('3') || texto.includes('pregunta') || texto.includes('consulta')) {
    sock.sendMessage(from, {
      text: '❓ Con gusto te ayudamos. Escribe tu pregunta y un asesor te responderá pronto.'
    });
  }
}

function iniciarScheduler() {
  cron.schedule('0 9 * * *', async () => {
    const clientes = JSON.parse(fs.readFileSync('./clientes.json'));
    const hoy = new Date().getDate();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const diaManana = manana.getDate();

    const paraRecordar = clientes.filter(c => c.fecha === diaManana);
    const paraCobrar = clientes.filter(c => c.fecha === hoy);

    for (const cliente of paraRecordar) {
      await enviarRecordatorio(cliente);
      await new Promise(r => setTimeout(r, 3000));
    }

    for (const cliente of paraCobrar) {
      await enviarCobranza(cliente);
      await new Promise(r => setTimeout(r, 3000));
    }
  });

  console.log('⏰ Scheduler activo — revisando diario a las 9AM');
}


//async function enviarPrueba() {
//  console.log('🧪 Enviando mensajes de prueba...');
//  for (const cliente of clientes) {
//    await enviarRecordatorio(cliente);
//    await new Promise(r => setTimeout(r, 3000));
//  }
//}

conectarWhatsApp();
