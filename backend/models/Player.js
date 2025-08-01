const pool = require('../config/database');

class Player {
  static async getAll() {
    const query = `
      SELECT p.id, p.name, p.matches_played, p.tickets_total, p.efficiency, 
             p.jokers, p.games_played_since_joker, p.momentum_flag, p.created_at, p.updated_at,
             p.user_id, u.username, u.role
      FROM players p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.efficiency DESC, p.tickets_total DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getById(id) {
    const query = `
      SELECT p.id, p.name, p.matches_played, p.tickets_total, p.efficiency, 
             p.jokers, p.games_played_since_joker, p.momentum_flag, p.created_at, p.updated_at,
             p.user_id, u.username, u.role
      FROM players p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create({ name, user_id }) {
    const query = `
      INSERT INTO players (name, user_id) 
      VALUES ($1, $2) 
      RETURNING id, name, matches_played, tickets_total, efficiency, 
                jokers, games_played_since_joker, momentum_flag, created_at, updated_at, user_id
    `;
    const result = await pool.query(query, [name, user_id]);
    return result.rows[0];
  }

  static async update(id, { name, jokers, games_played_since_joker, momentum_flag }) {
    const query = `
      UPDATE players 
      SET name = COALESCE($2, name),
          jokers = COALESCE($3, jokers),
          games_played_since_joker = COALESCE($4, games_played_since_joker),
          momentum_flag = COALESCE($5, momentum_flag),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING id, name, matches_played, tickets_total, efficiency, 
                jokers, games_played_since_joker, momentum_flag, created_at, updated_at
    `;
    const result = await pool.query(query, [id, name, jokers, games_played_since_joker, momentum_flag]);
    return result.rows[0];
  }

  static async getLeaderboard() {
    const query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY efficiency DESC, tickets_total DESC) as rank,
        id, name, matches_played, tickets_total, efficiency, 
        jokers, momentum_flag
      FROM players 
      WHERE matches_played > 0
      ORDER BY efficiency DESC, tickets_total DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateMomentumFlags() {
    await pool.query('SELECT update_momentum_flags()');
  }

  static async getByUserId(user_id) {
    const query = `
      SELECT p.id, p.name, p.matches_played, p.tickets_total, p.efficiency, 
             p.jokers, p.games_played_since_joker, p.momentum_flag, p.created_at, p.updated_at,
             p.user_id, u.username, u.role
      FROM players p
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows[0];
  }

  static async getOrCreateByUser(user_id, username) {
    let player = await this.getByUserId(user_id);
    if (!player) {
      // Create a player for this user
      player = await this.create({ 
        name: username, 
        user_id: user_id 
      });
    }
    return player;
  }
}

module.exports = Player;