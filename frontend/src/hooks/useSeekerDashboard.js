import { useCallback, useEffect, useState } from 'react';
import { getMockDashboardData, normalizeUser, seekerService, shouldUseSeekerMockFallback } from '../services/seekerService';
import { useAuth } from '../context/AuthContext';

export default function useSeekerDashboard() {
    const { user: sessionUser } = useAuth();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUsingFallback, setIsUsingFallback] = useState(false);

    const loadDashboard = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const dashboard = await seekerService.getDashboard();
            setData({ ...dashboard, profile: normalizeUser(dashboard.profile, sessionUser) });
            setIsUsingFallback(false);
        } catch (requestError) {
            if (!shouldUseSeekerMockFallback()) {
                setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load your dashboard.');
                setData(null);
            } else {
                setData(getMockDashboardData(sessionUser));
                setIsUsingFallback(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [sessionUser]);

    useEffect(() => {
        // This effect intentionally starts the initial REST request on mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadDashboard();
    }, [loadDashboard]);

    return { ...data, isLoading, error, isUsingFallback, refresh: loadDashboard };
}
