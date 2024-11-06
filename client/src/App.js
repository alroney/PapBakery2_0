import './App.css';
import { Navbar } from './Components/Navbar/Navbar';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Shop } from './Pages/Shop';
import { ShopCategory } from './Pages/ShopCategory';
import { AboutUs } from './Pages/AboutUs';
import { Product } from './Pages/Product';
import { Cart } from './Pages/Cart';
import { LoginSignup } from './Pages/LoginSignup';
import { Footer } from './Components/Footer/Footer';

function App() {
  const setBrowseMode = () => {
    if(localStorage.getItem("auth-token")) {
      localStorage.setItem("isGuest", false);
      localStorage.setItem("guestEmail", "");
      return "userMode";
    }
    else {
      localStorage.setItem("isGuest", true);
      return "guestMode";
    }
  }

  return (
    <div>
      <BrowserRouter>
        <Navbar/>
        { setBrowseMode() === "guestMode"
          ? <p>Guest Mode</p>
          : <></>
        }
        <Routes>
          <Route path='/' element={<Shop/>}/>
          <Route path='/biscuits' element={<ShopCategory category="biscuits"/>}/>
          <Route path='/trainingTreats' element={<ShopCategory category="trainingTreats"/>}/>
          <Route path='/aboutUs' element={<AboutUs/>}/>

          <Route path='/product' element={<Product/>}>
            <Route path=':productId' element={<Product/>}/>
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
