// server.mjs

// --- MÓDULOS E BIBLIOTECAS ---
// Para instalar: npm install whatsapp-web.js qrcode-terminal
import http from 'node:http'; // Usando import para o servidor HTTP
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import fs from 'fs';

// --- CONFIGURAÇÃO DO WHATSAPP ---
console.log('Iniciando o cliente de WhatsApp...');
const client = new Client({
    authStrategy: new LocalAuth() // Salva a sessão para não escanear o QR code sempre
});

// Flag para sabermos quando o WhatsApp está pronto para enviar mensagens
let isWhatsappReady = false;
let lastQr = null;
let connectedUser = null;

client.on('qr', (qr) => {
    console.log('QR Code recebido! Escaneie com o seu celular para conectar.');
    qrcode.generate(qr, { small: true });
    lastQr = qr;
});

client.on('ready', async () => {
    console.log('Cliente WhatsApp está pronto e conectado!');
    isWhatsappReady = true;
    lastQr = null; // Limpa o QR code após conexão
    try {
        const info = await client.getMe();
        connectedUser = info.id._serialized || info.id.user || null;
        console.log('Usuário conectado:', connectedUser); // Adiciona log para depuração
    } catch (e) {
        connectedUser = null;
    }
});

client.on('auth_failure', msg => {
    console.error('FALHA NA AUTENTICAÇÃO:', msg);
});

// Inicia a conexão com o WhatsApp
client.initialize();


// --- CONFIGURAÇÃO DO SERVIDOR HTTP ---
const server = http.createServer(async (req, res) => {
    // Habilita CORS para todas as rotas
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responde OPTIONS para pré-flight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

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
    } else if (req.url === '/upload-csv' && req.method === 'POST') {
        let data = '';
        req.on('data', chunk => {
            data += chunk;
            if (data.length > 5e6) req.connection.destroy(); // Limite 5MB
        });
        req.on('end', async () => {
            // Salva o arquivo recebido
            fs.writeFileSync('upload.csv', data);

            // Função auxiliar para validar linha do CSV
            function validateCsvLine(line, idx) {
                const original = line;
                line = line.replace(/"/g, '');
                const parts = line.split(',').map(p => p.trim());
                if (parts.length !== 2) return { valid: false, error: `Linha ${idx+1}: deve conter nome e número separados por vírgula.` };
                if (!parts[0]) return { valid: false, error: `Linha ${idx+1}: nome vazio.` };
                if (!/^\d{12,15}$/.test(parts[1])) return { valid: false, error: `Linha ${idx+1}: número inválido (${parts[1]}). Deve ter 12 a 15 dígitos.` };
                return { valid: true, nome: parts[0], numero: parts[1] };
            }

            // Função para envio em lote (concorrência limitada)
            async function sendBatch(leads, mensagem, batchSize = 5) {
                let enviados = 0;
                let erros = [];
                for (let i = 0; i < leads.length; i += batchSize) {
                    const batch = leads.slice(i, i+batchSize);
                    await Promise.all(batch.map(async (lead, idx) => {
                        try {
                            await sendMessageToLead(lead.numero + '@c.us', mensagem.replace('{nome}', lead.nome));
                            enviados++;
                            console.log(`[${new Date().toISOString()}] Mensagem enviada para ${lead.nome} (${lead.numero})`);
                        } catch (err) {
                            erros.push({ linha: lead.linha, erro: err.message });
                            console.error(`[${new Date().toISOString()}] Erro ao enviar para ${lead.nome} (${lead.numero}): ${err.message}`);
                        }
                    }));
                }
                return { enviados, erros };
            }

            // Processa o CSV
            const lines = data.split(/\r?\n/)
                .map(l => l.trim().replace(/^"|"$/g, ''))
                .filter(l => l.length > 0);
            let leads = [];
            let erros = [];
            for (let i = 0; i < lines.length; i++) {
                const result = validateCsvLine(lines[i], i);
                if (result.valid) {
                    leads.push({ nome: result.nome, numero: result.numero, linha: i+1 });
                } else {
                    erros.push({ linha: i+1, erro: result.error });
                }
            }
            if (leads.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, enviados: 0, erros, message: 'Nenhum contato válido no arquivo.' }));
                return;
            }
            // Mensagem padrão (pode ser configurada depois)
            const mensagem = 'Olá, {nome}! Esta é uma mensagem de teste disparada via CSV.';
            const startTime = Date.now();
            const batchResult = await sendBatch(leads, mensagem, 5); // 5 envios simultâneos
            const totalTime = ((Date.now() - startTime)/1000).toFixed(1);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, enviados: batchResult.enviados, erros: erros.concat(batchResult.erros), tempo: totalTime, total: leads.length }));
        });
        return;
    } else if (req.url === '/qrcode' && req.method === 'GET') {
        if (lastQr) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ qr: lastQr }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'QR Code não disponível.' }));
        }
        return;
    } else if (req.url === '/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            connected: isWhatsappReady, // true quando WhatsApp está pronto
            user: connectedUser
        }));
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
        console.log(`[${new Date().toISOString()}] Enviando mensagem para: ${number}`);
        await client.sendMessage(number, text);
        console.log(`[${new Date().toISOString()}] Mensagem enviada com sucesso!`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Ocorreu um erro ao enviar a mensagem:`, error);
        throw error;
    }
}

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = 3000;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor rodando em http://127.0.0.1:${PORT}`);
  console.log('Para testar, envie uma requisição POST para http://127.0.0.1:3000/enviar-whatsapp');
});



