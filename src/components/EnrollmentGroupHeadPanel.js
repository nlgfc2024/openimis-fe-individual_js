/* eslint-disable max-len */
/* eslint-disable camelcase */
import React from 'react';
import { injectIntl } from 'react-intl';

import { Grid, Divider } from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';

import {
  decodeId,
  FormPanel,
  PublishedComponent,
  formatMessage,
  withModulesManager,
} from '@openimis/fe-core';
import AdvancedCriteriaGroupForm from './dialogs/AdvancedCriteriaGroupForm';
import { CLEARED_STATE_FILTER } from '../constants';
import { normalizeAdvancedCriteria, safeParseJsonObject } from '../utils';

const styles = (theme) => ({
  tableTitle: theme.table.title,
  item: theme.paper.item,
  fullHeight: {
    height: '100%',
  },
});

class EnrollmentGroupHeadPanel extends FormPanel {
  constructor(props) {
    super(props);
    this.state = {
      appliedCustomFilters: [CLEARED_STATE_FILTER],
      appliedFiltersRowStructure: [CLEARED_STATE_FILTER],
    };
  }

  updateJsonExt = (value) => {
    this.updateAttributes({
      jsonExt: value,
    });
  };

  getDefaultAppliedCustomFilters = () => {
    const benefitPlan = this.props?.edited;
    const status = benefitPlan?.status;
    const jsonData = safeParseJsonObject(benefitPlan?.benefitPlan?.jsonExt);
    const criteria = normalizeAdvancedCriteria(
      benefitPlan?.benefitPlan?.advancedCriteria ?? jsonData.advanced_criteria,
    );
    return criteria[status] || [];
  };

  setAppliedCustomFilters = (appliedCustomFilters) => {
    this.setState({ appliedCustomFilters });
  };

  setAppliedFiltersRowStructure = (appliedFiltersRowStructure) => {
    this.setState({ appliedFiltersRowStructure });
  };

  render() {
    // eslint-disable-next-line no-unused-vars
    const { edited, classes, intl } = this.props;
    const { appliedCustomFilters, appliedFiltersRowStructure } = this.state;
    return (
      <>
        <Grid container className={classes.item}>
          <Grid item xs={3} className={classes.item}>
            <PublishedComponent
              pubRef="socialProtection.BenefitPlanPicker"
              withNull
              required
              filterLabels={false}
              onChange={(benefitPlan) => this.updateAttribute('benefitPlan', benefitPlan)}
              value={edited?.benefitPlan}
              type="GROUP"
            />
          </Grid>
          <Grid item xs={3} className={classes.item}>
            <PublishedComponent
              pubRef="socialProtection.BeneficiaryStatusPicker"
              required
              withNull={false}
              filterLabels={false}
              onChange={(status) => this.updateAttribute('status', status)}
              value={edited?.status}
            />
          </Grid>
        </Grid>
        <Divider />
        <Grid>
          <>
            <div className={classes.item}>
              {formatMessage(intl, 'individual', 'individual.enrollment.criteria')}
            </div>
            <Divider />
            <Grid container className={classes.item}>
              <AdvancedCriteriaGroupForm
                object={edited.benefitPlan}
                objectToSave={edited}
                moduleName="individual"
                objectType="Group"
                setAppliedCustomFilters={this.setAppliedCustomFilters}
                appliedCustomFilters={appliedCustomFilters}
                appliedFiltersRowStructure={appliedFiltersRowStructure}
                setAppliedFiltersRowStructure={this.setAppliedFiltersRowStructure}
                updateAttributes={this.updateJsonExt}
                getDefaultAppliedCustomFilters={this.getDefaultAppliedCustomFilters}
                additionalParams={edited?.benefitPlan ? { benefitPlan: `${decodeId(edited.benefitPlan.id)}` } : null}
                edited={edited}
                enrollmentUi={this.props.modulesManager.getRef('individual.enrollmentUiConfig')}
              />
            </Grid>
          </>
        </Grid>
      </>
    );
  }
}

export default withModulesManager(injectIntl(withTheme(withStyles(styles)(EnrollmentGroupHeadPanel))));
