import React from 'react'
import './Breadcrum.css'
import arrow_icon from '../Assets/img/icon/breadcrum_arrow.png'

export const Breadcrum = (props) => {
    const {product} = props;
    const arrowImg = <img src={arrow_icon} alt=">"/>;



  return (
    <div className="breadcrum">
        HOME {arrowImg} {product.category} {arrowImg} {product.subCategory}
    </div>
  )
}
