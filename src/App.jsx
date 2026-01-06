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
import LoginView from "./views/LoginView";

const AppContent = () => {
  const {
    currentUser,
    userLoading,
    view,
    setView,
    isAdminMode,
    setIsAdminMode,
    globalDates,
    setGlobalDates,
    cart,
  } = useAppContext();

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Завантажування...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={() => setView("home")} />;
  }

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
