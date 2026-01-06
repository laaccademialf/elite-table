import React from "react";
import {
  ShoppingBag,
  Calendar as CalendarIcon,
  Sparkles,
  Volume2,
  Trash2,
  Loader2,
} from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import { SafeImage } from "../components/SafeImage";
import { callGemini, callGeminiTTS } from "../services/geminiApi";
import { pcmToWav } from "../utils/audioUtils";

export const CartView = () => {
  const {
    cart,
    globalDates,
    setView,
    removeFromCart,
    isGenerating,
    setIsGenerating,
    aiConcept,
    setAiConcept,
    isTtsLoading,
    setIsTtsLoading,
  } = useAppContext();

  const days = globalDates.end ? globalDates.end - globalDates.start + 1 : 1;
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity * days,
    0
  );
  const total = subtotal + 100;

  const generateAiConcept = async () => {
    if (cart.length === 0) return;
    setIsGenerating(true);
    const itemsList = cart
      .map((i) => `${i.title} (${i.quantity} шт.)`)
      .join(", ");
    const prompt = `Запланована подія на ${globalDates.start}.12.2025. Обраний посуд: ${itemsList}. Створи концепцію події: Назва та стиль, Поради щодо дрес-коду, Ідеї для меню. Українською мовою.`;

    try {
      const result = await callGemini(
        prompt,
        "Ти — професійний івент-стиліст преміум-класу."
      );
      setAiConcept(result);
    } catch {
      alert("Не вдалося згенерувати концепцію.");
    } finally {
      setIsGenerating(false);
    }
  };

  const speakAiConcept = async () => {
    if (!aiConcept) return;
    setIsTtsLoading(true);
    const audioData = await callGeminiTTS(aiConcept.slice(0, 500));
    if (audioData) {
      const audioUrl = pcmToWav(audioData);
      const audio = new Audio(audioUrl);
      audio.play();
    }
    setIsTtsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 animate-in slide-in-from-bottom-8 duration-500 text-gray-900">
      <h2 className="text-4xl font-black italic uppercase mb-12 border-b pb-8 flex items-center gap-4"><ShoppingBag size={32} /> Кошик</h2>
      
      {cart.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-[48px] border border-dashed"><p className="text-gray-400 uppercase text-xs font-black">Кошик порожній</p></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#C5A059]/10 p-6 rounded-[32px] border border-[#C5A059]/20 flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <CalendarIcon size={24} className="text-[#C5A059]" />
              <div>
                <p className="text-[10px] font-black uppercase text-[#C5A059]">Період оренди</p>
                <p className="text-lg font-black">{globalDates.start}.12.2025 {globalDates.end ? `- ${globalDates.end}.12.2025` : ''}</p>
              </div>
            </div>
            <p className="text-lg font-black">{days} {days === 1 ? 'доба' : 'доби'}</p>
          </div>

          <div className="bg-gray-900 text-white p-8 rounded-[48px] shadow-2xl overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                  <Sparkles className="text-[#C5A059]" /> ✨ Концепція події
                </h3>
                {!aiConcept && (
                  <button 
                    onClick={generateAiConcept}
                    disabled={isGenerating}
                    className="bg-[#C5A059] text-white px-6 py-2 rounded-full font-black uppercase text-[10px] hover:bg-white hover:text-gray-900 transition-all flex items-center gap-2"
                  >
                    {isGenerating ? <Loader2 className="animate-spin" size={14}/> : '✨ Створити'}
                  </button>
                )}
              </div>
              {aiConcept ? (
                <div className="space-y-6 animate-in fade-in duration-1000">
                  <p className="text-sm italic leading-relaxed text-gray-300">{aiConcept}</p>
                  <div className="flex gap-4">
                    <button onClick={speakAiConcept} disabled={isTtsLoading} className="flex items-center gap-2 text-[10px] font-black uppercase text-[#C5A059]">
                      {isTtsLoading ? <Loader2 className="animate-spin" size={14}/> : <Volume2 size={16}/>} Прослухати
                    </button>
                    <button onClick={() => setAiConcept(null)} className="text-[10px] font-black uppercase text-gray-500">Очистити</button>
                  </div>
                </div>
              ) : <p className="text-xs text-gray-500 italic">Натисніть кнопку для розробки концепції свята.</p>}
            </div>
          </div>

          {cart.map(item => (
            <div key={item.id} className="p-6 bg-white border border-gray-100 rounded-[32px] flex items-center gap-6 shadow-sm">
              <SafeImage src={item.image} className="w-20 h-20 rounded-2xl object-cover" />
              <div className="flex-1">
                <h4 className="font-black uppercase text-lg">{item.title}</h4>
                <p className="text-[10px] font-bold text-[#C5A059] uppercase">{item.price} ₴ × {item.quantity} од.</p>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={20}/></button>
            </div>
          ))}

          <div className="mt-12 bg-gray-900 text-white p-10 rounded-[48px] shadow-2xl">
            <div className="flex justify-between text-3xl font-black mb-10"><span>Разом</span><span className="text-[#C5A059]">{total} ₴</span></div>
            <button onClick={() => setView('checkout')} className="w-full py-6 bg-[#C5A059] text-white font-black rounded-full uppercase tracking-widest text-xs">Оформити</button>
          </div>
        </div>
      )}
    </div>
  );
};
