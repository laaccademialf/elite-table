import React from "react";
import { AppProvider } from "./context/AppProvider";
import { useAppContext } from "./context/useAppContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { HomeView } from "./views/HomeView";
import { CartView } from "./views/CartView";
import { ItemDetailView } from "./views/ItemDetailView";
import { AdminPanel } from "./views/AdminPanel";
import { CheckoutView } from "./views/CheckoutView";
import { PostItemView } from "./views/PostItemView";
import { OrdersView } from "./views/OrdersView";
import { Bell } from "lucide-react";

const AppContent = () => {
  const {
    view,
    setView,
    isAdminMode,
    setIsAdminMode,
    adminTab,
    setAdminTab,
    globalDates,
    setGlobalDates,
    cart,
    pendingNotifications,
    setExpandedOrderId,
  } = useAppContext();

  const handleNotificationClick = (orderId) => {
    setIsAdminMode(true);
    setAdminTab('orders');
    setExpandedOrderId(orderId);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#C5A059] selection:text-white">
      <Navbar
        isAdminMode={isAdminMode}
        setIsAdminMode={setIsAdminMode}
        setView={setView}
        globalDates={globalDates}
        setGlobalDates={setGlobalDates}
        cart={cart}
      />

      {isAdminMode ? (
        <AdminPanel />
      ) : (
        <>
          {view === "home" && <HomeView />}
          {view === "cart" && <CartView />}
          {view === "item" && <ItemDetailView />}
          {view === "post" && <PostItemView />}
          {view === "checkout" && <CheckoutView />}
          {view === "orders" && <OrdersView />}
        </>
      )}

      {/* Global pending notifications - visible everywhere */}
      {pendingNotifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 w-72">
          {pendingNotifications.map((n) => (
            <div key={n.id} onClick={() => handleNotificationClick(n.orderId)} className="bg-slate-900 text-white shadow-xl rounded-2xl px-4 py-3 flex items-start gap-3 border border-slate-800 animate-fade-in cursor-pointer hover:bg-slate-800 hover:border-slate-700 transition-colors">
              <div className="mt-0.5"><Bell size={16} /></div>
              <div className="text-sm leading-tight">
                <div className="font-semibold">Нове замовлення</div>
                <div className="text-xs text-slate-200">#{n.orderId.slice(-6)} · {n.customer}</div>
                {n.contactPhone ? <div className="text-[11px] text-slate-300">{n.contactPhone}</div> : null}
                {!n.contactPhone && n.contactEmail ? <div className="text-[11px] text-slate-300">{n.contactEmail}</div> : null}
                {n.contactPhone && n.contactEmail ? <div className="text-[11px] text-slate-400">{n.contactEmail}</div> : null}
                {n.total ? <div className="text-xs text-amber-200 font-semibold">{n.total.toFixed(0)} ₴</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
