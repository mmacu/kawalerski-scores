const pool = require('../config/database');

class Game {
  static async getAll() {
    const query = `
      SELECT id, name, type, min_players, max_players, time_factor, created_at
      FROM games 
      ORDER BY name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getById(id) {
    const query = `
      SELECT id, name, type, min_players, max_players, time_factor, created_at
      FROM games 
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create({ name, type, min_players, max_players, time_factor = 1.0 }) {
    const query = `
      INSERT INTO games (name, type, min_players, max_players, time_factor) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, name, type, min_players, max_players, time_factor, created_at
    `;
    const result = await pool.query(query, [name, type, min_players, max_players, time_factor]);
    return result.rows[0];
  }

  static async update(id, { name, type, min_players, max_players, time_factor }) {
    const query = `
      UPDATE games 
      SET name = COALESCE($2, name),
          type = COALESCE($3, type),
          min_players = COALESCE($4, min_players),
          max_players = COALESCE($5, max_players),
          time_factor = COALESCE($6, time_factor)
      WHERE id = $1 
      RETURNING id, name, type, min_players, max_players, time_factor, created_at
    `;
    const result = await pool.query(query, [id, name, type, min_players, max_players, time_factor]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM games WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Game;