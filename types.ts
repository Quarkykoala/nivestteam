export interface Transaction {
    id: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    date: string;
}

export interface Goal {
    id: string;
    title: string;
    currentAmount: number;
    targetAmount: number;
    icon: string;
    color: string;
    monthlyContribution: number;
}

export interface UserProfile {
    name: string;
    role: string;
    phone: string;
    avatarUrl: string;
    language: 'English' | 'Hinglish' | 'Hindi';
    interactionMode: 'Voice' | 'Text';
}

export interface AppState {
    user: UserProfile;
    transactions: Transaction[];
    goals: Goal[];
    monthlyIncome: number;
}

export type AppContextType = {
    state: AppState;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
    addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
    updateUser: (updates: Partial<UserProfile>) => Promise<void>;
    updateMonthlyIncome: (income: number) => Promise<void>;
    processVoiceCommand: (text: string) => Promise<string>;
    isProcessing: boolean;
    isLoading: boolean;
};