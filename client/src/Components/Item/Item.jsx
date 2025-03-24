import React, { useEffect } from 'react'
import './Item.css'
import { Link } from 'react-router'

const Item = (props) => {
  console.log("(Item.jsx) Component Loaded.");

  const { id, name, image, price} = props; //Props passed from ShopCategory.jsx
  


//Link affects APP.js Routes
//TODO: Change this to represent subcategory.
  return (
    <div className="item">
        <Link to={`/product/${name.split(' ').join('-')}/111-11`}><img onClick={window.scrollTo(0,0)} src={image} alt="" /></Link>
        <div className='item-header'>
          <p>{name}</p>
        </div>
    </div>
  )
}

export default Item;