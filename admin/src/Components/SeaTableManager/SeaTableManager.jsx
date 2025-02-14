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

  const convertForeignValues = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/seatable/convertFKeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tableName: selectedTable })
      });
      const data = await response.json();

      if(data.success) {
        console.log("Foreign keys converted successfully.");
        console.log("Result: ", data.result);
        setLoading(false);
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
              <button onClick={convertForeignValues}>Convert Foreign Values</button>
              <button onClick={updateProductsTable}>Update Available Products</button>
          </div>
        )}
        
        <DataTable tableName={selectedTable} />
    </div>
  )
}

export default seatableManager;