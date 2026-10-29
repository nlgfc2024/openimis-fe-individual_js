import { useEffect, useRef, useState } from 'react';

// A response belongs to both the current inputs and a specific request. Returning
// to a previous district must not revive an old preview or a late response.
export default function useEnrollmentPreview(key) {
  const current = useRef({ key, sequence: 0 });
  const mounted = useRef(true);
  const [state, setState] = useState({ summary: null, loading: false });
  if (current.current.key !== key) {
    current.current = { key, sequence: current.current.sequence + 1 };
  }
  useEffect(() => () => { mounted.current = false; }, []);

  const load = async (request) => {
    if (!mounted.current || current.current.key !== key) return;
    const token = { key, sequence: current.current.sequence + 1 };
    current.current = token;
    setState({ ...token, summary: null, loading: true });
    let response;
    try { response = await request(); } catch (error) { response = null; }
    if (!mounted.current || current.current !== token) return;
    const summary = !response?.error && !response?.payload?.errors?.length
      ? response?.payload?.data?.groupEnrollmentSummary : null;
    setState({ ...token, summary: summary ?? null, loading: false });
  };
  const matches = state.key === key && state.sequence === current.current.sequence;
  return {
    load,
    summary: matches ? state.summary : null,
    loading: matches && state.loading,
  };
}
