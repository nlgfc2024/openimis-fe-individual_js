import React, {
  useEffect, useState, useRef, useMemo,
} from 'react';
import { injectIntl } from 'react-intl';
import {
  withModulesManager,
  formatMessage,
  formatMessageWithValues,
  Searcher,
  withHistory,
  historyPush,
  downloadExport,
  baseApiUrl,
  coreConfirm,
  clearConfirm,
  decodeId,
  journalize,
} from '@openimis/fe-core';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  IconButton, Tooltip, Button,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
} from '@material-ui/core';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import {
  deleteGroup, downloadGroups, fetchGroups, clearGroupExport,
} from '../actions';
import {
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  RIGHT_GROUP_UPDATE, RIGHT_GROUP_DELETE, INDIVIDUAL_MODULE_NAME, INDIVIDUAL_LABEL,
  INDIVIDUAL_GROUP_MENU_CONTRIBUTION_KEY,
} from '../constants';
import GroupFilter from './GroupFilter';
import {
  applyNumberCircle,
  LOC_LEVELS,
  locationAtLevel,
} from '../util/searcher-utils';
import {
  searcherDefaultFilters,
  searcherModeProps,
  searcherOrderingProps,
} from '../util/searcher-mode';
import {
  DEFAULT_GROUP_EXPORT_FIELDS,
  getGroupExportFields,
  hasConfiguredKycGroupExport,
} from '../util/group-export-config';
import { kycExportFilename } from '../util/kyc-export-filename';

const DEFAULT_GROUP_EXPORT_FIELD_LABELS = {
  id: 'group.id',
  code: 'group.code',
};

const isKycExport = (parameters = []) => parameters.some(
  (parameter) => /^\s*primaryRecipientOnly\s*:\s*true\s*$/.test(parameter),
);

const downloadKycCsv = (blob, filename) => {
  const anchor = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  anchor.style = 'display: none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }, 100);
};

function GroupSearcher({
  intl,
  modulesManager,
  history,
  rights,
  fetchGroups,
  fetchingGroups,
  fetchedGroups,
  errorGroups,
  groups,
  groupsPageInfo,
  groupsTotalCount,
  downloadGroups,
  groupExport,
  errorGroupExport,
  deleteGroup,
  confirmed,
  submittingMutation,
  clearGroupExport,
  readOnly = false,
  mutation,
  coreConfirm,
  clearConfirm,
  journalize,
  CLEARED_STATE_FILTER,
  additionalQueryFilters = {},
  queryName = 'group',
  preserveBackendOrder = false,
}) {
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [deletedGroupUuids, setDeletedGroupUuids] = useState([]);
  const [appliedCustomFilters, setAppliedCustomFilters] = useState([CLEARED_STATE_FILTER]);
  const [appliedFiltersRowStructure, setAppliedFiltersRowStructure] = useState([CLEARED_STATE_FILTER]);
  const prevSubmittingMutationRef = useRef();

  function groupUpdatePageUrl(group) {
    return `${modulesManager.getRef('individual.route.group')}/${group?.id}`;
  }

  const openDeleteGroupConfirmDialog = () => coreConfirm(
    formatMessageWithValues(intl, 'individual', 'group.delete.confirm.title', {
      id: groupToDelete.id,
    }),
    formatMessage(intl, 'individual', 'group.delete.confirm.message'),
    null,
    'warning',
  );

  const onDoubleClick = (group, newTab = false) => rights.includes(RIGHT_GROUP_UPDATE)
  && !deletedGroupUuids.includes(group.id)
  && historyPush(modulesManager, history, 'individual.route.group', [group?.id], newTab);

  const onDelete = (group) => setGroupToDelete(group);

  useEffect(() => groupToDelete && openDeleteGroupConfirmDialog(), [groupToDelete]);

  useEffect(() => {
    if (groupToDelete && confirmed) {
      deleteGroup(
        groupToDelete,
        formatMessageWithValues(intl, 'individual', 'individual.delete.mutationLabel', {
          id: groupToDelete.id,
        }),
      );
      setDeletedGroupUuids([...deletedGroupUuids, groupToDelete.id]);
    }
    if (groupToDelete && confirmed !== null) {
      setGroupToDelete(null);
    }
    return () => confirmed && clearConfirm(false);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  const fetch = (params) => fetchGroups(modulesManager, params, queryName);
  const canManageGroups = !readOnly
    && (rights.includes(RIGHT_GROUP_UPDATE) || rights.includes(RIGHT_GROUP_DELETE));

  const headers = () => {
    const headers = [
      'group.code',
      'group.head',
    ];

    headers.push(...Array.from({ length: LOC_LEVELS }, (_, i) => `location.locationType.${i}`));

    if (canManageGroups) {
      headers.push('emptyLabel');
    }
    return headers;
  };

  const itemFormatters = () => {
    const formatters = [
      (group) => group.code,
      (group) => (group?.head
        ? `${group?.head?.firstName} ${group?.head?.lastName}`
        : formatMessage(intl, 'group', 'noHeadSpecified')),
    ];

    const locations = Array.from({ length: LOC_LEVELS }, (_, i) => (group) => (
      locationAtLevel(group.location, LOC_LEVELS - i - 1)
    ));
    formatters.push(...locations);

    if (canManageGroups) {
      formatters.push((group) => (
        <span style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}>
          {rights.includes(RIGHT_GROUP_UPDATE) && (
            <Tooltip title={formatMessage(intl, 'individual', 'editButtonTooltip')}>
              <IconButton
                href={groupUpdatePageUrl(group)}
                onClick={(e) => e.stopPropagation() && onDoubleClick(group)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
          )}
          {rights.includes(RIGHT_GROUP_DELETE) && (
            <Tooltip title={formatMessage(intl, 'individual', 'deleteButtonTooltip')}>
              <IconButton
                onClick={() => onDelete(group)}
                disabled={deletedGroupUuids.includes(group.id)}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </span>
      ));
    }
    return formatters;
  };

  const rowIdentifier = (group) => group.id;

  const sorts = () => ([
    ['id', false],
  ]);

  const isRowDisabled = (_, group) => deletedGroupUuids.includes(group.id);

  const defaultFilters = () => {
    const filters = {
      isDeleted: {
        value: false,
        filter: 'isDeleted: false',
      },
    };
    return searcherDefaultFilters(readOnly, filters, additionalQueryFilters);
  };

  const [failedExport, setFailedExport] = useState(false);
  const [pendingKycExport, setPendingKycExport] = useState(false);
  const configuredGroupExportFields = modulesManager.getConf(
    'fe-individual',
    'group_export_fields',
    DEFAULT_GROUP_EXPORT_FIELDS,
  );
  const groupExportFields = getGroupExportFields(configuredGroupExportFields);
  const groupExportFieldLabels = modulesManager.getConf(
    'fe-individual',
    'group_export_field_labels',
    DEFAULT_GROUP_EXPORT_FIELD_LABELS,
  );
  const groupKycExport = modulesManager.getConf('fe-individual', 'group_kyc_export', null);
  const groupExportOptions = useMemo(() => {
    if (!hasConfiguredKycGroupExport(groupKycExport)) {
      return [];
    }

    const kycExportColumns = Object.fromEntries(
      groupKycExport.fields.map((field) => [
        field,
        formatMessage(intl, 'individual', groupKycExport.columnLabels?.[field] || field),
      ]),
    );
    return [
      {
        id: 'group-data',
        label: formatMessage(intl, 'individual', 'export.groupData'),
      },
      {
        id: 'kyc-payment-details',
        label: formatMessage(
          intl,
          'individual',
          groupKycExport.label || 'export.additionalGroupData',
        ),
        fields: groupKycExport.fields,
        columns: kycExportColumns,
        additionalFields: {},
        parameters: groupKycExport.parameters || [
          'includePrimaryRecipientData: true',
          'primaryRecipientOnly: true',
        ],
        picker: {
          pubRef: groupKycExport.pickerPubRef || 'socialProtection.BenefitPlanPicker',
          props: groupKycExport.pickerProps || { type: 'GROUP' },
          label: formatMessage(
            intl,
            'individual',
            groupKycExport.pickerLabel || 'export.benefitPlan',
          ),
          required: true,
        },
        getParameters: (phase) => (
          phase?.id ? [`benefitPlanId: "${decodeId(phase.id)}"`] : []
        ),
      },
    ];
  }, [groupKycExport, intl]);
  useEffect(() => {
    if (errorGroupExport) {
      setFailedExport(true);
    }
  }, [errorGroupExport]);

  useEffect(() => {
    if (groupExport) {
      if (pendingKycExport) {
        const url = new URL(
          `${window.location.origin}${baseApiUrl}/core/fetch_export?export=${groupExport}`,
        );
        fetch(url)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Export request failed with status ${response.status}`);
            }
            return response.blob();
          })
          .then(async (blob) => {
            const csv = await blob.text();
            downloadKycCsv(blob, kycExportFilename(csv));
          })
          .catch((error) => console.error('KYC export failed, reason: ', error));
      } else {
        const fileName = `${formatMessage(intl, 'individual', 'export.filename.groups')}.csv`;
        downloadExport(groupExport, fileName)();
      }
      clearGroupExport();
      setPendingKycExport(false);
    }

    return setFailedExport(false);
  }, [groupExport, pendingKycExport]);

  const exportGroups = (parameters) => {
    setPendingKycExport(isKycExport(parameters));
    downloadGroups(parameters);
  };

  const groupFilter = (props) => (
    <GroupFilter
      intl={props.intl}
      classes={props.classes}
      filters={props.filters}
      onChangeFilters={props.onChangeFilters}
    />
  );

  return (
    <div>
      <Searcher
        module="individual"
        fetch={fetch}
        items={groups}
        itemsPageInfo={groupsPageInfo}
        fetchingItems={fetchingGroups}
        fetchedItems={fetchedGroups}
        errorItems={errorGroups}
        tableTitle={formatMessageWithValues(intl, 'individual', 'groups.searcherResultsTitle', {
          groupsTotalCount,
        })}
        headers={headers}
        columnWidths={[
          '14%',
          '22%',
          ...Array(LOC_LEVELS).fill(undefined),
          ...(canManageGroups ? ['112px'] : []),
        ]}
        itemFormatters={itemFormatters}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        rowIdentifier={rowIdentifier}
        defaultFilters={defaultFilters()}
        exportFields={groupExportFields}
        exportFieldsColumns={Object.fromEntries(
          Object.entries(groupExportFieldLabels || {}).map(([field, labelKey]) => [
            field,
            formatMessage(intl, 'individual', labelKey),
          ]),
        )}
        chooseExportableColumns
        exportFieldLabel={formatMessage(intl, 'individual', 'export.groupLabel')}
        enableHeaderActionButtons={!readOnly}
        downloadWithIconButton
        compactLayout
        resetFiltersOnUnmount
        moduleName={INDIVIDUAL_MODULE_NAME}
        objectType={INDIVIDUAL_LABEL}
        additionalCustomFilterParams={{ type: 'GROUP' }}
        appliedCustomFilters={appliedCustomFilters}
        setAppliedCustomFilters={setAppliedCustomFilters}
        appliedFiltersRowStructure={appliedFiltersRowStructure}
        setAppliedFiltersRowStructure={setAppliedFiltersRowStructure}
        applyNumberCircle={applyNumberCircle}
        rowDisabled={isRowDisabled}
        rowLocked={isRowDisabled}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...searcherModeProps({
          readOnly,
          FilterPane: groupFilter,
          onDoubleClick,
          exportFetch: exportGroups,
          cacheFiltersKey: 'groupsFilterCache',
        })}
        exportOptions={groupExportOptions}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...searcherOrderingProps(preserveBackendOrder, sorts, 'id')}
        // eslint-disable-next-line react/jsx-props-no-spreading, max-len
        {...(!readOnly ? {
          actionsContributionKey: INDIVIDUAL_GROUP_MENU_CONTRIBUTION_KEY, isCustomFiltering: true,
        } : { isCustomFiltering: false })}
      />
      {failedExport && (
        <Dialog open={failedExport} fullWidth maxWidth="sm">
          <DialogTitle>{errorGroupExport?.message}</DialogTitle>
          <DialogContent>
            <strong>{`${errorGroupExport?.code}: `}</strong>
            {errorGroupExport?.detail}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFailedExport(false)} color="primary" variant="contained">
              {formatMessage(intl, 'individual', 'ok')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingGroups: state.individual.fetchingGroups,
  fetchedGroups: state.individual.fetchedGroups,
  errorGroups: state.individual.errorGroups,
  groups: state.individual.groups,
  groupsPageInfo: state.individual.groupsPageInfo,
  groupsTotalCount: state.individual.groupsTotalCount,
  selectedFilters: state.core.filtersCache.groupsFilterCache,
  fetchingGroupExport: state.individual.fetchingGroupExport,
  fetchedGroupExport: state.individual.fetchedGroupExport,
  groupExport: state.individual.groupExport,
  groupExportPageInfo: state.individual.groupExportPageInfo,
  errorGroupExport: state.individual.errorGroupExport,
  confirmed: state.core.confirmed,
  submittingMutation: state.individual.submittingMutation,
  mutation: state.individual.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchGroups,
    downloadGroups,
    clearGroupExport,
    deleteGroup,
    coreConfirm,
    clearConfirm,
    journalize,
  },
  dispatch,
);

export default withHistory(
  withModulesManager(injectIntl(connect(mapStateToProps, mapDispatchToProps)(GroupSearcher))),
);
