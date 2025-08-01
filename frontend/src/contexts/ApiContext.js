import React, { createContext, useContext } from 'react';
import axios from 'axios';

const ApiContext = createContext();

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}

export function ApiProvider({ children }) {
  // Players API
  const getPlayers = async () => {
    const response = await axios.get('/api/players');
    return response.data;
  };

  const createPlayer = async (playerData) => {
    const response = await axios.post('/api/players', playerData);
    return response.data;
  };

  const updatePlayer = async (id, playerData) => {
    const response = await axios.put(`/api/players/${id}`, playerData);
    return response.data;
  };

  const resetPlayerJoker = async (id) => {
    const response = await axios.post(`/api/players/${id}/reset-joker`);
    return response.data;
  };

  // Games API
  const getGames = async () => {
    const response = await axios.get('/api/games');
    return response.data;
  };

  const createGame = async (gameData) => {
    const response = await axios.post('/api/games', gameData);
    return response.data;
  };

  const updateGame = async (id, gameData) => {
    const response = await axios.put(`/api/games/${id}`, gameData);
    return response.data;
  };

  const deleteGame = async (id) => {
    const response = await axios.delete(`/api/games/${id}`);
    return response.data;
  };

  // Matches API
  const getMatches = async () => {
    const response = await axios.get('/api/matches');
    return response.data;
  };

  const getMatch = async (id) => {
    const response = await axios.get(`/api/matches/${id}`);
    return response.data;
  };

  const createMatch = async (matchData) => {
    const response = await axios.post('/api/matches', matchData);
    return response.data;
  };

  const addParticipant = async (matchId, userId) => {
    const response = await axios.post(`/api/matches/${matchId}/participants`, {
      user_id: userId
    });
    return response.data;
  };

  const removeParticipant = async (matchId, userId) => {
    const response = await axios.delete(`/api/matches/${matchId}/participants/${userId}`);
    return response.data;
  };

  const completeMatch = async (matchId, { winners, mvp_id, jokers_played }) => {
    const response = await axios.post(`/api/matches/${matchId}/complete`, {
      winners,
      mvp_id,
      jokers_played
    });
    return response.data;
  };

  const completeTournament = async (matchId, playerRankings) => {
    const response = await axios.post(`/api/matches/${matchId}/complete-tournament`, {
      player_rankings: playerRankings
    });
    return response.data;
  };

  const updateMatchStatus = async (matchId, status) => {
    const response = await axios.patch(`/api/matches/${matchId}/status`, { status });
    return response.data;
  };

  const updateMatchAdmin = async (matchId, adminId) => {
    const response = await axios.patch(`/api/matches/${matchId}/admin`, { admin_id: adminId });
    return response.data;
  };

  const deleteMatch = async (id) => {
    const response = await axios.delete(`/api/matches/${id}`);
    return response.data;
  };

  const joinMatch = async (matchId) => {
    const response = await axios.post(`/api/matches/${matchId}/join`);
    return response.data;
  };

  const leaveMatch = async (matchId) => {
    const response = await axios.delete(`/api/matches/${matchId}/leave`);
    return response.data;
  };

  // Leaderboard API
  const getLeaderboard = async () => {
    const response = await axios.get('/api/leaderboard');
    return response.data;
  };

  const getHeadToHead = async (player1Id, player2Id) => {
    const response = await axios.get(`/api/leaderboard/head-to-head/${player1Id}/${player2Id}`);
    return response.data;
  };

  // Users API
  const getUsers = async () => {
    const response = await axios.get('/api/users');
    return response.data;
  };

  const getAvailableUsers = async () => {
    const response = await axios.get('/api/users/available');
    return response.data;
  };

  const createUser = async (userData) => {
    const response = await axios.post('/api/users', userData);
    return response.data;
  };

  const updateUserRole = async (userId, role) => {
    const response = await axios.patch(`/api/users/${userId}/role`, { role });
    return response.data;
  };

  const deleteUser = async (userId) => {
    const response = await axios.delete(`/api/users/${userId}`);
    return response.data;
  };

  const updateDisplayName = async (userId, displayName) => {
    const response = await axios.patch(`/api/users/${userId}/display-name`, { display_name: displayName });
    return response.data;
  };

  // Teams API
  const getMatchTeams = async (matchId) => {
    const response = await axios.get(`/api/teams/match/${matchId}`);
    return response.data;
  };

  const createMatchTeams = async (matchId, teamNames) => {
    const response = await axios.post(`/api/teams/match/${matchId}`, { teamNames });
    return response.data;
  };

  const assignPlayerToTeam = async (matchId, userId, teamId) => {
    const response = await axios.post(`/api/teams/match/${matchId}/assign`, { userId, teamId });
    return response.data;
  };

  const removePlayerFromTeam = async (matchId, userId) => {
    const response = await axios.delete(`/api/teams/match/${matchId}/unassign/${userId}`);
    return response.data;
  };

  const deleteTeam = async (teamId) => {
    const response = await axios.delete(`/api/teams/${teamId}`);
    return response.data;
  };

  const completeMatchWithTeam = async (matchId, winningTeamId, mvpPlayerId) => {
    const response = await axios.post(`/api/teams/match/${matchId}/complete-team`, {
      winningTeamId,
      mvpPlayerId
    });
    return response.data;
  };

  // Declare joker for a match
  const declareJoker = async (matchId) => {
    const response = await axios.post(`/api/matches/${matchId}/declare-joker`);
    return response.data;
  };

  // Remove joker declaration
  const removeJokerDeclaration = async (matchId) => {
    const response = await axios.delete(`/api/matches/${matchId}/declare-joker`);
    return response.data;
  };

  // Get user participation data for all matches
  const getUserParticipation = async () => {
    const response = await axios.get('/api/matches/participation');
    return response.data;
  };

  const getLatestPendingMatch = async () => {
    const response = await axios.get('/api/matches/latest-pending');
    return response.data;
  };

  const value = {
    // Players
    getPlayers,
    createPlayer,
    updatePlayer,
    resetPlayerJoker,
    
    // Games
    getGames,
    createGame,
    updateGame,
    deleteGame,
    
    // Matches
    getMatches,
    getMatch,
    createMatch,
    addParticipant,
    removeParticipant,
    completeMatch,
    completeTournament,
    updateMatchStatus,
    updateMatchAdmin,
    deleteMatch,
    joinMatch,
    leaveMatch,
    
    // Leaderboard
    getLeaderboard,
    getHeadToHead,
    
    // Users
    getUsers,
    getAvailableUsers,
    createUser,
    updateUserRole,
    deleteUser,
    updateDisplayName,
    
    // Teams
    getMatchTeams,
    createMatchTeams,
    assignPlayerToTeam,
    removePlayerFromTeam,
    deleteTeam,
    completeMatchWithTeam,

    // Joker
    declareJoker,
    removeJokerDeclaration,

    // Participation
    getUserParticipation,
    getLatestPendingMatch
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
}