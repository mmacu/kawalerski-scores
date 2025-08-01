import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

function Profile() {
  const { user, setUser } = useAuth();
  const { updateDisplayName } = useApi();
  
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (displayName.length > 100) {
      setError('Display name must be 100 characters or less');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const updatedUser = await updateDisplayName(user.id, displayName.trim());
      
      // Update the user context with new display name
      setUser(prev => ({
        ...prev,
        display_name: updatedUser.display_name
      }));
      
      setSuccess('Display name updated successfully!');
    } catch (err) {
      console.error('Error updating display name:', err);
      setError(err.response?.data?.error || 'Failed to update display name');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDisplayName(user?.display_name || '');
    setError('');
    setSuccess('');
  };

  if (!user) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h3" component="h1" gutterBottom>
        Profile Settings
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Information
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Username (cannot be changed): <strong>{user.username}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Role: <strong>{user.role}</strong>
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              margin="normal"
              helperText="This is how your name appears to other users"
              inputProps={{ maxLength: 100 }}
              disabled={loading}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {success}
              </Alert>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || displayName.trim() === (user?.display_name || '')}
              >
                {loading ? <CircularProgress size={24} /> : 'Update Display Name'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Profile;