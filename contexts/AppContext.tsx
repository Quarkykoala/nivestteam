import React, { createContext, useContext, useEffect, useMemo, useState, PropsWithChildren } from 'react';
import { AppState, AppContextType, Transaction, Goal, UserProfile } from '../types';
import { parseFinancialCommand } from '../services/geminiService';
import {
    fetchBudgetsWithItems,
    fetchGoals,
    fetchMonthlyIncome,
    fetchProfile,
    fetchTransactions,
    insertTransaction,
    recordConversation,
    recordFinancialSnapshot,
    upsertGoals,
    upsertMonthlyIncome,
    upsertProfile,
} from '../services/supabaseService';
import { useAuth } from './AuthContext';

const emptyState: AppState = {
    user: {
        name: '',
        role: '',
        phone: '',
        avatarUrl: '',
        language: 'English',
        interactionMode: 'Voice',
    },
    transactions: [],
    goals: [],
    monthlyIncome: 0,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
    const { user } = useAuth();
    const [state, setState] = useState<AppState>(emptyState);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const userAvatar = useMemo(() => {
        if (!user) return '';
        return user.user_metadata?.avatar_url || state.user.avatarUrl || '';
    }, [state.user.avatarUrl, user]);

    useEffect(() => {
        const loadData = async () => {
            if (!user) {
                setState(emptyState);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            const [profile, transactions, goals, monthlyIncome, budgets] = await Promise.all([
                fetchProfile(user.id),
                fetchTransactions(user.id),
                fetchGoals(user.id),
                fetchMonthlyIncome(user.id),
                fetchBudgetsWithItems(user.id),
            ]);

            const enrichedGoals: Goal[] = goals.length
                ? goals
                : budgets.flatMap(budget =>
                    budget.budget_items.map(item => ({
                        id: `${budget.id}-${item.id}`,
                        title: item.category,
                        currentAmount: 0,
                        targetAmount: item.planned_amount,
                        icon: 'savings',
                        color: 'bg-primary/20',
                        monthlyContribution: Math.round(item.planned_amount / Math.max(1, budget.budget_items.length)),
                    }))
                );

            const mappedProfile: UserProfile = {
                name: profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? 'User',
                role: state.user.role || 'Member',
                phone: profile?.phone ?? user.phone ?? '',
                avatarUrl: userAvatar || profile?.full_name?.slice(0, 1) || '',
                language: state.user.language,
                interactionMode: state.user.interactionMode,
            };

            const incomeFromTransactions = transactions
                .filter(t => t.type === 'income')
                .reduce((acc, curr) => acc + curr.amount, 0);

            const nextState: AppState = {
                user: mappedProfile,
                transactions,
                goals: enrichedGoals,
                monthlyIncome: monthlyIncome || incomeFromTransactions,
            };

            setState(nextState);
            setIsLoading(false);
            await recordFinancialSnapshot({ state: nextState, userId: user.id, reason: 'app-init' });
        };

        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const persistSnapshot = (nextState: AppState, reason: string) => {
        if (!user) return;
        void recordFinancialSnapshot({ state: nextState, userId: user.id, reason });
    };

    const addTransaction = async (transaction: Omit<Transaction, 'id' | 'date'>) => {
        if (!user) return;

        const saved = await insertTransaction(user.id, transaction);
        if (!saved) return;

        setState(prev => {
            const nextState = {
                ...prev,
                transactions: [saved, ...prev.transactions],
            };
            persistSnapshot(nextState, 'transaction-added');
            return nextState;
        });
    };

    const addGoal = async (goal: Omit<Goal, 'id'>) => {
        if (!user) return;

        const newGoal: Goal = {
            ...goal,
            id: Math.random().toString(36).substr(2, 9),
        };
        setState(prev => {
            const nextState = {
                ...prev,
                goals: [...prev.goals, newGoal],
            };
            void upsertGoals(user.id, nextState.goals);
            persistSnapshot(nextState, 'goal-added');
            return nextState;
        });
    };

    const updateUser = async (updates: Partial<UserProfile>) => {
        if (!user) return;
        await upsertProfile(user, { ...state.user, ...updates });

        setState(prev => {
            const nextState = {
                ...prev,
                user: { ...prev.user, ...updates },
            };
            persistSnapshot(nextState, 'user-updated');
            return nextState;
        });
    };

    const updateMonthlyIncome = async (income: number) => {
        if (!user) return;
        await upsertMonthlyIncome(user.id, income);
        setState(prev => {
            const nextState = { ...prev, monthlyIncome: income };
            persistSnapshot(nextState, 'monthly-income-updated');
            return nextState;
        });
    };

    const processVoiceCommand = async (text: string): Promise<string> => {
        setIsProcessing(true);
        try {
            const result = await parseFinancialCommand(text);
            if (!result) {
                const parsingFailureResponse = "Sorry, I couldn't understand that.";
                if (user) {
                    await recordConversation({
                        prompt: text,
                        response: parsingFailureResponse,
                        userId: user.id,
                        context: { intent: 'unknown', reason: 'parse_failure' },
                    });
                }
                return parsingFailureResponse;
            }

            if (result.intent === 'transaction') {
                await addTransaction({
                    type: result.type as 'income' | 'expense',
                    category: result.category || 'General',
                    amount: result.amount || 0,
                    description: result.description || 'Voice entry'
                });
                const responseMessage = `Added ${result.type} of ₹${result.amount} for ${result.category}`;
                if (user) {
                    await recordConversation({
                        prompt: text,
                        response: responseMessage,
                        userId: user.id,
                        context: {
                            intent: result.intent,
                            transaction: {
                                amount: result.amount,
                                category: result.category,
                                type: result.type,
                            },
                            totals: {
                                income: state.monthlyIncome,
                                expenses: state.transactions
                                    .filter(t => t.type === 'expense')
                                    .reduce((acc, curr) => acc + curr.amount, 0),
                            },
                        },
                    });
                }
                return responseMessage;
            } else if (result.intent === 'goal') {
                await addGoal({
                    title: result.description || 'New Goal',
                    currentAmount: 0,
                    targetAmount: result.targetAmount || 10000,
                    icon: 'savings',
                    color: 'bg-green-500',
                    monthlyContribution: 0
                });
                const responseMessage = `Created goal: ${result.description}`;
                if (user) {
                    await recordConversation({
                        prompt: text,
                        response: responseMessage,
                        userId: user.id,
                        context: { intent: result.intent, goal: result.description, user: state.user },
                    });
                }
                return responseMessage;
            }

            const unknownResponse = "I understood, but I'm not sure what action to take.";
            if (user) {
                await recordConversation({
                    prompt: text,
                    response: unknownResponse,
                    userId: user.id,
                    context: { intent: result.intent, details: result },
                });
            }
            return unknownResponse;
        } catch (e) {
            const fallbackResponse = "Something went wrong processing your command.";
            if (user) {
                await recordConversation({
                    prompt: text,
                    response: fallbackResponse,
                    userId: user.id,
                    context: { error: true },
                });
            }
            return fallbackResponse;
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AppContext.Provider value={{ state: { ...state, user: { ...state.user, avatarUrl: userAvatar } }, addTransaction, addGoal, updateUser, updateMonthlyIncome, processVoiceCommand, isProcessing, isLoading }}>
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