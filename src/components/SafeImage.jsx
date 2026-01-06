import React, { useState } from "react";
import { ImageIcon } from "lucide-react";

export const SafeImage = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  return error ? (
    <div className={`${className} bg-gray-100 flex items-center justify-center`}>
      <ImageIcon className="text-gray-300" size={32} />
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};
