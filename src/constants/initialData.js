export const CATEGORIES = [
  { id: 1, name: "Всі", icon: "Home" },
  { id: 2, name: "Тарілки", icon: "Layers" },
  { id: 3, name: "Келихи", icon: "Wine" },
  { id: 4, name: "Прибори", icon: "Utensils" },
  { id: 5, name: "Текстиль", icon: "Palette" },
];

export const INITIAL_ITEMS = [
  {
    id: 1,
    title: "Золота Облямівка",
    category: "Тарілки",
    price: 25,
    count: 50,
    material: "Порцеляна",
    sku: "ART-001",
    image:
      "https://images.unsplash.com/photo-1577106263524-a76e5e7f1231?q=80&w=800",
    description: "Елегантна порцеляна з ручним золотим напиленням.",
  },
  {
    id: 2,
    title: "Кришталь Antique Royale",
    category: "Келихи",
    price: 15,
    count: 20,
    material: "Кришталь",
    sku: "ART-002",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800",
    description: "Вінтажні келихи з глибоким різьбленням.",
  },
  {
    id: 3,
    title: "SilverLine Modern",
    category: "Прибори",
    price: 30,
    count: 100,
    material: "Сріблення",
    sku: "ART-003",
    image:
      "https://images.unsplash.com/photo-1593510987185-1ec22559398f?q=80&w=800",
    description: "Мінімалістичні прибори з ідеальним поліруванням.",
  },
];

export const INITIAL_NEW_ITEM = {
  title: "",
  category: "Тарілки",
  price: "",
  count: "",
  material: "",
  description: "",
  image:
    "https://images.unsplash.com/photo-1594315522277-f9a44b82b334?auto=format&fit=crop&q=80&w=800",
};
