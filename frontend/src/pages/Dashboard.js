import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PlayersIcon,
  SportsSoccer as MatchesIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as GamesIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

function StatCard({ title, value, icon, color = 'primary' }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalMatches: 0,
    completedMatches: 0,
    totalGames: 0
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { getAvailableUsers, getMatches, getGames, getLeaderboard } = useApi();
  const { user } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [users, matches, games, leaderboardData] = await Promise.all([
        getAvailableUsers(),
        getMatches(),
        getGames(),
        getLeaderboard()
      ]);

      setStats({
        totalPlayers: users.length,
        totalMatches: matches.length,
        completedMatches: matches.filter(m => m.status === 'completed').length,
        totalGames: games.length
      });
      
      setLeaderboard(leaderboardData.slice(0, 5)); // Top 5 for dashboard
      
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
        Welcome back, {user?.display_name || user?.username}!
      </Typography>
      
      <Typography variant="h5" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Mini Olympics Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Players"
            value={stats.totalPlayers}
            icon={<PlayersIcon sx={{ fontSize: 40 }} />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Matches"
            value={stats.totalMatches}
            icon={<MatchesIcon sx={{ fontSize: 40 }} />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed Matches"
            value={stats.completedMatches}
            icon={<TrophyIcon sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Game Types"
            value={stats.totalGames}
            icon={<GamesIcon sx={{ fontSize: 40 }} />}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top 5 Leaderboard
              </Typography>
              {leaderboard.length === 0 ? (
                <Typography color="text.secondary">
                  No players have competed yet.
                </Typography>
              ) : (
                <Box>
                  {leaderboard.map((player, index) => (
                    <Box
                      key={player.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        borderBottom: index < leaderboard.length - 1 ? '1px solid #eee' : 'none'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="h6" color="primary">
                          #{player.rank}
                        </Typography>
                        <Typography variant="body1">
                          {player.display_name}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="success.main">
                          {player.efficiency}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {player.tickets_total} tickets
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {['admin', 'mini_admin'].includes(user?.role) && (
                  <>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                      • Create new match
                    </Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                      • Manage players
                    </Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                      • View detailed results
                    </Typography>
                  </>
                )}
                <Typography variant="body2" color="text.secondary">
                  • Check leaderboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • View match history
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Dashboard;