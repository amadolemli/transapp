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
    encaissement: number;
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

    // Dynamic calculations
    const activeAdminScope = currentUser?.role === 'admin' ? currentUser.email : currentUser?.admin_email;

    // Calculate Partner Reserve (The value of their remaining CNY in CFA)
    const partnerReserve = bulkTransfers
        .filter(b => b.status === 'Confirmé' && (currentUser?.role === 'admin' ? true : b.partnerEmail === currentUser?.email))
        .reduce((acc, b) => acc + ((b.remainingCNY || 0) * (b.rate || 0)), 0);

    // Calculate Encaissement (Cash on Hand)
    // Formula: Sum of Client Transactions (CFA) - Sum of Deposits to Admin (CFA)
    const encaissement = (() => {
        if (!currentUser) return 0;

        let received = 0;
        let deposited = 0;

        if (currentUser.role === 'admin') {
            received = transactions.reduce((acc, t) => acc + t.amount, 0);
            deposited = bulkTransfers.filter(b => b.status !== 'Rejeté').reduce((acc, b) => acc + b.amountCFA, 0);
        } else {
            const targetEmail = currentUser.email;
            received = transactions.filter(t => t.partnerEmail === targetEmail).reduce((acc, t) => acc + t.amount, 0);
            deposited = bulkTransfers.filter(b => b.partnerEmail === targetEmail && b.status !== 'Rejeté').reduce((acc, b) => acc + b.amountCFA, 0);
        }

        return received - deposited;
    })();

    useEffect(() => {
        // 1. Initial manual session check (for partners logged in via DB fallback)
        const checkManualSession = async () => {
            const manualSession = localStorage.getItem('transapp_manual_session');
            if (manualSession) {
                try {
                    const { email, password } = JSON.parse(manualSession);
                    console.log('Restoring manual session for:', email);
                    const { data: dbUser } = await supabase.from('accounts')
                        .select('*')
                        .eq('email', email.toLowerCase())
                        .eq('password', password)
                        .single();

                    if (dbUser && dbUser.is_active) {
                        setCurrentUser({
                            id: dbUser.id,
                            email: dbUser.email,
                            name: dbUser.name,
                            password: dbUser.password,
                            role: dbUser.role,
                            isActive: dbUser.is_active,
                            customRate: dbUser.custom_rate,
                            routes: dbUser.routes || [],
                            admin_email: dbUser.admin_email
                        });
                    } else {
                        localStorage.removeItem('transapp_manual_session');
                    }
                } catch (e) {
                    localStorage.removeItem('transapp_manual_session');
                }
            }
        };

        // 2. Listen for auth changes (official Supabase Auth)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth event:', event, session?.user?.email);

            if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setTransactions([]);
                setAccounts([]);
                setBulkTransfers([]);
                localStorage.removeItem('transapp_manual_session');
                return;
            }

            if (session?.user) {
                // If official auth is active, clear any manual session to avoid confusion
                localStorage.removeItem('transapp_manual_session');

                // Fetch profile
                const { data: profile, error } = await supabase.from('accounts')
                    .select('*')
                    .eq('email', session.user.email?.toLowerCase())
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    return;
                }

                if (profile && profile.is_active) {
                    setCurrentUser({
                        id: profile.id,
                        email: profile.email,
                        name: profile.name,
                        password: profile.password,
                        role: profile.role,
                        isActive: profile.is_active,
                        customRate: profile.custom_rate,
                        routes: profile.routes || [],
                        admin_email: profile.admin_email
                    });
                } else if (profile && !profile.is_active) {
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                }
            }
        });

        checkManualSession();
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser || !activeAdminScope) {
            setIsLoading(false);
            return;
        }

        const loadData = async () => {
            setIsLoading(true);
            console.log('Loading app data for scope:', activeAdminScope);

            try {
                // Fetch everything in parallel
                const [txRes, accRes, bulkRes, clientRes, settingsRes] = await Promise.all([
                    supabase.from('transactions')
                        .select('*')
                        .eq('admin_email', activeAdminScope)
                        .order('date', { ascending: false }),

                    supabase.from('accounts')
                        .select('*')
                        .or(`admin_email.eq."${activeAdminScope}",email.eq."${activeAdminScope}"`),

                    supabase.from('bulk_transfers')
                        .select('*')
                        .eq('admin_email', activeAdminScope)
                        .order('date', { ascending: false }),

                    supabase.from('client_records')
                        .select('*')
                        .eq('admin_email', activeAdminScope)
                        .order('date', { ascending: false }),

                    supabase.from('settings')
                        .select('*')
                        .eq('admin_email', activeAdminScope)
                ]);

                // Handle transactions
                if (txRes.data) {
                    setTransactions(txRes.data.map(t => ({
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

                // Handle accounts
                if (accRes.data) {
                    setAccounts(accRes.data.map(a => ({
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

                // Handle bulk transfers
                if (bulkRes.data) {
                    setBulkTransfers(bulkRes.data.map(b => ({
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

                // Handle client records
                if (clientRes.data) {
                    setClientRecords(clientRes.data.map(r => ({
                        id: r.id,
                        clientName: r.client_name,
                        amount: r.amount,
                        type: r.type,
                        partnerEmail: r.partner_email,
                        date: r.date,
                        status: r.status,
                        admin_email: r.admin_email
                    })));
                }

                // Handle settings
                if (settingsRes.data) {
                    const gRate = settingsRes.data.find(s => s.key === 'global_rate');
                    if (gRate) _setGlobalRate(parseFloat(gRate.value));

                    const rRates = settingsRes.data.find(s => s.key === 'route_rates');
                    if (rRates) setRouteRates(rRates.value);

                    const rSettings = settingsRes.data.find(s => s.key === 'receipt_settings');
                    if (rSettings) setReceiptSettingsState(rSettings.value);
                }
            } catch (error) {
                console.error('Critical error loading app data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [currentUser?.email, activeAdminScope]); // Use primitive values to avoid ref-loops

    const login = async (email: string, password?: string) => {
        setIsLoading(true);
        try {
            const lowerEmail = email.toLowerCase();

            // 1. Try to authenticate with Supabase Auth first
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: lowerEmail,
                password: password || '',
            });

            if (!authError && authData.user) {
                // Success with Supabase Auth - Clear any leftover manual session
                localStorage.removeItem('transapp_manual_session');

                // Fetch profile
                const { data, error: profileError } = await supabase.from('accounts')
                    .select('*')
                    .eq('email', lowerEmail)
                    .single();

                if (profileError || !data) {
                    return { success: false, error: 'Profil introuvable après authentification.' };
                }

                if (!data.is_active) {
                    await supabase.auth.signOut();
                    return { success: false, error: 'Compte suspendu' };
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
            }

            // 2. Fallback: Check 'accounts' table directly (for partners created without Auth account)
            console.log('Supabase Auth failed, checking accounts table fallback...');
            const { data: dbUser, error: dbError } = await supabase.from('accounts')
                .select('*')
                .eq('email', lowerEmail)
                .eq('password', password) // Direct matching for the "assigned" password
                .single();

            if (dbUser) {
                if (!dbUser.is_active) {
                    return { success: false, error: 'Compte suspendu' };
                }

                // SAVE manual session for persistence on refresh
                localStorage.setItem('transapp_manual_session', JSON.stringify({ email: lowerEmail, password }));

                setCurrentUser({
                    id: dbUser.id,
                    email: dbUser.email,
                    name: dbUser.name,
                    password: dbUser.password,
                    role: dbUser.role,
                    isActive: dbUser.is_active,
                    customRate: dbUser.custom_rate,
                    routes: dbUser.routes || [],
                    admin_email: dbUser.admin_email
                });
                return { success: true };
            }

            return { success: false, error: authError?.message || 'Identifiants invalides.' };
        } catch (e) {
            console.error('Login error:', e);
            return { success: false, error: 'Erreur de connexion' };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
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
            pools_used: t.poolsUsed,
            is_profit_settled: false,
            admin_email: activeAdminScope
        }).select().single();

        if (error) {
            console.error('Error adding transaction:', error);
            alert("Erreur lors de l'enregistrement de la transaction: " + error.message);
            return null;
        }

        if (data) {
            // DEDUCT from pools in DB and local state
            if (t.poolsUsed && t.poolsUsed.length > 0) {
                for (const allocation of t.poolsUsed) {
                    const pool = bulkTransfers.find(p => p.id === allocation.poolId);
                    if (pool) {
                        const newRemaining = (pool.remainingCNY || 0) - allocation.amountCNY;
                        await supabase.from('bulk_transfers')
                            .update({ remaining_cny: newRemaining })
                            .eq('id', pool.id);

                        setBulkTransfers(prev => prev.map(p => p.id === pool.id ? { ...p, remainingCNY: newRemaining } : p));
                    }
                }
            }

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
                poolsUsed: data.pools_used,
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

    const addClientRecord = async (r: Omit<ClientRecord, 'id' | 'date' | 'status' | 'admin_email'>) => {
        if (!activeAdminScope) return;
        const { data, error } = await supabase.from('client_records').insert({
            client_name: r.clientName,
            amount: r.amount,
            type: r.type,
            partner_email: r.partnerEmail,
            status: 'active',
            admin_email: activeAdminScope
        }).select().single();

        if (error) {
            console.error('Error adding client record:', error);
            return;
        }

        if (data) {
            setClientRecords(prev => [{
                id: data.id,
                clientName: data.client_name,
                amount: data.amount,
                type: data.type,
                partnerEmail: data.partner_email,
                date: data.date,
                status: data.status,
                admin_email: data.admin_email
            }, ...prev]);
        }
    };

    const resolveClientRecord = async (id: string) => {
        const { error } = await supabase.from('client_records').update({ status: 'resolved' }).eq('id', id);
        if (!error) {
            setClientRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
        }
    };

    const addBulkTransfer = async (amountCFA: number, partnerEmail: string) => {
        if (!activeAdminScope) {
            console.error('AddBulkTransfer failed: No activeAdminScope');
            return;
        }
        const ref = `DEP-${new Date().toISOString().replace(/\D/g, '').slice(0, 8)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

        console.log('Inserting bulk transfer for:', partnerEmail, 'with scope:', activeAdminScope);

        const { data, error } = await supabase.from('bulk_transfers').insert({
            partner_email: partnerEmail,
            amount_cfa: amountCFA,
            status: 'En attente',
            ref: ref,
            admin_email: activeAdminScope
        }).select().single();

        if (error) {
            console.error('Error inserting bulk transfer:', error.message, error.details);
            alert("Erreur lors de l'enregistrement du dépôt. " + error.message);
            return;
        }

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

    const receiptSettingsValue = receiptSettings; // to avoid naming conflict

    return (
        <AppContext.Provider value={{
            transactions, clientRecords, bulkTransfers, accounts, globalRate, setGlobalRate,
            addAccount, updateAccount, addTransaction, updateTransactionStatus,
            addClientRecord, resolveClientRecord, addBulkTransfer, deleteBulkTransfer,
            confirmBulkTransfer, partnerReserve, encaissement, routeRates, updateRouteRate,
            deleteRouteRate, settleProfits, receiptSettings: receiptSettingsValue, setReceiptSettings, isLoading,
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
