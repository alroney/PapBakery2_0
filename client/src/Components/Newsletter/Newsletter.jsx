import React from 'react'
import './Newsletter.css'

export const Newsletter = () => {
  console.log("(Newsletter) Component Loaded.");

  return (
    <div className="newsletter">
        <h1>Get Exclusive Offers On Your Email</h1>
        <p>Subscribe to our newsletter and stay updated</p>
        <div>
            <input type="email" placeholder='email@mail.com'/>
            <button>Subscribe</button>
        </div>
        <small>Not working right now</small>
    </div>
  )
}
