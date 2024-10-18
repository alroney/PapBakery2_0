import React from 'react'
import './CSS/LoginSignup.css'
import { useState } from 'react'

export const LoginSignup = () => {

  const [state, setState] = useState("Login");
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
  })

  const login = async () => {
    console.log("login funtion executed: ", formData);
  }

  const signup = async () => {
    console.log("signup function executed: ", formData);
    let responseData;
    await fetch('http://localhost:4000/signup', {
      method: 'POST',
      headers: {
        Accept: 'application/form-data',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    }).then((response) => response.json()).then((data) => responseData = data)

    if(responseData.success) {
      localStorage.setItem('auth-token', responseData.token); //Save auth token.
      window.location.replace("/"); //Replace the path of home page.
    }
  }


  const changeHandler = (e) => {
    setFormData({...formData, [e.target.name]:e.target.value})
  }


  return (
    <div className="loginsignup">
      <div className="loginsignup-container">
        <h1>{state}</h1> {/* Text changes depending on the value of the state variable */}
        <div className="loginsignup-fields">
          {state === "Sign Up"?<input name="username" value={formData.username} onChange={changeHandler} type="text" placeholder='Your Name'/> : <></>} {/*If state value is "Sign Up" then show the input field for your name : ELSE hide the input field and place empty tag <></> */}
          <input name="email" value={formData.email} onChange={changeHandler} type="email" placeholder='email@mail.com'/>
          <input name="password" value={formData.password} onChange={changeHandler} type="password" placeholder='Password'/>
        </div>

        <button onClick={() => {state === "Login"?login():signup()}}>{state}</button>

        {/* Change the <p> option depending on the value of state*/}
        {state === "Sign Up"
          ? <p className="loginsignup-login">Already have an account? <span onClick={() => setState("Login")}>Login Here</span></p> //If True
          : <p className="loginsignup-login">Creat an Account? <span onClick={() => setState("Sign Up")}>Click Here</span></p> //If False
        }
        
        <div className="loginsignup-agree">
          <input type="checkbox" name='' id='' />
          <p>By continue, I agree to the terms of use & privacy policy.</p>
        </div>
      </div>
    </div>
  )
}
