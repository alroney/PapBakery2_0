import React, { useState, useEffect } from 'react';
import './SeaTableManager.css';
import DataTable from './DataTable/DataTable';
const apiBase = "http://localhost:4000/api";


const seatableManager = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('none');


    useEffect(() => {
      if(selectedTable !== 'none'){
        console.log(`Selected table: ${selectedTable}`);
      }
    }, [selectedTable]);


    const fetchTables = async () => {
      setLoading(true);
      setSelectedTable('none');
      try {
          const response = await fetch(`${apiBase}/seatable/tables`);
          const data = await response.json();
          console.log("Tables: ", data);

          if(data.success) {
              setTables(data.tables.sort());
              setLoading(false);
          }
      }
      catch(error) {
          console.error("Error fetching tables: ", error);
      }
  };

  const handleTableSelect = (e) => {
    setSelectedTable(e.target.value);
  }

  const test = async () => {
    try {
      const response = await fetch(`${apiBase}/seatable/test`);
      const data = await response.json();
      console.log("Test Data: ", data);
      if(data.success) {
        const updatedMap = data.updatedMap;
        document.getElementById('category-map').innerHTML = JSON.stringify(updatedMap);
      }
    }
    catch(error) {
      console.error("Error testing: ", error);
    }
  }

  const updateProductsTable = async () => {
    setSelectedTable('none');
    try {
      const response = await fetch(`${apiBase}/seatable/updateProductsTable`);
      const data = await response.json();
      if(data.success) {
        console.log("Products table updated successfully.");
      }
    }
    catch(error) {
      console.error("Error updating products table: ", error);
    }
  }
  

  return (
    <div className='seatable-manager'>
        <h1>SeaTable</h1>
        <button onClick={fetchTables}>Update Available Tables</button>
        <div className='table-selection'>
            <select className='table-select' onChange={handleTableSelect} value={selectedTable}>
                <option value='none'>Select a table</option>
                {tables.map((table, index) => {
                    return <option key={index} value={table}>{table}</option>
                })}
            </select>
        </div>
        {loading && <p>Loading...</p>}
        {!loading && (
          <div>
              <button onClick={test}>Test Maps</button>
              <button onClick={updateProductsTable}>Update Available Products</button>
          </div>
        )}
        
        <DataTable tableName={selectedTable} />
    </div>
  )
}

export default seatableManager;