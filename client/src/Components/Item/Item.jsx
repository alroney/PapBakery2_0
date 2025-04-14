import React from 'react'
import './Item.css'
import { Link } from 'react-router'
import { imgUrl } from '../../config'

const Item = (props) => {
  console.log("(Item.jsx) Component Loaded.");

  const { scID, catName, scName, name, image, sku} = props; //Props passed from calling component.
//Link affects APP.js Routes
  return (
    <div className="item">
        <Link to={`/product/${(scName && catName) ? (scName+'-'+catName.split(' ').join('-')) : name.split(' ').join('-')}/${sku ?  sku : scID+'11-11'}`}>
          <img onClick={window.scrollTo(0,0)} src={`${imgUrl}/productsByCatShapeSize/${image}`} alt="" />
        </Link>
        <div className='item-header'>
          <p>{name}</p>
        </div>
    </div>
  )
}

export default Item;