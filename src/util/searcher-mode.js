export function searcherModeProps({
  readOnly,
  FilterPane,
  onDoubleClick,
  exportFetch,
  cacheFiltersKey,
}) {
  return {
    FilterPane: readOnly ? undefined : FilterPane,
    onDoubleClick: readOnly ? undefined : onDoubleClick,
    exportable: !readOnly,
    exportFetch: readOnly ? undefined : exportFetch,
    cacheFiltersKey: readOnly ? undefined : cacheFiltersKey,
  };
}

export function searcherDefaultFilters(readOnly, registryFilters, additionalQueryFilters = {}) {
  return {
    ...(readOnly ? {} : registryFilters),
    ...additionalQueryFilters,
  };
}

export function searcherOrderingProps(preserveBackendOrder, sorts, defaultOrderBy) {
  return {
    sorts: preserveBackendOrder ? undefined : sorts,
    defaultOrderBy: preserveBackendOrder ? undefined : defaultOrderBy,
  };
}
