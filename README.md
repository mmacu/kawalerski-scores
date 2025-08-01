# Mini Olympics Scoring System

A comprehensive web application for managing and scoring a bachelor party "Mini-Olympics" event with 12 players participating in various team sports and individual competitions.

## System Overview

This system implements a sophisticated scoring algorithm based on efficiency (tickets per match) rather than raw totals, featuring:

- **Complex Bonus System**: Joker (2x multiplier), Momentum (1.25x for players outside top 3), and MVP bonuses
- **Dynamic Leaderboard**: Ranked by efficiency percentage with tie-breakers
- **Match Management**: Admin interface for creating matches, managing participants, and recording results
- **Tournament Support**: Both regular matches and free-for-all tournaments (e.g., chess)
- **Role-Based Access**: Admin, Mini-Admin, and Player roles

## Technical Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Material-UI (MUI)
- **Database**: PostgreSQL with complex scoring triggers
- **Authentication**: JWT-based with role management

## Quick Start

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

### Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE mini_olympics;
```

2. Run the schema creation:
```bash
psql -d mini_olympics -f database/schema.sql
```

3. (Optional) Load test data:
```bash
psql -d mini_olympics -f database/seed-data.sql
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mini_olympics
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key-here
```

5. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Admin Access

If you loaded the seed data, you can log in with:
- **Username**: `testadmin`
- **Password**: `password` (you'll need to hash this properly in production)

## Core Features

### Scoring Algorithm

The system implements the exact algorithm described in `SCORING_SYSTEM.md`:

- **Base Pot**: K × Players × Time Factor (K=40)
- **Winner Share**: 70% of pot divided among winners
- **Loser Share**: 30% of pot divided among losers
- **MVP Bonus**: 5% of pot (team matches only)
- **Joker**: 2× multiplier (once per player)
- **Momentum**: 1.25× multiplier for next win (players ranked 4+)

### Match Types

1. **Team Matches**: Soccer, Volleyball, Counter-Strike, League of Legends
2. **Individual Matches**: FIFA, Chess, Target Shooting
3. **Tournaments**: Free-for-all with ranking-based scoring

### Admin Features

- Create and manage matches
- Add/remove participants
- Record match results with winners, MVP, and bonus tracking
- Assign mini-admins to specific matches
- Manage user accounts and roles
- Reset player jokers (if needed)

### Player Features

- View real-time leaderboard
- Track personal statistics
- See match history and detailed results
- Monitor bonus flag status (Joker available, Momentum active)

## Database Schema

### Key Tables

- **players**: Player stats, efficiency, bonus flags
- **matches**: Match metadata, pot, admin assignment
- **match_participants**: Individual player results per match
- **games**: Game types and multipliers
- **users**: Authentication and role management

### Automatic Calculations

The database includes triggers that automatically:
- Update player statistics after each match
- Calculate efficiency percentages
- Handle bonus flag states
- Update momentum flags based on rankings

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Players
- `GET /api/players` - List all players
- `POST /api/players` - Create player (admin only)
- `POST /api/players/:id/reset-joker` - Reset joker flag

### Matches
- `GET /api/matches` - List all matches
- `POST /api/matches` - Create match
- `POST /api/matches/:id/participants` - Add participant
- `POST /api/matches/:id/complete` - Complete regular match
- `POST /api/matches/:id/complete-tournament` - Complete tournament
- `PATCH /api/matches/:id/admin` - Change match admin

### Leaderboard
- `GET /api/leaderboard` - Current rankings
- `GET /api/leaderboard/head-to-head/:id1/:id2` - H2H comparison

## Testing the System

The seed data creates a realistic scenario:

1. **LoL Match (5v5)**: Alice wins with MVP and Joker (380% efficiency)
2. **FIFA Match (1v1)**: Bob wins with Momentum bonus 
3. **Chess Tournament**: All 12 players ranked by finish

Expected leaderboard after seed data:
1. Alice: ~380% efficiency (152 tickets, 1 match)
2. Bob: ~315% efficiency (126 tickets, 2 matches)  
3. Charlie: ~140% efficiency (56 tickets, 1 match)

## Production Deployment

### Security Considerations

1. **Hash passwords properly**: The seed data uses placeholder hashes
2. **Set strong JWT secrets**: Use a random 256-bit key
3. **Enable HTTPS**: Configure SSL certificates
4. **Database security**: Use connection pooling and prepared statements
5. **Rate limiting**: Already configured for API endpoints

### Environment Variables

Ensure all production environment variables are set:
- `NODE_ENV=production`
- `JWT_SECRET` (strong random key)
- Database credentials
- Frontend URL for CORS

### Database Backup

Regular backups of the PostgreSQL database are essential, especially before events.

## Troubleshooting

### Common Issues

1. **Database Connection Failed**: Check PostgreSQL is running and credentials are correct
2. **JWT Token Invalid**: Ensure JWT_SECRET matches between sessions
3. **CORS Errors**: Verify FRONTEND_URL in backend .env file
4. **Efficiency Calculation Wrong**: Run `SELECT update_momentum_flags();` to refresh

### Debugging

- Backend logs are output to console in development
- Frontend errors appear in browser developer tools
- Database queries can be monitored in PostgreSQL logs

## Contributing

This system is designed for a specific bachelor party event but can be adapted for other scoring competitions. Key areas for enhancement:

- Mobile-responsive design improvements
- Real-time match updates via WebSocket
- Advanced analytics and visualizations  
- Integration with external tournament brackets
- Automated bracket generation for tournaments

## License

This project is created for a private bachelor party event. Adapt as needed for your own events.