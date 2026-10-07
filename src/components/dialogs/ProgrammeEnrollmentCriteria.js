import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { NumberInput, SelectInput, formatMessage } from '@openimis/fe-core';
import { enrollmentProgrammeCode } from '../../utils';

const GENDER_OPTIONS = [
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
];

export default function ProgrammeEnrollmentCriteria({
  intl, benefitPlan, value, onChange, readOnly,
}) {
  const code = enrollmentProgrammeCode(benefitPlan);
  if (code !== 'UPG' && code !== 'RMEP') return null;

  const update = (field) => (fieldValue) => onChange({
    ...value,
    [field]: fieldValue,
  });

  return (
    <Grid item xs={12} style={{ marginBottom: '12px' }}>
      <Paper elevation={1} style={{ padding: '16px' }}>
        <Typography variant="subtitle1">
          {formatMessage(intl, 'individual', `individual.enrollment.${code.toLowerCase()}.title`)}
        </Typography>
        <Typography variant="body2" style={{ marginBottom: '12px' }}>
          {formatMessage(intl, 'individual', `individual.enrollment.${code.toLowerCase()}.rules`)}
        </Typography>
        {code === 'UPG' && (
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <SelectInput
                module="individual"
                label="individual.enrollment.preferredHeadGender"
                options={GENDER_OPTIONS}
                value={value.preferredHeadGender || ''}
                onChange={update('preferredHeadGender')}
                required
                readOnly={readOnly}
              />
            </Grid>
          </Grid>
        )}
        {code === 'RMEP' && (
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <NumberInput
                module="individual"
                label="individual.enrollment.businessPeriodYears"
                value={value.businessPeriodYears ?? 0}
                onChange={update('businessPeriodYears')}
                min={0}
                displayZero
                readOnly={readOnly}
              />
            </Grid>
            <Grid item xs={4}>
              <NumberInput
                module="individual"
                label="individual.enrollment.businessPeriodMonths"
                value={value.businessPeriodMonths ?? 0}
                onChange={update('businessPeriodMonths')}
                min={0}
                max={11}
                displayZero
                readOnly={readOnly}
              />
            </Grid>
          </Grid>
        )}
      </Paper>
    </Grid>
  );
}
