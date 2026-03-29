
import React, { useState } from 'react';
import { Plus, Search, Trash2, X, Wallet, Edit2 } from 'lucide-react';
import { ExpenseEntry } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ExpensesTabProps {
  entries: ExpenseEntry[];
  onAdd: (entry: ExpenseEntry) => void;
  onDelete: (id: string) => void;
  onConfirmPayment: (id: string) => void;
}

const ExpensesTab: React.FC<ExpensesTabProps> = ({ entries, onAdd, onDelete, onConfirmPayment }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');
  const [type, setType] = useState<'fixed' | 'variable'>('fixed');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'credit' | 'pix'>('cash');

  const filteredEntries = entries.filter(e => e.category !== 'Combustível' && e.category !== 'Manutenção');

  const handleEditExpense = (expense: ExpenseEntry) => {
    setEditingExpense(expense);
    setDesc(expense.description);
    setVal(expense.value.toFixed(2).replace('.', ','));
    setType(expense.type);
    setDueDate(new Date(expense.dueDate || expense.date).toISOString().split('T')[0]);
    setPaymentMethod(expense.paymentMethod || 'cash');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!desc || !val) return;
    
    if (editingExpense) {
      useFinanceStore.getState().updateExpense(editingExpense.id, {
        description: desc,
        value: parseFloat(val.replace(',', '.')),
        type: type,
        dueDate: new Date(dueDate).toISOString(),
        paymentMethod: paymentMethod
      });
      setEditingExpense(null);
    } else {
      onAdd({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        description: desc,
        value: parseFloat(val.replace(',', '.')),
        category: 'Outros',
        type: type,
        paymentMethod: paymentMethod
      });
    }
    
    setDesc('');
    setVal('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setType('fixed');
    setPaymentMethod('cash');
    setShowModal(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setDesc('');
    setVal('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setType('fixed');
    setPaymentMethod('cash');
  };

  return (
    <div className="space-y-8 animate-slide-up pb-8">
      <header className="border-b-2 border-[#334155] pb-3 flex justify-between items-center">
        <h1 className="text-2xl font-black italic uppercase text-[#3B82F6] tracking-tighter">Gastos</h1>
        <button onClick={() => setShowModal(true)} className="bg-[#3B82F6] text-white p-2.5 rounded-xl shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </header>

      {filteredEntries.length === 0 ? (
        <div className="py-20 text-center bg-[#1E293B] border border-dashed border-[#334155] rounded-3xl opacity-20">
          <Search size={40} className="mx-auto mb-2 text-[#3B82F6]"/>
          <p className="text-[10px] font-black uppercase italic">Nenhum gasto registrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase italic tracking-widest text-[#64748B] border-l-4 border-[#3B82F6] pl-3">Histórico de Gastos</h3>
          {filteredEntries.map(e => (
            <div key={e.id} className="bg-[#1E293B] border border-[#334155] p-4 rounded-xl flex justify-between items-center shadow-sm">
              <div className="flex gap-3 items-center">
                 <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-500"><Wallet size={16}/></div>
                 <div>
                    <p className="text-[8px] font-bold text-[#64748B] uppercase">{new Date(e.date).toLocaleDateString()}</p>
                    <p className="font-black text-[#F1F5F9] italic uppercase text-base leading-tight">{e.description}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <p className="font-black text-lg text-[#3B82F6]">R$ {formatCurrency(e.value)}</p>
                 <button 
                  onClick={() => handleEditExpense(e)}
                  className="p-1.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-lg hover:bg-[#3B82F6]/20 transition-colors"
                 >
                   <Edit2 size={12} />
                 </button>
                 <button onClick={() => onConfirmPayment(e.id)} className="text-[#10B981] p-1.5 active:text-[#10B981]/50" title="Confirmar Pagamento">✓</button>
                 <button onClick={() => onDelete(e.id)} className="text-[#64748B] p-1.5 active:text-rose-500"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-[#0F172A]/95 z-[2000] p-6 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-[#334155] w-full max-w-sm p-8 rounded-[2.5rem] space-y-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-black text-[#F1F5F9] uppercase italic">{editingExpense ? 'Editar Gasto' : 'Adicionar Gasto'}</h2>
               <button onClick={handleCloseModal} className="bg-[#334155] p-2 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-4">
               <input className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-xl font-bold text-[#F1F5F9] outline-none" placeholder="Descrição (Ex: Almoço, Estac.)" value={desc} onChange={e => setDesc(e.target.value)} autoFocus />
               <input className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-xl font-bold text-[#F1F5F9] outline-none" type="text" inputMode="decimal" placeholder="Valor (R$)" value={val} onChange={e => setVal(e.target.value.replace(/[^0-9.,]/g, ''))} />
               <input className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-xl font-bold text-[#F1F5F9] outline-none" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
               
               <div className="space-y-2">
                 <label className="text-[9px] font-black text-[#64748B] uppercase italic">Forma de Pagamento</label>
                 <div className="grid grid-cols-4 gap-2">
                   <button onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-xl border text-[9px] font-black italic uppercase transition-all ${paymentMethod === 'cash' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Dinheiro</button>
                   <button onClick={() => setPaymentMethod('pix')} className={`py-2 rounded-xl border text-[9px] font-black italic uppercase transition-all ${paymentMethod === 'pix' ? 'bg-[#10B981] border-[#10B981] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Pix</button>
                   <button onClick={() => setPaymentMethod('debit')} className={`py-2 rounded-xl border text-[9px] font-black italic uppercase transition-all ${paymentMethod === 'debit' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Débito</button>
                   <button onClick={() => setPaymentMethod('credit')} className={`py-2 rounded-xl border text-[9px] font-black italic uppercase transition-all ${paymentMethod === 'credit' ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'bg-[#0F172A] border-[#334155] text-[#64748B]'}`}>Crédito</button>
                 </div>
               </div>

               <select className="w-full bg-[#0F172A] border border-[#334155] p-4 rounded-xl font-bold text-[#F1F5F9] outline-none" value={type} onChange={e => setType(e.target.value as 'fixed' | 'variable')}>
                 <option value="fixed">Fixo (Dividido por dia)</option>
                 <option value="variable">Variável (Dividido por KM)</option>
               </select>
               <button onClick={handleSave} className="w-full bg-[#3B82F6] text-white py-5 rounded-2xl font-black uppercase italic shadow-xl">{editingExpense ? 'Salvar Alterações ✓' : 'Salvar Gasto ✓'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesTab;
