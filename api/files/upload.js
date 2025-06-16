const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { uploadFile } = require('../cloudinary');
const multer = require('multer');

// Configurar multer para memoria
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: function (req, file, cb) {
    // Filtrar tipos de archivo peligrosos
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|doc|docx|xls|xlsx|zip|rar|mp4|mp3|avi|mov/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Procesar el archivo con multer
    const uploadMiddleware = upload.single('file');
    
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

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

    if (!req.file) {
      return res.status(400).json({ error: 'No se seleccionó archivo' });
    }

    // Subir archivo a Cloudinary
    const cloudinaryResult = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Guardar información en base de datos
    const result = await pool.query(
      `INSERT INTO files (user_id, filename, original_name, cloudinary_public_id, cloudinary_url, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        req.user.id,
        cloudinaryResult.public_id.split('/').pop(),
        req.file.originalname,
        cloudinaryResult.public_id,
        cloudinaryResult.secure_url,
        cloudinaryResult.bytes,
        req.file.mimetype
      ]
    );

    res.json({
      message: 'Archivo subido exitosamente',
      file: {
        id: result.rows[0].id,
        filename: req.file.originalname,
        size: cloudinaryResult.bytes,
        type: req.file.mimetype,
        url: cloudinaryResult.secure_url
      }
    });

  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ error: 'Error al subir archivo: ' + error.message });
  }
};