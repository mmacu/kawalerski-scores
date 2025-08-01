import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Box, 
  Chip,
  CircularProgress,
  Alert 
} from '@mui/material';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

function Players() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { getAvailableUsers } = useApi();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAvailableUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'mini_admin': return 'warning';
      case 'player': return 'default';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'mini_admin': return 'Mini Admin';
      case 'player': return 'Player';
      default: return role;
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h3" component="h1" gutterBottom>
        Players
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        All registered players in the Mini Olympics system
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {users.map((user) => (
          <Grid item xs={12} sm={6} md={4} key={user.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {user.display_name || user.username}
                    </Typography>
                    {user.display_name && (
                      <Typography variant="body2" color="text.secondary">
                        @{user.username}
                      </Typography>
                    )}
                  </Box>
                  <Chip 
                    label={getRoleLabel(user.role)} 
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                </Box>

                {/* Statistics Section */}
                {user.matches_played > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Games:</strong> {user.matches_played}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Record:</strong> {user.wins}W - {user.losses}L ({user.win_percentage}%)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      <strong>Tickets:</strong> {user.tickets_total} ({user.efficiency}% efficiency)
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No games played yet
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default Players;