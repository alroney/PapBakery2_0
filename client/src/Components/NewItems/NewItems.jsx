import React, { memo, useEffect, useState } from 'react';
import './NewItems.css';
import Item from '../Item/Item';
import apiUrl from '@config';

export const NewItems = memo(() => {

    const [newProducts, setNewProducts] = useState([]);

    useEffect(() => {
        fetch(`${apiUrl}/products/new`) //Contact the newitems API endpoint.
            .then((response) => response.json()) //Then get the response and format it to json.
            .then((data) => {
                //Only call setNewProducts if the new data differs from the current state.
                if(JSON.stringify(data) !== JSON.stringify(newProducts)) {
                    setNewProducts(data);
                }
            }); //Then take the data from it and put it in newProducts using the set property for it.
    }, []) //[] indicates the useEffect to be used only one time when the component gets mounted.

  return (
    <div className="newitems">
        <h1>Newest Items</h1>
        <hr />
        <div className="newitems-item">
            {newProducts.map((item, i) => {
                return <Item key={i} id={item.id} name={item.name} image={item.image} price={item.price} /> 
            })}
        </div>
    </div>
  )
})
