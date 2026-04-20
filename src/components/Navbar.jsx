import React, { useState } from "react";
import { House, Calendar as CalendarIcon, ShoppingBag, LogOut, Package, Settings, X, LogIn, Images, Info, FileText, Phone } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import LoginModal from "./LoginModal";

export const Navbar = ({
  view,
  isAdminMode,
  setIsAdminMode,
  setView,
  globalDates,
  setGlobalDates,
  cart,
}) => {
  const { currentUser, handleLogout, pendingBadge } = useAppContext();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navLinkClasses = (isActive) => `flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl border transition-all duration-200 ${isActive ? "bg-slate-800 text-white border-slate-700" : "text-slate-300 hover:text-white hover:bg-slate-800 border-transparent hover:border-slate-700"}`;

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[#1a2766] bg-[#131C4E]/95 backdrop-blur w-full px-6 h-16 flex items-center justify-between shadow-2xl transition-all duration-300 relative">
        {/* Left — Logo */}
        <div className="flex items-center shrink-0 z-10">
          <div
            className="flex items-center cursor-pointer hover:scale-[1.02] transition-transform duration-200"
            onClick={() => {
              setView("home");
              setIsAdminMode(false);
            }}
          >
            <div className="flex flex-col items-center justify-center leading-none select-none text-center">
              <span
                className="text-[12px] md:text-[14px] text-white font-semibold tracking-[-0.03em]"
                style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif' }}
              >
                laFamiglia
              </span>
              <span className="text-[18px] md:text-[22px] font-black tracking-[0.16em] uppercase text-white leading-none">
                RENTCO
              </span>
            </div>
          </div>
        </div>

        {/* Center — Nav links + date (absolutely centered) */}
        <div className="absolute left-0 right-0 flex items-center justify-center gap-2 md:gap-3 pointer-events-none">
          <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
          <button
            onClick={() => {
              setView("home");
              setIsAdminMode(false);
            }}
            className={navLinkClasses(view === "home")}
            title="На головну"
          >
            <House size={18} />
            <span className="hidden md:inline text-xs font-semibold">На головну</span>
          </button>

          <button
            onClick={() => {
              setView("gallery");
              setIsAdminMode(false);
            }}
            className={navLinkClasses(view === "gallery")}
            title="Галерея"
          >
            <Images size={18} />
            <span className="hidden md:inline text-xs font-semibold">Галерея</span>
          </button>

          <button
            onClick={() => {
              setView("about");
              setIsAdminMode(false);
            }}
            className={navLinkClasses(view === "about")}
            title="Про нас"
          >
            <Info size={18} />
            <span className="hidden md:inline text-xs font-semibold">Про нас</span>
          </button>

          <button
            onClick={() => {
              setView("terms");
              setIsAdminMode(false);
            }}
            className={navLinkClasses(view === "terms")}
            title="Оренда та умови"
          >
            <FileText size={18} />
            <span className="hidden lg:inline text-xs font-semibold">Оренда та умови</span>
          </button>

          {globalDates.start && (
            <div className="hidden md:flex items-center gap-2 bg-slate-900/80 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 shadow transition-all duration-300 ml-2">
              <CalendarIcon size={14} className="text-cyan-300" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                {globalDates.start ? `${globalDates.start.day}.${globalDates.start.month+1}.${globalDates.start.year}` : ''}
                {globalDates.end ? ` - ${globalDates.end.day}.${globalDates.end.month+1}.${globalDates.end.year}` : ''}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setGlobalDates({ start: null, end: null });
                }}
                className="ml-1 text-slate-400 hover:text-white hover:scale-110 transition-all duration-200"
                title="Скинути дату"
              >
                <X size={14} />
              </button>
            </div>
          )}
          </div>
        </div>

        {/* Right — Controls */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 z-10">
          {/* Social media icons */}
          <div className="hidden md:flex items-center gap-1">
            <a href="tel:+380443338948" className="p-2 text-slate-300 hover:text-white transition-colors" title="Телефон">
              <Phone size={16} />
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-white transition-colors" title="Pinterest">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345c-.091.379-.293 1.194-.333 1.361-.052.22-.174.266-.402.16-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-white transition-colors" title="Instagram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-white transition-colors" title="Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
          {currentUser && (
            <button
              onClick={() => setView("orders")}
              className="flex items-center gap-2 px-2 md:px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-700 transition-all duration-200"
              title="Мої замовлення"
            >
              <Package size={18} />
              <span className="hidden md:inline text-xs font-semibold">Замовлення</span>
            </button>
          )}

          {currentUser?.role === "manager" && (
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`relative p-2 rounded-xl transition-all duration-200 border ${
                isAdminMode
                  ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg scale-105"
                  : "text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white hover:scale-105"
              }`}
              title="Панель менеджера"
            >
              <Settings size={18} />
              {pendingBadge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                  {pendingBadge}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setView("cart")}
            className="relative p-2 rounded-xl text-white border border-slate-700 hover:bg-slate-800 transition-all duration-200"
            title="Кошик"
          >
            <ShoppingBag size={18} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-cyan-500 text-slate-950 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                {cart.length}
              </span>
            )}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-white">{currentUser?.name}</p>
                <p className="text-xs text-slate-400">{currentUser?.role === 'manager' ? 'Менеджер' : 'Клієнт'}</p>
              </div>
              <button
                onClick={async () => {
                  await handleLogout();
                  setView("home");
                }}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200"
                title="Вихід"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-slate-950 rounded-xl hover:bg-cyan-400 hover:scale-105 transition-all duration-200 font-semibold text-sm shadow"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Вхід</span>
            </button>
          )}
        </div>
      </nav>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          window.location.reload();
        }}
      />
    </>
  );
};
