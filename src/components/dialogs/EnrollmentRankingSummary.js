import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { formatMessage } from '@openimis/fe-core';

const parseRanking = (ranking) => {
  if (!ranking) return null;
  if (typeof ranking === 'object') return ranking;
  try {
    return JSON.parse(ranking);
  } catch (error) {
    return null;
  }
};

export default function EnrollmentRankingSummary({ intl, summary }) {
  const ranking = parseRanking(summary?.enrolmentRanking);
  const orderBy = ranking?.order_by || [];
  const orderLabel = orderBy.map((entry) => (
    typeof entry === 'string'
      ? entry
      : `${entry.field} ${entry.direction || 'asc'}${entry.cast ? ` (${entry.cast})` : ''}`
  )).join(', ');

  return (
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <Paper elevation={3} style={{ padding: '20px' }}>
          <Typography variant="h6">
            {formatMessage(intl, 'individual', 'individual.enrollment.eligiblePool')}
          </Typography>
          <Typography>{summary?.poolSize}</Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper elevation={3} style={{ padding: '20px' }}>
          <Typography variant="h6">
            {formatMessage(intl, 'individual', 'individual.enrollment.capApplied')}
          </Typography>
          <Typography>
            {summary?.capApplied ?? formatMessage(intl, 'individual', 'individual.enrollment.noCap')}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper elevation={3} style={{ padding: '20px' }}>
          <Typography variant="h6">{formatMessage(intl, 'individual', 'individual.enrollment.willEnroll')}</Typography>
          <Typography>{summary?.willEnrol}</Typography>
        </Paper>
      </Grid>
      {ranking && (
        <Grid item xs={12}>
          <Paper elevation={3} style={{ padding: '20px' }}>
            <Typography variant="h6">
              {formatMessage(intl, 'individual', 'individual.enrollment.rankingRule')}
            </Typography>
            <Typography>{orderLabel || ranking.tie_breaker || 'id'}</Typography>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}
