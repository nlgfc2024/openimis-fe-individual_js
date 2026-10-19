import React from 'react';
import { useModulesManager } from '@openimis/fe-core';
import Filter from './Filter';

function GroupFilter({
  intl, classes, filters, onChangeFilters,
}) {
  const modulesManager = useModulesManager();
  const filterFields = [
    { name: 'code_Icontains', label: 'group.code' },
    { name: 'firstName', label: 'group.individual.firstName' },
    { name: 'lastName', label: 'group.individual.lastName' },
  ];

  const checkboxFields = modulesManager.getConf('fe-individual', 'show_missing_location_filter', true)
    ? [{ name: 'location_Isnull', label: 'hasNoLocation' }]
    : [];

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

export default GroupFilter;
