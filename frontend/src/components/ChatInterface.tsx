import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Send,
  Person,
  SmartToy,
  Clear,
  MoreVert,
  Download,
  ContentCopy
} from '@mui/icons-material';
import { apiService } from '../services/api.ts';
import { ChatMessage, ChatRequest, ChatResponse } from '../types/api.ts';
import { useGraph } from '../contexts/GraphContext.tsx';

interface ChatInterfaceProps {
  onMessageSent?: (message: ChatMessage) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onMessageSent }) => {
  const { selectedGraph } = useGraph();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize session
  useEffect(() => {
    if (selectedGraph) {
      setSessionId(`session_${selectedGraph.graph_id}_${Date.now()}`);
      setMessages([]);
      setError(null);
    }
  }, [selectedGraph]);

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedGraph || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      session_id: sessionId
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const chatRequest: ChatRequest = {
        message: userMessage.content,
        graph_id: selectedGraph.graph_id,
        session_id: sessionId,
        include_sources: true,
        max_tokens: 500
      };

      const response = await apiService.sendChatMessage(chatRequest);
      const responseData: ChatResponse = response.data;

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: responseData.response,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        sources: responseData.sources,
        context_nodes: responseData.context_nodes
      };

      setMessages(prev => [...prev, assistantMessage]);
      onMessageSent?.(assistantMessage);

    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(`session_${selectedGraph?.graph_id}_${Date.now()}`);
    setError(null);
    setMenuAnchor(null);
  };

  const exportChat = () => {
    const chatData = {
      graph_id: selectedGraph?.graph_id,
      graph_name: selectedGraph?.name,
      session_id: sessionId,
      messages: messages,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_${selectedGraph?.name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuAnchor(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    
    return (
      <ListItem key={message.id} sx={{ display: 'block', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar sx={{ bgcolor: isUser ? 'primary.main' : 'secondary.main' }}>
            {isUser ? <Person /> : <SmartToy />}
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                {isUser ? 'You' : 'AI Assistant'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTimestamp(message.timestamp)}
              </Typography>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(message.content)}
                sx={{ ml: 'auto' }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Box>
            
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
              {message.content}
            </Typography>
            
            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Sources:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {message.sources.map((source, index) => (
                    <Chip
                      key={index}
                      label={`${source.type}: ${source.content.substring(0, 50)}...`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {/* Context Nodes */}
            {message.context_nodes && message.context_nodes.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Related concepts:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {message.context_nodes.map((node, index) => (
                    <Chip
                      key={index}
                      label={`${node.type}: ${node.node_id}`}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </ListItem>
    );
  };

  if (!selectedGraph) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Select a graph to start chatting
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Choose a knowledge graph from the sidebar to begin asking questions
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6">
            Chat with {selectedGraph.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ask questions about the knowledge in this graph
          </Typography>
        </Box>
        
        <Box>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={clearChat}>
              <Clear sx={{ mr: 1 }} />
              Clear Chat
            </MenuItem>
            <MenuItem onClick={exportChat} disabled={messages.length === 0}>
              <Download sx={{ mr: 1 }} />
              Export Chat
            </MenuItem>
          </Menu>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Messages */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'auto', maxHeight: '60vh' }}>
          {messages.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <SmartToy sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Start a conversation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ask me anything about the knowledge in this graph!
              </Typography>
              <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {[
                  "What are the main concepts?",
                  "How are entities related?",
                  "What patterns do you see?",
                  "Summarize the key insights"
                ].map((suggestion) => (
                  <Chip
                    key={suggestion}
                    label={suggestion}
                    onClick={() => setInput(suggestion)}
                    clickable
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {messages.map((message, index) => (
                <React.Fragment key={message.id}>
                  {renderMessage(message)}
                  {index < messages.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {isLoading && (
                <ListItem sx={{ justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    AI is thinking...
                  </Typography>
                </ListItem>
              )}
            </List>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Divider />
        <Box sx={{ p: 2, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this knowledge graph..."
            disabled={isLoading}
            variant="outlined"
            size="small"
          />
          <Tooltip title="Send message (Enter)">
            <IconButton
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              color="primary"
              sx={{ mb: 0.5 }}
            >
              <Send />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatInterface;
