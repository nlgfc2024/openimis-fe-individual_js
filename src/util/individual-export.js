export const BASE_INDIVIDUAL_EXPORT_FIELDS = ['id', 'first_name', 'last_name', 'dob'];

export const KYC_EXPORT_FIELDS = [
  { field: 'json_ext__form_number', label: 'UBR household form number' },
  { field: 'location__parent__parent__parent__name', label: 'District' },
  { field: 'location__parent__parent__name', label: 'Traditional Authority' },
  { field: 'location__parent__name', label: 'Group Village Head' },
  { field: 'location__name', label: 'Village' },
  { field: 'kyc_catchment', label: 'Catchment' },
  { field: 'json_ext__national_id', label: 'National ID' },
  { field: 'json_ext__account_number', label: 'Account number' },
  { field: 'json_ext__account_name', label: 'Account name' },
  { field: 'json_ext__bank', label: 'Bank / provider' },
];

export const KYC_EXPORT_SELECTED_FIELDS = [
  'location__parent__parent__parent__name',
  'location__parent__parent__name',
  'location__parent__name',
  'location__name',
  'kyc_catchment',
  'json_ext__form_number',
  'first_name',
  'last_name',
  'json_ext__national_id',
  'dob',
  'json_ext__account_number',
  'json_ext__account_name',
  'json_ext__bank',
];

export const KYC_EXPORT_COLUMN_LABELS = {
  first_name: 'First Name',
  last_name: 'Last Name',
  dob: 'Date of Birth',
};

export function getIndividualExportParameters(parameters, selectedFields, fieldLabels) {
  const isKycExport = selectedFields.some((field) => (
    KYC_EXPORT_FIELDS.some((kycField) => kycField.field === field)
  ));
  const fields = isKycExport ? KYC_EXPORT_SELECTED_FIELDS : selectedFields;
  const columns = Object.fromEntries(
    fields.map((field) => [
      field,
      (isKycExport && KYC_EXPORT_COLUMN_LABELS[field]) || fieldLabels[field] || field,
    ]),
  );
  const exportParameters = parameters.filter((parameter) => (
    !parameter.startsWith('fields:') && !parameter.startsWith('fieldsColumns:')
  ));
  if (isKycExport && !exportParameters.some((parameter) => parameter.startsWith('primaryRecipientOnly:'))) {
    exportParameters.push('primaryRecipientOnly: true');
  }
  exportParameters.push(`fields: ${JSON.stringify(fields)}`);
  exportParameters.push(`fieldsColumns: "${JSON.stringify(columns).replace(/"/g, '\\"')}"`);
  return exportParameters;
}

export function getIndividualSchemaExportFields(rawSchema) {
  let schema = rawSchema;
  if (typeof rawSchema === 'string') {
    try {
      schema = JSON.parse(rawSchema);
    } catch (error) {
      return KYC_EXPORT_FIELDS;
    }
  }

  const baseFields = new Set(BASE_INDIVIDUAL_EXPORT_FIELDS);
  const schemaFields = Object.entries(schema?.properties || {})
    .filter(([key]) => !baseFields.has(key))
    .map(([key, definition]) => ({
      field: `json_ext__${key}`,
      label: definition?.description || key,
    }));
  const schemaFieldNames = new Set(schemaFields.map(({ field }) => field));
  return [
    ...schemaFields,
    ...KYC_EXPORT_FIELDS.filter(({ field }) => !schemaFieldNames.has(field)),
  ];
}
