// app.js - Centraliza lógica JS do frontend
document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('csvUpload');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const submitBtn = document.getElementById('submitBtn');

    // Drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'dragenter' || eventName === 'dragover') dropArea.classList.add('dragover');
            else dropArea.classList.remove('dragover');
        });
    });

    dropArea.addEventListener('drop', e => {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        showFileInfo(files[0]);
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            showFileInfo(this.files[0]);
            removeFileBtn.style.display = 'inline-block';
        } else {
            removeFileBtn.style.display = 'none';
            feedbackMessage.classList.add('hidden');
        }
    });

    function showFileInfo(file) {
        const fileName = document.createElement('p');
        fileName.className = 'text-sm text-gray-700 mt-2 file-info';
        fileName.innerHTML = `<i class="fas fa-file-alt mr-2"></i> ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        const prevInfo = dropArea.querySelector('.file-info');
        if (prevInfo) dropArea.removeChild(prevInfo);
        dropArea.appendChild(fileName);
    }

    submitBtn.addEventListener('click', function() {
        if (!fileInput.files.length) {
            feedbackMessage.textContent = 'Por favor, selecione um arquivo CSV.';
            feedbackMessage.className = 'mt-4 p-4 rounded-lg text-center bg-red-100 text-red-800';
            feedbackMessage.classList.remove('hidden');
            return;
        }
        feedbackMessage.textContent = 'Enviando arquivo...';
        feedbackMessage.className = 'mt-4 p-4 rounded-lg text-center bg-blue-100 text-blue-800';
        feedbackMessage.classList.remove('hidden');
        fetch('http://127.0.0.1:3000/upload-csv', {
            method: 'POST',
            body: fileInput.files[0],
            headers: { 'Content-Type': 'text/csv' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let msg = `Contatos enviados: <b>${data.enviados}</b>`;
                if (data.erros && data.erros.length > 0) {
                    msg += `<br><span class='text-red-700'>Erros:</span><ul class='text-left mx-auto inline-block'>`;
                    data.erros.forEach(e => {
                        msg += `<li>Linha ${e.linha}: ${e.erro}</li>`;
                    });
                    msg += '</ul>';
                }
                feedbackMessage.innerHTML = msg;
                feedbackMessage.className = 'mt-4 p-4 rounded-lg text-center bg-green-100 text-green-800';
            } else {
                feedbackMessage.textContent = 'Erro ao enviar. Por favor, tente novamente.';
                feedbackMessage.className = 'mt-4 p-4 rounded-lg text-center bg-red-100 text-red-800';
            }
            feedbackMessage.classList.remove('hidden');
        })
        .catch(() => {
            feedbackMessage.textContent = 'Erro ao enviar. Por favor, tente novamente.';
            feedbackMessage.className = 'mt-4 p-4 rounded-lg text-center bg-red-100 text-red-800';
            feedbackMessage.classList.remove('hidden');
        });
    });

    removeFileBtn.addEventListener('click', function() {
        fileInput.value = '';
        removeFileBtn.style.display = 'none';
        feedbackMessage.classList.add('hidden');
        const fileInfo = dropArea.querySelector('.file-info');
        if (fileInfo) dropArea.removeChild(fileInfo);
    });

    // WhatsApp status check
    let etapaAtual = 1; // 1 = aguardando conexão, 2 = upload CSV, 3 = envio
    const stepQr = document.getElementById('stepQr');
    const stepUpload = document.getElementById('stepUpload');
    const stepSend = document.getElementById('stepSend');
    const statusSpan = document.getElementById('statusText'); // Usa o status do WhatsApp no topo

    function checarStatusWhatsapp() {
        fetch('http://127.0.0.1:3000/status')
            .then(res => res.json())
            .then(data => {
                if (data.connected) {
                    statusSpan.textContent = data.user ? `Conectado: ${data.user}` : 'Conectado!';
                    if (etapaAtual === 1) {
                        etapaAtual = 2;
                        stepQr.classList.add('hidden');
                        stepUpload.classList.remove('hidden');
                        stepSend.classList.add('hidden');
                    }
                } else {
                    statusSpan.textContent = 'Aguardando conexão...';
                    stepQr.classList.remove('hidden');
                    stepUpload.classList.add('hidden');
                    stepSend.classList.add('hidden');
                    etapaAtual = 1;
                }
            })
            .catch(() => {
                statusSpan.textContent = 'Erro ao verificar status.';
            });
    }

    // Checa status a cada 2 segundos
    setInterval(checarStatusWhatsapp, 2000);
    checarStatusWhatsapp();
});
