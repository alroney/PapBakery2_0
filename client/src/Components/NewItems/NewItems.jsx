import React, { memo, useEffect, useState } from 'react';
import './NewItems.css';
import Item from '../Item/Item';
import apiUrl from '@config';
import { ProductGrid } from '../Common/ProductGrid';

export const NewItems = memo(() => {
    
  return <ProductGrid
        title="New Items"
        endpoint="/products/new"
        className="newItems"
    />
})
