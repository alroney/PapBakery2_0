import React, {useContext, useEffect, useRef, useState} from 'react';
import './Navbar.css';
import navLogo from '../Assets/img/logo/papbakery_logo_dark.png';
import cart_icon from '../Assets/img/icon/cart_icon.png';
import login_icon from '../Assets/img/icon/login-icon.svg'
import logout_icon from '../Assets/img/icon/logout-icon.svg'
import nav_dropdown from '../Assets/img/icon/nav_dropdown.png';
import { NavLink, useLocation } from 'react-router';
import { CartContext } from '../../Context/CartContext';
import { useUser } from '../../Context/UserContext';

export const Navbar = () => {
    console.log("(Navbar.jsx) Component Loaded.");

    const [menu, setMenu] = useState("home"); //Initialize the menu selection.
    const {getTotalCartItems} = useContext(CartContext); //Get the total cart items from the CartContext.
    const { currentUser, setCurrentUser } = useUser(); //Get the current user and set the current user from the UserContext.
    const navRef = useRef(); //Create a reference to the navRef.
    const location = useLocation(); //Get the current location.

    //Function: Disable page scrolling.
    const toggleScroll = (disabled) => {
        if(disabled) {
            document.body.classList.add('no-scroll');
        }
        else {
            document.body.classList.remove('no-scroll');
        }
    }


    //Function: Complete a process for logging out.
    const handleLogout = () => {
        localStorage.removeItem('auth-token'); //Clear the token.
        setCurrentUser(null); //Clear the user context.
        window.location.replace('/'); //Return to home page.
        setMenu("home"); //Set menu to home to prepare the <hr>.
    }

    //Function: Toggle the dropdown menu.
    const dropdown_toggle = (e) => {
        navRef.current.classList.toggle('nav-combo-visible');
        e.target.classList.toggle('open');
        toggleScroll(navRef.current.classList.contains('nav-combo-visible')); //Disable scolling when menu is open.
    }

    //Function: Check if the token is expired.
    const isTokenExpired = (token) => {
        if(!token) return true; //If token is not present, return true.
        const decodedToken = JSON.parse(atob(token.split('.')[1])); //Decode the token.
        return decodedToken.exp * 1000 < Date.now(); //Return true if token is expired.
    }

    //UseEffect: Check if the token is expired.
    useEffect(() => {
        const token = localStorage.getItem('auth-token'); //Get the token from local storage.
        if(isTokenExpired(token)) { //If the token is expired, remove it.
            localStorage.removeItem('auth-token');
            setCurrentUser(null);
        }
    }, []);

    //UseEffect: Update the menu based on the current path.
    useEffect(() => {
        const pathSegments = location.pathname.split('/').filter(Boolean); //Split the path and remove empty strings.
        const currentMenu = pathSegments[0] || 'home'; //Get the first segment of the path.
        setMenu(currentMenu); //Set the menu to the current menu.
    }, [location]);

  return (
    <div className='navbar'>
        <div className='nav-logo'>
            <img src={navLogo} alt="PapBakery Logo"/>
            <div className="logo-text">
                <p>Andrew's</p>
                <p>Paws & Palms Bakery</p>
            </div>
            
        </div>
        <div className="nav-dropdown"><img  onClick={dropdown_toggle} src={nav_dropdown} alt="" /></div>
        <div ref={navRef} className="nav-combo">
            <ul className="nav-menu">
                {/**The setMenu() will change the menu value to the value in its parameter. The <hr/> tag is added to the li if menu is equal to the current menu item. */}
                <li onClick={()=>{setMenu("home")}}>
                    <NavLink className="nav-item"  to='/'>Home</NavLink>{menu==="home"?<hr/>:<></>}
                </li> 
                <li onClick={()=>{setMenu("biscuits")}}>
                    <NavLink className="nav-item" to='/biscuits'>Biscuits</NavLink>{menu==="biscuits"?<hr/>:<></>}
                </li>
                <li onClick={()=>{setMenu("trainingTreats")}}>
                    <NavLink className="nav-item" to='/trainingTreats'>Training Treats</NavLink>{menu==="trainingTreats"?<hr/>:<></>}
                </li>
            </ul>
        </div>
        <div className="nav-right-side">
            <div  id="nav_login">
                    {localStorage.getItem('auth-token')
                        ? <button onClick={() => handleLogout()}><span className='logText'>Logout</span><img className='logImg' src={logout_icon} alt=""></img></button> //If true, remove the auth-token and send user to home page.
                        : <NavLink to='/login'><button onClick={() => {setMenu("")}}><span className='logText'>Login</span><img className='logImg' src={login_icon} alt=""></img></button></NavLink> //If false, display the login button.
                    }
                </div>
            <div id="nav_cart">
                <NavLink to='/cart'><img onClick={()=>{setMenu("")}} src={cart_icon} alt="Cart"/></NavLink>
                <div className="nav-cart-count">{getTotalCartItems()}</div> {/*Cart item count display icon*/}
            </div>
        </div>
        
    </div>
  )
}
