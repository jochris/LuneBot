# Lune WhatsApp Bot 🌙

Bot WhatsApp sederhana, cepat, dan modular yang dibangun menggunakan library [Baileys (@itsliaaa/baileys)](https://www.npmjs.com/package/@itsliaaa/baileys). Proyek ini dikonfigurasi khusus menggunakan runtime **Bun** dan database **SQLite** bawaan (`bun:sqlite`) sebagai pengganti cache memori (*in-memory store*).

## Fitur & Perintah (Commands)

Semua perintah menggunakan awalan/prefix yang dapat disesuaikan melalui konfigurasi `.env` (defaultnya adalah titik `.`).

*   **[prefix]menu** / **[prefix]help** - Menampilkan daftar perintah yang tersedia.
*   **[prefix]ping** - Memeriksa kecepatan respon dan koneksi bot.
*   **[prefix]runtime** - Menampilkan durasi bot telah aktif/berjalan.
*   **[prefix]say <teks>** - Membuat bot mengirimkan kembali teks yang Anda masukkan.
*   **[prefix]owner** - Menampilkan informasi kontak pemilik bot.

## Konfigurasi

Sebelum menjalankan bot, Anda dapat menyesuaikan pengaturan pada berkas **[.env](file:///root/lune/.env)**:
*   `BOT_NAME`: Nama tampilan bot Anda (contoh: `LuneBot`).
*   `OWNER_NUMBER`: Nomor WhatsApp pemilik bot (contoh: `62895416602000`).
*   `PREFIX`: Simbol awalan perintah bot (contoh: `.`).

## Instalasi & Cara Menjalankan

### 1. Prasyarat
Pastikan Anda memiliki:
*   [Bun](https://bun.sh/) versi terbaru (direkomendasikan v1.x).
*   Koneksi internet yang stabil.
*   Aplikasi WhatsApp di HP untuk memasukkan Pairing Code.

### 2. Instalasi Dependensi
Instal paket-paket yang diperlukan menggunakan Bun:
```bash
bun install
```

### 3. Menjalankan Bot
Mulai bot dengan perintah:
```bash
bun start
```

Setelah bot berjalan:
1.  Masukkan nomor telepon WhatsApp Anda di terminal (contoh: `628123456789`).
2.  Bot akan menghasilkan **Pairing Code** (kode 8 digit).
3.  Buka WhatsApp di HP Anda -> **Perangkat Tertaut (Linked Devices)** -> **Tautkan Perangkat (Link a Device)**.
4.  Pilih **Tautkan dengan nomor telepon saja (Link with phone number instead)**.
5.  Masukkan kode 8 digit yang tertera di terminal Anda.
6.  Setelah berhasil tersambung, folder `session` akan dibuat secara otomatis untuk menyimpan sesi masuk (agar Anda tidak perlu memasukkan pairing code lagi saat menjalankan ulang bot). Database SQLite `session/store.db` juga akan dibuat secara otomatis untuk menyimpan cache kontak dan grup.
