class FileEncryptor {
    constructor() {
        this.API_BASE = '/api'; // --> Update with your actual API path <--
        this.currentFile = null;
        this.currentOperation = null;

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.encryptUploadArea = document.getElementById('encrypt-upload');
        this.encryptFileInput = document.getElementById('encrypt-file-input');
        this.encryptPassword = document.getElementById('encrypt-password');
        this.encryptBtn = document.getElementById('encrypt-btn');

        this.decryptUploadArea = document.getElementById('decrypt-upload');
        this.decryptFileInput = document.getElementById('decrypt-file-input');
        this.decryptPassword = document.getElementById('decrypt-password');
        this.decryptBtn = document.getElementById('decrypt-btn');

        this.progressContainer = document.getElementById('progress-container');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');

        this.logContainer = document.getElementById('log-container');
        this.clearLogBtn = document.getElementById('clear-log');

        this.passwordToggles = document.querySelectorAll('.toggle-password');
    }

    initEventListeners() {
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        this.setupFileUpload(this.encryptUploadArea, this.encryptFileInput, 'encrypt');
        this.setupFileUpload(this.decryptUploadArea, this.decryptFileInput, 'decrypt');

        this.encryptPassword.addEventListener('input', () => this.validateEncryptForm());
        this.decryptPassword.addEventListener('input', () => this.validateDecryptForm());

        this.encryptBtn.addEventListener('click', () => this.encryptFile());
        this.decryptBtn.addEventListener('click', () => this.decryptFile());

        this.clearLogBtn.addEventListener('click', () => this.clearLog());

        this.passwordToggles.forEach(btn => {
            btn.addEventListener('click', () => this.togglePassword(btn));
        });
    }

    switchTab(tab) {
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tab}-tab`);
        });

        this.log('info', `Switched to ${tab} tab`);
    }

    setupFileUpload(uploadArea, fileInput, type) {
        uploadArea.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0], type);
            }
        });

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0], type);
            }
        });
    }

    handleFileSelect(file, type) {
        if (type === 'decrypt' && !file.name.endsWith('.enc')) {
            this.log('error', 'Invalid file. Please select an encrypted (.enc) file');
            return;
        }

        this.currentFile = file;

        const uploadArea = type === 'encrypt' ? this.encryptUploadArea : this.decryptUploadArea;
        uploadArea.classList.add('has-file');
        uploadArea.querySelector('.upload-text').textContent = file.name;
        uploadArea.querySelector('.upload-hint').textContent = `Size: ${this.formatFileSize(file.size)}`;

        this.log('info', `Selected file: ${file.name} (${this.formatFileSize(file.size)})`);

        if (type === 'encrypt') {
            this.validateEncryptForm();
        } else {
            this.validateDecryptForm();
        }
    }

    validateEncryptForm() {
        const hasFile = this.currentFile !== null && this.encryptUploadArea.classList.contains('has-file');
        const hasPassword = this.encryptPassword.value.length > 0;
        this.encryptBtn.disabled = !(hasFile && hasPassword);
    }

    validateDecryptForm() {
        const hasFile = this.currentFile !== null && this.decryptUploadArea.classList.contains('has-file');
        const hasPassword = this.decryptPassword.value.length > 0;
        this.decryptBtn.disabled = !(hasFile && hasPassword);
    }

    async encryptFile() {
        if (!this.currentFile || !this.encryptPassword.value) return;

        this.currentOperation = 'encrypt';
        this.setLoading(true, 'encrypt');
        this.showProgress();

        try {
            this.log('info', 'Starting encryption...');

            const response = await fetch(`${this.API_BASE}/encrypt.php`, {
                method: 'PUT',
                headers: {
                    'X-Password': this.encryptPassword.value,
                    'Content-Type': 'application/octet-stream'

                },
                body: this.currentFile
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                this.updateProgress(Math.min(95, (receivedLength / 1024) * 2));
            }

            const blob = new Blob(chunks);
            this.updateProgress(100);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.currentFile.name + '.enc';
            a.click();
            URL.revokeObjectURL(url);

            this.log('success', `File encrypted successfully: ${a.download}`);
            this.resetEncryptForm();

        } catch (error) {
            this.log('error', `Encryption failed: ${error.message}`);
        } finally {
            this.setLoading(false, 'encrypt');
            this.hideProgress();
        }
    }

    async decryptFile() {
        if (!this.currentFile || !this.decryptPassword.value) return;

        this.currentOperation = 'decrypt';
        this.setLoading(true, 'decrypt');
        this.showProgress();

        try {
            this.log('info', 'Starting decryption...');

            const response = await fetch(`${this.API_BASE}/decrypt.php`, {
                method: 'PUT',
                headers: {
                    'X-Password': this.decryptPassword.value
                },
                body: this.currentFile
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                this.updateProgress(Math.min(95, (receivedLength / 1024) * 2));
            }

            const blob = new Blob(chunks);
            this.updateProgress(100);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.currentFile.name.replace('.enc', '');
            a.click();
            URL.revokeObjectURL(url);

            this.log('success', `File decrypted successfully: ${a.download}`);
            this.resetDecryptForm();

        } catch (error) {
            this.log('error', `Decryption failed: ${error.message}`);
        } finally {
            this.setLoading(false, 'decrypt');
            this.hideProgress();
        }
    }

    setLoading(loading, type) {
        const btn = type === 'encrypt' ? this.encryptBtn : this.decryptBtn;

        if (loading) {
            btn.classList.add('loading');
            btn.disabled = true;
        } else {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }

    showProgress() {
        this.progressContainer.classList.add('show');
        this.updateProgress(0);
    }

    hideProgress() {
        setTimeout(() => {
            this.progressContainer.classList.remove('show');
            this.updateProgress(0);
        }, 1000);
    }

    updateProgress(percent) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `${Math.round(percent)}%`;
    }

    resetEncryptForm() {
        this.encryptFileInput.value = '';
        this.encryptPassword.value = '';
        this.encryptUploadArea.classList.remove('has-file');
        this.encryptUploadArea.querySelector('.upload-text').textContent = 'Drop file here or click to browse';
        this.encryptUploadArea.querySelector('.upload-hint').textContent = 'Your file will be encrypted client-side';
        this.currentFile = null;
        this.validateEncryptForm();
    }

    resetDecryptForm() {
        this.decryptFileInput.value = '';
        this.decryptPassword.value = '';
        this.decryptUploadArea.classList.remove('has-file');
        this.decryptUploadArea.querySelector('.upload-text').textContent = 'Drop encrypted file here or click to browse';
        this.decryptUploadArea.querySelector('.upload-hint').textContent = 'Only .enc files are accepted';
        this.currentFile = null;
        this.validateDecryptForm();
    }

    togglePassword(btn) {
        const input = document.getElementById(btn.dataset.target);
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;

        const svg = btn.querySelector('svg');
        if (type === 'text') {
            svg.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            svg.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    }

    log(type, message) {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message">${message}</span>
        `;

        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    clearLog() {
        this.logContainer.innerHTML = '';
        this.log('info', 'Log cleared');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FileEncryptor();
});