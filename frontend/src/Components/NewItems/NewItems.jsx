import React from 'react'
import './NewItems.css'
import data_product from '../Assets/data/data'
import Item from '../Item/Item'

export const NewItems = () => {
  return (
    <div className="newitems">
        <h1>Newest Items</h1>
        <hr />
        <div className="newitems-item">
            {
                data_product.map((item, i) => {
                    return <Item key={i} id={item.id} name={item.name} image={item.image} price={item.price} /> 
                })
            }
        </div>
    </div>
  )
}
