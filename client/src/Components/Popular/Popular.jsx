import React, { memo } from 'react';
import './Popular.css';
import { ProductGrid } from '../Common/ProductGrid';

export const Popular = memo(() => {
  return <ProductGrid
		title="Popular Items"
		endpoint="/products/top"
		className="popularItems"
	/>
});
