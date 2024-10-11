import React, {useState} from 'react'
import './Navbar.css'
import navLogo from '../Assets/img/logo/papbakery_logo_dark.png'
import cart_icon from '../Assets/img/shopping-cart.png'

export const Navbar = () => {

    const [menu, setMenu] = useState("home"); //Initialize the menu selection

  return (
    <div className='navbar'>
        <div className='nav-logo'>
            <img src={navLogo} alt="PapBakery Logo"/>
            <p>PapBakery</p>
        </div>
        
        <ul className="nav-menu">
            <li onClick={()=>{setMenu("home")}}>Home{menu==="home"?<hr/>:<></>}</li>
            <li onClick={()=>{setMenu("about")}}>About{menu==="about"?<hr/>:<></>}</li>
            <li onClick={()=>{setMenu("shop")}}>Shop{menu==="shop"?<hr/>:<></>}</li>
        </ul>
        <div className="nav-login-cart">
            <button>Login</button>
            <img src={cart_icon} alt="Cart"/>
            <div className="nav-cart-count">0</div>
        </div>
    </div>
  )
}
