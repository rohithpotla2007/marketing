import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  category?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = 'w-full h-40',
  category = 'Product',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-lg overflow-hidden ${className}`}
      >
        <Package className="w-10 h-10 text-slate-500 mb-2" />
        <span className="text-xs font-semibold text-slate-400 text-center px-2 truncate max-w-full">
          {alt}
        </span>
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          {category}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center ${className}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
        loading="lazy"
      />
    </div>
  );
};
