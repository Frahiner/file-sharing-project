const jwt = require('jsonwebtoken');
const { pool } = require('../db');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_muy_segura');
    } catch (error) {
      return res.status(401).json({ error: 'Token de compartición inválido o expirado' });
    }

    // Buscar archivo compartido
    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1 AND is_shared = TRUE AND share_token = $2',
      [decoded.fileId, token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo compartido no encontrado' });
    }

    const file = result.rows[0];

    // Redirigir directamente a Cloudinary con headers de descarga
    res.redirect(file.cloudinary_url);

  } catch (error) {
    console.error('Error al acceder archivo compartido:', error);
    res.status(500).json({ error: 'Error al acceder archivo compartido' });
  }
};