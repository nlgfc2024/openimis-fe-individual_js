import React, { useState } from 'react';
import { injectIntl } from 'react-intl';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import {
  formatMessage,
} from '@openimis/fe-core';
import {
  ListItem,
  ListItemText,
  Collapse,
  Typography,
} from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { UPLOAD_STATUS } from '../constants';

const styles = (theme) => ({
  item: theme.paper.item,
});

const IGNORED_ERROR_KEYS = new Set(['timestamp', 'upload_id', 'data_upload_id']);

function formatErrorValue(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(formatErrorValue).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !IGNORED_ERROR_KEYS.has(key))
      .map(([key, item]) => `${key.replace(/_/g, ' ')}: ${formatErrorValue(item)}`)
      .filter((entry) => !entry.endsWith(': '))
      .join('\n');
  }
  return value == null ? '' : String(value);
}

function getErrorDetails(errors) {
  if (!errors) return '';
  if (typeof errors === 'string') return errors;
  const details = errors.errors && typeof errors.errors === 'object' ? errors.errors : errors;
  return formatErrorValue(details);
}

function CollapsableErrorList({
  intl,
  errors,
  status,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const errorDetails = getErrorDetails(errors);

  const handleOpen = () => {
    setIsExpanded(!isExpanded);
  };

  if (!errorDetails) {
    const message = status === UPLOAD_STATUS.PARTIAL_SUCCESS
      ? 'individual.upload.uploadHistoryTable.partialError'
      : status === UPLOAD_STATUS.FAIL
        ? 'individual.upload.uploadHistoryTable.failedWithoutDetails'
        : 'individual.upload.uploadHistoryTable.errorNone';
    return (
      <ListItem>
        <ListItemText primary={formatMessage(
          intl,
          'individual',
          message,
        )}
        />
      </ListItem>
    );
  }

  return (
    <>
      <ListItem button onClick={handleOpen}>
        <ListItemText primary={formatMessage(
          intl,
          'individual',
          'individual.upload.uploadHistoryTable.error',
        )}
        />
        {isExpanded ? <ExpandLess /> : <ExpandMore />}
      </ListItem>
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Typography
          component="pre"
          variant="body2"
          style={{ margin: 8, whiteSpace: 'pre-wrap' }}
        >
          {errorDetails}
        </Typography>
      </Collapse>
    </>
  );
}

export default injectIntl(
  withTheme(
    withStyles(styles)(CollapsableErrorList),
  ),
);
