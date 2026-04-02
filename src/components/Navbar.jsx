import React, { useState } from "react";
import { Wine, Calendar as CalendarIcon, ShoppingBag, LogOut, Package, Settings, X, LogIn, Images } from "lucide-react";
import { useAppContext } from "../context/useAppContext";
import LoginModal from "./LoginModal";

export const Navbar = ({
  isAdminMode,
  setIsAdminMode,
  setView,
  globalDates,
  setGlobalDates,
  cart,
}) => {
  const { currentUser, handleLogout, pendingBadge } = useAppContext();
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#081226]/95 backdrop-blur px-4 md:px-6 h-16 flex items-center justify-between shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div
            className="flex items-center cursor-pointer hover:scale-[1.02] transition-transform duration-200"
            onClick={() => {
              setView("home");
              setIsAdminMode(false);
            }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/15 border border-cyan-400/30 p-2 rounded-xl shadow-md">
                <Wine className="text-cyan-200" size={20} />
              </div>
              <span className="text-sm md:text-base font-bold tracking-[0.18em] uppercase text-white hidden sm:inline">
                LaFamiglia Rentco
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setView("gallery");
              setIsAdminMode(false);
            }}
            className="flex items-center gap-2 px-2 md:px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-700 transition-all duration-200"
            title="Галерея"
          >
            <Images size={18} />
            <span className="hidden md:inline text-xs font-semibold">Галерея</span>
          </button>
        </div>

        {globalDates.start && (
          <div className="hidden md:flex items-center gap-2 bg-slate-900/80 text-slate-200 px-4 py-2 rounded-xl border border-slate-700 shadow transition-all duration-300">
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

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
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
