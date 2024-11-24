import './App.css';
import { Navbar } from './Components/Navbar/Navbar';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './Pages/Home';
import { ShopCategory } from './Pages/ShopCategory';
import { AboutUs } from './Pages/AboutUs';
import { Product } from './Pages/Product';
import { Cart } from './Pages/Cart';
import { LoginSignup } from './Pages/LoginSignup';
import { Footer } from './Components/Footer/Footer';
import Popular from './Components/Popular/Popular';
import { useEffect, useState } from 'react';
import { useUser } from './Context/UserContext';
import apiUrl from '@config';

function App() {
  const { currentUser, setCurrentUser } = useUser();

  useEffect(() => {
    console.log("(app) currentUser: ", currentUser);
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('auth-token');
      if(token && !currentUser) {
        console.log("(app) Found token but no currentUser.")
        const response = await fetch(`${apiUrl}/users/me`, {
          headers: {
            'auth-token': token,
          },
        });

        const data = await response.json();

        if(data.success) {
          setCurrentUser(data.user); //Restore user.
          console.log("(app) CurrentUser: ", currentUser);
        }
        else {
          console.log("Failed to fetch user.");
        }
      }
    };

    fetchCurrentUser();
  }, [currentUser, setCurrentUser])


  return (
    <div>
      <header>
        {currentUser ? (
          <p>Welcome, {currentUser.name}</p>
        ) : (
          <p>Browsing as Guest</p>
        )
      
      }
      <p>ALPHA Testing</p>
      </header>
      <BrowserRouter>
        <Navbar/>
        <div style={{margin: 50+'px'}}>
          <h2>Disclaimer:</h2>
          <p>
            This website is in the early stages of development. 
            All content, design, and functionality are subject to significant change and do not represent a finalized site. 
            The products displayed may not reflect actual offerings, and any accounts or reviews created may be removed during testing phases. 
            You may place orders for testing purposes; however, no products will be delivered. 
            By placing an order during this phase, you acknowledge and accept that this is for testing only, and no responsibility is assumed for unmet expectations of product delivery.</p>
        </div>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/biscuits' element={<ShopCategory category="biscuits"/>}/>
          <Route path='/trainingTreats' element={<ShopCategory category="trainingTreats"/>}/>
          <Route path='/aboutUs' element={<AboutUs/>}/>

          <Route path='/product'>
            <Route path=':productId/:name' element={<Product/>}/>
          </Route>

          <Route path='/cart' element={<Cart/>}/>
          <Route path='/login' element={<LoginSignup/>}/>
        </Routes>
      </BrowserRouter>
      <Footer/>
    </div>
  );
}

export default App;
