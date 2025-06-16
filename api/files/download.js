const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// Middleware para verificar token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'clave_secreta_muy_segura', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Verificar autenticación
    await new Promise((resolve, reject) => {
      authenticateToken(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const fileId = req.query.id;
    
    if (!fileId) {
      return res.status(400).json({ error: 'ID de archivo requerido' });
    }

    // Buscar archivo
    const result = await pool.query(
      'SELECT * FROM files WHERE id = $1 AND user_id = $2',
      [fileId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const file = result.rows[0];

    // Redirigir a la URL de Cloudinary
    res.redirect(file.cloudinary_url);

  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({ error: 'Error al descargar archivo' });
  }
};