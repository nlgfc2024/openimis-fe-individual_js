export const DEFAULT_GROUP_EXPORT_FIELDS = ['id', 'code'];

export const getGroupExportFields = (configuredFields) => (
  Array.isArray(configuredFields) ? configuredFields : DEFAULT_GROUP_EXPORT_FIELDS
);

export const hasConfiguredKycGroupExport = (config) => (
  Array.isArray(config?.fields) && config.fields.length > 0
);
