import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-[#050b18] text-white py-10 mt-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-6">
          <div className="inline-flex flex-col items-center justify-center text-center leading-none mb-2 select-none">
            <span
              className="text-[20px] md:text-[26px] text-white font-semibold tracking-[-0.03em]"
              style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif' }}
            >
              laFamiglia
            </span>
            <span className="text-[34px] md:text-[48px] font-black tracking-[0.18em] uppercase text-white leading-none">
              RENTCO
            </span>
          </div>
          <p className="text-slate-400 text-xs md:text-sm">Преміальна оренда посуду, меблів та декору для особливих подій</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6 text-center mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
              <Phone className="text-[#D7B46A]" size={20} />
            </div>
            <h3 className="text-sm md:text-base font-bold uppercase tracking-wide">Зворотний зв’язок</h3>
            <a href="tel:+380443338948" className="text-slate-200 text-xl hover:text-[#D7B46A] transition">
              044 333 89 48
            </a>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
              <MapPin className="text-[#D7B46A]" size={20} />
            </div>
            <h3 className="text-sm md:text-base font-bold uppercase tracking-wide">Адреси</h3>
            <div className="space-y-1 text-slate-200 text-sm md:text-base leading-relaxed">
              <p>Київ, вул. Січових стрільців, 23а — офіс</p>
              <p>Київ, вул. Марка Вовчка, 8 — склад</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center">
              <Mail className="text-[#D7B46A]" size={20} />
            </div>
            <h3 className="text-sm md:text-base font-bold uppercase tracking-wide">Email</h3>
            <a href="mailto:rent@rentco.com.ua" className="text-slate-200 text-xl hover:text-[#D7B46A] transition break-all">
              rent@rentco.com.ua
            </a>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-800 text-[9px] font-bold tracking-[0.3em] text-slate-500 uppercase text-center">
          © 2026 LaFamiglia Rentco.
        </div>
      </div>
    </footer>
  );
};
