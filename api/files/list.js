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

    // Obtener archivos del usuario
    const result = await pool.query(
      `SELECT 
        f.id, 
        f.filename, 
        f.original_name, 
        f.file_size, 
        f.mime_type, 
        f.is_shared, 
        f.uploaded_at,
        f.cloudinary_url,
        u.username as uploaded_by
       FROM files f
       JOIN users u ON f.user_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.uploaded_at DESC`,
      [req.user.id]
    );

    const files = result.rows.map(file => ({
      id: file.id.toString(),
      filename: file.filename,
      original_name: file.original_name,
      size: file.file_size,
      type: file.mime_type,
      is_shared: file.is_shared,
      uploaded_at: file.uploaded_at,
      uploaded_by: file.uploaded_by,
      url: file.cloudinary_url
    }));

    res.json(files);

  } catch (error) {
    console.error('Error al obtener archivos:', error);
    res.status(500).json({ error: 'Error al obtener archivos' });
  }
};