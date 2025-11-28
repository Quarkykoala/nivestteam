import React, { createContext, useContext, useState, ReactNode, PropsWithChildren } from 'react';
import { AppState, AppContextType, Transaction, Goal, UserProfile } from '../types';
import { parseFinancialCommand } from '../services/geminiService';

const defaultState: AppState = {
    user: {
        name: "Aarav Sharma",
        role: "Gig Worker",
        phone: "+91 98765 43210",
        avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuD8JO0tyFFec7T92hQiz4VUr_GUMEtlwAKU9AWbavvEzPptg4M9lnZQyqYOIzppP-e-gFiHnufeWAzvacgta9QAnkf88OjFXZk8O50earhDgMkEEnGup3wzp4k5DtCtv6aQu1nFZz3z2AFt4HsFghV8W6lwCAXDLswFv4YhWBKOOIjblNReamPAXThxlp04snsB8cqXaEQU3m7_e2NqrIlr-AnhUrOqJEmZQcJlsil05wfJ3A20RLx655UhcfsN3cLLbFkfFHe38v8",
        language: 'Hinglish',
        interactionMode: 'Voice'
    },
    transactions: [
        { id: '1', type: 'expense', category: 'Food', amount: 1200, description: 'Lunch & Groceries', date: new Date().toISOString() },
        { id: '2', type: 'expense', category: 'Fuel', amount: 850, description: 'Petrol', date: new Date().toISOString() },
        { id: '3', type: 'expense', category: 'Shopping', amount: 540, description: 'Daily Spend', date: new Date().toISOString() },
        { id: '4', type: 'expense', category: 'Rent', amount: 7000, description: 'Monthly Rent', date: new Date().toISOString() },
    ],
    goals: [
        { id: '1', title: 'Buy a Bike', currentAmount: 15000, targetAmount: 60000, icon: 'two_wheeler', color: 'bg-orange-500', monthlyContribution: 5000 },
        { id: '2', title: 'New Phone', currentAmount: 12000, targetAmount: 20000, icon: 'smartphone', color: 'bg-blue-500', monthlyContribution: 2000 }
    ],
    monthlyIncome: 50000
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    const [state, setState] = useState<AppState>(defaultState);
    const [isProcessing, setIsProcessing] = useState(false);

    const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString()
        };
        setState(prev => ({
            ...prev,
            transactions: [newTransaction, ...prev.transactions]
        }));
    };

    const addGoal = (goal: Omit<Goal, 'id'>) => {
        const newGoal: Goal = {
            ...goal,
            id: Math.random().toString(36).substr(2, 9)
        };
        setState(prev => ({
            ...prev,
            goals: [...prev.goals, newGoal]
        }));
    };

    const updateUser = (updates: Partial<UserProfile>) => {
        setState(prev => ({
            ...prev,
            user: { ...prev.user, ...updates }
        }));
    };

    const processVoiceCommand = async (text: string): Promise<string> => {
        setIsProcessing(true);
        try {
            const result = await parseFinancialCommand(text);
            if (!result) return "Sorry, I couldn't understand that.";

            if (result.intent === 'transaction') {
                addTransaction({
                    type: result.type as 'income' | 'expense',
                    category: result.category || 'General',
                    amount: result.amount || 0,
                    description: result.description || 'Voice entry'
                });
                return `Added ${result.type} of ₹${result.amount} for ${result.category}`;
            } else if (result.intent === 'goal') {
                addGoal({
                    title: result.description || 'New Goal',
                    currentAmount: 0,
                    targetAmount: result.targetAmount || 10000,
                    icon: 'savings',
                    color: 'bg-green-500',
                    monthlyContribution: 0
                });
                return `Created goal: ${result.description}`;
            }

            return "I understood, but I'm not sure what action to take.";
        } catch (e) {
            return "Something went wrong processing your command.";
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AppContext.Provider value={{ state, addTransaction, addGoal, updateUser, processVoiceCommand, isProcessing }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};