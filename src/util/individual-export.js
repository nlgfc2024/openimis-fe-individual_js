export const BASE_INDIVIDUAL_EXPORT_FIELDS = ['id', 'first_name', 'last_name', 'dob'];

export function getIndividualExportParameters(parameters, selectedFields, fieldLabels) {
  const columns = Object.fromEntries(
    selectedFields.map((field) => [
      field,
      fieldLabels[field] || field,
    ]),
  );
  const exportParameters = parameters.filter((parameter) => (
    !parameter.startsWith('fields:') && !parameter.startsWith('fieldsColumns:')
  ));
  exportParameters.push(`fields: ${JSON.stringify(selectedFields)}`);
  exportParameters.push(`fieldsColumns: "${JSON.stringify(columns).replace(/"/g, '\\"')}"`);
  return exportParameters;
}

export function getIndividualSchemaExportFields(rawSchema) {
  let schema = rawSchema;
  if (typeof rawSchema === 'string') {
    try {
      schema = JSON.parse(rawSchema);
    } catch (error) {
      return [];
    }
  }

  const baseFields = new Set(BASE_INDIVIDUAL_EXPORT_FIELDS);
  const schemaFields = Object.entries(schema?.properties || {})
    .filter(([key]) => !baseFields.has(key))
    .map(([key, definition]) => ({
      field: `json_ext__${key}`,
      label: definition?.description || key,
    }));
  return schemaFields;
}
