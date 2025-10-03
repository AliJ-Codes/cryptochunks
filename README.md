# STREAMENCRYPTOR — XChaCha20-Poly1305 File Streaming Encryptor 🔐🚀

## Description:
A lightweight, high-performance file encryption service using PHP's Sodium extension.
It encrypts/decrypts files as streams with XChaCha20-Poly1305, processing files in chunks
so nothing needs to be fully written to disk and memory usage stays low. Frontend is
vanilla HTML/CSS/JavaScript and backend is pure PHP (no Composer). Communication between
frontend and backend is via a small HTTP API.

## ✨ Features
- Streaming encryption/decryption with sodium (XChaCha20-Poly1305)
- Chunked processing (configurable chunk size, e.g., 64 KiB)
- No Composer or third-party PHP libs — pure ext-sodium
- Frontend: HTML / CSS / JS (uses streaming Fetch APIs)
- Minimal memory footprint — suitable for large files

## ⚙️ Requirements
- PHP 8.x with sodium extension enabled
- Modern browser (supports streaming fetch)
- HTTPS recommended for production

## 🔧 Quick dev setup
### 1) Clone locally:
   git clone https://github.com/AliJ-Codes/cryptochunks.git
   cd streamencryptor

### 2) Run PHP built-in server for testing:
   php -S 127.0.0.1:8080 -t public

## 📡 API endpoints
PUT /api/encrypt.php
- Response: streamed encrypted bytes (secretstream header + frames)

PUT /api/decrypt.php
- Response: streamed decrypted bytes

## 🛡️ Security notes
- Use HTTPS in production.
- Add auth / rate-limiting.

### ⚠️ Security Disclaimer  
This project is a proof-of-concept and does not implement advanced security mechanisms such as authentication, authorization, rate limiting, CSRF protection, or intrusion prevention.  
Do **not** expose the API directly to the public Internet without adding proper security layers.  
Use it only for educational purposes or within a controlled environment.

## 📄 License — Use & Distribution (Non-Commercial) 🛑💼❌
This project is licensed under **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** — in plain words:

- ✅ You **may** use, copy, modify, and share this software and its source code for **non-commercial** purposes.
- ✅ You **may** fork the repository, make improvements, and share those improvements publicly for free.
- ✅ You **must** give appropriate credit to the original author when you redistribute or publish the code (attribution).
- ❌ You **may NOT** sell the software or any derivative works, nor may you offer it for commercial distribution or charge users for it.
- ❌ You **may NOT** use this project as part of a paid product or service without obtaining a separate commercial license from the author.

#### ❤️☕ Coded with love and tea  
