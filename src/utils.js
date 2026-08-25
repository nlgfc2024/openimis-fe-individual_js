import { baseApiUrl } from '@openimis/fe-core';

export function isBase64Encoded(str) {
  // Base64 encoded strings can only contain characters from [A-Za-z0-9+/=]
  const base64RegExp = /^[A-Za-z0-9+/=]+$/;
  return base64RegExp.test(str);
}

export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

export function safeParseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

export function normalizeCriterion(criterion) {
  if (!criterion || typeof criterion !== 'object') return null;
  if (criterion.field && criterion.filter && criterion.type) return { ...criterion };
  const condition = criterion.custom_filter_condition;
  if (typeof condition !== 'string') return null;
  const valueSeparator = condition.indexOf('=');
  if (valueSeparator < 0) return null;
  const expression = condition.slice(0, valueSeparator);
  const parts = expression.split('__');
  if (parts.length < 2) return null;
  const type = parts.pop();
  const filter = parts.length > 1 ? parts.pop() : 'exact';
  const field = parts.join('__');
  if (!field || !filter || !type) return null;
  let value = condition.slice(valueSeparator + 1);
  if (type === 'string' && value.startsWith('"')) {
    try {
      const decoded = JSON.parse(value);
      if (typeof decoded === 'string') value = decoded;
    } catch (error) {
      // Preserve legacy or malformed values for validation instead of dropping them.
    }
  }
  return {
    ...criterion,
    field,
    filter,
    type,
    value,
  };
}

export function normalizeAdvancedCriteria(value) {
  let criteria = value;
  if (typeof criteria === 'string') {
    try { criteria = JSON.parse(criteria); } catch (error) { return {}; }
  }
  if (Array.isArray(criteria)) criteria = { POTENTIAL: criteria };
  if (!criteria || typeof criteria !== 'object') return {};
  return Object.keys(criteria).reduce((result, status) => ({
    ...result,
    [status]: Array.isArray(criteria[status])
      ? criteria[status].map(normalizeCriterion).filter(Boolean)
      : [],
  }), {});
}

export function toCustomFilterConditions(filters) {
  return filters
    .filter((filter) => !filter.locked && filter.field && filter.filter && filter.type)
    .map((filter) => {
      const value = filter.type === 'string'
        ? JSON.stringify(String(filter.value ?? ''))
        : filter.value;
      return `${filter.field}__${filter.filter}__${filter.type}=${value}`;
    });
}

export function enrollmentOperatorConditions(filters, enabled = true) {
  return enabled ? toCustomFilterConditions(filters) : [];
}

export function createEnrollmentCriteriaState(phaseCriteria = [], savedOperatorFilters = []) {
  const lockedPhaseCriteria = phaseCriteria.map((criterion) => ({ ...criterion, locked: true }));
  const phaseKeys = new Set(lockedPhaseCriteria.map(
    (criterion) => `${criterion.field}__${criterion.filter}__${criterion.type}=${criterion.value}`,
  ));
  const operatorFilters = savedOperatorFilters
    .filter((criterion) => !criterion.locked)
    .filter((criterion) => !phaseKeys.has(
      `${criterion.field}__${criterion.filter}__${criterion.type}=${criterion.value}`,
    ))
    .map((criterion) => ({ ...criterion, locked: false }));
  return { phaseCriteria: lockedPhaseCriteria, operatorFilters };
}

export function updateEnrollmentJsonExt(inputJsonExt, status, conditions) {
  const existingData = safeParseJsonObject(inputJsonExt);
  const advancedCriteria = normalizeAdvancedCriteria(existingData.advanced_criteria);
  existingData.advanced_criteria = {
    ...advancedCriteria,
    // eslint-disable-next-line camelcase
    [status]: conditions.map((custom_filter_condition) => ({ custom_filter_condition })),
  };
  return JSON.stringify(existingData);
}

export function toGraphQLStringLiterals(conditions) {
  return conditions.map((condition) => JSON.stringify(condition));
}

export function parseEnrollmentRanking(ranking) {
  if (!ranking) return null;
  if (typeof ranking === 'object') return ranking;
  try {
    return JSON.parse(ranking);
  } catch (error) {
    return null;
  }
}

function downloadFile(url, filename) {
  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Download failed, reason: ', error);
    });
}

export function downloadInvalidItems(uploadId) {
  const baseUrl = new URL(`${window.location.origin}${baseApiUrl}/individual/download_invalid_items/`);
  const queryParams = new URLSearchParams({ upload_id: uploadId });
  const url = `${baseUrl}?${queryParams.toString()}`;
  downloadFile(url, 'individuals_invalid_items.csv');
}

export function downloadIndividualUploadFile(filename) {
  const baseUrl = `${window.location.origin}${baseApiUrl}/individual/download_individual_upload_file/`;
  const queryParams = new URLSearchParams({ filename });
  const url = `${baseUrl}?${queryParams.toString()}`;
  downloadFile(url, filename);
}
