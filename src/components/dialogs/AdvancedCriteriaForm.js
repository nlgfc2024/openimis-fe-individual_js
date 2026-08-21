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
  isBase64Encoded,
  isEmptyObject,
  normalizeAdvancedCriteria,
  safeParseJsonObject,
  toGraphQLStringLiterals,
  updateEnrollmentJsonExt,
} from '../../utils';
import { confirmEnrollment, fetchIndividualEnrollmentSummary } from '../../actions';
import IndividualPreviewEnrollmentDialog from './IndividualPreviewEnrollmentDialog';

const styles = (theme) => ({
  item: theme.paper.item,
});

function AdvancedCriteriaForm({
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
  getDefaultAppliedCustomFilters,
  additionalParams,
  fetchIndividualEnrollmentSummary,
  enrollmentSummary,
  fetchedEnrollmentSummary,
  confirmEnrollment,
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
  const [filters, setFilters] = useState(getDefaultAppliedCustomFilters());
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

  useEffect(() => {
    // Status-level default filters from the Phase are mandatory (locked): always shown and
    // non-removable. Previously-applied user-added filters are appended and stay editable.
    const defaults = getBenefitPlanDefaultCriteria().map((f) => ({ ...f, locked: true }));
    const filterKey = (f) => `${f.field}__${f.filter}__${f.type}=${f.value}`;
    const defaultKeys = new Set(defaults.map(filterKey));
    const extras = getDefaultAppliedCustomFilters().filter((f) => !defaultKeys.has(filterKey(f)));
    setFilters([...defaults, ...extras]);
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
    setFilters([...filters, CLEARED_STATE_FILTER]);
  };

  const handleRemoveFilter = () => {
    setCurrentFilter(CLEARED_STATE_FILTER);
    const phaseCriteria = filters.filter((filter) => filter.locked);
    setAppliedFiltersRowStructure(phaseCriteria);
    setFilters(phaseCriteria);
  };

  const saveCriteria = () => {
    setAppliedFiltersRowStructure(filters);
    const operatorConditions = enrollmentOperatorConditions(filters, showOperatorFilters);
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
    fetchIndividualEnrollmentSummary(params);
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
      formatMessageWithValues(intl, 'individual', 'individual.enrollment.confirmMessageDialog', { benefitPlanName: object.name }),
    );
  };

  useEffect(() => {
    if (confirmed) {
      const operatorConditions = enrollmentOperatorConditions(filters, showOperatorFilters);
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
      confirmEnrollment(
        params,
        formatMessage(intl, 'individual', 'individual.enrollment.mutationLabel'),
      );
    }
    return () => confirmed && clearConfirm(false);
  }, [confirmed]);

  return (
    <>
      {showMandatoryCriteria && filters.filter((filter) => filter.locked).map((filter) => (
        <AdvancedCriteriaRowValue
          customFilters={customFilters}
          currentFilter={filter}
          setCurrentFilter={setCurrentFilter}
          index={filters.indexOf(filter)}
          filters={filters}
          setFilters={setFilters}
          readOnly={confirmed || filter.locked}
        />
      ))}
      {showOperatorFilters && filters.filter((filter) => !filter.locked).map((filter) => (
        <AdvancedCriteriaRowValue
          customFilters={customFilters}
          currentFilter={filter}
          setCurrentFilter={setCurrentFilter}
          index={filters.indexOf(filter)}
          filters={filters}
          setFilters={setFilters}
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
      {fetchedEnrollmentSummary && (
      <div>
        <div className={classes.item}>
          {formatMessage(intl, 'individual', 'individual.enrollment.summary')}
        </div>
        <Divider />
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {formatMessage(intl, 'individual', 'individual.enrollment.totalNumberOfIndividuals')}
              </Typography>
              <Typography variant="body1">
                {enrollmentSummary.totalNumberOfIndividuals}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfSelectedIndividuals')}
              </Typography>
              <Typography variant="body1">
                {enrollmentSummary.numberOfSelectedIndividuals}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfIndividualsAssignedToProgramme')}
              </Typography>
              <Typography variant="body1">
                {enrollmentSummary.numberOfIndividualsAssignedToProgramme}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfIndividualsNotAssignedToProgramme')}
              </Typography>
              <Typography variant="body1">
                {enrollmentSummary.numberOfIndividualsNotAssignedToProgramme}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {/* eslint-disable-next-line max-len */}
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfIndividualsAssignedToSelectedProgramme')}
              </Typography>
              <Typography variant="body1">
                {enrollmentSummary.numberOfIndividualsAssignedToSelectedProgramme}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={3} style={{ padding: '20px' }}>
              <Typography variant="h6" gutterBottom>
                {/* eslint-disable-next-line max-len */}
                {formatMessage(intl, 'individual', 'individual.enrollment.numberOfIndividualsToBeUploaded')}
              </Typography>
              <Typography variant="body1">
                {enrollmentSummary.numberOfIndividualsToUpload}
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
              disabled={!object || confirmed || enrollmentSummary.numberOfIndividualsToUpload === '0'}
            >
              {formatMessage(intl, 'individual', 'individual.enrollment.confirmEnrollment')}
            </Button>
            <IndividualPreviewEnrollmentDialog
              rights={rights}
              classes={classes}
              advancedCriteria={filtersToApply}
              benefitPlanToEnroll={object.id}
              enrollmentSummary={enrollmentSummary}
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
  fetchingEnrollmentSummary: state.individual.fetchingEnrollmentSummary,
  errorEnrollmentSummary: state.individual.errorEnrollmentSummary,
  fetchedEnrollmentSummary: state.individual.fetchedEnrollmentSummary,
  enrollmentSummary: state.individual.enrollmentSummary,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchCustomFilter,
  fetchIndividualEnrollmentSummary,
  confirmEnrollment,
  clearConfirm,
  coreConfirm,
}, dispatch);

export default injectIntl(
  withTheme(withStyles(styles)(connect(mapStateToProps, mapDispatchToProps)(AdvancedCriteriaForm))),
);
