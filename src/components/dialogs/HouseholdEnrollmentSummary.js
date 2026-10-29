import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { formatMessage } from '@openimis/fe-core';

export default function HouseholdEnrollmentSummary({ intl, summary }) {
  const target = summary.phaseTarget
    ?? formatMessage(intl, 'individual', 'individual.enrollment.targetNotConfigured');
  const cards = [
    ['verifiedUnenrolledHouseholds', summary.verifiedUnenrolledHouseholds],
    ['phaseTarget', target],
    ['enrolledHouseholds', summary.enrolledHouseholds],
  ];

  return (
    <Grid container spacing={2}>
      {cards.map(([key, value]) => (
        <Grid item xs={12} md={4} key={key}>
          <Paper elevation={3} style={{ padding: '20px' }}>
            <Typography variant="h6" gutterBottom>
              {formatMessage(intl, 'individual', `individual.enrollment.${key}`)}
            </Typography>
            <Typography variant="body1">{value}</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
