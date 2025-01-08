import React, { useState, useEffect } from 'react';
import './SeaTableManager.css';
const apiBase = "http://localhost:4000/api";

const seatableManager = () => {
    const [tables, setTables] = useState([]);

    const fetchTables = async () => {
      try {
          const response = await fetch(`${apiBase}/seatable/tables`);
          const data = await response.json();
          console.log("Tables: ", data);

          if(data.success) {
              setTables(sortTables(data.tables));
          }
      }
      catch(error) {
          console.error("Error fetching tables: ", error);
      }
  };

  const sortTables = (tables) => {
      return tables.sort((a, b) => {
          return a.name.localeCompare(b.name);
      });
  }

  return (
    <div className='seatable-manager'>
        <h1>SeaTable</h1>
        <button onClick={fetchTables}>Show Tables</button>
        <div className='tables'>
            <select>
                {tables.map((table, index) => {
                    return <option key={index}>{table.name}</option>
                })}
            </select>
        </div>
    </div>
  )
}

export default seatableManager;