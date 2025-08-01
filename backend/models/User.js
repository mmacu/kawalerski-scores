const pool = require('../config/database');

class User {
  static async getAll() {
    const query = `
      SELECT id, username, display_name, role, created_at
      FROM users 
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getAllWithStats() {
    const query = `
      SELECT 
        u.id,
        u.username,
        u.display_name,
        u.role,
        u.created_at,
        u.matches_played,
        u.tickets_total,
        u.efficiency,
        COALESCE(SUM(CASE WHEN mp.is_winner = true THEN 1 ELSE 0 END), 0) as wins,
        COALESCE(SUM(CASE WHEN mp.is_winner = false THEN 1 ELSE 0 END), 0) as losses,
        CASE 
          WHEN COUNT(mp.id) > 0 THEN ROUND(100.0 * SUM(CASE WHEN mp.is_winner = true THEN 1 ELSE 0 END) / COUNT(mp.id), 1)
          ELSE 0 
        END as win_percentage
      FROM users u
      LEFT JOIN match_participants mp ON u.id = mp.user_id
      LEFT JOIN matches m ON mp.match_id = m.id AND m.status = 'completed'
      GROUP BY u.id, u.username, u.display_name, u.role, u.created_at, u.matches_played, u.tickets_total, u.efficiency
      ORDER BY u.matches_played DESC, wins DESC, u.display_name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getById(id) {
    const query = `
      SELECT 
        u.id, u.username, u.display_name, u.role, u.created_at,
        p.jokers, p.games_played_since_joker
      FROM users u
      LEFT JOIN players p ON u.id = p.user_id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getByUsername(username) {
    const query = `
      SELECT id, username, display_name, password_hash, role, created_at
      FROM users 
      WHERE username = $1
    `;
    const result = await pool.query(query, [username]);
    return result.rows[0];
  }

  static async create({ username, password, role = 'player', display_name }) {
    const finalDisplayName = display_name || username; // Default to username if no display_name provided
    const query = `
      INSERT INTO users (username, password_hash, role, display_name) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, username, display_name, role, created_at
    `;
    const result = await pool.query(query, [username, password, role, finalDisplayName]);
    return result.rows[0];
  }

  static async validatePassword(user, password) {
    return user.password_hash === password;
  }

  static async updateRole(id, role) {
    const query = `
      UPDATE users 
      SET role = $2 
      WHERE id = $1 
      RETURNING id, username, display_name, role, created_at
    `;
    const result = await pool.query(query, [id, role]);
    return result.rows[0];
  }

  static async updateDisplayName(id, display_name) {
    const query = `
      UPDATE users 
      SET display_name = $2 
      WHERE id = $1 
      RETURNING id, username, display_name, role, created_at
    `;
    const result = await pool.query(query, [id, display_name]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id, username, display_name, role';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = User;