import React from 'react'
import './Sidebar.css'
import { Link } from 'react-router'
import add_product_icon from '../../assets/img/icon/Product_Cart.svg'
import list_product_icon from '../../assets/img/icon/Product_list_icon.svg'

const Sidebar = () => {
  return (
    <div className="sidebar">
        <Link to={'/addproduct'} style={{textDecoration: "none"}}>
            <div className="sidebar-item">
              <img src={add_product_icon} alt="" />
              <p>Add Product</p>
            </div>
        </Link>

        <Link to={'/listproduct'} style={{textDecoration: "none"}}>
            <div className="sidebar-item">
              <img src={list_product_icon} alt="" />
              <p>Product List</p>
            </div>
        </Link>

        <Link to={'/seatableManager'} style={{textDecoration: "none"}}>
            <div className="sidebar-item">
              <img src={list_product_icon} alt="" />
              <p>SeaTable Manager</p>
            </div>
        </Link>

        <Link to={'/mathTest'} style={{textDecoration: "none"}}>
            <div className="sidebar-item">
              <img src={list_product_icon} alt="" />
              <p>Math Test</p>
            </div>
        </Link>
    </div>
  )
}

export default Sidebar