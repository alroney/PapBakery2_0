import React from 'react'
import './Navbar.css'
import navLogo from '../../assets/img/logo/papbakery_logo_dark.png'
import navProfile from '../../assets/img/profile/nav-profile.svg'
import textLogo from '../../assets/img/logo/papbakery_textLogo_dark.png'
import fullLogo from '../../assets/img/logo/papbakery_titleLogo.png'

const Navbar = () => {
  return (
    <div className="navbar">
        <img src={navLogo} alt="Logo" className="nav-logo" />
        <img src={navProfile} alt="Profile Img" className="nav-profile" />
        <img src={fullLogo}/>
    </div>
  )
}

export default Navbar