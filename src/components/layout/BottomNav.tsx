"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Home, History, PlusCircle, User, PieChart, CheckCircle, Wallet, Users } from 'lucide-react';

type Role = 'admin' | 'partner';

interface BottomNavProps {
    role: Role;
    activeTab: string;
    onChange: (tab: string) => void;
}

export default function BottomNav({ role, activeTab, onChange }: BottomNavProps) {
    type NavTabDef = { id: string; label: string; icon: React.ElementType; highlight?: boolean };

    const partnerTabs: NavTabDef[] = [
        { id: 'home', label: 'Accueil', icon: Home },
        { id: 'history', label: 'Historique', icon: History },
        { id: 'add', label: 'Nouveau', icon: PlusCircle, highlight: true },
        { id: 'profile', label: 'Profil', icon: User },
    ];

    const adminTabs: NavTabDef[] = [
        { id: 'overview', label: 'Vue d\'ensemble', icon: PieChart },
        { id: 'validations', label: 'Validations', icon: CheckCircle },
        { id: 'payouts', label: 'Paiements', icon: Wallet },
        { id: 'partners', label: 'Partenaires', icon: Users },
        { id: 'profile', label: 'Profil', icon: User },
    ];

    const tabs = role === 'admin' ? adminTabs : partnerTabs;

    return (
        <div className="fixed bottom-0 left-0 right-0 glass-nav iphone-bottom-safe z-50">
            <div className="flex items-end justify-around h-16 px-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            className={`flex flex-col items-center justify-center flex-1 py-2 transition-all relative ${tab.highlight ? 'mb-1' : ''
                                }`}
                        >
                            <div className={`relative p-1 ${tab.highlight ? 'bg-primary text-white p-2 rounded-full -mt-10 shadow-lg scale-110 active:scale-95 transition-transform' : ''}`}>
                                <Icon
                                    className={`w-6 h-6 ${isActive && !tab.highlight ? 'text-primary' : (tab.highlight ? 'text-white' : 'text-gray-400')}`}
                                />

                                {isActive && !tab.highlight && (
                                    <motion.div
                                        layoutId="activeTabBadge"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                                    />
                                )}
                            </div>

                            {!tab.highlight && (
                                <span className={`text-[10px] font-medium mt-1 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                                    {tab.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
