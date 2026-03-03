"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Mail, ArrowRight, ShieldCheck, Globe,
  TrendingUp, Wallet, ArrowUpRight, Clock, ChevronRight,
  Home, History, PlusCircle, User, Search, Filter,
  Phone, MapPin, Calendar, CheckCircle, XCircle, Send, Camera,
  LogOut, Edit3, Star, Copy, Bell, HelpCircle, ChevronDown, FileText,
  PieChart, Activity, AlertCircle, Users, BookOpen, Landmark, Trash2
} from 'lucide-react';
import { useAppContext, TransferRoute } from './AppContext';
import { supabase } from './supabase';
import { handleShareReceipt } from './utils';
import { format } from 'date-fns';

type Role = 'admin' | 'partner';
type Screen = 'login' | 'app';
type Tab = 'home' | 'history' | 'add' | 'gestion' | 'profile' | 'overview' | 'operations' | 'partners' | 'deposits';


// ─── UTILS ────────────────────────────────────────────────────────────────
const formatMoney = (amount: number) => Math.round(amount).toLocaleString('fr-FR');

// ─── HOME / DASHBOARD ────────────────────────────────────────────────────────
function HomeScreen({ userName, userEmail }: { userName: string, userEmail: string }) {
  const { transactions, partnerReserve, bulkTransfers, addBulkTransfer, deleteBulkTransfer, routeRates, accounts } = useAppContext();
  const currentAccount = accounts.find(a => a.email === userEmail);
  const authorizedRoutes = currentAccount?.routes || [];
  const [showAddDeposit, setShowAddDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const partnerTxs = transactions.filter(t => t.partnerEmail === userEmail);
  const partnerBulks = bulkTransfers.filter(b => b.partnerEmail === userEmail).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const pendingBulks = partnerBulks.filter(b => b.status === 'En attente');
  const confirmedBulks = partnerBulks.filter(b => b.status !== 'En attente');

  const profit = partnerTxs.filter(t => t.status === 'Payé').reduce((acc, t) => acc + (t.profit || 0), 0);
  const myProfitShare = profit / 2;
  const encaissements = partnerTxs.filter(t => t.status === 'Validé' || t.status === 'Payé').reduce((acc, t) => acc + t.amount, 0);

  const handleDepositSubmit = async () => {
    await addBulkTransfer(parseFloat(depositAmount.replace(/,/g, '')), userEmail);
    setShowAddDeposit(false);
    setDepositAmount('');
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-5 overflow-y-auto pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">TABLEAU DE BORD</p>
          <h1 className="text-2xl font-bold text-primary italic">Bonjour, {userName.split(' ')[0]}</h1>
        </div>
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Avatar" className="w-11 h-11 rounded-full border-2 border-white shadow-md" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4">
        <motion.div whileHover={{ y: -3 }} className="ios-card bg-white border border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-gray-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Mon Profit Total</span>
            </div>
            <div className="text-xl font-bold tracking-tight" style={{ color: '#34C759' }}>+{formatMoney(myProfitShare)} <span className="text-xs text-gray-400 font-normal">FCFA</span></div>
            <div className="mt-1 text-[9px] text-gray-400 font-medium italic">Partage (50%) sur {formatMoney(profit)} FCFA bruts</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
        </motion.div>
      </div>

      {/* Encaissements */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="ios-card bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Encaissements Clients</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary">{formatMoney(encaissements)}</span>
            <span className="text-sm font-bold text-gray-400 uppercase">FCFA</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">Somme détenue à reverser pour la prochaine réserve.</p>
        </div>
      </motion.div>

      {/* Taux du Marché Actuel */}
      {authorizedRoutes.length > 0 && (
        <div className="ios-card bg-white space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Star className="w-3 h-3 text-yellow-500" /> Taux du Marché (Vente)</h3>
          <div className="grid grid-cols-2 gap-2">
            {authorizedRoutes.map(route => (
              <div key={route} className="bg-gray-50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-gray-400 font-bold mb-1">{route}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-primary">{routeRates[route]}</span>
                  <span className="text-[10px] font-bold text-gray-500">FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Transfers Section */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mes Dépôts & Transferts</h3>
          <button onClick={() => setShowAddDeposit(!showAddDeposit)} className="text-[11px] font-bold text-primary flex items-center gap-1">
            <PlusCircle className="w-3 h-3" /> Nouveau Dépôt
          </button>
        </div>

        <AnimatePresence>
          {showAddDeposit && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ios-card bg-white p-4 mb-3 space-y-3 overflow-hidden border-2 border-primary/20">
              <h4 className="text-sm font-bold text-primary">Nouveau Dépôt Admin</h4>
              <p className="text-xs text-gray-400 leading-tight">Envoyez une demande de confirmation de dépôt après l'avoir remis à l'Admin en CFA.</p>
              <input value={depositAmount} onChange={e => setDepositAmount(e.target.value)} type="number" className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Montant remis (FCFA)" />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowAddDeposit(false)} className="flex-1 py-2 bg-gray-50 text-gray-500 rounded-xl font-bold text-xs">Annuler</button>
                <button onClick={handleDepositSubmit} disabled={!depositAmount} className="flex-1 py-2 bg-primary text-white disabled:bg-gray-300 rounded-xl font-bold text-xs">Envoyer Demande</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {pendingBulks.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-2 px-1">En attente de validation Admin</h4>
              <div className="space-y-3">
                {pendingBulks.map((item) => (
                  <motion.div key={item.id} whileTap={{ scale: 0.99 }} className="ios-card bg-white p-4 flex items-center justify-between border-l-2 border-yellow-500">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-50 text-yellow-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-primary">Dépôt CFA</div>
                        <div className="text-[10px] text-gray-400 font-medium">{format(new Date(item.date), 'dd MMM, HH:mm')}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-sm font-black text-primary">{formatMoney(item.amountCFA)} <span className="text-[10px] font-normal text-gray-400">FCFA</span></div>
                        <div className="text-[10px] font-bold text-yellow-500 uppercase mt-0.5">En cours</div>
                      </div>
                      <button onClick={() => { if (window.confirm('Voulez-vous annuler cette demande de dépôt ?')) deleteBulkTransfer(item.id); }} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Annuler
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Historique des Dépôts Confirmés</h4>
            <div className="space-y-3">
              {confirmedBulks.map((item) => (
                <motion.div key={item.id} whileTap={{ scale: 0.99 }} className="ios-card bg-white p-4 border border-green-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-50 text-green-500">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-primary">Dépôt CFA</div>
                        <div className="text-[10px] text-gray-400 font-medium">{format(new Date(item.date), 'dd MMM, HH:mm')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-primary">{formatMoney(item.amountCFA)} <span className="text-[10px] font-normal text-gray-400">FCFA</span></div>
                      <div className="text-[10px] font-bold text-green-500 mt-0.5 uppercase tracking-wider">Confirmé</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Reçu en Chine :</span>
                    <span className="font-bold text-primary">{formatMoney(item.amountCNY || 0)} CNY <span className="text-gray-400 font-normal">(@ {item.rate?.toFixed(2)})</span></span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-gray-400 uppercase">Solde restant (Tirages)</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{formatMoney(item.remainingCNY || 0)} CNY</span>
                  </div>
                </motion.div>
              ))}
              {confirmedBulks.length === 0 && <p className="text-sm text-center text-gray-400">Aucun historique.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────
function HistoryScreen({ userEmail }: { userEmail: string }) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const { transactions, receiptSettings } = useAppContext();

  const partnerTxs = transactions.filter(t => t.partnerEmail === userEmail);
  const filtered = filter === 'all' ? partnerTxs : filter === 'paid' ? partnerTxs.filter(t => t.status === 'Payé') : partnerTxs.filter(t => t.status === 'Confirmé' || t.status === 'Validé');

  const statusColor = (s: string) => s === 'Payé' ? 'text-green-500' : (s === 'Confirmé' || s === 'Validé') ? 'text-yellow-500' : 'text-red-400';
  const statusIcon = (s: string) => s === 'Payé' ? <CheckCircle className="w-3 h-3" /> : s === 'Annulé' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />;

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-4 overflow-y-auto pb-28">
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">JOURNAL</p>
          <h1 className="text-2xl font-bold text-primary">Historique</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
          <Filter className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="w-full bg-white rounded-2xl py-3 pl-11 pr-4 text-sm text-primary shadow-sm outline-none" placeholder="Rechercher un transfert..." />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        {(['all', 'paid', 'pending'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-400'}`}>
            {f === 'all' ? 'Tous' : f === 'paid' ? 'Payés' : 'En attente'}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div className="space-y-3">
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="ios-card bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Send className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-bold text-primary">{item.name}</div>
                  <div className="text-[10px] text-gray-400 font-medium">{item.ref}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-primary">{formatMoney(item.amount)} <span className="text-[10px] font-normal text-gray-400">FCFA</span></div>
                <div className={`text-[10px] font-bold flex items-center gap-1 justify-end ${statusColor(item.status)}`}>
                  {statusIcon(item.status)} {item.status}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(item.date), 'dd MMM yyyy')}</span>
              <span className="text-[10px] text-gray-400">Taux: {item.rate}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => handleShareReceipt(item, 'client', receiptSettings)} className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-gray-100">
                <FileText className="w-3 h-3" /> Reçu Client
              </button>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-center text-gray-400">Aucun transfert pour ce filtre.</p>}
      </div>
    </div>
  );
}

// ─── NEW TRANSFER ─────────────────────────────────────────────────────────────
function NewTransferScreen({ userEmail }: { userEmail: string }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ route: '' as any, clientName: '', clientPhone: '', amount: '', receiverName: '', receiverAccount: '', customRate: '', paymentStatus: 'Validé' as any });
  const { globalRate, addTransaction, bulkTransfers, accounts, routeRates, receiptSettings } = useAppContext();
  const [createdTx, setCreatedTx] = useState<any>(null);
  const [selectedPools, setSelectedPools] = useState<string[]>([]);

  const currentAccount = accounts.find(a => a.email === userEmail);
  const selectedRoute = (formData.route || (currentAccount?.routes[0] || 'Sénégal -> Chine')) as TransferRoute;
  const partnerGlobalRate = currentAccount?.customRate || routeRates[selectedRoute] || globalRate;

  const availablePools = bulkTransfers.filter(b => b.partnerEmail === userEmail && b.status === 'Confirmé').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const neededCNY = parseFloat(formData.amount.replace(/,/g, '') || '0') / parseFloat(formData.customRate || partnerGlobalRate.toString());

  let totalCostCFA = 0;
  const allocations: { poolId: string, amountCNY: number, poolRate: number }[] = [];

  if (selectedPools.length > 0) {
    const pool = availablePools.find(p => p.id === selectedPools[0]);
    if (pool) {
      allocations.push({ poolId: pool.id, amountCNY: neededCNY, poolRate: pool.rate! });
      totalCostCFA = neededCNY * pool.rate!;
    }
  }

  const isSelected = selectedPools.length > 0;
  const expectedProfit = isSelected ? parseFloat(formData.amount.replace(/,/g, '')) - totalCostCFA : 0;

  const handleTogglePool = (id: string) => {
    setSelectedPools([id]);
  };

  const handleConfirm = async () => {
    const tx = await addTransaction({
      name: formData.clientName,
      phone: formData.clientPhone,
      amount: parseFloat(formData.amount.replace(/,/g, '')),
      rate: formData.customRate ? parseFloat(formData.customRate) : partnerGlobalRate,
      receiverName: formData.receiverName,
      receiverAccount: formData.receiverAccount,
      partnerEmail: userEmail,
      route: formData.route || (currentAccount?.routes[0] || 'Sénégal -> Chine'),
      status: formData.paymentStatus,
      poolsUsed: allocations,
      profit: expectedProfit
    });
    setCreatedTx(tx);
    setStep(3);
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 overflow-y-auto pb-28">
      <div className="pt-2 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">TRANSACTION</p>
        <h1 className="text-2xl font-bold text-primary">Nouveau Transfert</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-400'}`}>
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="ios-card bg-white space-y-4">
              <h2 className="text-base font-bold text-primary">Informations du client</h2>
              {currentAccount?.routes && currentAccount.routes.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Pays d'origine (Route)</label>
                  <select
                    value={formData.route}
                    onChange={e => setFormData({ ...formData, route: e.target.value })}
                    className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none appearance-none font-bold"
                  >
                    {!formData.route && <option value="" disabled>Sélectionner une route</option>}
                    {currentAccount.routes.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Nom complet</label>
                <input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Ex: Moussa Diop" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Téléphone</label>
                <div className="flex gap-2">
                  <div className="bg-[#F2F2F7] rounded-xl py-3 px-3 flex items-center gap-1 text-sm text-primary font-medium">
                    🇸🇳 +221 <ChevronDown className="w-3 h-3" />
                  </div>
                  <input value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="flex-1 bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="77 000 00 00" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Montant (FCFA)</label>
                <input value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  type="number" className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Ex: 100000" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Règlement du client</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormData({ ...formData, paymentStatus: 'Validé' })} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${formData.paymentStatus === 'Validé' ? 'bg-primary text-white shadow-md' : 'bg-[#F2F2F7] text-gray-400'}`}>Payé comptant</button>
                  <button onClick={() => setFormData({ ...formData, paymentStatus: 'Confirmé' })} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${formData.paymentStatus === 'Confirmé' ? 'bg-primary text-white shadow-md' : 'bg-[#F2F2F7] text-gray-400'}`}>À crédit</button>
                </div>
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!formData.clientName || !formData.amount || (currentAccount?.routes?.length ? !formData.route : false)} className="w-full bg-primary disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-md flex items-center justify-center gap-2">
              Continuer <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="ios-card bg-white space-y-4">
              <h2 className="text-base font-bold text-primary">Informations du bénéficiaire (Chine)</h2>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Nom du bénéficiaire</label>
                <input value={formData.receiverName} onChange={e => setFormData({ ...formData, receiverName: e.target.value })}
                  className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Ex: Wang Wei" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Compte / WeChat Pay / Alipay</label>
                <input value={formData.receiverAccount} onChange={e => setFormData({ ...formData, receiverAccount: e.target.value })}
                  className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Num. de compte ou ID" />
              </div>
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mt-4 shadow-sm">
                <label className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-2 block flex items-center gap-1"><Star className="w-3 h-3" /> Taux de vente appliqué (FCFA/CNY)</label>
                <input value={formData.customRate} onChange={e => setFormData({ ...formData, customRate: e.target.value })}
                  type="number" step="0.1" className="w-full bg-white border border-blue-200 focus:border-primary rounded-xl py-3 px-4 text-lg font-black text-primary outline-none transition-all" placeholder={`${partnerGlobalRate}`} />
                <p className="text-[10px] text-blue-500 font-medium mt-2 leading-tight">
                  Saisissez le taux négocié avec le client pour cette transaction. Sinon, le taux actuel du marché (<strong>{partnerGlobalRate}</strong>) sera appliqué.
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 mt-4">
                <label className="text-xs font-bold text-gray-400 mb-2 block uppercase tracking-wider">1. Choisir le Dépôt (Taux de calcul)</label>
                <div className="space-y-2">
                  {availablePools.map(pool => (
                    <label key={pool.id} className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer ${selectedPools.includes(pool.id) ? 'bg-primary/5 border-primary shadow-sm' : 'bg-white border-gray-100'}`}>
                      <input type="radio" checked={selectedPools.includes(pool.id)} onChange={() => handleTogglePool(pool.id)} className="w-4 h-4 rounded text-primary accent-primary" />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-primary">Reste: {formatMoney(pool.remainingCNY || 0)} CNY</div>
                        <div className="text-[10px] text-gray-500 font-medium">Taux d'achat: {pool.rate?.toFixed(2)} FCFA/CNY</div>
                      </div>
                    </label>
                  ))}
                  {availablePools.length === 0 && <p className="text-xs text-gray-400">Aucun dépôt disponible. Veuillez faire un dépôt admin d'abord.</p>}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl space-y-1">
                <p className="text-xs text-blue-600 font-medium">💱 Taux de vente au client: <strong>{formData.customRate || partnerGlobalRate} FCFA / CNY</strong></p>
                {formData.amount && <p className="text-xs text-blue-600 font-medium">≈ <strong>{neededCNY.toFixed(2)} CNY</strong> nécessaires pour ce transfert</p>}
              </div>

              {selectedPools.length > 0 && (
                <div className={`p-3 rounded-xl border-l-4 ${isSelected ? 'bg-green-50 border-green-500 text-green-700' : 'bg-yellow-50 border-yellow-500 text-yellow-700'}`}>
                  {isSelected ? (
                    <>
                      <p className="text-sm font-bold">✅ Dépôt sélectionné pour le calcul</p>
                      <p className="text-xs mt-1 opacity-80">Bénéfice estimé sur ce transfert : <strong>{formatMoney(expectedProfit)} FCFA</strong></p>
                    </>
                  ) : (
                    <p className="text-sm font-bold">⚠️ Sélectionnez un dépôt</p>
                  )}
                </div>
              )}

            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 bg-white text-primary font-bold py-4 rounded-2xl shadow-sm border border-gray-100">Retour</button>
              <button onClick={handleConfirm} disabled={!formData.receiverName || !formData.receiverAccount || !isSelected} className="flex-1 bg-primary disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl shadow-md flex items-center justify-center gap-2">
                Confirmer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && createdTx && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="ios-card bg-white text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-black text-primary mb-2">Transfert Enregistré!</h2>
              <p className="text-sm text-gray-400 font-medium">Référence: <strong className="text-primary">{createdTx.ref}</strong></p>
              <div className="mt-4 p-3 bg-gray-50 rounded-xl text-left space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Route</span>
                  <span className="font-bold text-primary">{createdTx.route}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Client</span>
                  <span className="font-bold text-primary">{createdTx.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Montant</span>
                  <span className="font-bold text-primary">{formatMoney(createdTx.amount)} FCFA</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Bénéficiaire</span>
                  <span className="font-bold text-primary">{createdTx.receiverName}</span>
                </div>
                <div className="flex justify-between text-xs text-yellow-600 font-bold border-t pt-2">
                  <span>Statut</span>
                  <span>En attente de validation</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => handleShareReceipt(createdTx, 'client', receiptSettings)} className="flex-1 py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" /> Reçu Client
                </button>
                <button onClick={() => handleShareReceipt(createdTx, 'china', receiptSettings)} className="flex-1 py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" /> Reçu Chine
                </button>
              </div>
            </div>
            <button onClick={() => { setStep(1); setFormData({ route: '', clientName: '', clientPhone: '', amount: '', receiverName: '', receiverAccount: '', customRate: '', paymentStatus: 'Validé' as any }); setCreatedTx(null); }}
              className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-md">
              Nouveau Transfert
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PARTNER GESTION ───────────────────────────────────────────────────────────
function PartnerGestionScreen({ userEmail }: { userEmail: string }) {
  const { clientRecords, addClientRecord, resolveClientRecord } = useAppContext();
  const [tab, setTab] = useState<'avoir' | 'dette'>('avoir');
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ clientName: '', amount: '' });

  const partnerRecords = clientRecords.filter(r => r.partnerEmail === userEmail && r.type === tab);

  const total = partnerRecords.filter(r => r.status === 'active').reduce((acc, r) => acc + r.amount, 0);

  const handleAdd = () => {
    addClientRecord({
      clientName: formData.clientName,
      amount: parseFloat(formData.amount.replace(/,/g, '')),
      type: tab,
      partnerEmail: userEmail
    });
    setFormData({ clientName: '', amount: '' });
    setShowAdd(false);
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-4 overflow-y-auto pb-28">
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">FINANCES CLIENTS</p>
        <h1 className="text-2xl font-bold text-primary">Gestion</h1>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('avoir')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'avoir' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-400'}`}>
          Avoirs (Dépôts)
        </button>
        <button onClick={() => setTab('dette')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${tab === 'dette' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-400'}`}>
          Dettes
        </button>
      </div>

      <div className="ios-card bg-white p-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          {tab === 'avoir' ? 'Total Avoirs Non Envoyés' : 'Total Dettes Non Soldées'}
        </p>
        <div className="text-3xl font-black text-primary">{formatMoney(total)} <span className="text-sm text-gray-400 font-bold uppercase">FCFA</span></div>
      </div>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dossiers Actifs</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="text-primary flex items-center gap-1 text-[11px] font-bold">
          <PlusCircle className="w-3 h-3" /> Nouveau
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ios-card bg-white p-4 space-y-3 overflow-hidden">
            <h4 className="text-sm font-bold text-primary">Ajouter un(e) {tab}</h4>
            <input value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Nom du client" />
            <input value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} type="number" className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Montant (FCFA)" />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-gray-50 text-gray-500 rounded-xl font-bold text-xs">Annuler</button>
              <button onClick={handleAdd} disabled={!formData.clientName || !formData.amount} className="flex-1 py-2 bg-primary text-white disabled:bg-gray-300 rounded-xl font-bold text-xs">Ajouter</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        <AnimatePresence>
          {[...partnerRecords].sort((a, b) => (a.status === 'active' ? -1 : 1)).map(r => (
            <motion.div key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`ios-card p-4 transition-all ${r.status === 'resolved' ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <div className="text-sm font-bold text-primary">{r.clientName}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{format(new Date(r.date), 'dd MMM yyyy, HH:mm')}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-primary">{formatMoney(r.amount)} <span className="text-[10px] font-normal text-gray-400">FCFA</span></div>
                  <div className={`text-[10px] font-bold uppercase ${r.status === 'resolved' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {r.status === 'active' ? (r.type === 'avoir' ? 'Avoir' : 'Dette en cours') : 'Soldé'}
                  </div>
                </div>
              </div>
              {r.status === 'active' && (
                <button onClick={() => resolveClientRecord(r.id)} className={`w-full py-2.5 rounded-xl text-xs font-bold mt-1 ${r.type === 'avoir' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {r.type === 'avoir' ? 'Marquer comme Utilisé (Envoyé)' : 'Marquer comme Payé (Soldé)'}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {partnerRecords.length === 0 && <p className="text-sm text-center text-gray-400">Aucun enregistrement.</p>}
      </div>
    </div>
  );
}
// ─── PROFILE ──────────────────────────────────────────────────────────────────
function ProfileScreen({ onLogout, user }: { onLogout: () => void, user: { name: string, email: string, role: Role } }) {
  const { transactions, partnerReserve, accounts, settleProfits, receiptSettings, setReceiptSettings, routeRates, updateRouteRate, deleteRouteRate } = useAppContext();
  const [viewingReceipts, setViewingReceipts] = useState(false);
  const [viewingRoutes, setViewingRoutes] = useState(false);
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [newRate, setNewRate] = useState("");
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteRate, setNewRouteRate] = useState("");

  const handleRateUpdate = async (route: string) => {
    const parsed = parseFloat(newRate);
    if (!isNaN(parsed) && parsed > 0) {
      await updateRouteRate(route, parsed);
      setEditingRoute(null);
    }
  };

  const handleAddRoute = async () => {
    if (newRouteName.trim() && !isNaN(parseFloat(newRouteRate)) && parseFloat(newRouteRate) > 0) {
      await updateRouteRate(newRouteName.trim(), parseFloat(newRouteRate));
      setShowAddRoute(false);
      setNewRouteName("");
      setNewRouteRate("");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await setReceiptSettings({ ...receiptSettings, headerImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Financial Calculations ---
  const allTxs = transactions;
  const partnerTxs = allTxs.filter(t => t.partnerEmail === user.email);

  // Totals for the current user
  const targetTxs = user.role === 'admin' ? allTxs : partnerTxs;
  const totalTransferred = targetTxs.reduce((acc, t) => acc + t.amount, 0);
  const totalProfitEver = targetTxs.filter(t => t.status === 'Payé' || t.status === 'Envoyé').reduce((acc, t) => acc + (t.profit || 0), 0);
  const pendingProfitRaw = targetTxs.filter(t => (t.status === 'Payé' || t.status === 'Envoyé') && !t.isProfitSettled).reduce((acc, t) => acc + (t.profit || 0), 0);

  // Split share
  const myPendingProfitShare = pendingProfitRaw / 2;
  const otherPendingProfitShare = pendingProfitRaw / 2;

  // Cash on hand (Funds currently with partner to be sent to admin)
  const cashOnHand = partnerTxs.filter(t => t.status === 'Validé' || t.status === 'Payé').reduce((acc, t) => acc + t.amount, 0);

  // Admin specific stats
  const totalNetworkProfitPending = allTxs.filter(t => (t.status === 'Payé' || t.status === 'Envoyé') && !t.isProfitSettled).reduce((acc, t) => acc + (t.profit || 0), 0);
  const totalNetworkVolume = allTxs.reduce((acc, t) => acc + t.amount, 0);

  const handleSettle = async () => {
    if (window.confirm("Voulez-vous marquer tous les bénéfices actuels comme 'encaissés' ? Cela remettra le compteur de retrait à zéro.")) {
      await settleProfits(user.role === 'admin' ? undefined : user.email);
    }
  };

  const items = [
    { id: 'dev_profile', icon: Edit3, label: 'Modifier le profil', color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'dev_notif', icon: Bell, label: 'Notifications', color: 'text-purple-500', bg: 'bg-purple-50' },
    ...(user.role === 'admin' ? [
      { id: 'dev_routes', icon: Globe, label: 'Gestion des routes', color: 'text-cyan-500', bg: 'bg-cyan-50' },
      { id: 'receipt_settings', icon: FileText, label: 'Paramètres des Reçus', color: 'text-orange-500', bg: 'bg-orange-50' }
    ] : []),
  ];

  if (viewingRoutes) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-5 overflow-y-auto pb-28">
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => setViewingRoutes(false)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">RÉSEAU</p>
            <h1 className="text-xl font-bold text-primary">Gestion des Routes</h1>
          </div>
        </div>

        <div className="ios-card bg-white space-y-3 border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-500" /> Routes & Taux</h3>
            <button onClick={() => setShowAddRoute(!showAddRoute)} className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded flex items-center gap-1">
              <PlusCircle className="w-3 h-3" /> Nouvelle
            </button>
          </div>

          <AnimatePresence>
            {showAddRoute && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3 overflow-hidden mt-3">
                <input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} type="text" placeholder="Route (ex: Mali -> Chine)" className="w-full text-sm font-bold px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary" />
                <input value={newRouteRate} onChange={e => setNewRouteRate(e.target.value)} type="number" step="0.1" placeholder="Taux (ex: 98.5)" className="w-full text-sm font-bold px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary" />
                <button onClick={handleAddRoute} disabled={!newRouteName.trim() || !newRouteRate} className="w-full py-2 bg-primary text-white rounded-lg font-bold text-xs disabled:opacity-50">Créer la route</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3 mt-4">
            {(Object.entries(routeRates) as [string, number][]).map(([route, rate]) => (
              <div key={route} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{route}</span>
                  <button onClick={async () => { if (window.confirm(`Vous êtes sûr de supprimer la route ${route} ?`)) await deleteRouteRate(route); }} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-full transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-primary">{rate}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">FCFA/CNY</span>
                  </div>
                  {editingRoute !== route ? (
                    <button onClick={() => { setEditingRoute(route); setNewRate(rate.toString()); }} className="px-3 py-1.5 bg-white text-primary text-xs font-bold rounded-full shadow-sm border border-gray-200">Modifier</button>
                  ) : (
                    <div className="flex gap-2">
                      <input value={newRate} onChange={e => setNewRate(e.target.value)} type="number" step="0.1" className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-sm font-bold outline-none" />
                      <button onClick={() => handleRateUpdate(route)} className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full shadow-sm">OK</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (viewingReceipts) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-5 overflow-y-auto pb-28">
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => setViewingReceipts(false)} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">CONFIGURATION</p>
            <h1 className="text-xl font-bold text-primary">Modèles de Reçus</h1>
          </div>
        </div>

        <div className="ios-card bg-white p-5 space-y-4 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">Entête Personnalisée / Logo</label>
          <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer bg-gray-50">
            {receiptSettings.headerImage ? (
              <img src={receiptSettings.headerImage} alt="Header" className="max-h-24 object-contain rounded-lg" />
            ) : (
              <>
                <Camera className="w-8 h-8 text-gray-300 mb-2" />
                <span className="text-xs font-medium text-gray-500">Ajouter une image d'entête</span>
              </>
            )}
            <input type="file" onChange={handleImageUpload} accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          {receiptSettings.headerImage && (
            <button onClick={async () => await setReceiptSettings({ ...receiptSettings, headerImage: null })} className="w-full py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
              <XCircle className="w-3 h-3" /> Supprimer l'image
            </button>
          )}

          <div className="pt-4 border-t border-gray-100 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Choisissez un style global</label>

            <button onClick={async () => await setReceiptSettings({ ...receiptSettings, style: 1 })} className={`w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${receiptSettings.style === 1 ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-primary">Style 1 : Classique</span>
                {receiptSettings.style === 1 && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
              <p className="text-xs text-gray-500 font-medium">Inspiré des reçus Western, structuré avec des cadres et lignes horizontales. Idéal pour l'impression thermique.</p>
              <div className="mt-3 aspect-[3/1] bg-gray-100 border border-gray-200 rounded p-2 flex flex-col gap-1 opacity-70">
                <div className="h-1 bg-gray-300 w-1/3 mx-auto"></div>
                <div className="flex justify-between mt-1"><div className="w-1/4 h-1 bg-gray-300"></div><div className="w-1/4 h-1 bg-gray-300"></div></div>
                <div className="border border-gray-300 h-4 mt-auto"></div>
              </div>
            </button>

            <button onClick={async () => await setReceiptSettings({ ...receiptSettings, style: 2 })} className={`w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${receiptSettings.style === 2 ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-primary">Style 2 : Épuré Moderne</span>
                {receiptSettings.style === 2 && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
              <p className="text-xs text-gray-500 font-medium">Design digital propre, sans bordures lourdes, avec un focus sur les typographies modernes (comme les reçus de néo-banques).</p>
              <div className="mt-3 aspect-[3/1] bg-blue-50/50 rounded shadow-sm p-2 flex flex-col gap-1 opacity-70">
                <div className="h-2 bg-blue-200 w-1/4 rounded-full mx-auto"></div>
                <div className="h-4 bg-primary rounded-lg w-1/2 mx-auto mt-1"></div>
                <div className="flex justify-between mt-auto px-2"><div className="w-1/5 h-1 bg-gray-300 rounded"></div><div className="w-1/5 h-1 bg-gray-300 rounded"></div></div>
              </div>
            </button>

            <button onClick={async () => await setReceiptSettings({ ...receiptSettings, style: 3 })} className={`w-full p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${receiptSettings.style === 3 ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-bold text-primary">Style 3 : Premium Élégant</span>
                {receiptSettings.style === 3 && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
              <p className="text-xs text-gray-500 font-medium">Design premium et aéré, parfait pour l'entête colorée, utilisant des bordures subtiles et de l'italique avec des tons profonds.</p>
              <div className="mt-3 aspect-[3/1] bg-[#111] rounded shadow-sm p-2 flex flex-col gap-1 opacity-70 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-600"></div>
                <div className="h-2 bg-white/20 w-1/3 rounded-full ml-4"></div>
                <div className="h-3 bg-white w-1/2 rounded-full ml-4 mt-1"></div>
                <div className="flex justify-between mt-auto ml-4"><div className="w-1/4 h-1 bg-white/40 rounded"></div><div className="w-1/4 h-1 bg-white/40 rounded"></div></div>
              </div>
            </button>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-5 overflow-y-auto pb-28">
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">FINANCES</p>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Mon Tableau</h1>
          <div className="text-[10px] font-bold text-gray-400 uppercase">Cumul Profit: {formatMoney(totalProfitEver / 2)} FCFA</div>
        </div>
      </div>

      {/* Profile summary */}
      <div className="ios-card bg-white p-4 flex items-center gap-4 border border-gray-100 shadow-sm">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-primary/10" />
        <div>
          <div className="font-bold text-primary">{user.name}</div>
          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{user.role === 'admin' ? 'Administrateur Central' : 'Partenaire Agréé'}</div>
          <div className="text-[10px] text-gray-400">{user.email}</div>
        </div>
      </div>

      {/* Main Financial Grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Global Volume / Transfers - ONLY FOR ADMIN */}
        {user.role === 'admin' && (
          <div className="ios-card bg-primary text-white p-5 pr-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <Activity className="absolute right-4 top-4 w-8 h-8 opacity-20" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 text-white/60">
                <span className="text-[10px] font-bold uppercase tracking-widest">Volume des Transferts</span>
              </div>
              <div className="text-3xl font-black">{formatMoney(totalNetworkVolume)} <span className="text-xs font-normal opacity-60">FCFA</span></div>
              <div className="mt-2 text-[10px] text-white/50 font-medium italic">Nombre total: {allTxs.length}</div>
            </div>
          </div>
        )}

        {/* Profit Split Breakdown */}
        <div className="ios-card bg-white border border-gray-100 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Bénéfices En Attente (50/50)</span>
            </div>
            <span className="text-[9px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-black">Total Net: {formatMoney(user.role === 'admin' ? totalNetworkProfitPending : pendingProfitRaw)} FCFA</span>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2 bg-gray-50 rounded-xl p-3">
            <div className="space-y-1">
              <p className="text-[9px] text-gray-400 font-bold uppercase italic text-center">Ma Part Retirable</p>
              <p className="text-xl font-black text-green-600 italic leading-none text-center truncate">{formatMoney(user.role === 'admin' ? totalNetworkProfitPending / 2 : myPendingProfitShare)}</p>
            </div>
            <div className="space-y-1 border-l border-gray-200 pl-4">
              <p className="text-[9px] text-gray-400 font-bold uppercase italic text-center">Part {user.role === 'admin' ? 'Partenaires' : 'Admin'}</p>
              <p className="text-xl font-black text-gray-400 italic leading-none text-center truncate">{formatMoney(user.role === 'admin' ? totalNetworkProfitPending / 2 : otherPendingProfitShare)}</p>
            </div>
          </div>

          {((user.role === 'admin' && totalNetworkProfitPending > 0) || (user.role === 'partner' && myPendingProfitShare > 0)) && (
            <button onClick={handleSettle} className="w-full py-2.5 bg-green-500 text-white rounded-xl text-xs font-black shadow-md shadow-green-200 flex items-center justify-center gap-2 transition-transform active:scale-95">
              <CheckCircle className="w-4 h-4" /> Encaisser & Solder Profit
            </button>
          )}
        </div>

        {/* Funds Tracking */}
        <div className="ios-card bg-gray-50 border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Wallet className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Suivi des Fonds & Réserve</span>
          </div>

          <div className="space-y-3">
            {user.role === 'partner' ? (
              <>
                <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                  <span className="text-xs text-gray-500 font-medium italic">Réserve CNY Actuelle :</span>
                  <span className="text-sm font-black text-primary">{formatMoney(partnerReserve)} FCFA</span>
                </div>
                <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                  <span className="text-xs text-gray-500 font-medium italic">Cash en main (Dettes Admin) :</span>
                  <span className="text-sm font-black text-orange-600">{formatMoney(cashOnHand)} FCFA</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                  <span className="text-xs text-gray-500 font-medium italic">Nombre total de partenaires :</span>
                  <span className="text-sm font-black text-primary">{accounts.filter(a => a.role === 'partner').length}</span>
                </div>
                <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                  <span className="text-xs text-gray-500 font-medium italic">Total Dettes Partenaires (Cash) :</span>
                  <span className="text-sm font-black text-orange-600">{formatMoney(allTxs.filter(t => t.status === 'Validé' || t.status === 'Payé').reduce((acc, t) => acc + t.amount, 0))} FCFA</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Paramètres & Aide</h3>
        <div className="ios-card bg-white space-y-1 p-2">
          {items.map((item) => (
            <button key={item.label} onClick={() => {
              if (item.id === 'receipt_settings') {
                setViewingReceipts(true);
              } else if (item.id === 'dev_profile') {
                alert('Cette option permettra prochainement de modifier le nom, mot de passe et avatar du compte.');
              } else if (item.id === 'dev_notif') {
                alert('Les préférences de notifications push / email seront configurables ici.');
              } else if (item.id === 'dev_routes') {
                setViewingRoutes(true);
              }
            }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className={`w-9 h-9 ${item.bg} rounded-xl flex items-center justify-center`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <span className="text-sm font-semibold text-primary flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>
      </div>

      <button onClick={onLogout} className="w-full py-4 rounded-2xl bg-red-50 text-red-500 font-bold flex items-center justify-center gap-2">
        <LogOut className="w-4 h-4" /> Se Déconnecter
      </button>
    </div>
  );
}

// ─── ADMIN SCREENS ────────────────────────────────────────────────────────────

function AdminOverviewScreen() {
  const { transactions, routeRates, updateRouteRate, deleteRouteRate } = useAppContext();
  const [editingRoute, setEditingRoute] = useState<string | null>(null);
  const [newRate, setNewRate] = useState("");
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteRate, setNewRouteRate] = useState("");

  const pendingCount = transactions.filter(t => t.status === 'Confirmé' || t.status === 'Validé').length;
  // Calculate pending profit (not yet settled)
  const pendingProfit = transactions.filter(t => (t.status === 'Payé' || t.status === 'Envoyé') && !t.isProfitSettled).reduce((acc, t) => acc + (t.profit || 0), 0);
  const adminProfitShare = pendingProfit / 2;

  const handleRateUpdate = (route: string) => {
    const parsed = parseFloat(newRate);
    if (!isNaN(parsed) && parsed > 0) {
      updateRouteRate(route, parsed);
      setEditingRoute(null);
    }
  };

  const handleAddRoute = () => {
    if (newRouteName.trim() && !isNaN(parseFloat(newRouteRate)) && parseFloat(newRouteRate) > 0) {
      updateRouteRate(newRouteName.trim(), parseFloat(newRouteRate));
      setShowAddRoute(false);
      setNewRouteName("");
      setNewRouteRate("");
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-5 overflow-y-auto pb-28">
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">ADMINISTRATION</p>
        <h1 className="text-2xl font-bold text-primary">Vue d'ensemble</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div whileHover={{ y: -3 }} className="ios-card bg-primary text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-white/60">
            <Wallet className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Réserve Globale</span>
          </div>
          <div className="text-xl font-bold tracking-tight">45.5M <span className="text-xs font-normal">FCFA</span></div>
        </motion.div>

        <motion.div whileHover={{ y: -3 }} className="ios-card bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Transferts</span>
          </div>
          <div className="text-xl font-bold tracking-tight text-primary">{transactions.length} <span className="text-xs font-normal text-gray-400">total</span></div>
          <div className="text-xs text-yellow-500 font-bold mt-1">{pendingCount} en attente</div>
        </motion.div>
      </div>

      <motion.div whileHover={{ y: -3 }} className="ios-card bg-green-50 border border-green-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-green-700">
          <TrendingUp className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Profit Net En Attente</span>
        </div>
        <div className="text-2xl font-black tracking-tight text-green-600">{formatMoney(pendingProfit)} <span className="text-xs font-normal">FCFA</span></div>
        <div className="mt-1 text-sm text-green-800 font-medium">Ma Part Admin (50%): <strong className="text-green-700">{formatMoney(adminProfitShare)} FCFA</strong></div>
      </motion.div>

      {/* Taux de Change Control */}
      <div className="ios-card bg-white space-y-3 border border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Gestion des Routes & Taux</h3>
          <button onClick={() => setShowAddRoute(!showAddRoute)} className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded flex items-center gap-1">
            <PlusCircle className="w-3 h-3" /> Ajouter Route
          </button>
        </div>

        <AnimatePresence>
          {showAddRoute && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3 overflow-hidden">
              <input value={newRouteName} onChange={e => setNewRouteName(e.target.value)} type="text" placeholder="Nom de la route (ex: Gabon -> Chine)" className="w-full text-sm font-bold px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary" />
              <input value={newRouteRate} onChange={e => setNewRouteRate(e.target.value)} type="number" step="0.1" placeholder="Taux de vente (ex: 98.5)" className="w-full text-sm font-bold px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary" />
              <button onClick={handleAddRoute} disabled={!newRouteName.trim() || !newRouteRate} className="w-full py-2 bg-primary text-white rounded-lg font-bold text-xs disabled:opacity-50">Créer la route</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {(Object.entries(routeRates) as [string, number][]).map(([route, rate]) => (
            <div key={route} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{route}</span>
                <button onClick={() => { if (window.confirm(`Vous êtes sûr de supprimer la route ${route} ?`)) deleteRouteRate(route); }} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-full transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-primary">{rate}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">FCFA/CNY</span>
                </div>
                {editingRoute !== route ? (
                  <button onClick={() => { setEditingRoute(route); setNewRate(rate.toString()); }} className="px-3 py-1.5 bg-white text-primary text-xs font-bold rounded-full shadow-sm border border-gray-100">Modifier</button>
                ) : (
                  <div className="flex gap-2">
                    <input value={newRate} onChange={e => setNewRate(e.target.value)} type="number" step="0.1" className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-sm font-bold outline-none" />
                    <button onClick={() => handleRateUpdate(route)} className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">OK</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ios-card bg-white space-y-3">
        <h3 className="text-sm font-bold text-primary">Action Requise</h3>
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <div className="text-sm font-bold text-red-700">Recharger Wallet CNY</div>
              <div className="text-[10px] text-red-500 font-medium">Solde actuel très bas (≈ 1500 CNY)</div>
            </div>
          </div>
          <button className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-full font-bold">Gérer</button>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DEPOSITS ─────────────────────────────────────────────────────────────
function AdminDepositsScreen() {
  const { bulkTransfers, confirmBulkTransfer } = useAppContext();
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [amountCNY, setAmountCNY] = useState('');

  const pendingBulks = bulkTransfers.filter(b => b.status === 'En attente');
  const confirmedBulks = bulkTransfers.filter(b => b.status !== 'En attente').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleConfirm = async (id: string) => {
    await confirmBulkTransfer(id, parseFloat(amountCNY.replace(/,/g, '')));
    setActiveDepositId(null);
    setAmountCNY('');
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-5 overflow-y-auto pb-28">
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">ADMINISTRATION</p>
        <h1 className="text-2xl font-bold text-primary">Dépôts Partenaires</h1>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {pendingBulks.map(item => (
            <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="ios-card bg-white p-4 space-y-3 border-l-4 border-yellow-500 rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.ref}</div>
                  <div className="text-sm font-bold text-primary mt-1">{item.partnerEmail}</div>
                  <div className="text-[10px] font-medium text-gray-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {format(new Date(item.date), 'dd MMM, HH:mm')}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-primary">{formatMoney(item.amountCFA)} <span className="text-[10px] text-gray-400 font-normal">FCFA</span></div>
                  <div className="text-[10px] font-bold text-yellow-500 uppercase mt-0.5">En attente</div>
                </div>
              </div>

              {activeDepositId === item.id ? (
                <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl mt-2 space-y-3">
                  <p className="text-xs font-bold text-primary">Confirmer l'argent reçu en Chine</p>
                  <input value={amountCNY} onChange={e => setAmountCNY(e.target.value)} type="number" className="w-full bg-white border border-gray-200 rounded-lg py-2px-3 text-sm text-primary p-2" placeholder="Montant reçu (CNY)" />
                  {amountCNY && (
                    <p className="text-xs text-blue-600 font-medium">
                      Taux calculé : <strong>{(item.amountCFA / parseFloat(amountCNY)).toFixed(2)} FCFA/CNY</strong>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => { setActiveDepositId(null); setAmountCNY(''); }} className="flex-1 py-2 bg-white text-gray-500 rounded-lg font-bold text-xs border border-gray-200">Annuler</button>
                    <button onClick={() => handleConfirm(item.id)} disabled={!amountCNY} className="flex-1 py-2 bg-green-500 text-white rounded-lg font-bold text-xs disabled:bg-gray-300">Confirmer Réception</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setActiveDepositId(item.id)} className="w-full py-3 bg-primary/10 text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  Confirmer la Réception (Saisir CNY)
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {pendingBulks.length === 0 && <p className="text-sm text-center text-gray-400">Aucun dépôt en attente.</p>}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Historique des Validations</h3>
        <div className="space-y-3">
          {confirmedBulks.map((item) => (
            <motion.div key={item.id} whileTap={{ scale: 0.99 }} className="ios-card bg-white p-4 border border-green-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-50 text-green-500">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.ref}</div>
                    <div className="text-sm font-bold text-primary">{item.partnerEmail}</div>
                    <div className="text-[10px] text-gray-400 font-medium">{format(new Date(item.date), 'dd MMM, HH:mm')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-primary">{formatMoney(item.amountCFA)} <span className="text-[10px] font-normal text-gray-400">FCFA</span></div>
                  <div className="text-[10px] font-bold text-green-500 mt-0.5 uppercase tracking-wider">Confirmé</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Reçu en Chine :</span>
                <span className="font-bold text-primary">{formatMoney(item.amountCNY || 0)} CNY <span className="text-gray-400 font-normal">(@ {item.rate?.toFixed(2)})</span></span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-gray-400 uppercase">Solde restant partenaire</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{formatMoney(item.remainingCNY || 0)} CNY</span>
              </div>
            </motion.div>
          ))}
          {confirmedBulks.length === 0 && <p className="text-sm text-center text-gray-400">Aucun historique.</p>}
        </div>
      </div>
    </div>
  );
}

function AdminOperationsScreen() {
  const { transactions, updateTransactionStatus } = useAppContext();

  const pending = transactions.filter(t => ['Confirmé', 'Validé', 'Payé'].includes(t.status));
  const completed = transactions.filter(t => ['Envoyé', 'Annulé'].includes(t.status)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-5 overflow-y-auto pb-28">
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">TRANSFERTS CLIENTS</p>
        <h1 className="text-2xl font-bold text-primary">Opérations ({pending.length})</h1>
      </div>
      <div className="space-y-3">
        <AnimatePresence>
          {pending.map(item => (
            <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="ios-card bg-white p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.ref}</div>
                  <div className="text-sm font-bold text-primary mt-1">Client: {item.name}</div>
                  <div className="text-xs text-gray-500">Par: {item.partnerEmail}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-primary">{formatMoney(item.amount)} <span className="text-[10px] text-gray-400 font-normal">FCFA</span></div>
                  <div className={`text-[10px] font-bold flex items-center gap-1 justify-end ${item.status === 'Payé' ? 'text-green-500' : 'text-orange-500'}`}>
                    <Clock className="w-3 h-3" /> {item.status}
                  </div>
                </div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg text-xs flex justify-between">
                <span className="text-gray-500">Bénéficiaire Chine:</span>
                <span className="font-bold">{item.receiverName} ({item.receiverAccount})</span>
              </div>
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg text-xs flex justify-between font-bold">
                <span>Montant à Payer (CNY):</span>
                <span>{(item.amount / item.rate).toFixed(2)} ¥</span>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-50">
                <button onClick={async () => await updateTransactionStatus(item.id, 'Annulé')} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <XCircle className="w-4 h-4" /> Rejeter
                </button>
                {item.status !== 'Payé' ? (
                  <button onClick={async () => await updateTransactionStatus(item.id, 'Payé')} className="flex-1 py-3 bg-green-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md">
                    <CheckCircle className="w-4 h-4" /> Valider Pmt.
                  </button>
                ) : (
                  <button onClick={async () => await updateTransactionStatus(item.id, 'Envoyé')} className="flex-1 py-3 bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md">
                    <Send className="w-4 h-4" /> Payer en Chine
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {pending.length === 0 && <p className="text-sm text-center text-gray-400">Aucune opération en attente.</p>}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Historique des Opérations</h3>
        <div className="space-y-3">
          {completed.map(item => (
            <motion.div key={item.id} whileTap={{ scale: 0.99 }} className={`ios-card p-4 flex flex-col gap-3 ${item.status === 'Annulé' ? 'bg-red-50/50 border border-red-100' : 'bg-white border border-green-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.status === 'Annulé' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {item.status === 'Annulé' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.ref}</div>
                    <div className="text-sm font-bold text-primary">{item.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-primary">{formatMoney(item.amount)} <span className="text-[10px] font-normal text-gray-400">FCFA</span></div>
                  <div className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${item.status === 'Annulé' ? 'text-red-500' : 'text-green-500'}`}>{item.status}</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Bénéficiaire :</span>
                <span className="font-bold text-primary">{item.receiverName} <span className="text-gray-400 font-normal">({item.receiverAccount})</span></span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-gray-400 uppercase">Validé par</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.partnerEmail}</span>
              </div>
            </motion.div>
          ))}
          {completed.length === 0 && <p className="text-sm text-center text-gray-400">Aucun historique.</p>}
        </div>
      </div>
    </div>
  );
}

function AdminPartnersScreen() {
  const { accounts, addAccount, updateAccount, routeRates } = useAppContext();
  const [showAdd, setShowAdd] = useState(false);
  const [newPartner, setNewPartner] = useState({ name: '', email: '', password: '', routes: [] as string[] });

  const partners = accounts.filter(a => a.role === 'partner');
  const availableRoutes = Object.keys(routeRates);

  const toggleRoute = (route: string, currentRoutes: string[], setter: (val: string[]) => void) => {
    if (currentRoutes.includes(route)) {
      setter(currentRoutes.filter(r => r !== route));
    } else {
      setter([...currentRoutes, route]);
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto p-5 space-y-5 overflow-y-auto pb-28">
      <div className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">RÉSEAU</p>
        <h1 className="text-2xl font-bold text-primary">Partenaires</h1>
      </div>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Liste des partenaires</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="text-primary flex items-center gap-1 text-[11px] font-bold">
          <PlusCircle className="w-3 h-3" /> Nouveau
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ios-card bg-white p-4 space-y-3 overflow-hidden">
            <h4 className="text-sm font-bold text-primary">Ajouter un partenaire</h4>
            <input value={newPartner.name} onChange={e => setNewPartner({ ...newPartner, name: e.target.value })} className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Nom du partenaire" />
            <input value={newPartner.email} onChange={e => setNewPartner({ ...newPartner, email: e.target.value })} type="email" className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Email" />
            <input value={newPartner.password} onChange={e => setNewPartner({ ...newPartner, password: e.target.value })} type="text" className="w-full bg-[#F2F2F7] rounded-xl py-3 px-4 text-sm text-primary outline-none" placeholder="Mot de passe" />
            <div className="pt-2 border-t border-gray-100 mt-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Routes Autorisées</label>
              <div className="flex flex-wrap gap-2">
                {availableRoutes.map(route => (
                  <button
                    key={route}
                    onClick={() => toggleRoute(route, newPartner.routes, (r) => setNewPartner({ ...newPartner, routes: r }))}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${newPartner.routes.includes(route) ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {route}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-gray-50 text-gray-500 rounded-xl font-bold text-xs">Annuler</button>
              <button onClick={async () => {
                if (newPartner.name && newPartner.email && newPartner.password) {
                  await addAccount({ name: newPartner.name, email: newPartner.email, password: newPartner.password, role: 'partner', isActive: true, customRate: null, routes: newPartner.routes });
                  setShowAdd(false);
                  setNewPartner({ name: '', email: '', password: '', routes: [] });
                }
              }} disabled={!newPartner.name || !newPartner.email || !newPartner.password} className="flex-1 py-2 bg-primary text-white disabled:bg-gray-300 rounded-xl font-bold text-xs">Ajouter</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {partners.map(p => (
          <div key={p.id} className="ios-card bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">{p.name[0]}</div>
                <div>
                  <div className="text-sm font-bold text-primary flex items-center gap-2">
                    {p.name}
                    {!p.isActive && <span className="bg-red-50 text-red-600 text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Suspendu</span>}
                  </div>
                  <div className="text-[10px] text-gray-400">{p.email}</div>
                </div>
              </div>
              <button
                onClick={async () => await updateAccount(p.id, { isActive: !p.isActive })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${p.isActive ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-green-50 hover:bg-green-100 text-green-600'}`}
              >
                {p.isActive ? <><XCircle className="w-3 h-3" /> Suspendre</> : <><CheckCircle className="w-3 h-3" /> Activer</>}
              </button>
            </div>

            <div className="pt-2 border-t border-gray-50">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Routes Assignées ({p.routes?.length || 0})</span>
              <div className="flex flex-wrap gap-1.5">
                {availableRoutes.map(route => {
                  const isAssigned = p.routes && p.routes.includes(route);
                  return (
                    <button
                      key={route}
                      onClick={async () => await updateAccount(p.id, { routes: (p.routes && p.routes.includes(route)) ? p.routes.filter(r => r !== route) : [...(p.routes || []), route] })}
                      className={`px-2 py-1 flex items-center gap-1 rounded text-[9px] font-bold transition-colors ${isAssigned ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-gray-50 text-gray-400 border border-transparent hover:bg-gray-100'}`}
                    >
                      {isAssigned && <CheckCircle className="w-2.5 h-2.5" />} {route}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
        {partners.length === 0 && <p className="text-sm text-center text-gray-400">Aucun partenaire.</p>}
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
type NavTabDef = { id: Tab; label: string; icon: React.ElementType; highlight?: boolean };

function BottomNav({ role, activeTab, onChange }: { role: Role; activeTab: Tab; onChange: (t: Tab) => void }) {
  const partnerTabs: NavTabDef[] = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'history', label: 'Historique', icon: History },
    { id: 'add', label: '', icon: PlusCircle, highlight: true },
    { id: 'gestion', label: 'Gestion', icon: BookOpen },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  const adminTabs: NavTabDef[] = [
    { id: 'overview', label: 'Accueil', icon: PieChart },
    { id: 'deposits', label: 'Dépôts', icon: Landmark },
    { id: 'operations', label: 'Opérations', icon: CheckCircle },
    { id: 'partners', label: 'Partenaires', icon: Users },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  const tabs = role === 'admin' ? adminTabs : partnerTabs;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
      <div className="flex items-end justify-around h-16 px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onChange(tab.id)} className={`flex flex-col items-center justify-center flex-1 py-2 transition-all ${tab.highlight ? 'mb-1' : ''}`}>
              {tab.highlight ? (
                <div className="bg-primary p-3 rounded-full shadow-lg -mt-8 active:scale-95 transition-transform border-[3px] border-white">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                    {isActive && <motion.div layoutId="dot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />}
                  </div>
                  <span className={`text-[10px] font-medium mt-1 ${isActive ? 'text-primary' : 'text-gray-400'}`}>{tab.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { accounts, login, logout, currentUser, isLoading: isDataLoading } = useAppContext();
  const [screen, setScreen] = useState<Screen>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [role, setRole] = useState<Role>('partner');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F7]">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Initialisation sécurisée...</p>
      </div>
    );
  }

  // Redirect to login screen if currentUser is null but we are on 'app' screen
  useEffect(() => {
    if (!currentUser && screen === 'app') {
      setScreen('login');
    }
  }, [currentUser, screen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isRegistering) {
      // Logic for new Admin registration
      try {
        const { data: existing } = await supabase.from('accounts').select('id').eq('email', email.toLowerCase()).single();
        if (existing) {
          setError('Cet email est déjà utilisé.');
          setIsLoading(false);
          return;
        }

        const { error: regError } = await supabase.from('accounts').insert({
          email: email.toLowerCase(),
          name: userName || 'Admin',
          password: password,
          role: 'admin',
          is_active: true,
          routes: []
        });

        if (regError) throw regError;

        // Auto login after registration
        await login(email, password);
        setScreen('app');
      } catch (err) {
        setError('Erreur lors de la création du compte.');
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        setScreen('app');
      } else {
        setError(result.error || 'Erreur de connexion.');
      }
    }
    setIsLoading(false);
  };

  if (screen === 'app' && currentUser) {
    return (
      <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col bg-[#F2F2F7]">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><HomeScreen userName={currentUser.name} userEmail={currentUser.email} /></motion.div>}
          {activeTab === 'history' && <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><HistoryScreen userEmail={currentUser.email} /></motion.div>}
          {activeTab === 'add' && <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><NewTransferScreen userEmail={currentUser.email} /></motion.div>}
          {activeTab === 'gestion' && <motion.div key="gestion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><PartnerGestionScreen userEmail={currentUser.email} /></motion.div>}
          {activeTab === 'overview' && <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AdminOverviewScreen /></motion.div>}
          {activeTab === 'deposits' && <motion.div key="deposits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AdminDepositsScreen /></motion.div>}
          {activeTab === 'operations' && <motion.div key="operations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AdminOperationsScreen /></motion.div>}
          {activeTab === 'partners' && <motion.div key="partners" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AdminPartnersScreen /></motion.div>}
          {activeTab === 'profile' && <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><ProfileScreen user={{ name: currentUser.name, email: currentUser.email, role: currentUser.role }} onLogout={() => { logout(); setScreen('login'); setEmail(''); setPassword(''); }} /></motion.div>}
        </AnimatePresence>
        <BottomNav role={currentUser.role} activeTab={activeTab} onChange={setActiveTab} />
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F2F2F7]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-white rounded-[22px] flex items-center justify-center shadow-lg mb-6 overflow-hidden p-2">
            <img src="/logo.png" alt="TransApp Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">TransApp</h1>
          <p className="text-gray-500 font-medium">Système Partenaire Sécurisé</p>
        </div>

        <div className="ios-card bg-white p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegistering && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 ml-1">Nom Complet / Société</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={userName} onChange={e => setUserName(e.target.value)}
                    className="w-full bg-[#F2F2F7] border-none rounded-ios-btn py-4 pl-12 pr-4 text-primary font-medium focus:ring-2 focus:ring-primary/10 outline-none"
                    placeholder="Ex: Agence Dakar" required={isRegistering} />
                </div>
              </motion.div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 ml-1">Adresse Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#F2F2F7] border-none rounded-ios-btn py-4 pl-12 pr-4 text-primary font-medium focus:ring-2 focus:ring-primary/10 outline-none"
                  placeholder="nom@exemple.com" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 ml-1">Mot de Passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#F2F2F7] border-none rounded-ios-btn py-4 pl-12 pr-4 text-primary font-medium focus:ring-2 focus:ring-primary/10 outline-none"
                  placeholder="••••••••" required />
              </div>
            </div>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-red-500 bg-red-50 rounded-xl p-3 font-medium">{error}</motion.p>
            )}
            <button type="submit" disabled={isLoading}
              className="w-full bg-primary text-white font-bold py-4 rounded-ios-btn shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isRegistering ? 'Création...' : 'Connexion...'}</span>
                  </motion.div>
                ) : (
                  <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <span>{isRegistering ? 'Créer mon compte Admin' : 'Se Connecter'}</span><ArrowRight className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="text-primary text-sm font-bold hover:underline"
            >
              {isRegistering ? "Déjà un compte ? Se connecter" : "Nouveau ? Créer un compte Admin"}
            </button>
          </div>

          {!isRegistering && (
            <div className="mt-5 p-3 bg-blue-50 rounded-xl space-y-1">
              <p className="text-[11px] text-blue-600 font-medium text-center mb-2">Accès Partenaires :</p>
              <p className="text-[11px] text-blue-600 font-medium text-center">
                Utilisez l'email et le mot de passe fournis par votre Admin.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-gray-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-medium">Accès Restreint aux Partenaires Agréés</span>
        </div>
      </motion.div>
    </div>
  );
}
