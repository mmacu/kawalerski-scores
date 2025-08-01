import React from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography } from '@mui/material';

function MatchDetails() {
  const { id } = useParams();
  
  return (
    <Container maxWidth="lg">
      <Typography variant="h3" component="h1" gutterBottom>
        Match Details
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Details for match ID: {id} - coming soon
      </Typography>
    </Container>
  );
}

export default MatchDetails;