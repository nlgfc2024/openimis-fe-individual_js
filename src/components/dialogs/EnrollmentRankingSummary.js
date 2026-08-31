import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { formatMessage, formatMessageWithValues } from '@openimis/fe-core';
import { parseEnrollmentRanking } from '../../utils';

export default function EnrollmentRankingSummary({
  intl,
  summary,
  entityKey,
  entityLabelKey,
}) {
  const entity = formatMessage(intl, 'individual', entityKey);
  const entityLabel = formatMessage(intl, 'individual', entityLabelKey);
  const ranking = parseEnrollmentRanking(summary?.enrolmentRanking);
  const orderBy = ranking?.order_by || [];
  const orderLabel = orderBy.map((entry) => (
    typeof entry === 'string'
      ? entry
      : `${entry.field} ${entry.direction || 'asc'}${entry.cast ? ` (${entry.cast})` : ''}`
  )).join(', ');
  const capExplanation = summary?.percentage
    ? formatMessageWithValues(intl, 'individual', 'individual.enrollment.capExplanation', {
      percentage: summary.percentage,
      willEnrol: summary.willEnrol,
      poolSize: summary.poolSize,
    })
    : null;

  return (
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <Paper elevation={3} style={{ padding: '20px' }}>
          <Typography variant="h6">
            {formatMessageWithValues(intl, 'individual', 'individual.enrollment.eligiblePool', { entity })}
          </Typography>
          <Typography>{summary?.poolSize}</Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper elevation={3} style={{ padding: '20px' }}>
          <Typography variant="h6">
            {formatMessageWithValues(intl, 'individual', 'individual.enrollment.capApplied', { entity })}
          </Typography>
          <Typography>
            {summary?.capApplied ?? formatMessage(intl, 'individual', 'individual.enrollment.noCap')}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper elevation={3} style={{ padding: '20px' }}>
          <Typography variant="h6">
            {formatMessageWithValues(intl, 'individual', 'individual.enrollment.willEnroll', { entity: entityLabel })}
          </Typography>
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
      {capExplanation && (
        <Grid item xs={12}>
          <Typography>{capExplanation}</Typography>
        </Grid>
      )}
      {summary?.poolSize === 0 && (
        <Grid item xs={12}>
          <Typography color="error">
            {formatMessageWithValues(intl, 'individual', 'individual.enrollment.emptyEligiblePool', { entity })}
          </Typography>
        </Grid>
      )}
      {summary?.poolSize > 0 && summary?.capApplied === 0 && (
        <Grid item xs={12}>
          <Typography color="error">
            {formatMessageWithValues(intl, 'individual', 'individual.enrollment.noRemainingCapacity', {
              entity,
              poolSize: summary.poolSize,
            })}
          </Typography>
        </Grid>
      )}
    </Grid>
  );
}
