import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

function Games() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGame, setNewGame] = useState({
    name: '',
    type: '',
    min_players: '',
    max_players: '',
    time_factor: 1.0
  });

  const { getGames, createGame } = useApi();
  const { user } = useAuth();

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    try {
      setLoading(true);
      const data = await getGames();
      setGames(data);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async () => {
    try {
      await createGame({
        ...newGame,
        min_players: parseInt(newGame.min_players),
        max_players: newGame.max_players ? parseInt(newGame.max_players) : null,
        time_factor: parseFloat(newGame.time_factor)
      });
      setCreateDialogOpen(false);
      setNewGame({
        name: '',
        type: '',
        min_players: '',
        max_players: '',
        time_factor: 1.0
      });
      loadGames(); // Refresh the list of games
    } catch (err) {
      console.error('Error creating game:', err);
      setError(err.response?.data?.error || 'Failed to create game');
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h3" component="h1">
          Games
        </Typography>
        {user?.role === 'admin' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Game
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Min Players</TableCell>
              <TableCell>Max Players</TableCell>
              <TableCell>Time Factor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {games.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No games available.
                </TableCell>
              </TableRow>
            ) : (
              games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell>{game.name}</TableCell>
                  <TableCell>{game.type}</TableCell>
                  <TableCell>{game.min_players}</TableCell>
                  <TableCell>{game.max_players || 'N/A'}</TableCell>
                  <TableCell>{game.time_factor}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Game Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Game</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Game Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newGame.name}
            onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="game-type-label">Game Type</InputLabel>
            <Select
              labelId="game-type-label"
              id="game-type"
              value={newGame.type}
              label="Game Type"
              onChange={(e) => setNewGame({ ...newGame, type: e.target.value })}
            >
              <MenuItem value="team">Team</MenuItem>
              <MenuItem value="individual">Individual</MenuItem>
              <MenuItem value="tournament">Tournament</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            id="min_players"
            label="Minimum Players"
            type="number"
            fullWidth
            variant="outlined"
            value={newGame.min_players}
            onChange={(e) => setNewGame({ ...newGame, min_players: e.target.value })}
          />
          <TextField
            margin="dense"
            id="max_players"
            label="Maximum Players (Optional)"
            type="number"
            fullWidth
            variant="outlined"
            value={newGame.max_players}
            onChange={(e) => setNewGame({ ...newGame, max_players: e.target.value })}
          />
          <TextField
            margin="dense"
            id="time_factor"
            label="Time Factor (e.g., 1.0, 1.5)"
            type="number"
            step="0.1"
            fullWidth
            variant="outlined"
            value={newGame.time_factor}
            onChange={(e) => setNewGame({ ...newGame, time_factor: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGame} variant="contained" disabled={!newGame.name || !newGame.type || !newGame.min_players}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Games;