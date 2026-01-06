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

const AppContent = () => {
  const {
    view,
    setView,
    isAdminMode,
    setIsAdminMode,
    globalDates,
    setGlobalDates,
    cart,
  } = useAppContext();

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
