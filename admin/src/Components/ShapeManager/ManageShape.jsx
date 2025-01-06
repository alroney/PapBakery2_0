import React, { useState, useEffect } from 'react';
import './ManageShape.css';
const apiBase = "http://localhost:4000/api";
const seatableKey = '@config/seatableKey';

const manageshape = () => {
    const [token, setToken] = useState(null);

    useEffect(() => {
        
    }, []);


  return (
    <div>
      <h1>SeaTable</h1>
      <pre>{JSON.stringify(token, null, 2)}</pre>
    </div>
  )
}

export default manageshape;