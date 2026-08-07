"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Home, History, PlusCircle, User, PieChart, CheckCircle, Landmark, Users, BookOpen } from 'lucide-react';

type Role = 'admin' | 'partner';
type Tab = 'home' | 'history' | 'add' | 'gestion' | 'profile' | 'overview' | 'operations' | 'partners' | 'deposits';
type NavTabDef = { id: Tab; label: string; icon: React.ElementType; highlight?: boolean };

interface BottomNavProps {
    role: Role;
    activeTab: Tab;
    onChange: (tab: Tab) => void;
}

export default function BottomNav({ role, activeTab, onChange }: BottomNavProps) {
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
