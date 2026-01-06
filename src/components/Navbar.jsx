import React from "react";
import { Wine, Calendar as CalendarIcon, Settings, ShoppingBag, X } from "lucide-react";

export const Navbar = ({
  isAdminMode,
  setIsAdminMode,
  setView,
  globalDates,
  setGlobalDates,
  cart,
}) => {
  return (
    <nav className="sticky top-0 z-50 bg-transparent px-6 h-16 flex items-center justify-between">
      <div
        className="flex items-center cursor-pointer shrink-0"
        onClick={() => {
          setView("home");
          setIsAdminMode(false);
        }}
      >
        <div className="flex items-center mr-4">
          <div className="bg-white p-2 rounded-card shadow-soft-md mr-3 flex items-center justify-center">
            <Wine className="text-accent" size={20} />
          </div>
          <span className="text-xl font-black tracking-widest uppercase text-primary">
            ELITE TABLE
          </span>
        </div>
      </div>

      {globalDates.start && (
        <div className="flex items-center gap-2 bg-[#C5A059]/10 text-[#C5A059] px-4 py-2 rounded-full border border-[#C5A059]/20 animate-in fade-in zoom-in duration-300">
          <CalendarIcon size={14} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {globalDates.start}.12{globalDates.end ? ` - ${globalDates.end}.12` : ""}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setGlobalDates({ start: null, end: null });
            }}
            className="ml-1 hover:text-gray-900 transition-colors"
            title="Скинути дату"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <div className="flex items-center space-x-4 shrink-0">
        <button
          onClick={() => {
            setIsAdminMode(!isAdminMode);
            setView(isAdminMode ? "home" : "admin");
          }}
          className={`p-2 rounded-full transition-all ${
            isAdminMode
              ? "bg-primary text-white shadow-lg"
              : "text-gray-400 hover:bg-gray-100"
          }`}
        >
          <Settings size={20} />
        </button>
        <button
          onClick={() => setView("cart")}
          className="relative p-2 hover:bg-gray-100 rounded-full text-gray-900"
        >
          <ShoppingBag size={20} />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md animate-bounce">
              {cart.length}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
