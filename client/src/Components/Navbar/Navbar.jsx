import React, {useContext, useRef, useState} from 'react';
import './Navbar.css';
import navLogo from '../Assets/img/logo/papbakery_logo_dark.png';
import cart_icon from '../Assets/img/icon/cart_icon.png';
import nav_dropdown from '../Assets/img/icon/nav_dropdown.png';
import { Link } from 'react-router-dom';
import { CartContext } from '../../Context/CartContext';

export const Navbar = () => {

    const [menu, setMenu] = useState("shop"); //Initialize the menu selection
    const {getTotalCartItems} = useContext(CartContext);
    const menuRef = useRef();

    const dropdown_toggle = (e) => {
        menuRef.current.classList.toggle('nav-menu-visible');
        e.target.classList.toggle('open');
    }

  return (
    <div className='navbar'>
        <div className='nav-logo'>
            <img src={navLogo} alt="PapBakery Logo"/>
            <div className="logo-text">
                <p>Andrew's</p>
                <p>Paws & Palms Bakery</p>
            </div>
            
        </div>
        <img className="nav-dropdown" onClick={dropdown_toggle} src={nav_dropdown} alt="" />
        <ul ref={menuRef} className="nav-menu">
            <li onClick={()=>{setMenu("shop")}}><Link className="nav-item"  to='/'>Shop</Link>{menu==="shop"?<hr/>:<></>}</li> {/**The setMenu() will change the menu value to the value in its parameter. The <hr/> tag is added to the li if menu is equal to the current menu item. */}
            <li onClick={()=>{setMenu("biscuits")}}><Link className="nav-item" to='/biscuits'>Biscuits</Link>{menu==="biscuits"?<hr/>:<></>}</li>
            <li onClick={()=>{setMenu("trainingTreats")}}><Link className="nav-item" to='/trainingTreats'>Training Treats</Link>{menu==="trainingTreats"?<hr/>:<></>}</li>
        </ul>

        <div className="nav-login-cart">
            {localStorage.getItem('auth-token')
                ? <button onClick={() => {localStorage.removeItem('auth-token'); window.location.replace('/')}}>Logout</button> //If true, remove the auth-token and send user to home page.
                : <Link to='/login'><button>Login</button></Link> //If false, display the login button.
            }
            
            <Link to='/cart'><img src={cart_icon} alt="Cart"/></Link>
            <div className="nav-cart-count">{getTotalCartItems()}</div> {/*Cart item count display icon*/}
        </div>
    </div>
  )
}
