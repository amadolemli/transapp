"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Wallet, ArrowUpRight, Clock, ChevronRight } from 'lucide-react';

export default function PartnerDashboardMockup() {
    return (
        <div className="flex-1 w-full max-w-md mx-auto p-6 space-y-6 overflow-y-auto pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">TABLEAU DE BORD</h2>
                    <h1 className="text-2xl font-bold text-primary italic">Bonjour, Partner</h1>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface-secondary border-2 border-white shadow-sm overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" />
                </div>
            </div>

            {/* Main Cards Row */}
            <div className="grid grid-cols-2 gap-4">
                <motion.div
                    whileHover={{ y: -4 }}
                    className="ios-card bg-primary text-white"
                >
                    <div className="flex items-center gap-2 mb-2 text-white/60">
                        <Wallet className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Réserve</span>
                    </div>
                    <div className="text-xl font-bold tracking-tight">8.5M <span className="text-xs">FCFA</span></div>
                    <div className="mt-2 text-[10px] text-secondary font-medium flex items-center gap-1">
                        <div className="w-1 h-1 bg-secondary rounded-full animate-pulse" />
                        En cours
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ y: -4 }}
                    className="ios-card border border-white"
                >
                    <div className="flex items-center gap-2 mb-2 text-gray-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Profit</span>
                    </div>
                    <div className="text-xl font-bold tracking-tight text-status-paid">+125k <span className="text-xs text-gray-400">FCFA</span></div>
                    <div className="mt-2 text-[10px] text-gray-400 font-medium">Aujourd'hui</div>
                </motion.div>
            </div>

            {/* Collection Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="ios-card bg-white relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-secondary/20 transition-colors" />
                <div className="relative">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Encaissements Clients</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-primary">1,240,000</span>
                        <span className="text-sm font-bold text-gray-400 tracking-wide uppercase">FCFA</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-2 font-medium">
                        Somme détenue à reverser pour la prochaine réserve.
                    </p>
                </div>
            </motion.div>

            {/* Recent Activity */}
            <div>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Activité Récente</h3>
                    <button className="text-[11px] font-bold text-primary flex items-center gap-1">
                        Voir Tout <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="space-y-3">
                    {[
                        { id: 1, name: 'Client: Moussa Diop', amount: '50,000', rate: '95.5', status: 'Payé', type: 'out' },
                        { id: 2, name: 'Client: Fatima Sy', amount: '120,000', rate: '95.0', status: 'En attente', type: 'out' },
                        { id: 3, name: 'Dépôt Réserve', amount: '5M', rate: '90.2', status: 'Confirmé', type: 'in' },
                    ].map((item) => (
                        <motion.div
                            key={item.id}
                            whileTap={{ scale: 0.98 }}
                            className="ios-card bg-white p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'in' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'
                                    }`}>
                                    {item.type === 'in' ? <ArrowUpRight className="w-5 h-5 rotate-180" /> : <ArrowUpRight className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-primary">{item.name}</div>
                                    <div className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> il y a 2h • Taux: {item.rate}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-black text-primary">{item.amount}</div>
                                <div className={`text-[10px] font-bold uppercase tracking-tighter ${item.status === 'Payé' || item.status === 'Confirmé' ? 'text-status-paid' : 'text-status-pending'
                                    }`}>
                                    {item.status}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
