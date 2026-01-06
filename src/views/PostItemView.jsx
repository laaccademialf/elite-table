import React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { callGemini } from "../services/geminiApi";

export const PostItemView = () => {
  const { view, setView, newItem, setNewItem, items, setItems, isGenerating, setIsGenerating } =
    useAppContext();

  if (view !== "post") return null;

  const generateAiDescription = async () => {
    if (!newItem.title) return alert("Спочатку вкажіть назву");
    setIsGenerating(true);
    const prompt = `Напиши розкішний рекламний опис для каталогу оренди посуду. Назва: ${newItem.title}. Матеріал: ${newItem.material || "порцеляна/скло"}. До 3 речень.`;
    try {
      const result = await callGemini(prompt);
      setNewItem({ ...newItem, description: result });
    } catch {
      alert("AI поки зайнятий.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 animate-in slide-in-from-bottom-12 duration-500">
      <div className="bg-white rounded-[64px] p-16 shadow-2xl border border-gray-100 relative overflow-hidden text-gray-900">
        <h2 className="text-4xl font-black italic mb-10 border-b pb-8 uppercase">➕ Новий товар</h2>
        <form onSubmit={() => { setItems([{ ...newItem, id: Date.now() }, ...items]); setView('home'); }} className="space-y-6 relative z-10">
          <input required className="w-full px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400" placeholder="Назва товару..." value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} />
          <div className="space-y-2">
            <div className="flex justify-between items-center px-4">
              <label className="text-[10px] font-black uppercase text-gray-400">Опис товару</label>
              <button type="button" onClick={generateAiDescription} disabled={isGenerating || !newItem.title} className="text-[10px] font-black uppercase text-[#C5A059] flex items-center gap-1 hover:text-gray-900 transition-colors">
                {isGenerating ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />} ✨ AI Опис
              </button>
            </div>
            <textarea required className="w-full px-8 py-5 rounded-[32px] bg-gray-50 border border-gray-100 font-bold outline-none min-h-[120px] resize-none text-sm placeholder-gray-400" placeholder="Опис товару..." value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input required type="number" className="px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400" placeholder="Ціна ₴" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
            <input required className="px-8 py-5 rounded-full bg-gray-50 border border-gray-100 font-bold outline-none text-sm placeholder-gray-400" placeholder="Матеріал" value={newItem.material} onChange={(e) => setNewItem({ ...newItem, material: e.target.value })} />
          </div>
          <button type="submit" className="w-full py-6 bg-gray-900 text-white font-black rounded-full uppercase shadow-xl hover:bg-[#C5A059] transition-all text-sm">📤 Опублікувати товар</button>
        </form>
      </div>
    </div>
  );
};
