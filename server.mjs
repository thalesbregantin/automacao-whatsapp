// server.js

// --- MÓDULOS E BIBLIOTECAS ---
// Para instalar: npm install whatsapp-web.js qrcode-terminal
import http from 'node:http'; // Usando import para o servidor HTTP
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// --- CONFIGURAÇÃO DO WHATSAPP ---
console.log('Iniciando o cliente de WhatsApp...');
const client = new Client({
    authStrategy: new LocalAuth() // Salva a sessão para não escanear o QR code sempre
});

// Flag para sabermos quando o WhatsApp está pronto para enviar mensagens
let isWhatsappReady = false;

client.on('qr', (qr) => {
    console.log('QR Code recebido! Escaneie com o seu celular para conectar.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Cliente WhatsApp está pronto e conectado!');
    isWhatsappReady = true;
});

client.on('auth_failure', msg => {
    console.error('FALHA NA AUTENTICAÇÃO:', msg);
});

// Inicia a conexão com o WhatsApp
client.initialize();


// --- CONFIGURAÇÃO DO SERVIDOR HTTP ---
const server = http.createServer(async (req, res) => {
    // Rota para disparar o envio da mensagem
    if (req.url === '/enviar-whatsapp' && req.method === 'POST') {
        
        if (!isWhatsappReady) {
            console.log('Tentativa de envio, mas o WhatsApp não está pronto.');
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Serviço indisponível. Cliente WhatsApp não está pronto.' }));
            return;
        }

        // Lógica para extrair dados do corpo da requisição (ex: número e nome do lead)
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) req.connection.destroy(); // 1MB
        });

        req.on('end', async () => {
            try {
                const { name, phone } = JSON.parse(body);

                if (!name || !phone) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Campos "name" e "phone" são obrigatórios.' }));
                    return;
                }

                const numeroCompleto = `${phone}@c.us`; // Formato do whatsapp-web.js
                const mensagem = `Olá, ${name}! Esta é uma mensagem de teste disparada via API.`;

                await sendMessageToLead(numeroCompleto, mensagem);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: `Mensagem enviada para ${name}.` }));

            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Erro nos dados fornecidos. Envie um JSON com "name" e "phone".', error: error.message }));
            }
        });

    } else if (req.url === '/enviar-whatsapp' && req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Método não permitido. Use POST.' }));
        return;
    } else {
        // Resposta padrão para outras rotas
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Endpoint não encontrado. Use POST /enviar-whatsapp.');
    }
});

// --- FUNÇÃO DE ENVIO ---
/**
 * Envia uma mensagem para um número específico.
 * @param {string} number - O número do destinatário no formato '5511..._@c.us'.
 * @param {string} text - O texto da mensagem.
 */
async function sendMessageToLead(number, text) {
    try {
        console.log(`Enviando mensagem para: ${number}`);
        await client.sendMessage(number, text);
        console.log('Mensagem enviada com sucesso!');
    } catch (error) {
        console.error('Ocorreu um erro ao enviar a mensagem:', error);
        throw error; // Propaga o erro para ser tratado na resposta do servidor
    }
}

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = 3000;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor rodando em http://127.0.0.1:${PORT}`);
  console.log('Para testar, envie uma requisição POST para http://127.0.0.1:3000/enviar-whatsapp');
});