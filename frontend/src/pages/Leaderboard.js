import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Grid
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  LocalFireDepartment as MomentumIcon,
  Casino as JokerIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { getLeaderboard } = useApi();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return 'gold';
      case 2: return 'silver';
      case 3: return '#cd7f32'; // bronze
      default: return 'text.primary';
    }
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) {
      return <TrophyIcon sx={{ color: getRankColor(rank), mr: 1 }} />;
    }
    return null;
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
        Leaderboard
      </Typography>
      
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Rankings by efficiency percentage (tickets per match)
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {leaderboard.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="h6" align="center" color="text.secondary">
              No players have competed yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {leaderboard.map((player) => (
            <Grid item xs={12} key={player.id}>
              <Card 
                sx={{ 
                  border: player.rank <= 3 ? 2 : 1,
                  borderColor: player.rank <= 3 ? getRankColor(player.rank) : 'divider'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {getRankIcon(player.rank)}
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          color: getRankColor(player.rank),
                          fontWeight: 600 
                        }}
                      >
                        #{player.rank}
                      </Typography>
                      <Typography variant="h6">
                        {player.display_name}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {player.momentum_flag && (
                          <Chip
                            icon={<MomentumIcon />}
                            label="Momentum"
                            color="warning"
                            size="small"
                          />
                        )}
                        {!player.joker_used && (
                          <Chip
                            icon={<JokerIcon />}
                            label="Joker Available"
                            color="secondary"
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>
                    
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          color: 'success.main', 
                          fontWeight: 600 
                        }}
                      >
                        {player.efficiency}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {player.tickets_total} tickets • {player.matches_played} matches
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default Leaderboard;