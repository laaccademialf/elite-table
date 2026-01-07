import React, { useState } from "react";
import { Wine, Calendar as CalendarIcon, ShoppingBag, LogOut, Package, X, LogIn } from "lucide-react";
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
  const { currentUser, handleLogout, refreshUser } = useAppContext();
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[#FFF7ED] border-b border-slate-200 px-6 h-16 flex items-center justify-between shadow-lg transition-all duration-300">
        {/* Logo */}
        <div
          className="flex items-center cursor-pointer shrink-0 hover:scale-105 transition-transform duration-200"
          onClick={() => {
            setView("home");
            setIsAdminMode(false);
          }}
        >
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-2 rounded-lg shadow-md">
              <Wine className="text-white" size={20} />
            </div>
            <span className="text-lg font-bold tracking-wide uppercase text-slate-900 hidden sm:inline">
              ELITE TABLE
            </span>
          </div>
        </div>

        {/* Center: Selected Date */}
        {globalDates.start && (
          <div className="flex items-center gap-2 bg-[#FAF3E3] text-slate-700 px-4 py-2 rounded-lg border border-slate-200 shadow transition-all duration-300">
            <CalendarIcon size={14} />
            <span className="text-xs font-semibold uppercase">
              {globalDates.start ? `${globalDates.start.day}.${globalDates.start.month+1}.${globalDates.start.year}` : ''}
              {globalDates.end ? ` - ${globalDates.end.day}.${globalDates.end.month+1}.${globalDates.end.year}` : ''}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGlobalDates({ start: null, end: null });
              }}
              className="ml-1 hover:text-slate-900 hover:scale-110 transition-all duration-200"
              title="Скинути дату"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Orders Button */}
          {currentUser && (
            <button
              onClick={() => setView("orders")}
              className="flex items-center gap-2 md:gap-0 px-2 md:px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-[#F5EBDD] rounded-lg shadow transition-all duration-200"
              title="Мої замовлення"
            >
              <Package size={18} />
              <span className="hidden md:inline text-xs font-semibold ml-2">Замовлення</span>
            </button>
          )}

          {/* Admin Mode Toggle */}
          {currentUser?.role === "manager" && (
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`p-2 rounded-lg transition-all duration-200 shadow ${
                isAdminMode
                  ? "bg-slate-900 text-white shadow-lg scale-105"
                  : "text-slate-600 hover:bg-[#F5EBDD] hover:scale-105"
              }`}
              title="Панель менеджера"
            >
              <Package size={18} />
            </button>
          )}

          {/* Cart Button */}
          <button
            onClick={() => setView("cart")}
            className="relative p-2 hover:bg-[#F5EBDD] rounded-lg text-slate-900 transition-all duration-200 shadow"
            title="Кошик"
          >
            <ShoppingBag size={18} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                {cart.length}
              </span>
            )}
          </button>

          {/* Auth Section */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-slate-900">{currentUser?.name}</p>
                <p className="text-xs text-slate-600">{currentUser?.role === 'manager' ? 'Менеджер' : 'Клієнт'}</p>
              </div>
              <button
                onClick={async () => {
                  await handleLogout();
                  setView("home");
                }}
                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                title="Вихід"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-[#EADBC8] hover:text-slate-900 hover:scale-105 transition-all duration-200 font-medium text-sm shadow"
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
