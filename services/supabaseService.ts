import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

type ConversationPayload = {
    prompt: string;
    response: string;
    userPhone?: string;
    context?: Record<string, unknown>;
};

type FinancialSnapshotPayload = {
    state: AppState;
    reason: string;
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

    await client.from('conversations').insert({
        prompt: payload.prompt,
        response: payload.response,
        user_phone: payload.userPhone ?? 'anonymous',
        context: payload.context ?? {},
        created_at: new Date().toISOString(),
    });
};

export const recordFinancialSnapshot = async ({ state, reason }: FinancialSnapshotPayload) => {
    const client = getSupabaseClient();
    if (!client) return;

    const summary = buildFinancialSummary(state);

    await client.from('financial_snapshots').insert({
        user_phone: state.user.phone,
        reason,
        summary,
        transactions: state.transactions,
        goals: state.goals,
        captured_at: new Date().toISOString(),
    });
};
