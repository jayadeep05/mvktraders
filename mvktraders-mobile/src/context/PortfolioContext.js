import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { portfolioService } from '../api/client';
import { useAuth } from './AuthContext';

const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
    const { user } = useAuth();
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const refreshPortfolio = useCallback(async () => {
        if (!user || user.role !== 'CLIENT') return;

        setLoading(true);
        setError(null);
        try {
            const data = await portfolioService.getMyPortfolio();
            setPortfolio(data);
        } catch (err) {
            console.error('Error fetching portfolio:', err);
            setError(err.message || 'Failed to fetch portfolio');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            refreshPortfolio();
        } else {
            setPortfolio(null);
        }
    }, [user, refreshPortfolio]);

    return (
        <PortfolioContext.Provider value={{ portfolio, loading, error, refreshPortfolio }}>
            {children}
        </PortfolioContext.Provider>
    );
};

export const usePortfolio = () => {
    const context = useContext(PortfolioContext);
    if (!context) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
};
