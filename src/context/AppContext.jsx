import React, { useState, useContext } from "react";
import { CATEGORIES, INITIAL_ITEMS, INITIAL_NEW_ITEM } from "../constants/initialData";
import { AppContext } from "./AppContextDefinition";

function AppProvider({ children }) {
  const [view, setView] = useState("home");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState("inventory");
  const [globalDates, setGlobalDates] = useState({ start: null, end: null });
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Всі");
  const [selectedItem, setSelectedItem] = useState(null);
  const [bookingStatus, setBookingStatus] = useState("idle");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
    time: "",
  });
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiConcept, setAiConcept] = useState(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState({});
  const [categories, setCategories] = useState(CATEGORIES);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [newItem, setNewItem] = useState(INITIAL_NEW_ITEM);

  const getAvailabilityForDate = (itemId, day) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;
    const dateKey = `${day}.12.2025`;
    const booked = (bookings[itemId] && bookings[itemId][dateKey]) || 0;
    const inCart = cart.find((c) => c.id === itemId)?.quantity || 0;
    return item.count - booked - inCart;
  };

  const getMaxAvailableForRange = (itemId, start, end) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return 0;
    if (!start) return item.count;
    const effectiveEnd = end || start;
    let minAvail = item.count;
    for (let d = start; d <= effectiveEnd; d++) {
      minAvail = Math.min(minAvail, getAvailabilityForDate(itemId, d));
    }
    return minAvail;
  };

  const addToCart = (item, quantity) => {
    if (!globalDates.start) {
      alert("Спочатку оберіть дату події");
      return;
    }
    const qty = parseInt(quantity) || 1;
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing)
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + qty } : c
        );
      return [...prev, { ...item, quantity: qty }];
    });
    setOrderQuantity("1");
    setView("home");
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
    setAiConcept(null);
  };

  const handleOrderSubmit = (e) => {
    e.preventDefault();
    const days = globalDates.end ? globalDates.end - globalDates.start + 1 : 1;
    const cartTotal =
      cart.reduce((sum, item) => sum + item.price * item.quantity * days, 0) +
      100;

    const newOrder = {
      id: Date.now(),
      items: cart.map((c) => `${c.title} (x${c.quantity})`).join(", "),
      total: cartTotal,
      customer: { ...customerInfo },
      dates: `${globalDates.start}.12.2025${
        globalDates.end ? ` - ${globalDates.end}.12.2025` : ""
      }`,
      status: "Нове",
    };

    const newBookings = { ...bookings };
    cart.forEach((item) => {
      if (!newBookings[item.id]) newBookings[item.id] = {};
      const endDay = globalDates.end || globalDates.start;
      for (let d = globalDates.start; d <= endDay; d++) {
        const key = `${d}.12.2025`;
        newBookings[item.id][key] =
          (newBookings[item.id][key] || 0) + item.quantity;
      }
    });

    setBookings(newBookings);
    setOrders([newOrder, ...orders]);
    setCart([]);
    setCustomerInfo({ name: "", phone: "", address: "", time: "" });
    setBookingStatus("success");
  };

  const value = {
    view,
    setView,
    isAdminMode,
    setIsAdminMode,
    adminTab,
    setAdminTab,
    globalDates,
    setGlobalDates,
    cart,
    setCart,
    selectedCategory,
    setSelectedCategory,
    selectedItem,
    setSelectedItem,
    bookingStatus,
    setBookingStatus,
    customerInfo,
    setCustomerInfo,
    orderQuantity,
    setOrderQuantity,
    isGenerating,
    setIsGenerating,
    aiConcept,
    setAiConcept,
    isTtsLoading,
    setIsTtsLoading,
    orders,
    setOrders,
    bookings,
    setBookings,
    categories,
    setCategories,
    items,
    setItems,
    newItem,
    setNewItem,
    getAvailabilityForDate,
    getMaxAvailableForRange,
    addToCart,
    removeFromCart,
    handleOrderSubmit,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}

export { AppProvider, useAppContext };
