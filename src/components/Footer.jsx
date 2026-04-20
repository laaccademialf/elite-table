import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-[#131C4E] text-white py-10 mt-16 border-t border-[#1a2766]">
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
          <p className="text-slate-300 text-xs md:text-sm">Преміальна оренда посуду, меблів та декору для особливих подій</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6 text-left mb-6">
          <div className="flex flex-col items-start gap-2">
            <Phone className="text-white" size={22} />
            <h3 className="text-sm md:text-base font-bold uppercase tracking-wide">Зворотний зв’язок</h3>
            <a href="tel:+380443338948" className="text-slate-200 text-xl hover:text-white transition">
              044 333 89 48
            </a>
          </div>

          <div className="flex flex-col items-start gap-2">
            <MapPin className="text-white" size={22} />
            <h3 className="text-sm md:text-base font-bold uppercase tracking-wide">Адреси</h3>
            <div className="space-y-1 text-slate-200 text-sm md:text-base leading-relaxed">
              <p>Київ, вул. Січових стрільців, 23а — офіс</p>
              <p>Київ, вул. Марка Вовчка, 8 — склад</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2">
            <Mail className="text-white" size={22} />
            <h3 className="text-sm md:text-base font-bold uppercase tracking-wide">Email</h3>
            <a href="mailto:rent@rentco.com.ua" className="text-slate-200 text-xl hover:text-white transition break-all">
              rent@rentco.com.ua
            </a>
          </div>
        </div>

        {/* Social media icons */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <a href="tel:+380443338948" className="p-2 text-slate-300 hover:text-white transition-colors" title="Телефон">
            <Phone size={20} />
          </a>
          <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-white transition-colors" title="Pinterest">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345c-.091.379-.293 1.194-.333 1.361-.052.22-.174.266-.402.16-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-white transition-colors" title="Instagram">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-white transition-colors" title="Facebook">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
        </div>

        <div className="pt-5 border-t border-white/10 text-[9px] font-bold tracking-[0.3em] text-slate-400 uppercase text-center">
          © 2026 LaFamiglia Rentco.
        </div>
      </div>
    </footer>
  );
};
