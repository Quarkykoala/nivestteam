import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { AppState, AppContextType, Transaction, Goal, UserProfile } from '../types';
import { parseFinancialCommand } from '../services/geminiService';
import { recordConversation, recordFinancialSnapshot } from '../services/supabaseService';

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

const STORAGE_KEY = 'nivest-app-state';

const loadPersistedState = (): AppState => {
    if (typeof window === 'undefined') {
        return defaultState;
    }

    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) return defaultState;

        const parsed = JSON.parse(stored) as Partial<AppState>;
        return {
            ...defaultState,
            ...parsed,
            user: { ...defaultState.user, ...parsed.user },
            transactions: parsed.transactions ?? defaultState.transactions,
            goals: parsed.goals ?? defaultState.goals,
            monthlyIncome: parsed.monthlyIncome ?? defaultState.monthlyIncome
        };
    } catch (error) {
        console.warn('Failed to load saved financial state', error);
        return defaultState;
    }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    const [state, setState] = useState<AppState>(() => loadPersistedState());
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        void recordFinancialSnapshot({ state, reason: 'app-init' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn('Failed to persist financial state', error);
        }
    }, [state]);

    const persistSnapshot = (nextState: AppState, reason: string) => {
        void recordFinancialSnapshot({ state: nextState, reason });
    };

    const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString()
        };
        setState(prev => {
            const nextState = {
                ...prev,
                transactions: [newTransaction, ...prev.transactions]
            };
            persistSnapshot(nextState, 'transaction-added');
            return nextState;
        });
    };

    const addGoal = (goal: Omit<Goal, 'id'>) => {
        const newGoal: Goal = {
            ...goal,
            id: Math.random().toString(36).substr(2, 9)
        };
        setState(prev => {
            const nextState = {
                ...prev,
                goals: [...prev.goals, newGoal]
            };
            persistSnapshot(nextState, 'goal-added');
            return nextState;
        });
    };

    const updateUser = (updates: Partial<UserProfile>) => {
        setState(prev => {
            const nextState = {
                ...prev,
                user: { ...prev.user, ...updates }
            };
            persistSnapshot(nextState, 'user-updated');
            return nextState;
        });
    };

    const processVoiceCommand = async (text: string): Promise<string> => {
        setIsProcessing(true);
        try {
            const result = await parseFinancialCommand(text);
            if (!result) {
                const parsingFailureResponse = "Sorry, I couldn't understand that.";
                await recordConversation({
                    prompt: text,
                    response: parsingFailureResponse,
                    userPhone: state.user.phone,
                    context: { intent: 'unknown', reason: 'parse_failure' }
                });
                return parsingFailureResponse;
            }

            if (result.intent === 'transaction') {
                addTransaction({
                    type: result.type as 'income' | 'expense',
                    category: result.category || 'General',
                    amount: result.amount || 0,
                    description: result.description || 'Voice entry'
                });
                const responseMessage = `Added ${result.type} of ₹${result.amount} for ${result.category}`;
                await recordConversation({
                    prompt: text,
                    response: responseMessage,
                    userPhone: state.user.phone,
                    context: {
                        intent: result.intent,
                        transaction: {
                            amount: result.amount,
                            category: result.category,
                            type: result.type
                        },
                        totals: {
                            income: state.monthlyIncome,
                            expenses: state.transactions
                                .filter(t => t.type === 'expense')
                                .reduce((acc, curr) => acc + curr.amount, 0)
                        }
                    }
                });
                return responseMessage;
            } else if (result.intent === 'goal') {
                addGoal({
                    title: result.description || 'New Goal',
                    currentAmount: 0,
                    targetAmount: result.targetAmount || 10000,
                    icon: 'savings',
                    color: 'bg-green-500',
                    monthlyContribution: 0
                });
                const responseMessage = `Created goal: ${result.description}`;
                await recordConversation({
                    prompt: text,
                    response: responseMessage,
                    userPhone: state.user.phone,
                    context: { intent: result.intent, goal: result.description, user: state.user }
                });
                return responseMessage;
            }

            const unknownResponse = "I understood, but I'm not sure what action to take.";
            await recordConversation({
                prompt: text,
                response: unknownResponse,
                userPhone: state.user.phone,
                context: { intent: result.intent, details: result }
            });
            return unknownResponse;
        } catch (e) {
            const fallbackResponse = "Something went wrong processing your command.";
            await recordConversation({
                prompt: text,
                response: fallbackResponse,
                userPhone: state.user.phone,
                context: { error: true }
            });
            return fallbackResponse;
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