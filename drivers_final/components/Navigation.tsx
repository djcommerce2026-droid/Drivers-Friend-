
import React from 'react';
import { PlayCircle, Fuel, Wallet, Wrench, BarChart3, BarChart2 } from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'rides', icon: <PlayCircle size={20} />, label: 'Corridas' },
    { id: 'fuel', icon: <Fuel size={20} />, label: 'Combustível' },
    { id: 'expenses', icon: <Wallet size={20} />, label: 'Gastos' },
    { id: 'maintenance', icon: <Wrench size={20} />, label: 'Manutenção' },
    { id: 'financial', icon: <BarChart3 size={20} />, label: 'Finanças' },
    { id: 'reports', icon: <BarChart2 size={20} />, label: 'Relatórios' },
  ];

  return (
    <nav className="w-full bg-[#1E293B] border-t border-[#334155] px-1 flex justify-around items-start z-[5000] flex-shrink-0" 
         style={{ 
           height: 'calc(env(safe-area-inset-bottom, 24px) + 64px)',
           paddingBottom: 'env(safe-area-inset-bottom, 24px)',
           paddingTop: '8px'
         }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as TabType)}
          className={`flex flex-col items-center gap-1 flex-1 transition-all active:scale-90 ${
            activeTab === tab.id ? 'text-[#3B82F6]' : 'text-[#64748B]'
          }`}
        >
          <div className={`${activeTab === tab.id ? 'scale-110' : 'opacity-70'}`}>
            {tab.icon}
          </div>
          <span className={`text-[8px] font-bold text-center leading-none ${
            activeTab === tab.id ? 'text-[#3B82F6]' : ''
          }`}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
