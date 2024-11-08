import React, { memo, useEffect, useState } from 'react';
import './Popular.css';
import Item from '../Item/Item';
import apiUrl from '@config';

export const Popular = memo(() => {

  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetch(`${apiUrl}/products/top`) //Call the API endpoint.
    .then((response) => response.json()) //Then convert the response into json format.
    .then((data) => {
      //Only call setTopProducts if the new data differs from the current state.
      if(JSON.stringify(data) !== JSON.stringify(topProducts)) {
        setTopProducts(data);
      }
    }) //Then place all the data into popular_flavors using its set property.
  }, []); //[] indicates to be called only one time when component is mounted.

  return (
    <div className="popular">
        <h1>Popular</h1>
        <hr />
        <div className="popular-item">
            {
              topProducts.map((item, i) => {
                return <Item key={i} id={item.id} name={item.name} image={item.image} price={item.price} /> 
              })
            }
        </div>
    </div>
  )
})
