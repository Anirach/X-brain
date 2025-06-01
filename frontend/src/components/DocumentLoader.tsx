import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Description,
  CheckCircle,
  Error,
  Upload,
  Close
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { apiService } from '../services/api.ts';
import { Document } from '../types/api.ts';
import { useGraph } from '../contexts/GraphContext.tsx';

interface DocumentLoaderProps {
  onDocumentUploaded?: (document: Document) => void;
}

const DocumentLoader: React.FC<DocumentLoaderProps> = ({ onDocumentUploaded }) => {
  const { selectedGraph } = useGraph();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [metadata, setMetadata] = useState<{ [key: string]: string }>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
    setUploadDialog(true);
    setError(null);
    setSuccess(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/markdown': ['.md'],
      'application/json': ['.json']
    },
    multiple: true
  });

  const handleUpload = async () => {
    if (!selectedGraph) {
      setError('Please select a graph first');
      return;
    }

    setUploadDialog(false);
    
    for (const file of selectedFiles) {
      const fileId = `${file.name}-${Date.now()}`;
      setUploadingFiles(prev => new Set(prev).add(fileId));

      try {
        const response = await apiService.uploadDocument(
          file,
          selectedGraph.graph_id,
          true,
          true
        );
        
        // Transform DocumentResponse to Document by mapping document_id to id
        const documentData: Document = {
          ...response.data,
          id: response.data.document_id
        };
        
        setDocuments(prev => [...prev, documentData]);
        setSuccess(`Successfully uploaded ${file.name}`);
        onDocumentUploaded?.(documentData);

      } catch (err: any) {
        console.error('Upload error:', err);
        setError(`Failed to upload ${file.name}: ${err?.message || 'Unknown error'}`);
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }
    }

    setSelectedFiles([]);
    setMetadata({});
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await apiService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setSuccess('Document deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete document');
    }
  };

  const loadDocuments = useCallback(async () => {
    if (!selectedGraph) return;

    try {
      const response = await apiService.listDocuments(selectedGraph.graph_id);
      // Transform DocumentResponse array to Document array by mapping document_id to id
      const documentsData: Document[] = response.data.map((doc: any) => ({
        ...doc,
        id: doc.document_id
      }));
      setDocuments(documentsData);
    } catch (err) {
      console.error('Load documents error:', err);
      setError('Failed to load documents');
    }
  }, [selectedGraph]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Upload Area */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          mb: 3,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease'
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to select files
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Supported formats: TXT, PDF, DOC, DOCX, MD, JSON
        </Typography>
      </Paper>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Documents List */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Documents ({documents.length})
        </Typography>
        {documents.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No documents uploaded yet
          </Typography>
        ) : (
          <List>
            {documents.map((document) => (
              <ListItem key={document.id} divider>
                <Description sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText
                  primary={document.filename}
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        Uploaded: {new Date(document.uploaded_at).toLocaleString()}
                      </Typography>
                      {document.metadata?.size && (
                        <Typography variant="caption" display="block">
                          Size: {formatFileSize(parseInt(document.metadata.size))}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Box sx={{ mr: 1 }}>
                  <Chip
                    label={document.status}
                    color={getStatusColor(document.status)}
                    size="small"
                    icon={
                      document.status === 'processed' ? <CheckCircle /> :
                      document.status === 'failed' ? <Error /> : undefined
                    }
                  />
                </Box>
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteDocument(document.id)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Upload Progress */}
      {uploadingFiles.size > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Uploading {uploadingFiles.size} file(s)...
          </Typography>
          <LinearProgress />
        </Paper>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Upload Documents
          <IconButton
            onClick={() => setUploadDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Files to upload: {selectedFiles.map(f => f.name).join(', ')}
          </Typography>
          
          <TextField
            fullWidth
            label="Tags (comma-separated)"
            value={metadata.tags || ''}
            onChange={(e) => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
            margin="normal"
            placeholder="e.g., research, important, draft"
          />
          
          <TextField
            fullWidth
            label="Description"
            value={metadata.description || ''}
            onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
            margin="normal"
            multiline
            rows={3}
            placeholder="Optional description for these documents"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            startIcon={<Upload />}
            disabled={!selectedGraph}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentLoader;
