import React from 'react';
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@material-ui/core';
import {
  useGraphqlQuery,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

const PAYMENT_PROVIDER_QUERY = `
  query KycPaymentProviders {
    paymentProviders(activeOnly: true) {
      id
      code
      name
    }
  }
`;

const parseJsonExt = (value) => {
  if (!value) return {};
  return typeof value === 'string' ? JSON.parse(value) : value;
};

function KycPaymentDetails({ jsonExt, onChange }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('individual', modulesManager);
  const { data, error, isLoading } = useGraphqlQuery(PAYMENT_PROVIDER_QUERY, {}, {});
  const details = parseJsonExt(jsonExt);
  const providers = data?.paymentProviders ?? [];
  const selectedProvider = providers.find(
    (provider) => provider.code === details.payment_provider_code,
  ) || providers.find((provider) => provider.name === details.bank);

  const updateField = (field, value) => onChange({
    ...details,
    [field]: value,
  });

  const selectProvider = (event) => {
    const provider = providers.find(({ code }) => code === event.target.value);
    onChange({
      ...details,
      payment_provider_code: provider?.code ?? '',
      bank: provider?.name ?? '',
    });
  };

  return (
    <>
      <FormControl fullWidth margin="normal" error={!!error}>
        <InputLabel>{formatMessage('individual.kycPayment.provider')}</InputLabel>
        <Select
          value={selectedProvider?.code ?? ''}
          onChange={selectProvider}
          disabled={isLoading || !!error}
        >
          {providers.map((provider) => (
            <MenuItem key={provider.code} value={provider.code}>
              {provider.name}
            </MenuItem>
          ))}
        </Select>
        {error && <FormHelperText>{error.message}</FormHelperText>}
        {!error && !isLoading && !providers.length && (
          <FormHelperText>{formatMessage('individual.kycPayment.noProviders')}</FormHelperText>
        )}
      </FormControl>
      <TextField
        fullWidth
        margin="normal"
        label={formatMessage('individual.kycPayment.accountName')}
        value={details.account_name ?? ''}
        onChange={(event) => updateField('account_name', event.target.value)}
      />
      <TextField
        fullWidth
        margin="normal"
        label={formatMessage('individual.kycPayment.accountNumber')}
        value={details.account_number ?? ''}
        onChange={(event) => updateField('account_number', event.target.value)}
        inputProps={{ inputMode: 'text' }}
      />
    </>
  );
}

export default KycPaymentDetails;
