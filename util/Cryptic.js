const crypto = require('crypto');

module.exports = {
  encrypt: (data, EncryptionMethod, Key, EncryptionIV) => {
    const cipher = crypto.createCipheriv(EncryptionMethod, Key, EncryptionIV)
    return Buffer.from(
      cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
    ).toString('base64') // Encrypts data and converts to hex and base64
  },

  decrypt: (data, EncryptionMethod, Key, EncryptionIV) => {
    const buff = Buffer.from(data, 'base64')
    const decipher = crypto.createDecipheriv(EncryptionMethod, Key, EncryptionIV)
    return (
      decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
      decipher.final('utf8')
    ) // Decrypts data and converts to utf8
  }
}