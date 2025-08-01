import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Alert,
  TextField,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Collapse,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as CompleteIcon,
  Person as PlayerIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

function MatchAdmin() {
  const [matches, setMatches] = useState([]);
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [userParticipation, setUserParticipation] = useState(new Set()); // Track which matches user has joined
  const [expandedMatches, setExpandedMatches] = useState(new Set()); // Track which completed matches are expanded
  const [matchDetails, setMatchDetails] = useState({}); // Store detailed results for expanded matches
  const [jokerDeclarations, setJokerDeclarations] = useState(new Set()); // Track matches where user declared joker
  const [userHasJoker, setUserHasJoker] = useState(false); // Track if current user has joker available
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [participantsDialogOpen, setParticipantsDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [teamsDialogOpen, setTeamsDialogOpen] = useState(false);
  const [teamCompleteDialogOpen, setTeamCompleteDialogOpen] = useState(false);
  
  // Form states
  const [newMatch, setNewMatch] = useState({
    game_id: '',
    mini_admin_id: '',
    time_factor: 1.0
  });
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [matchResults, setMatchResults] = useState({
    winners: [],
    mvp_id: '',
    jokers_played: []
  });
  
  // Team states
  const [matchTeams, setMatchTeams] = useState({ teams: [], unassigned: [] });
  const [newTeamNames, setNewTeamNames] = useState(['Team 1', 'Team 2']);
  const [teamResults, setTeamResults] = useState({
    winningTeamId: '',
    mvpPlayerId: ''
  });
  
  const { 
    getMatches, 
    getGames, 
    getUsers,
    getAvailableUsers,
    createMatch, 
    addParticipant, 
    removeParticipant,
    completeMatch,
    updateMatchStatus,
    deleteMatch,
    getMatch,
    joinMatch,
    leaveMatch,
    // Team functions
    getMatchTeams,
    createMatchTeams,
    assignPlayerToTeam,
    removePlayerFromTeam,
    deleteTeam,
    completeMatchWithTeam,
    // Joker functions
    declareJoker,
    removeJokerDeclaration,
    // Participation
    getUserParticipation
  } = useApi();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load basic data that all users can access
      const [matchesData, gamesData] = await Promise.all([
        getMatches(),
        getGames()
      ]);
      
      setMatches(matchesData);
      setGames(gamesData);
      
      // Get user participation data efficiently
      try {
        const participationData = await getUserParticipation();
        setUserParticipation(new Set(Object.keys(participationData.participation)));
        setJokerDeclarations(new Set(Object.keys(participationData.jokerDeclarations)));
      } catch (err) {
        console.warn('Could not load participation data:', err);
        setUserParticipation(new Set());
        setJokerDeclarations(new Set());
      }
      
      // Load available users for match management (accessible to all authenticated users)
      try {
        const usersData = await getAvailableUsers();
        setUsers(usersData);
        
        // Check if current user has joker available
        const currentUserData = usersData.find(u => u.username === user?.username);
        setUserHasJoker(currentUserData && !currentUserData.joker_used);
      } catch (userErr) {
        console.warn('Could not load available users:', userErr);
        // Fallback: try to load full users list for admins
        if (user?.role === 'admin') {
          try {
            const adminUsersData = await getUsers();
            setUsers(adminUsersData);
            
            // Check if current user has joker available (admin fallback)
            const currentUserData = adminUsersData.find(u => u.username === user?.username);
            setUserHasJoker(currentUserData && !currentUserData.joker_used);
          } catch (adminErr) {
            console.warn('Could not load admin users data:', adminErr);
            setUsers([]);
            setUserHasJoker(false);
          }
        } else {
          setUsers([]);
          setUserHasJoker(false);
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async () => {
    try {
      await createMatch(newMatch);
      setCreateDialogOpen(false);
      setNewMatch({ game_id: '', mini_admin_id: '', time_factor: 1.0 });
      loadData();
    } catch (err) {
      console.error('Error creating match:', err);
      setError('Failed to create match');
    }
  };

  const handleAddParticipants = async () => {
    try {
      for (const userId of selectedPlayers) {
        await addParticipant(selectedMatch.id, userId);
      }
      // Refresh the specific match data in the dialog
      const updatedMatch = await getMatch(selectedMatch.id);
      setSelectedMatch(updatedMatch);
      setSelectedPlayers([]);
      // Also refresh the main matches list
      loadData();
    } catch (err) {
      console.error('Error adding participants:', err);
      setError('Failed to add participants');
    }
  };

  const handleRemoveParticipant = async (matchId, userId) => {
    try {
      await removeParticipant(matchId, userId);
      // Refresh the specific match data in the dialog
      const updatedMatch = await getMatch(matchId);
      setSelectedMatch(updatedMatch);
      // Also refresh the main matches list
      loadData();
    } catch (err) {
      console.error('Error removing participant:', err);
      setError('Failed to remove participant');
    }
  };

  const handleCompleteMatch = async () => {
    try {
      await completeMatch(selectedMatch.id, matchResults);
      setCompleteDialogOpen(false);
      setMatchResults({ winners: [], mvp_id: '', jokers_played: [] });
      loadData();
    } catch (err) {
      console.error('Error completing match:', err);
      setError('Failed to complete match');
    }
  };

  const handleStatusChange = async (matchId, status) => {
    try {
      await updateMatchStatus(matchId, status);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update match status');
    }
  };

  const handleDeleteMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    const isCompleted = match?.status === 'completed';
    
    const confirmMessage = isCompleted 
      ? 'Are you sure you want to delete this completed match? This will permanently remove all match data, results, and statistics. This action cannot be undone.'
      : 'Are you sure you want to delete this match?';
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteMatch(matchId);
        loadData();
      } catch (err) {
        console.error('Error deleting match:', err);
        setError('Failed to delete match');
      }
    }
  };

  const openParticipantsDialog = async (match) => {
    const fullMatch = await getMatch(match.id);
    setSelectedMatch(fullMatch);
    setParticipantsDialogOpen(true);
  };

  const openCompleteDialog = async (match) => {
    const fullMatch = await getMatch(match.id);
    setSelectedMatch(fullMatch);
    setCompleteDialogOpen(true);
  };

  const handleJoinMatch = async (matchId) => {
    try {
      await joinMatch(matchId);
      // Update participation state immediately
      setUserParticipation(prev => new Set([...prev, matchId]));
      loadData();
    } catch (err) {
      console.error('Error joining match:', err);
      if (err.response?.status === 409) {
        setError('Already joined this match');
      } else {
        setError('Failed to join match');
      }
    }
  };

  const handleLeaveMatch = async (matchId) => {
    try {
      await leaveMatch(matchId);
      // Update participation state immediately
      setUserParticipation(prev => {
        const newSet = new Set(prev);
        newSet.delete(matchId);
        return newSet;
      });
      loadData();
    } catch (err) {
      console.error('Error leaving match:', err);
      setError('Failed to leave match');
    }
  };

  // Team management handlers
  const openTeamsDialog = async (match) => {
    try {
      setSelectedMatch(match);
      const teamsData = await getMatchTeams(match.id);
      setMatchTeams(teamsData);
      setTeamsDialogOpen(true);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
    }
  };

  const handleCreateTeams = async () => {
    try {
      await createMatchTeams(selectedMatch.id, newTeamNames);
      const updatedTeams = await getMatchTeams(selectedMatch.id);
      setMatchTeams(updatedTeams);
      setNewTeamNames(['Team 1', 'Team 2']);
    } catch (err) {
      console.error('Error creating teams:', err);
      setError('Failed to create teams');
    }
  };

  const handleAssignPlayer = async (userId, teamId) => {
    try {
      await assignPlayerToTeam(selectedMatch.id, userId, teamId);
      const updatedTeams = await getMatchTeams(selectedMatch.id);
      setMatchTeams(updatedTeams);
      // Also refresh the main matches list to update player counts
      loadData();
    } catch (err) {
      console.error('Error assigning player:', err);
      setError('Failed to assign player to team');
    }
  };

  const handleRemovePlayerFromTeam = async (userId) => {
    try {
      await removePlayerFromTeam(selectedMatch.id, userId);
      const updatedTeams = await getMatchTeams(selectedMatch.id);
      setMatchTeams(updatedTeams);
      // Also refresh the main matches list to update player counts
      loadData();
    } catch (err) {
      console.error('Error removing player from team:', err);
      setError('Failed to remove player from team');
    }
  };

  const openTeamCompleteDialog = async (match) => {
    try {
      const fullMatch = await getMatch(match.id);
      const teamsData = await getMatchTeams(match.id);
      setSelectedMatch(fullMatch);
      setMatchTeams(teamsData);
      setTeamCompleteDialogOpen(true);
    } catch (err) {
      console.error('Error loading match teams:', err);
      setError('Failed to load match data');
    }
  };

  const handleCompleteMatchWithTeam = async () => {
    try {
      await completeMatchWithTeam(selectedMatch.id, teamResults.winningTeamId, teamResults.mvpPlayerId);
      setTeamCompleteDialogOpen(false);
      setTeamResults({ winningTeamId: '', mvpPlayerId: '' });
      loadData();
    } catch (err) {
      console.error('Error completing team match:', err);
      setError('Failed to complete match');
    }
  };

  // Handle joker declaration
  const handleDeclareJoker = async (matchId) => {
    try {
      await declareJoker(matchId);
      setJokerDeclarations(prev => new Set([...prev, matchId]));
      loadData(); // Refresh to get updated participant data
    } catch (err) {
      console.error('Error declaring joker:', err);
      setError(err.message || 'Failed to declare joker');
    }
  };

  // Handle removing joker declaration
  const handleRemoveJokerDeclaration = async (matchId) => {
    try {
      await removeJokerDeclaration(matchId);
      setJokerDeclarations(prev => {
        const newSet = new Set(prev);
        newSet.delete(matchId);
        return newSet;
      });
      loadData(); // Refresh to get updated participant data
    } catch (err) {
      console.error('Error removing joker declaration:', err);
      setError(err.message || 'Failed to remove joker declaration');
    }
  };

  // Check if current user can manage this match
  const canManageMatch = (match) => {
    return user?.role === 'admin' || match.mini_admin_id === user?.id;
  };

  // Check if current user can delete this match (admins can delete any match, mini-admins can only delete non-completed matches)
  const canDeleteMatch = (match) => {
    if (user?.role === 'admin') {
      return true; // Admins can delete any match
    }
    if (match.mini_admin_id === user?.id) {
      return match.status !== 'completed'; // Mini-admins can only delete non-completed matches
    }
    return false;
  };

  // Check if current user is participating in this match
  const isParticipating = (match) => {
    return userParticipation.has(match.id);
  };

  // Check if game is team-based
  const isTeamBasedGame = (match) => {
    return match.game_type === 'team';
  };

  // Toggle match results expansion
  const toggleMatchExpansion = async (matchId) => {
    const isCurrentlyExpanded = expandedMatches.has(matchId);
    
    if (!isCurrentlyExpanded) {
      // Load match details when expanding
      try {
        const fullMatch = await getMatch(matchId);
        setMatchDetails(prev => ({
          ...prev,
          [matchId]: fullMatch
        }));
      } catch (err) {
        console.error('Error loading match details:', err);
        setError('Failed to load match details');
        return;
      }
    }
    
    setExpandedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  // Component to render match results
  const MatchResults = ({ match, matchDetails }) => {
    if (!matchDetails || !matchDetails.participants || matchDetails.participants.length === 0) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography color="text.secondary">No participants data available</Typography>
        </Box>
      );
    }

    const winners = matchDetails.participants.filter(p => p.is_winner);
    const losers = matchDetails.participants.filter(p => !p.is_winner);
    const mvp = matchDetails.participants.find(p => p.is_mvp);

    return (
      <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
        <Grid container spacing={2}>
          {winners.length > 0 && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                🏆 Winners
              </Typography>
              {winners.map((participant) => (
                <Box key={participant.user_id} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">
                      {participant.display_name}
                      {participant.is_mvp && <Chip label="MVP" size="small" color="primary" sx={{ ml: 1 }} />}
                      {participant.joker_played && <Chip label="Joker" size="small" color="warning" sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      +{participant.total_tickets} tickets
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Grid>
          )}
          
          {losers.length > 0 && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'error.main', mb: 1 }}>
                💀 Participants
              </Typography>
              {losers.map((participant) => (
                <Box key={participant.user_id} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">
                      {participant.display_name}
                      {participant.is_mvp && <Chip label="MVP" size="small" color="primary" sx={{ ml: 1 }} />}
                      {participant.joker_played && <Chip label="Joker" size="small" color="warning" sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {participant.total_tickets} tickets
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Grid>
          )}
        </Grid>
        
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'grey.300' }}>
          <Typography variant="caption" color="text.secondary">
            Total pot distributed: {matchDetails.participants.reduce((sum, p) => sum + (p.total_tickets || 0), 0)} tickets
            {mvp && ` • MVP: ${mvp.display_name}`}
          </Typography>
        </Box>
      </Box>
    );
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
          Match Administration
        </Typography>
        {(user?.role === 'admin' || user?.role === 'mini_admin') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Match
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {matches.map((match) => (
          <Grid item xs={12} md={6} key={match.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {match.game_name}
                  </Typography>
                  <Chip 
                    label={match.status} 
                    color={getStatusColor(match.status)}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Players: {match.player_count} • Pot: {match.pot} tickets
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Admin: {match.admin_username}
                  {match.mini_admin_username && (
                    <> • Mini-Admin: {match.mini_admin_username}</>
                  )}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  {/* Management buttons for admins and mini-admins */}
                  {canManageMatch(match) && (
                    <>
                      {match.status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            startIcon={<PlayerIcon />}
                            onClick={() => openParticipantsDialog(match)}
                          >
                            Manage Players
                          </Button>
                          {isTeamBasedGame(match) && (
                            <Button
                              size="small"
                              startIcon={<PlayerIcon />}
                              onClick={() => openTeamsDialog(match)}
                              variant="outlined"
                              color="secondary"
                            >
                              Manage Teams
                            </Button>
                          )}
                          <Button
                            size="small"
                            startIcon={<StartIcon />}
                            onClick={() => handleStatusChange(match.id, 'in_progress')}
                          >
                            Start
                          </Button>
                        </>
                      )}
                      
                      {match.status === 'in_progress' && (
                        <Button
                          size="small"
                          startIcon={<CompleteIcon />}
                          onClick={() => isTeamBasedGame(match) ? openTeamCompleteDialog(match) : openCompleteDialog(match)}
                          color="success"
                        >
                          Complete
                        </Button>
                      )}
                      
                      {canDeleteMatch(match) && (
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteMatch(match.id)}
                          color="error"
                        >
                          Delete
                        </Button>
                      )}
                    </>
                  )}
                  
                  {/* Join/Leave buttons for all users */}
                  {match.status === 'pending' && (
                    <>
                      {!isParticipating(match) ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleJoinMatch(match.id)}
                          color="primary"
                        >
                          Join Match
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleLeaveMatch(match.id)}
                          color="secondary"
                        >
                          Leave Match
                        </Button>
                      )}
                    </>
                  )}
                  
                  {/* View Results button for completed matches */}
                  {match.status === 'completed' && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={expandedMatches.has(match.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      onClick={() => toggleMatchExpansion(match.id)}
                      color="primary"
                    >
                      {expandedMatches.has(match.id) ? 'Hide Results' : 'View Results'}
                    </Button>
                  )}
                </Box>
                
                {/* Joker Declaration Card for Pending Matches */}
                {match.status === 'pending' && isParticipating(match) && userHasJoker && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', border: '2px solid', borderColor: 'warning.main', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ color: 'warning.dark', fontWeight: 'bold' }}>
                        🃏 Joker Available
                      </Typography>
                      {!jokerDeclarations.has(match.id) ? (
                        <Button
                          variant="contained"
                          color="warning"
                          size="large"
                          onClick={() => handleDeclareJoker(match.id)}
                          sx={{ fontWeight: 'bold', fontSize: '1.1em' }}
                        >
                          USE JOKER
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          onClick={() => handleRemoveJokerDeclaration(match.id)}
                        >
                          Remove Joker
                        </Button>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {jokerDeclarations.has(match.id) 
                        ? "✅ Joker declared! You'll get double tickets if you win this match."
                        : "Double your tickets if you win! You can have maxium of 2 jokers. You earn one for every 4 games!"
                      }
                    </Typography>
                  </Box>
                )}
              </CardContent>
              
              {/* Collapsible Results Section */}
              {match.status === 'completed' && (
                <Collapse in={expandedMatches.has(match.id)} timeout="auto" unmountOnExit>
                  <Divider />
                  <MatchResults 
                    match={match} 
                    matchDetails={matchDetails[match.id]} 
                  />
                </Collapse>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Match Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Match</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Game</InputLabel>
            <Select
              value={newMatch.game_id}
              onChange={(e) => setNewMatch({ ...newMatch, game_id: e.target.value })}
            >
              {games.map((game) => (
                <MenuItem key={game.id} value={game.id}>
                  {game.name} ({game.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Mini-Admin (Match Manager)</InputLabel>
            <Select
              value={newMatch.mini_admin_id}
              onChange={(e) => setNewMatch({ ...newMatch, mini_admin_id: e.target.value })}
            >
              <MenuItem value="">Default (michal)</MenuItem>
              {users.map((userItem) => (
                <MenuItem key={userItem.id} value={userItem.id}>
                  {userItem.display_name} ({userItem.role})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            margin="normal"
            fullWidth
            label="Time Factor"
            type="number"
            step="0.1"
            value={newMatch.time_factor}
            onChange={(e) => setNewMatch({ ...newMatch, time_factor: parseFloat(e.target.value) })}
            helperText="Multiplier for longer matches (e.g., 1.5 for CS matches)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateMatch} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Participants Dialog */}
      <Dialog open={participantsDialogOpen} onClose={() => setParticipantsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Manage Participants - {selectedMatch?.game_name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Current Participants</Typography>
              <List>
                {selectedMatch?.participants?.map((participant) => (
                  <ListItem key={participant.user_id}>
                    <ListItemText primary={participant.display_name} secondary={participant.role} />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        onClick={() => handleRemoveParticipant(selectedMatch.id, participant.user_id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Add Users</Typography>
              <FormControl fullWidth>
                <InputLabel>Select Users</InputLabel>
                <Select
                  multiple
                  value={selectedPlayers}
                  onChange={(e) => setSelectedPlayers(e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((userId) => {
                        const user = users.find(u => u.id === userId);
                        return <Chip key={userId} label={user?.display_name} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {users
                    .filter(user => !selectedMatch?.participants?.some(p => p.user_id === user.id))
                    .map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.display_name} ({user.role})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setParticipantsDialogOpen(false)}>Close</Button>
          <Button onClick={handleAddParticipants} variant="contained" disabled={selectedPlayers.length === 0}>
            Add Selected
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Match Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Complete Match - {selectedMatch?.game_name}</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Select Winners</Typography>
          <Box sx={{ mb: 3 }}>
            {selectedMatch?.participants?.map((participant) => (
              <FormControlLabel
                key={participant.user_id}
                control={
                  <Checkbox
                    checked={matchResults.winners.includes(participant.user_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMatchResults({
                          ...matchResults,
                          winners: [...matchResults.winners, participant.user_id]
                        });
                      } else {
                        setMatchResults({
                          ...matchResults,
                          winners: matchResults.winners.filter(id => id !== participant.user_id)
                        });
                      }
                    }}
                  />
                }
                label={participant.display_name}
              />
            ))}
          </Box>

          <FormControl fullWidth margin="normal">
            <InputLabel>MVP (Optional)</InputLabel>
            <Select
              value={matchResults.mvp_id}
              onChange={(e) => setMatchResults({ ...matchResults, mvp_id: e.target.value })}
            >
              <MenuItem value="">None</MenuItem>
              {selectedMatch?.participants?.map((participant) => (
                <MenuItem key={participant.user_id} value={participant.user_id}>
                  {participant.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Jokers Played</Typography>
          <Box>
            {selectedMatch?.participants?.map((participant) => {
              const user = users.find(u => u.id === participant.user_id);
              return (
                <FormControlLabel
                  key={participant.user_id}
                  control={
                    <Checkbox
                      disabled={user?.joker_used}
                      checked={matchResults.jokers_played.includes(participant.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMatchResults({
                            ...matchResults,
                            jokers_played: [...matchResults.jokers_played, participant.user_id]
                          });
                        } else {
                          setMatchResults({
                            ...matchResults,
                            jokers_played: matchResults.jokers_played.filter(id => id !== participant.user_id)
                          });
                        }
                      }}
                    />
                  }
                  label={`${participant.display_name} ${user?.joker_used ? '(Already Used)' : ''}`}
                />
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCompleteMatch} 
            variant="contained" 
            disabled={matchResults.winners.length === 0}
          >
            Complete Match
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team Management Dialog */}
      <Dialog open={teamsDialogOpen} onClose={() => setTeamsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Team Management - {selectedMatch?.game_name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* No players message */}
            {matchTeams.teams.length === 0 && matchTeams.unassigned.length === 0 && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>No players in this match yet!</strong> 
                  <br />Use "Manage Players" to add players to the match first, then come back here to organize them into teams.
                </Alert>
              </Grid>
            )}

            {/* Create Teams Section */}
            {matchTeams.teams.length === 0 && matchTeams.unassigned.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Create Teams</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  {newTeamNames.map((name, index) => (
                    <TextField
                      key={index}
                      size="small"
                      value={name}
                      onChange={(e) => {
                        const updated = [...newTeamNames];
                        updated[index] = e.target.value;
                        setNewTeamNames(updated);
                      }}
                      label={`Team ${index + 1} Name`}
                    />
                  ))}
                  <Button
                    variant="outlined"
                    onClick={() => setNewTeamNames([...newTeamNames, `Team ${newTeamNames.length + 1}`])}
                  >
                    Add Team
                  </Button>
                </Box>
                <Button
                  variant="contained"
                  onClick={handleCreateTeams}
                  disabled={newTeamNames.some(name => !name.trim())}
                >
                  Create Teams
                </Button>
              </Grid>
            )}

            {/* Teams Display */}
            {matchTeams.teams.map((team) => (
              <Grid item xs={12} md={6} key={team.id}>
                <Card sx={{ bgcolor: `${team.team_color}.50` }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ color: `${team.team_color}.800` }}>
                      {team.team_name}
                    </Typography>
                    <List dense>
                      {team.participants.map((participant) => (
                        <ListItem key={participant.id}>
                          <ListItemText primary={participant.display_name} secondary={participant.role} />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              onClick={() => handleRemovePlayerFromTeam(participant.user_id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {/* Unassigned Players */}
            {matchTeams.unassigned.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Unassigned Players</Typography>
                <List>
                  {matchTeams.unassigned.map((participant) => (
                    <ListItem key={participant.id}>
                      <ListItemText primary={participant.display_name} secondary={participant.role} />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {matchTeams.teams.map((team) => (
                          <Button
                            key={team.id}
                            size="small"
                            variant="outlined"
                            onClick={() => handleAssignPlayer(participant.user_id, team.id)}
                            sx={{ bgcolor: `${team.team_color}.100` }}
                          >
                            Join {team.team_name}
                          </Button>
                        ))}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Team-based Match Completion Dialog */}
      <Dialog open={teamCompleteDialogOpen} onClose={() => setTeamCompleteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Complete Match - {selectedMatch?.game_name}</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Select Winning Team</Typography>
          <Box sx={{ mb: 3 }}>
            {matchTeams.teams?.map((team) => (
              <Card 
                key={team.id} 
                sx={{ 
                  mb: 2, 
                  cursor: 'pointer',
                  border: teamResults.winningTeamId === team.id ? 2 : 1,
                  borderColor: teamResults.winningTeamId === team.id ? 'primary.main' : 'grey.300',
                  bgcolor: teamResults.winningTeamId === team.id ? 'primary.50' : 'inherit'
                }}
                onClick={() => setTeamResults({ ...teamResults, winningTeamId: team.id, mvpPlayerId: '' })}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ color: `${team.team_color}.800` }}>
                    {team.team_name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {team.participants.map((participant) => (
                      <Chip
                        key={participant.id}
                        label={participant.display_name}
                        size="small"
                        color={teamResults.winningTeamId === team.id ? 'primary' : 'default'}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {teamResults.winningTeamId && (
            <FormControl fullWidth margin="normal">
              <InputLabel>MVP (Optional)</InputLabel>
              <Select
                value={teamResults.mvpPlayerId}
                onChange={(e) => setTeamResults({ ...teamResults, mvpPlayerId: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {matchTeams.teams
                  ?.find(team => team.id === teamResults.winningTeamId)
                  ?.participants.map((participant) => (
                    <MenuItem key={participant.user_id} value={participant.user_id}>
                      {participant.display_name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamCompleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCompleteMatchWithTeam} 
            variant="contained" 
            disabled={!teamResults.winningTeamId}
          >
            Complete Match
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default MatchAdmin;