import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { AppState, Goal, Transaction, UserProfile } from '../types';

type ConversationPayload = {
    prompt: string;
    response: string;
    userId: string;
    context?: Record<string, unknown>;
};

type FinancialSnapshotPayload = {
    state: AppState;
    userId: string;
    reason: string;
};

type SupabaseTransaction = {
    id: number;
    user_id: string;
    account_id: string | null;
    occurred_on: string;
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    category: string | null;
    description: string | null;
    source: string;
    llm_message_id: number | null;
    created_at: string;
};

type SupabaseBudget = {
    id: string;
    user_id: string;
    period: 'weekly' | 'monthly' | 'custom';
    start_date: string;
    end_date: string;
    currency: string;
    title: string | null;
    created_at: string;
    budget_items: SupabaseBudgetItem[];
};

type SupabaseBudgetItem = {
    id: number;
    budget_id: string;
    category: string;
    planned_amount: number;
    notes: string | null;
};

type SupabaseProfile = {
    id: string;
    full_name: string | null;
    phone: string | null;
    created_at: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseClient: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const getSupabaseClient = (): SupabaseClient | null => {
    if (!supabaseClient) {
        console.warn('Supabase credentials missing; skipping capture.');
        return null;
    }

    return supabaseClient;
};

const buildFinancialSummary = (state: AppState) => {
    const totalExpenses = state.transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = state.transactions
        .filter(t => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return {
        totalExpenses,
        totalIncome,
        monthlyIncome: state.monthlyIncome,
        remainingBudget: state.monthlyIncome - totalExpenses,
        goalsCount: state.goals.length,
    };
};

export const recordConversation = async (payload: ConversationPayload) => {
    const client = getSupabaseClient();
    if (!client) return;

    const { data: conversation, error } = await client
        .from('conversations')
        .insert({
            user_id: payload.userId,
            title: payload.prompt.slice(0, 80),
            metadata: payload.context ?? {},
        })
        .select('id')
        .single();

    if (error || !conversation) {
        console.error('Failed to create conversation', error);
        return;
    }

    await client.from('messages').insert([
        {
            conversation_id: conversation.id,
            role: 'user',
            content: payload.prompt,
        },
        {
            conversation_id: conversation.id,
            role: 'assistant',
            content: payload.response,
            metadata: payload.context ?? {},
        },
    ]);
};

export const recordFinancialSnapshot = async ({ state, userId, reason }: FinancialSnapshotPayload) => {
    const client = getSupabaseClient();
    if (!client) return;

    const summary = buildFinancialSummary(state);

    await client
        .from('user_facts')
        .upsert({
            user_id: userId,
            key: 'financial_summary',
            value: { reason, summary, captured_at: new Date().toISOString() },
        });
};

export const fetchTransactions = async (userId: string): Promise<Transaction[]> => {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_on', { ascending: false });

    if (error || !data) {
        console.error('Failed to fetch transactions', error);
        return [];
    }

    return data.map((row: SupabaseTransaction) => ({
        id: String(row.id),
        type: row.type as Transaction['type'],
        category: row.category ?? 'General',
        amount: row.amount,
        description: row.description ?? '',
        date: row.occurred_on,
    }));
};

export const insertTransaction = async (
    userId: string,
    transaction: Omit<Transaction, 'id' | 'date'>
): Promise<Transaction | null> => {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
        .from('transactions')
        .insert({
            user_id: userId,
            type: transaction.type,
            amount: transaction.amount,
            category: transaction.category,
            description: transaction.description,
            occurred_on: new Date().toISOString(),
            source: 'manual',
        })
        .select('*')
        .single();

    if (error || !data) {
        console.error('Failed to insert transaction', error);
        return null;
    }

    return {
        id: String(data.id),
        type: data.type as Transaction['type'],
        category: data.category ?? 'General',
        amount: data.amount,
        description: data.description ?? '',
        date: data.occurred_on,
    };
};

export const fetchBudgetsWithItems = async (userId: string): Promise<SupabaseBudget[]> => {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('budgets')
        .select('*, budget_items(*)')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

    if (error || !data) {
        console.error('Failed to fetch budgets', error);
        return [];
    }

    return data as SupabaseBudget[];
};

export const fetchGoals = async (userId: string): Promise<Goal[]> => {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('user_facts')
        .select('value')
        .eq('user_id', userId)
        .eq('key', 'goals')
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch goals', error);
        return [];
    }

    return (data?.value as Goal[]) ?? [];
};

export const upsertGoals = async (userId: string, goals: Goal[]) => {
    const client = getSupabaseClient();
    if (!client) return;

    await client
        .from('user_facts')
        .upsert({
            user_id: userId,
            key: 'goals',
            value: goals,
        });
};

export const fetchMonthlyIncome = async (userId: string): Promise<number> => {
    const client = getSupabaseClient();
    if (!client) return 0;

    const { data, error } = await client
        .from('user_facts')
        .select('value')
        .eq('user_id', userId)
        .eq('key', 'monthly_income')
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch monthly income', error);
        return 0;
    }

    return typeof data?.value === 'number' ? data.value : 0;
};

export const upsertMonthlyIncome = async (userId: string, income: number) => {
    const client = getSupabaseClient();
    if (!client) return;

    await client
        .from('user_facts')
        .upsert({
            user_id: userId,
            key: 'monthly_income',
            value: income,
        });
};

export const fetchProfile = async (userId: string): Promise<SupabaseProfile | null> => {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch profile', error);
        return null;
    }

    return (data as SupabaseProfile) ?? null;
};

export const upsertProfile = async (user: User, updates: Partial<UserProfile>) => {
    const client = getSupabaseClient();
    if (!client) return;

    const payload = {
        id: user.id,
        full_name: updates.name ?? user.user_metadata?.full_name ?? user.email ?? 'User',
        phone: updates.phone ?? user.user_metadata?.phone ?? null,
    };

    await client.from('profiles').upsert(payload);
};
