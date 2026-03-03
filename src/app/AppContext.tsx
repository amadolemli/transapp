"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

export type TransactionStatus = 'Confirmé' | 'Validé' | 'Payé' | 'Envoyé' | 'Annulé' | 'En attente';
export type TransactionType = 'in' | 'out';
export type AccountRole = 'admin' | 'partner';
export type TransferRoute = string;

export interface Account {
    id: string;
    email: string;
    name: string;
    password?: string;
    role: AccountRole;
    isActive: boolean;
    customRate: number | null;
    routes: string[];
    admin_email?: string; // The admin who "owns" this account
}


export interface Transaction {
    id: string;
    name: string;
    phone: string;
    amount: number;
    rate: number;
    status: TransactionStatus;
    type: TransactionType;
    date: string;
    ref: string;
    receiverName: string;
    receiverAccount: string;
    partnerEmail: string;
    route: TransferRoute;
    poolsUsed?: { poolId: string, amountCNY: number, poolRate: number }[];
    profit?: number;
    isProfitSettled?: boolean;
    admin_email: string;
}

export type ClientRecordType = 'avoir' | 'dette';

export interface ClientRecord {
    id: string;
    clientName: string;
    amount: number;
    type: ClientRecordType;
    partnerEmail: string;
    date: string;
    status: 'active' | 'resolved';
    admin_email: string;
}

export type BulkTransferStatus = 'En attente' | 'Confirmé' | 'Rejeté';

export interface BulkTransfer {
    id: string;
    partnerEmail: string;
    amountCFA: number;
    amountCNY: number | null;
    remainingCNY?: number | null;
    rate: number | null;
    status: BulkTransferStatus;
    date: string;
    ref: string;
    admin_email: string;
}

interface AppContextType {
    transactions: Transaction[];
    clientRecords: ClientRecord[];
    bulkTransfers: BulkTransfer[];
    accounts: Account[];
    globalRate: number;
    setGlobalRate: (rate: number) => void;
    addAccount: (acc: Omit<Account, 'id'>) => Promise<void>;
    updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
    addTransaction: (t: Omit<Transaction, 'id' | 'date' | 'type' | 'ref' | 'admin_email'>) => Promise<Transaction | null>;
    updateTransactionStatus: (id: string, status: TransactionStatus) => Promise<void>;
    addClientRecord: (r: Omit<ClientRecord, 'id' | 'date' | 'status' | 'admin_email'>) => void;
    resolveClientRecord: (id: string) => void;
    addBulkTransfer: (amountCFA: number, partnerEmail: string) => Promise<void>;
    deleteBulkTransfer: (id: string) => Promise<void>;
    confirmBulkTransfer: (id: string, amountCNY: number) => Promise<void>;
    partnerReserve: number;
    routeRates: Record<string, number>;
    updateRouteRate: (route: string, rate: number) => Promise<void>;
    deleteRouteRate: (route: string) => Promise<void>;
    settleProfits: (partnerEmail?: string) => Promise<void>;
    receiptSettings: { style: number, headerImage: string | null };
    setReceiptSettings: (settings: { style: number, headerImage: string | null }) => Promise<void>;
    isLoading: boolean;
    currentUser: Account | null;
    login: (email: string, password?: string) => Promise<{ success: boolean, error?: string }>;
    logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<Account | null>(null);
    const [globalRate, _setGlobalRate] = useState(95.5);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [clientRecords, setClientRecords] = useState<ClientRecord[]>([]);
    const [bulkTransfers, setBulkTransfers] = useState<BulkTransfer[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [routeRates, setRouteRates] = useState<Record<string, number>>({});
    const [receiptSettings, setReceiptSettingsState] = useState<{ style: number, headerImage: string | null }>({
        style: 1,
        headerImage: null
    });

    const setReceiptSettings = async (settings: { style: number, headerImage: string | null }) => {
        if (!activeAdminScope) return;
        setReceiptSettingsState(settings);
        await supabase.from('settings').upsert({ key: 'receipt_settings', value: settings, admin_email: activeAdminScope });
    };

    // The scope of data is defined by the admin_email
    // If Admin: their own email
    // If Partner: their admin_email field
    const activeAdminScope = currentUser?.role === 'admin' ? currentUser.email : currentUser?.admin_email;

    useEffect(() => {
        if (!currentUser || !activeAdminScope) return;

        const loadData = async () => {
            setIsLoading(true);
            try {
                // Fetch transactions for this admin scope
                const { data: txData } = await supabase.from('transactions').select('*').eq('admin_email', activeAdminScope).order('date', { ascending: false });
                if (txData) {
                    setTransactions(txData.map(t => ({
                        id: t.id,
                        name: t.name,
                        phone: t.phone,
                        amount: t.amount,
                        rate: t.rate,
                        status: t.status,
                        type: t.type,
                        date: t.date,
                        ref: t.ref,
                        receiverName: t.receiver_name,
                        receiverAccount: t.receiver_account,
                        partnerEmail: t.partner_email,
                        route: t.route,
                        profit: t.profit,
                        isProfitSettled: t.is_profit_settled,
                        admin_email: t.admin_email
                    })));
                }

                // Fetch accounts linked to this admin scope (including the admin themselves)
                const { data: accData } = await supabase.from('accounts')
                    .select('*')
                    .or(`admin_email.eq.${activeAdminScope},email.eq.${activeAdminScope}`);

                if (accData) {
                    setAccounts(accData.map(a => ({
                        id: a.id,
                        email: a.email,
                        name: a.name,
                        password: a.password,
                        role: a.role,
                        isActive: a.is_active,
                        customRate: a.custom_rate,
                        routes: a.routes || [],
                        admin_email: a.admin_email
                    })));
                }

                // Fetch bulk transfers
                const { data: bulkData } = await supabase.from('bulk_transfers').select('*').eq('admin_email', activeAdminScope).order('date', { ascending: false });
                if (bulkData) {
                    setBulkTransfers(bulkData.map(b => ({
                        id: b.id,
                        partnerEmail: b.partner_email,
                        amountCFA: b.amount_cfa,
                        amountCNY: b.amount_cny,
                        remainingCNY: b.remaining_cny,
                        rate: b.rate,
                        status: b.status,
                        date: b.date,
                        ref: b.ref,
                        admin_email: b.admin_email
                    })));
                }

                // Fetch settings for this admin
                const { data: settingsData } = await supabase.from('settings').select('*').eq('admin_email', activeAdminScope);
                if (settingsData) {
                    const gRate = settingsData.find(s => s.key === 'global_rate');
                    if (gRate) _setGlobalRate(parseFloat(gRate.value));

                    const rRates = settingsData.find(s => s.key === 'route_rates');
                    if (rRates) setRouteRates(rRates.value);

                    const rSettings = settingsData.find(s => s.key === 'receipt_settings');
                    if (rSettings) setReceiptSettings(rSettings.value);
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [currentUser, activeAdminScope]);

    const login = async (email: string, password?: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('accounts').select('*').eq('email', email.toLowerCase()).single();

            if (error || !data) {
                return { success: false, error: 'Compte introuvable' };
            }

            if (!data.is_active) {
                return { success: false, error: 'Compte suspendu' };
            }

            // Simple password check (replace with real auth for production)
            if (password && data.password !== password) {
                return { success: false, error: 'Mot de passe incorrect' };
            }

            setCurrentUser({
                id: data.id,
                email: data.email,
                name: data.name,
                password: data.password,
                role: data.role,
                isActive: data.is_active,
                customRate: data.custom_rate,
                routes: data.routes || [],
                admin_email: data.admin_email
            });

            return { success: true };
        } catch (e) {
            return { success: false, error: 'Erreur de connexion' };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setCurrentUser(null);
        setTransactions([]);
        setAccounts([]);
        setBulkTransfers([]);
    };

    const setGlobalRate = async (rate: number) => {
        if (!activeAdminScope) return;
        _setGlobalRate(rate);
        await supabase.from('settings').upsert({ key: 'global_rate', value: rate.toString(), admin_email: activeAdminScope });
    };

    const updateRouteRate = async (route: string, rate: number) => {
        if (!activeAdminScope) return;
        const newRates = { ...routeRates, [route]: rate };
        setRouteRates(newRates);
        await supabase.from('settings').upsert({ key: 'route_rates', value: newRates, admin_email: activeAdminScope });
    };

    const deleteRouteRate = async (route: string) => {
        if (!activeAdminScope) return;
        const newRates = { ...routeRates };
        delete newRates[route];
        setRouteRates(newRates);
        await supabase.from('settings').upsert({ key: 'route_rates', value: newRates, admin_email: activeAdminScope });

        // Also remove from accounts locally and in DB
        setAccounts(prev => prev.map(a => ({
            ...a,
            routes: a.routes.filter(r => r !== route)
        })));
        // Note: Real DB update for all accounts would need a specific query or loop
    };

    const addAccount = async (acc: Omit<Account, 'id'>) => {
        if (!currentUser || currentUser.role !== 'admin') return;

        const { data, error } = await supabase.from('accounts').insert({
            email: acc.email.toLowerCase(),
            name: acc.name,
            password: acc.password,
            role: acc.role,
            is_active: acc.isActive,
            custom_rate: acc.customRate,
            routes: acc.routes,
            admin_email: currentUser.email // Link to this admin
        }).select().single();

        if (data) {
            setAccounts(prev => [...prev, {
                id: data.id,
                email: data.email,
                name: data.name,
                password: data.password,
                role: data.role,
                isActive: data.is_active,
                customRate: data.custom_rate,
                routes: data.routes || [],
                admin_email: data.admin_email
            }]);
        }
    };

    const updateAccount = async (id: string, updates: Partial<Account>) => {
        const dbUpdates: any = {};
        if (updates.email !== undefined) dbUpdates.email = updates.email.toLowerCase();
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        if (updates.customRate !== undefined) dbUpdates.custom_rate = updates.customRate;
        if (updates.routes !== undefined) dbUpdates.routes = updates.routes;

        await supabase.from('accounts').update(dbUpdates).eq('id', id);
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const addTransaction = async (t: Omit<Transaction, 'id' | 'date' | 'type' | 'ref' | 'admin_email'>) => {
        if (!activeAdminScope) return null;
        const ref = `TC-${new Date().toISOString().replace(/\D/g, '').slice(0, 8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        const { data, error } = await supabase.from('transactions').insert({
            name: t.name,
            phone: t.phone,
            amount: t.amount,
            rate: t.rate,
            status: t.status,
            type: 'out',
            ref: ref,
            receiver_name: t.receiverName,
            receiver_account: t.receiverAccount,
            partner_email: t.partnerEmail,
            route: t.route,
            profit: t.profit,
            is_profit_settled: false,
            admin_email: activeAdminScope
        }).select().single();

        if (data) {
            const newTx: Transaction = {
                id: data.id,
                name: data.name,
                phone: data.phone,
                amount: data.amount,
                rate: data.rate,
                status: data.status,
                type: data.type,
                date: data.date,
                ref: data.ref,
                receiverName: data.receiver_name,
                receiverAccount: data.receiver_account,
                partnerEmail: data.partner_email,
                route: data.route,
                profit: data.profit,
                isProfitSettled: data.is_profit_settled,
                admin_email: data.admin_email
            };
            setTransactions(prev => [newTx, ...prev]);
            return newTx;
        }
        return null;
    };

    const updateTransactionStatus = async (id: string, status: TransactionStatus) => {
        await supabase.from('transactions').update({ status }).eq('id', id);
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    };

    const addClientRecord = (r: Omit<ClientRecord, 'id' | 'date' | 'status' | 'admin_email'>) => {
        if (!activeAdminScope) return;
        setClientRecords(prev => [{ ...r, id: Date.now().toString(), date: new Date().toISOString(), status: 'active', admin_email: activeAdminScope }, ...prev]);
    };

    const resolveClientRecord = (id: string) => {
        setClientRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
    };

    const addBulkTransfer = async (amountCFA: number, partnerEmail: string) => {
        if (!activeAdminScope) return;
        const ref = `DEP-${new Date().toISOString().replace(/\D/g, '').slice(0, 8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const { data } = await supabase.from('bulk_transfers').insert({
            partner_email: partnerEmail,
            amount_cfa: amountCFA,
            status: 'En attente',
            ref: ref,
            admin_email: activeAdminScope
        }).select().single();

        if (data) {
            setBulkTransfers(prev => [{
                id: data.id,
                partnerEmail: data.partner_email,
                amountCFA: data.amount_cfa,
                amountCNY: data.amount_cny,
                remainingCNY: data.remaining_cny,
                rate: data.rate,
                status: data.status,
                date: data.date,
                ref: data.ref,
                admin_email: data.admin_email
            }, ...prev]);
        }
    };

    const deleteBulkTransfer = async (id: string) => {
        await supabase.from('bulk_transfers').delete().eq('id', id);
        setBulkTransfers(prev => prev.filter(b => b.id !== id));
    };

    const confirmBulkTransfer = async (id: string, amountCNY: number) => {
        const bulk = bulkTransfers.find(b => b.id === id);
        if (!bulk) return;
        const rate = bulk.amountCFA / amountCNY;

        await supabase.from('bulk_transfers').update({
            amount_cny: amountCNY,
            remaining_cny: amountCNY,
            rate,
            status: 'Confirmé'
        }).eq('id', id);

        setBulkTransfers(prev => prev.map(b => b.id === id ? { ...b, amountCNY, remainingCNY: amountCNY, rate, status: 'Confirmé' } : b));
    };

    const settleProfits = async (partnerEmail?: string) => {
        const query = supabase.from('transactions').update({ is_profit_settled: true });
        if (partnerEmail) query.eq('partner_email', partnerEmail);
        await query.in('status', ['Payé', 'Envoyé']);

        setTransactions(prev => prev.map(t => {
            if ((!partnerEmail || t.partnerEmail === partnerEmail) && (t.status === 'Payé' || t.status === 'Envoyé')) {
                return { ...t, isProfitSettled: true };
            }
            return t;
        }));
    };

    const partnerReserve = 0;

    return (
        <AppContext.Provider value={{
            transactions, clientRecords, bulkTransfers, accounts, globalRate, setGlobalRate,
            addAccount, updateAccount, addTransaction, updateTransactionStatus,
            addClientRecord, resolveClientRecord, addBulkTransfer, deleteBulkTransfer,
            confirmBulkTransfer, partnerReserve, routeRates, updateRouteRate,
            deleteRouteRate, settleProfits, receiptSettings, setReceiptSettings, isLoading,
            currentUser, login, logout
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useAppContext must be used within AppProvider');
    return context;
}
