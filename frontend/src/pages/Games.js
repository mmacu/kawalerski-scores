import React from 'react';
import { Container, Typography } from '@mui/material';

function Games() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h3" component="h1" gutterBottom>
        Games
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Game management interface - coming soon
      </Typography>
    </Container>
  );
}

export default Games;