import React, {useState} from 'react'
import './Navbar.css'
import navLogo from '../Assets/img/logo/papbakery_logo_dark.png'
import cart_icon from '../Assets/img/shopping-cart.png'
import { Link } from 'react-router-dom'

export const Navbar = () => {

    const [menu, setMenu] = useState("shop"); //Initialize the menu selection

  return (
    <div className='navbar'>
        <div className='nav-logo'>
            <img src={navLogo} alt="PapBakery Logo"/>
            <p>Paws & Palms Bakery</p>
        </div>
        
        <ul className="nav-menu">
            <li onClick={()=>{setMenu("shop")}}><Link to='/'>Shop</Link>{menu==="shop"?<hr/>:<></>}</li> {/**The setMenu() will change the menu value to the value in its parameter. The <hr/> tag is added to the li if menu is equal to the current menu item. */}
            <li onClick={()=>{setMenu("biscuits")}}><Link to='/biscuits'>Biscuits</Link>{menu==="biscuits"?<hr/>:<></>}</li>
            <li onClick={()=>{setMenu("trainingTreats")}}><Link to='/trainingTreats'>Training Treats</Link>{menu==="trainingTreats"?<hr/>:<></>}</li>
            <li onClick={()=>{setMenu("aboutUs")}}><Link to='/aboutUs'>About Us</Link>{menu==="aboutUs"?<hr/>:<></>}</li>
        </ul>
        <div className="nav-login-cart">
            <Link to='/login'><button>Login</button></Link>
            <Link to='/cart'><img src={cart_icon} alt="Cart"/></Link>
            <div className="nav-cart-count">0</div>
        </div>
    </div>
  )
}
