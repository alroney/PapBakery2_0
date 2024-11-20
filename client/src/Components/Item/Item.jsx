import React, { useEffect } from 'react'
import './Item.css'
import { Link } from 'react-router-dom'

const Item = (props) => {
  const { id, name, image, price} = props;
  
//Link affects APP.js Routes
  return (
    <div className="item">
        <Link to={`/product/${id}/${name.split(' ').join('-')}`}><img onClick={window.scrollTo(0,0)} src={image} alt="" /></Link>
        <p>{name}</p>
        <div className="item-price">
          ${price}
        </div>
    </div>
  )
}

export default Item;