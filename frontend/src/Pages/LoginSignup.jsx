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

  /**Explanation of login.
   * @variables
   * - `const login = async () => { ... }` defines an asynchronous function called `login`. The `async` keyword is used to indicate that this function will be dealing with asynchronous operations, specifically waiting for a fetch request.
   * - `let responseData;` is declared to store the response data from the server after the fetch request is completed.
   * 

   * @function fetch() used to make an HTTP request to the specified URL. It's a built-in JavaScript function for making network requests and returns a Promise.
   * `await` pauses the exectuion of the function until the fetch request completes.
   * - @argument URL ('http://localhost:4000') to make the request to.
   * - @argument Options_Object that specifies how the request should be made.
   *    - @key method @value 'POST': This indicates that the request method is POST, meaning that data is being sent to the server.
   *    - @key headers @value {
   *        - @key Accept @value 'application/json': This indicates the type of data that the client is willing to accept from the server.
   *        - @key 'Content-Type' @value 'application/json': This specifies that the format of the data being sent to the server is JSON. The server needs this information to understand the incoming data format.
   *      }
   *    - @key body @value JSON.stringify(formData):
   *      - The body property contains the data to be sent in the request.
   *      - JSON.stringify(formData) converts the formData object into a JSON string because HTTP requests typically use strings as the body payload, and the server expects it in JSON format.
   *
   * - `.then((response) => response.json())`:
   *    - When the server responds, it returns a response object.
   *    - response.json() is called to extract the JSON data from the response. This returns a Promise that resolves to the actual data.
   * 
   * - `.then((data) => responseData = data)`: This assigns the extracted data (now available as a JavaScript object) to the variable responseData.
   * 
   * @Handle_the_Response
   * - if(responseData.success)
   *    - `localStorage` (not a cookie): is used to store key-value pairs persistently on the client's browser, even after the page is reloaded.
   *    - `window.location.replace("/")`: changes the current document to the specified URL, effectively redirecting the user. The use of `.replace()` makes sure that the previous page is not retained in the session history, meaning the user can't navigate back to it with the browser's "back" button.
   * - else
   *  - `alert(responseData.errors)`: an alert is displayed with the error message (responseData.errors). This message is usually received from the server and helps the user understand what went wrong.
   */
  const login = async () => {
    console.log("login funtion executed: ", formData); //Debugging to indicate proper functionality.
    let responseData;
    await fetch('http://localhost:4000/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    }).then((response) => response.json()).then((data) => responseData = data)

    if(responseData.success) {
      localStorage.setItem('auth-token', responseData.token); //Save auth token.
      window.location.replace("/"); //Send the user to home page.
    }
    else {
      alert(responseData.errors)
    }
  }

  const signup = async () => {
    console.log("signup function executed: ", formData);
    let responseData;
    await fetch('http://localhost:4000/signup', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    }).then((response) => response.json()).then((data) => responseData = data)

    if(responseData.success) {
      localStorage.setItem('auth-token', responseData.token); //Save auth token.
      window.location.replace("/"); //Send the user to home page.
    }
    else {
      alert(responseData.errors)
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
