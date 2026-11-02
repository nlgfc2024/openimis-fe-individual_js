export const BASE_INDIVIDUAL_EXPORT_FIELDS = ['id', 'first_name', 'last_name', 'dob'];

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
  return Object.entries(schema?.properties || {})
    .filter(([key]) => !baseFields.has(key))
    .map(([key, definition]) => ({
      field: `json_ext__${key}`,
      label: definition?.description || key,
    }));
}
