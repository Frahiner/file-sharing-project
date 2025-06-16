const { Pool } = require('pg');
require('dotenv').config();

async function initDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Conectando a la base de datos...');
    
    // Probar conexión
    const client = await pool.connect();
    console.log('✅ Conexión exitosa');
    
    // Crear tabla de usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla users creada');

    // Crear tabla de archivos
    await client.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        cloudinary_public_id VARCHAR(255) NOT NULL,
        size INTEGER NOT NULL,
        mime_type VARCHAR(100),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla files creada');

    // Crear tabla de archivos compartidos
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_files (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
        share_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla shared_files creada');

    client.release();
    console.log('✅ Base de datos inicializada correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
  } finally {
    await pool.end();
  }
}

initDatabase();