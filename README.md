# Assistente Comercial 3Cor - Automação WhatsApp

Automatize disparos comerciais via WhatsApp de forma simples e eficiente!  
Este projeto permite conectar seu WhatsApp, enviar mensagens para contatos individuais ou em lote via CSV, e acompanhar o status do envio.

## Funcionalidades

- **Conexão rápida com WhatsApp Web**
- **Envio de mensagens automáticas para leads**
- **Upload de contatos via arquivo CSV**
- **Feedback visual do status de conexão**
- **Interface moderna com Tailwind CSS**
- **Template CSV para facilitar o cadastro de contatos**

## Estrutura do Projeto

```
Automação Web/
├── server.mjs              # Backend Node.js (WhatsApp + API)
├── .gitignore
├── package.json
├── package-lock.json
├── img/                    # Imagens e logos
├── frontend/
│   ├── index.html          # Interface web
│   ├── style.css           # Estilos customizados
│   ├── app.js              # Lógica JS do frontend
│   ├── template.csv        # Modelo de arquivo para upload de contatos
```

## Instalação

1. **Clone o repositório:**
   ```sh
   git clone https://github.com/thalesbregantin/automacao-whatsapp.git
   cd automacao-whatsapp
   ```

2. **Instale as dependências:**
   ```sh
   npm install whatsapp-web.js qrcode-terminal
   ```

3. **Inicie o servidor:**
   ```sh
   node server.mjs
   ```
   O servidor estará disponível em `http://127.0.0.1:3000`.

## Como Usar

1. **Abra o arquivo `frontend/index.html` no navegador.**
2. **Etapa 1:** Escaneie o QR Code com o WhatsApp do seu celular.
3. **Etapa 2:** Faça upload do arquivo CSV com os contatos.
4. **Etapa 3:** Envie o CSV para disparar as mensagens.

> O template do CSV está disponível para download na interface.

## Exemplo de template CSV

```
nome,numero
João,5511999999999
Maria,5511988888888
```

## Tecnologias Utilizadas

- Node.js
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- Tailwind CSS
- Font Awesome

## Observações

- O WhatsApp precisa estar conectado para enviar mensagens.
- O backend salva a sessão localmente para evitar escanear o QR code toda vez.
- O envio em lote é limitado para evitar bloqueios.

## Licença

MIT

---

Desenvolvido por [Thales Bregantin](https://github.com/thalesbregantin)
