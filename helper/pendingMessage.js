const startTime = Math.floor(Date.now() / 1000);

/**
 * Memeriksa apakah pesan merupakan pesan tertunda (pending/historical message)
 * yang dikirim saat bot sedang offline (sebelum proses bot dimulai).
 * 
 * @param {object} m Objek pesan ter-serialisasi
 * @returns {boolean} True jika pesan merupakan pesan tertunda
 */
export function isPendingMessage(m) {
    if (!m || !m.raw || !m.raw.messageTimestamp) return false;
    const msgTimestamp = Number(m.raw.messageTimestamp);
    return msgTimestamp < startTime;
}
