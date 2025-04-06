import React, { memo } from 'react';
import './NewItems.css';
import { ProductGrid } from '../Common/ProductGrid';

export const NewItems = memo(() => {
    
  return <ProductGrid
        title="New Items"
        endpoint="/products/new"
        className="newItems"
    />
})
