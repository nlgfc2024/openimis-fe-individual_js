/* eslint-disable max-len */
/* eslint-disable camelcase */
import React, { useEffect, useState } from 'react';
import { injectIntl } from 'react-intl';
import Button from '@material-ui/core/Button';
import { Divider, Grid, Paper } from '@material-ui/core';
import {
  decodeId,
  formatMessage,
  formatMessageWithValues,
  fetchCustomFilter,
  coreConfirm,
  clearConfirm,
} from '@openimis/fe-core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import AddCircle from '@material-ui/icons/Add';
import Typography from '@material-ui/core/Typography';
import AdvancedCriteriaRowValue from './AdvancedCriteriaRowValue';
import {
  CLEARED_STATE_FILTER,
  INDIVIDUAL,
} from '../../constants';
import {
  enrollmentOperatorConditions,
  createEnrollmentCriteriaState,
  isBase64Encoded,
  isEmptyObject,
  normalizeAdvancedCriteria,
  safeParseJsonObject,
  toGraphQLStringLiterals,
  updateEnrollmentJsonExt,
} from '../../utils';
import { confirmGroupEnrollment, fetchGroupEnrollmentSummary } from '../../actions';
import GroupPreviewEnrollmentDialog from './GroupPreviewEnrollmentDialog';
import EnrollmentRankingSummary from './EnrollmentRankingSummary';

const styles = (theme) => ({
  item: theme.paper.item,
});

function AdvancedCriteriaGroupForm({
  intl,
  classes,
  object,
  objectToSave,
  fetchCustomFilter,
  customFilters,
  moduleName,
  objectType,
  setAppliedCustomFilters,
  // eslint-disable-next-line no-unused-vars
  appliedFiltersRowStructure,
  setAppliedFiltersRowStructure,
  updateAttributes,
  additionalParams,
  fetchGroupEnrollmentSummary,
  enrollmentGroupSummary,
  fetchedEnrollmentGroupSummary,
  confirmGroupEnrollment,
  confirmed,
  clearConfirm,
  coreConfirm,
  rights,
  edited,
  enrollmentUi,
}) {
  // eslint-disable-next-line no-unused-vars
  const [currentFilter, setCurrentFilter] = useState({
    field: '', filter: '', type: '', value: '', amount: '',
  });
  const [phaseCriteria, setPhaseCriteria] = useState([]);
  const [operatorFilters, setOperatorFilters] = useState([]);
  const [filtersToApply, setFiltersToApply] = useState(null);
  const status = edited?.status;
  const showMandatoryCriteria = enrollmentUi?.show_mandatory_criteria_summary ?? true;
  const showOperatorFilters = enrollmentUi?.show_advanced_operator_filters ?? true;

  const getBenefitPlanDefaultCriteria = () => {
    const jsonData = safeParseJsonObject(edited?.benefitPlan?.jsonExt);
    const criteria = normalizeAdvancedCriteria(
      edited?.benefitPlan?.advancedCriteria ?? jsonData.advanced_criteria,
    );

    return criteria[status] || [];
  };

  const getSavedOperatorFilters = () => {
    const jsonData = safeParseJsonObject(objectToSave?.jsonExt);
    return normalizeAdvancedCriteria(jsonData.advanced_criteria)[status] || [];
  };

  const filters = [...phaseCriteria, ...operatorFilters];
  const updateOperatorFilters = (nextFilters) => {
    const combinedFilters = typeof nextFilters === 'function' ? nextFilters(filters) : nextFilters;
    setOperatorFilters(combinedFilters.filter((filter) => !filter.locked));
  };

  useEffect(() => {
    const nextState = createEnrollmentCriteriaState(
      getBenefitPlanDefaultCriteria(),
      getSavedOperatorFilters(),
    );
    setPhaseCriteria(nextState.phaseCriteria);
    setOperatorFilters(nextState.operatorFilters);
  }, [edited?.benefitPlan?.id, status]);

  const createParams = (moduleName, objectTypeName, uuidOfObject = null, additionalParams = null) => {
    const params = [
      `moduleName: "${moduleName}"`,
      `objectTypeName: "${objectTypeName}"`,
    ];
    if (uuidOfObject) {
      params.push(`uuidOfObject: "${uuidOfObject}"`);
    }
    if (additionalParams) {
      params.push(`additionalParams: ${JSON.stringify(JSON.stringify(additionalParams))}`);
    }
    return params;
  };

  const fetchFilters = (params) => {
    fetchCustomFilter(params);
  };

  const handleClose = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
  };

  const handleAddFilter = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
    setOperatorFilters([...operatorFilters, CLEARED_STATE_FILTER]);
  };

  const handleRemoveFilter = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
    setAppliedFiltersRowStructure(phaseCriteria);
    setOperatorFilters([]);
  };

  const saveCriteria = () => {
    setAppliedFiltersRowStructure(filters);
    const operatorConditions = enrollmentOperatorConditions(operatorFilters, showOperatorFilters);
    const outputFilters = JSON.stringify(operatorConditions.map((custom_filter_condition) => ({ custom_filter_condition })));
    const jsonExt = updateEnrollmentJsonExt(objectToSave.jsonExt, status, operatorConditions);
    updateAttributes(jsonExt);
    setAppliedCustomFilters(outputFilters);

    // Parse the jsonExt string to extract advanced_criteria
    const jsonData = JSON.parse(jsonExt);
    const advancedCriteria = jsonData.advanced_criteria?.[status] || [];

    // Extract custom_filter_condition values and construct customFilters array
    const customFilters = toGraphQLStringLiterals(advancedCriteria.map((criterion) => criterion.custom_filter_condition));
    setFiltersToApply(customFilters);
    const params = [
      `customFilters: [${customFilters}]`,
      `benefitPlanId: "${decodeId(object.id)}"`,
      `status: "${status}"`,
    ];
    fetchGroupEnrollmentSummary(params);
    handleClose();
  };

  useEffect(() => {
    if (object && isEmptyObject(object) === false) {
      let paramsToFetchFilters = [];
      if (objectType === INDIVIDUAL) {
        paramsToFetchFilters = createParams(
          moduleName,
          objectType,
          isBase64Encoded(object.id) ? decodeId(object.id) : object.id,
          additionalParams,
        );
      } else {
        paramsToFetchFilters = createParams(
          moduleName,
          objectType,
          null,
          additionalParams,
        );
      }
      fetchFilters(paramsToFetchFilters);
    }
  }, [object]);

  useEffect(() => {}, [filters]);

  const openConfirmEnrollmentDialog = () => {
    coreConfirm(
      formatMessage(intl, 'individual', 'individual.enrollment.confirmTitle'),
      formatMessageWithValues(intl, 'individual', 'individual.enrollment.confirmGroupMessageDialog', { benefitPlanName: object.name }),
    );
  };

  useEffect(() => {
    if (confirmed) {
      const operatorConditions = enrollmentOperatorConditions(operatorFilters, showOperatorFilters);
      const jsonExt = updateEnrollmentJsonExt(objectToSave.jsonExt, status, operatorConditions);
      const jsonData = JSON.parse(jsonExt);
      const advancedCriteria = jsonData.advanced_criteria?.[status] || [];

      // Extract custom_filter_condition values and construct customFilters array
      const customFilters = toGraphQLStringLiterals(advancedCriteria.map((criterion) => criterion.custom_filter_condition));
      setFiltersToApply(customFilters);
      const params = {
        customFilters: `[${customFilters}]`,
        benefitPlanId: `"${decodeId(object.id)}"`,
        status: `"${status}"`,
      };
      confirmGroupEnrollment(
        params,
        formatMessage(intl, 'individual', 'individual.enrollment.mutationLabel'),
      );
    }
    return () => confirmed && clearConfirm(false);
  }, [confirmed]);

  return (
    <>
      {showMandatoryCriteria && phaseCriteria.map((filter, index) => (
        <AdvancedCriteriaRowValue
          customFilters={customFilters}
          currentFilter={filter}
          setCurrentFilter={setCurrentFilter}
          index={index}
          filters={filters}
          setFilters={updateOperatorFilters}
          readOnly={confirmed || filter.locked}
        />
      ))}
      {showOperatorFilters && operatorFilters.map((filter, index) => (
        <AdvancedCriteriaRowValue
          customFilters={customFilters}
          currentFilter={filter}
          setCurrentFilter={setCurrentFilter}
          index={phaseCriteria.length + index}
          filters={filters}
          setFilters={updateOperatorFilters}
          readOnly={confirmed}
        />
      ))}
      { showOperatorFilters && !confirmed ? (
        <div
          style={{ backgroundColor: '#DFEDEF', paddingLeft: '10px', paddingBottom: '10px' }}
        >
          <AddCircle
            style={{
              border: 'thin solid',
              borderRadius: '40px',
              width: '16px',
              height: '16px',
            }}
            onClick={handleAddFilter}
            disabled={confirmed}
          />
          <Button
            onClick={handleAddFilter}
            variant="outlined"
            style={{
              border: '0px',
              marginBottom: '6px',
              fontSize: '0.8rem',
            }}
            disabled={confirmed}
          >
            {formatMessage(intl, 'individual', 'individual.enrollment.addFilters')}
          </Button>
        </div>
      // eslint-disable-next-line react/jsx-no-useless-fragment
      ) : (<></>) }
      <div>
        {showOperatorFilters && (
        <div style={{ float: 'left' }}>
          <Button
            onClick={handleRemoveFilter}
            variant="outlined"
            style={{
              border: '0px',
            }}
            disabled={confirmed}
          >
            {formatMessage(intl, 'individual', 'individual.enrollment.clearAllFilters')}
          </Button>
        </div>
        )}
        <div style={{
          float: 'right',
          paddingRight: '16px',
        }}
        >
          <Button
            onClick={saveCriteria}
            variant="contained"
            color="primary"
            autoFocus
            disabled={!object || confirmed}
          >
            {formatMessage(intl, 'individual', 'individual.enrollment.previewEnrollment')}
          </Button>
        </div>
      </div>
      <Divider />
      {fetchedEnrollmentGroupSummary && (
      <div>
        <div className={classes.item}>
          {formatMessage(intl, 'individual', 'individual.enrollment.summary')}
        </div>
        <Divider />
        <EnrollmentRankingSummary intl={intl} summary={enrollmentGroupSummary} />
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {formatMessage(intl, 'individual', 'individual.enrollment.totalNumberOfGroups')}
              </Typography>
              <Typography variant="body1">
                {enrollmentGroupSummary.totalNumberOfGroups}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfSelectedGroups')}
              </Typography>
              <Typography variant="body1">
                {enrollmentGroupSummary.numberOfSelectedGroups}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfGroupsAssignedToProgramme')}
              </Typography>
              <Typography variant="body1">
                {enrollmentGroupSummary.numberOfGroupsAssignedToProgramme}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfGroupsNotAssignedToProgramme')}
              </Typography>
              <Typography variant="body1">
                {enrollmentGroupSummary.numberOfGroupsNotAssignedToProgramme}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {/* eslint-disable-next-line max-len */}
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfGroupsAssignedToSelectedProgramme')}
              </Typography>
              <Typography variant="body1">
                {enrollmentGroupSummary.numberOfGroupsAssignedToSelectedProgramme}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {/* eslint-disable-next-line max-len */}
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfGroupsToUpload')}
              </Typography>
              <Typography variant="body1">
                {enrollmentGroupSummary.numberOfGroupsToUpload}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={5} />
          <Grid item xs={5}>
            <Button
              onClick={() => openConfirmEnrollmentDialog()}
              variant="contained"
              color="primary"
              autoFocus
              disabled={!object || confirmed || enrollmentGroupSummary.numberOfGroupsToUpload === '0'}
            >
              {formatMessage(intl, 'individual', 'individual.enrollment.confirmEnrollment')}
            </Button>
            <GroupPreviewEnrollmentDialog
              rights={rights}
              classes={classes}
              advancedCriteria={filtersToApply}
              benefitPlanToEnroll={object.id}
              enrollmentSummary={enrollmentGroupSummary}
              status={status}
              confirmed={confirmed}
            />
          </Grid>
          <Grid item xs={5} />
        </Grid>
      </div>
      )}
    </>
  );
}

// eslint-disable-next-line no-unused-vars
const mapStateToProps = (state, props) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  confirmed: state.core.confirmed,
  fetchingCustomFilters: state.core.fetchingCustomFilters,
  errorCustomFilters: state.core.errorCustomFilters,
  fetchedCustomFilters: state.core.fetchedCustomFilters,
  customFilters: state.core.customFilters,
  fetchingEnrollmentGroupSummary: state.individual.fetchingEnrollmentGroupSummary,
  errorEnrollmentGroupSummary: state.individual.errorEnrollmentGroupSummary,
  fetchedEnrollmentGroupSummary: state.individual.fetchedEnrollmentGroupSummary,
  enrollmentGroupSummary: state.individual.enrollmentGroupSummary,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchCustomFilter,
  fetchGroupEnrollmentSummary,
  confirmGroupEnrollment,
  clearConfirm,
  coreConfirm,
}, dispatch);

export default injectIntl(
  withTheme(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(AdvancedCriteriaGroupForm))),
);
