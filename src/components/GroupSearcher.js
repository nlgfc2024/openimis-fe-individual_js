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
  EXPORT_FILE_FORMATS,
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

const KYC_EXPORT_FIELDS = [
  'location__parent__parent__parent__name',
  'location__parent__parent__name',
  'kyc_catchment',
  'location__parent__name',
  'location__name',
  'kyc_phase',
  'json_ext__form_number',
  'primary_recipient_full_name',
  'primary_recipient_national_id',
  'primary_recipient_dob',
  'primary_recipient_gender',
  'primary_recipient_account_number',
  'primary_recipient_account_name',
  'primary_recipient_bank',
];

const KYC_EXPORT_COLUMN_LABELS = {
  location__parent__parent__parent__name: 'export.kycDistrict',
  location__parent__parent__name: 'export.kycTraditionalAuthority',
  kyc_catchment: 'export.kycCatchment',
  location__parent__name: 'export.kycGroupVillageHead',
  location__name: 'export.kycVillage',
  kyc_phase: 'export.kycPhase',
  json_ext__form_number: 'export.kycHouseholdFormNumber',
  primary_recipient_full_name: 'export.kycFullName',
  primary_recipient_national_id: 'export.kycNationalId',
  primary_recipient_dob: 'export.kycDateOfBirth',
  primary_recipient_gender: 'export.kycGender',
  primary_recipient_account_number: 'export.kycAccountNumber',
  primary_recipient_account_name: 'export.kycAccountName',
  primary_recipient_bank: 'export.kycBankProvider',
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
  // The generic core exporter currently produces CSV content. Keep its file
  // extension honest until XLSX generation is implemented in core.
  const [exportFileFormat, setExportFileFormat] = useState(EXPORT_FILE_FORMATS.csv);
  const groupExportOptions = useMemo(() => {
    const kycExportColumns = Object.entries(KYC_EXPORT_COLUMN_LABELS).reduce(
      (columns, [field, labelKey]) => ({
        ...columns,
        [field]: formatMessage(intl, 'individual', labelKey),
      }),
      {},
    );

    return [
      {
        id: 'household-data',
        label: formatMessage(intl, 'individual', 'export.householdData'),
      },
      {
        id: 'kyc-payment-details',
        label: formatMessage(intl, 'individual', 'export.kycPaymentDetails'),
        fields: KYC_EXPORT_FIELDS,
        columns: kycExportColumns,
        additionalFields: {},
        parameters: [
          'includePrimaryRecipientData: true',
          'primaryRecipientOnly: true',
        ],
        picker: {
          pubRef: 'socialProtection.BenefitPlanPicker',
          props: { type: 'GROUP' },
          label: formatMessage(intl, 'individual', 'export.kycPhase'),
          required: true,
        },
        getParameters: (phase) => (phase?.id ? [`benefitPlanId: "${decodeId(phase.id)}"`] : []),
      },
    ];
  }, [intl]);
  useEffect(() => {
    if (errorGroupExport) {
      setFailedExport(true);
    }
  }, [errorGroupExport]);

  useEffect(() => {
    if (groupExport) {
      const fileName = `${formatMessage(intl, 'individual', 'export.filename.groups')}.${exportFileFormat}`;
      const mimeType = exportFileFormat === EXPORT_FILE_FORMATS.xlsx
        ? 'vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : exportFileFormat;
      downloadExport(
        groupExport,
        fileName,
        mimeType,
      )();
      clearGroupExport();
    }

    return setFailedExport(false);
  }, [groupExport, exportFileFormat]);

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
        exportFields={[
          'code',
          'json_ext__form_number',
          'json_ext__validation_status',
          'json_ext__validation_project_name',
          'json_ext__sector',
          'location__parent__parent__parent__name',
          'location__parent__parent__name',
          'location__parent__name',
          'location__name',
        ]}
        exportFieldsColumns={{
          code: formatMessage(intl, 'individual', 'group.code'),
          json_ext__form_number: formatMessage(intl, 'individual', 'group.filter.formNumber'),
          json_ext__validation_status: formatMessage(intl, 'individual', 'group.filter.status'),
          json_ext__validation_project_name: formatMessage(intl, 'individual', 'group.filter.project'),
          json_ext__sector: formatMessage(intl, 'individual', 'group.filter.sector'),
          location__parent__parent__parent__name: formatMessage(intl, 'individual', 'group.filter.district'),
          location__parent__parent__name: formatMessage(intl, 'individual', 'group.filter.ta'),
          location__parent__name: formatMessage(intl, 'individual', 'group.filter.gvh'),
          location__name: formatMessage(intl, 'individual', 'group.filter.village'),
        }}
        chooseExportableColumns
        chooseFileFormat
        exportFileFormats={EXPORT_FILE_FORMATS}
        exportFileFormat={exportFileFormat}
        setExportFileFormat={setExportFileFormat}
        exportFieldLabel={formatMessage(intl, 'individual', 'export.label')}
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
          exportFetch: downloadGroups,
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
