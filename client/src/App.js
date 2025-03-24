import './App.css';
import { Navbar } from './Components/Navbar/Navbar';
import { BrowserRouter, Routes, Route } from 'react-router';
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
  console.log("========(App.js) Loaded.========");
  const { currentUser, setCurrentUser } = useUser();
  const [all_category, setAll_Category] = useState([]);
  const [showDisclaimer, setShowDisclaimer] = useState(false); //TEMPORARY

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('auth-token');
      if(token && !currentUser) {
        const response = await fetch(`${apiUrl}/users/me`, {
          headers: {
            'auth-token': token,
          },
        });

        const data = await response.json();

        if(data.success) {
          setCurrentUser(data.user); //Restore user.
        }
        else {
          console.log("Failed to fetch user.");
        }
      }
    };

    fetchCurrentUser();
  }, [currentUser, setCurrentUser]);

  useEffect(() => {
    const fetchAllCategories = async () => {
      const response = await fetch(`${apiUrl}/products/allCategories`);
      const data = await response.json();
      return data;
    }

    fetchAllCategories().then(data => {
      setAll_Category(data);
    });
  }, [])

  return (
    <div>
      <header>
        {currentUser ? (
          <p>Welcome, {currentUser.name}</p>
        ) : (
          <p>Browsing as Guest</p>
        )}
        <p>ALPHA Testing</p>
      </header>
      <BrowserRouter>
        <Navbar/>
        <div className="disclaimer" style={{margin: 50+'px'}}>
          <h2>Site Disclaimer:</h2>
          <button onClick={() => setShowDisclaimer(!showDisclaimer)}>{showDisclaimer ? "Hide Disclaimer" : "Show Disclaimer"}</button>
          {showDisclaimer && 
            <p>
              This website is in the early stages of development. 
              All content, design, and functionality are subject to significant change and do not represent a finalized site. 
              The products displayed may not reflect actual offerings, and any accounts or reviews created may be removed during testing phases. 
              You may place orders for testing purposes; however, no products will be delivered. 
              By placing an order during this phase, you acknowledge and accept that this is for testing only, and no responsibility is assumed for unmet expectations of product delivery.
            </p>
          }
        </div>
        <Routes>
          <Route path='/' element={<Home/>}/>
          {all_category.map(category => {
            console.log("Category:", category);
            return (
              <Route 
                key={category} 
                path={`/${category}`} 
                element={<ShopCategory category={category}/>}
              />
            );
          })}
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
