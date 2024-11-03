import React, { useEffect, useState } from 'react';
import './NewItems.css';
import Item from '../Item/Item';
import apiUrl from '@config';

export const NewItems = () => {

    const [new_items, setNew_items] = useState([]);

    useEffect(() => {
        fetch(`${apiUrl}/newitems`) //Contact the newitems API endpoint.
            .then((response) => response.json()) //Then get the response and format it to json.
            .then((data) => setNew_items(data)); //Then take the data from it and put it in new_items using the set property for it.
    }, []) //[] indicates the useEffect to be used only one time when the component gets mounted.

  return (
    <div className="newitems">
        <h1>Newest Items</h1>
        <hr />
        <div className="newitems-item">
            {new_items.map((item, i) => {
                return <Item key={i} id={item.id} name={item.name} image={item.image} price={item.price} /> 
            })}
        </div>
    </div>
  )
}
