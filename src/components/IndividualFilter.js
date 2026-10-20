import React from 'react';
import { useModulesManager } from '@openimis/fe-core';
import Filter from './Filter';
import { CONTAINS_LOOKUP } from '../constants';

function IndividualFilter({
  intl, classes, filters, onChangeFilters,
}) {
  const modulesManager = useModulesManager();
  const filterFields = [
    { name: 'firstName', label: 'individual.firstName', lookup: CONTAINS_LOOKUP },
    { name: 'lastName', label: 'individual.lastName', lookup: CONTAINS_LOOKUP },
  ];

  const checkboxFields = [
    ...(modulesManager.getConf('fe-individual', 'show_deleted_filter', true)
      ? [{ name: 'isDeleted', label: 'isDeleted' }] : []),
    ...(modulesManager.getConf('fe-individual', 'show_missing_location_filter', true)
      ? [{ name: 'location_Isnull', label: 'hasNoLocation' }] : []),
  ];

  return (
    <Filter
      intl={intl}
      classes={classes}
      filters={filters}
      onChangeFilters={onChangeFilters}
      filterFields={filterFields}
      checkboxFields={checkboxFields}
    />
  );
}

export default IndividualFilter;
