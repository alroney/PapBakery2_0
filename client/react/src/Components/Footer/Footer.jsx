import React from 'react'
import './Footer.css'
import logo from '../Assets/img/logo/papbakery_logo_light.png'
import text_logo from '../Assets/img/logo/papbakery_textLogo_dark.png'
import instagram_icon from '../Assets/img/icon/socialMediaIcon/instagram_icon.png'
import facebook_icon from '../Assets/img/icon/socialMediaIcon/facebook_icon.png'

export const Footer = () => {
  return (
    <div className="footer">
        <div className="footer-logo">
            <img id="logoImg" src={logo} alt="papbakery logo" />
            <img id="logoText" src={text_logo} alt="papbakery text logo" />
        </div>
        <ul className="footer-links">
            <li>Product</li>
            <li>About</li>
            <li>Contact</li>
            <li>Legal</li>
        </ul>
        {/* <div className="footer-social-icon">
            <div className="footer-icons-container">
                <img src={instagram_icon} alt="instagram"/>
                <img src={facebook_icon} alt="facebook" />
            </div>
        </div> */}
        <div className="footer-copyright">
            <hr />
            <p>Created by Andrew Roney. Copyright @ 2024 - All Rights Reserved</p>
        </div>
    </div>
  )
}
