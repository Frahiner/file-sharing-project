import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface FileItem {
  id: number;
  filename: string;
  originalName: string;
  size: number;
  uploadDate: string;
  shareToken?: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareLinks, setShareLinks] = useState<{ [key: number]: string }>({});
  const [message, setMessage] = useState('');

  // Cargar archivos del usuario
  const loadFiles = async () => {
    try {
      const response = await axios.get('/api/files/list', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error loading files:', error);
      setMessage('Error al cargar archivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  // Manejar selección de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Subir archivo
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage('Archivo subido exitosamente');
      setSelectedFile(null);
      // Limpiar el input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Recargar la lista de archivos
      loadFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setMessage(error.response?.data?.error || 'Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  // Descargar archivo
  const handleDownload = async (fileId: number, filename: string) => {
    try {
      const response = await axios.get(`/api/files/download?fileId=${fileId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob'
      });

      // Crear URL para descargar
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      setMessage('Error al descargar archivo');
    }
  };

  // Generar enlace de compartir
  const handleShare = async (fileId: number) => {
    try {
      const response = await axios.post('/api/files/share', 
        { fileId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const shareUrl = `${window.location.origin}/shared/${response.data.token}`;
      setShareLinks(prev => ({
        ...prev,
        [fileId]: shareUrl
      }));
      
      setMessage('Enlace de compartir generado');
    } catch (error) {
      console.error('Error sharing file:', error);
      setMessage('Error al generar enlace de compartir');
    }
  };

  // Copiar enlace al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage('Enlace copiado al portapapeles');
    });
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando archivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Mis Archivos</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Hola, {user?.username}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Upload Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Subir Archivo</h2>
            <div className="flex items-center space-x-4">
              <input
                id="fileInput"
                type="file"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium"
              >
                {uploading ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Archivo seleccionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          {/* Message */}
          {message && (
            <div className="mb-6 p-4 rounded-md bg-blue-50 border border-blue-200">
              <p className="text-blue-800">{message}</p>
            </div>
          )}

          {/* Files List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Archivos Subidos ({files.length})
              </h2>
            </div>
            
            {files.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No tienes archivos subidos aún</p>
                <p className="text-sm mt-2">Sube tu primer archivo usando el formulario de arriba</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {files.map((file) => (
                    <li key={file.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.originalName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(file.size)} • {formatDate(file.uploadDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDownload(file.id, file.originalName)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Descargar
                          </button>
                          <button
                            onClick={() => handleShare(file.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Compartir
                          </button>
                        </div>
                      </div>
                      
                      {/* Share Link */}
                      {shareLinks[file.id] && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-600 mb-2">Enlace de compartir:</p>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={shareLinks[file.id]}
                              readOnly
                              className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                              onClick={() => copyToClipboard(shareLinks[file.id])}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                            >
                              Copiar
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;