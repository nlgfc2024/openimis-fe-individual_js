import { baseApiUrl } from '@openimis/fe-core';
import { KYC_DETAILS_WORKFLOW } from '../constants';

export default function downloadTemplate(workflowName) {
  const url = new URL(
    `${window.location.origin}${baseApiUrl}/individual/download_template_file/`,
  );
  if (workflowName === KYC_DETAILS_WORKFLOW) {
    url.searchParams.set('workflow_name', workflowName);
  }

  fetch(url)
    .then((response) => response.blob())
    .then((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = workflowName === KYC_DETAILS_WORKFLOW
        ? 'individual_kyc_details_template.csv'
        : 'individual_upload_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Export failed, reason: ', error);
    });
}
