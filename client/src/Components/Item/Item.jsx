import React, { useEffect } from 'react'
import './Item.css'
import { Link } from 'react-router'

const Item = (props) => {
  console.log("(Item.jsx) Component Loaded.");

  const { id, name, image, price} = props;
  


//Link affects APP.js Routes
//TODO: Change this to represent subcategory.
  return (
    <div className="item">
        <Link to={`/product/${id}/${name.split(' ').join('-')}`}><img onClick={window.scrollTo(0,0)} src={image} alt="" /></Link>
        <div className='item-header'>
          <p>{name}</p>
          <p>${price}</p>
        </div>
    </div>
  )
}

export default Item;