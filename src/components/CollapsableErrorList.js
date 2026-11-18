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
import { getUploadErrorDetails } from '../util/upload-response';

const styles = (theme) => ({
  item: theme.paper.item,
});

function CollapsableErrorList({
  intl,
  errors,
  status,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const errorDetails = getUploadErrorDetails(errors);

  const handleOpen = () => {
    setIsExpanded(!isExpanded);
  };

  if (!errorDetails) {
    let message = 'individual.upload.uploadHistoryTable.errorNone';
    if (status === UPLOAD_STATUS.PARTIAL_SUCCESS) {
      message = 'individual.upload.uploadHistoryTable.partialError';
    } else if (status === UPLOAD_STATUS.FAIL) {
      message = 'individual.upload.uploadHistoryTable.failedWithoutDetails';
    }
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
