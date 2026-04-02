import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-[#050b18] text-white py-16 mt-24 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <span className="text-2xl md:text-4xl font-black tracking-[0.28em] mb-3 block uppercase">
            LaFamiglia Rentco
          </span>
          <p className="text-slate-400 text-sm md:text-base">Преміальна оренда посуду, меблів та декору для особливих подій</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-10 text-center mb-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center">
              <Phone className="text-cyan-300" size={26} />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide">Зворотний зв’язок</h3>
            <a href="tel:+380443338948" className="text-slate-200 text-2xl hover:text-cyan-300 transition">
              044 333 89 48
            </a>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center">
              <MapPin className="text-cyan-300" size={26} />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide">Адреси</h3>
            <div className="space-y-2 text-slate-200 text-lg leading-relaxed">
              <p>Київ, вул. Дегтяревская, 21Г — офіс</p>
              <p>Київ, вул. Марка Вовчка, 5 — склад</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center">
              <Mail className="text-cyan-300" size={26} />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-wide">Email</h3>
            <a href="mailto:rent@rentco.com.ua" className="text-slate-200 text-2xl hover:text-cyan-300 transition break-all">
              rent@rentco.com.ua
            </a>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-[10px] font-bold tracking-[0.3em] text-slate-500 uppercase text-center">
          © 2026 LaFamiglia Rentco.
        </div>
      </div>
    </footer>
  );
};
