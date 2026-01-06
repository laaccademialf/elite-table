import {
  Home,
  Layers,
  Wine,
  Utensils,
  Palette,
  User,
  Phone,
  Truck,
  Clock,
} from "lucide-react";

const iconMap = {
  Home,
  Layers,
  Wine,
  Utensils,
  Palette,
  User,
  Phone,
  Truck,
  Clock,
};

export const getIcon = (iconName, size = 16) => {
  const IconComponent = iconMap[iconName] || Layers;
  return <IconComponent size={size} />;
};
