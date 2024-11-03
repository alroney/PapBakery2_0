import React, { useEffect, useState } from 'react';
import './Popular.css';
import Item from '../Item/Item';
import apiUrl from '@config';

export const Popular = () => {

  const [popular_flavors, setPopular_flavors] = useState([]);

  useEffect(() => {
    fetch(`${apiUrl}/popular`) //Call the API endpoint.
    .then((response) => response.json()) //Then convert the response into json format.
    .then((data) => setPopular_flavors(data)) //Then place all the data into popular_flavors using its set property.
  }, []); //[] indicates to be called only one time when component is mounted.

  return (
    <div className="popular">
        <h1>Popular Flavors</h1>
        <hr />
        <div className="popular-item">
            {
              popular_flavors.map((item, i) => {
                return <Item key={i} id={item.id} name={item.name} image={item.image} price={item.price} /> 
              })
            }
        </div>
    </div>
  )
}
