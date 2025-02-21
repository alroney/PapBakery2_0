import React, { useState, useEffect } from 'react';
import './SeaTableManager.css';
import DataTable from './DataTable/DataTable';
import useFailSafe from '../../hooks/useFailSafe';
const apiBase = "http://localhost:4000/api";


const seatableManager = () => {
    const { failSafe, loading, setLoading, error, setError } = useFailSafe();
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

          if(data.success) {
              setTables(data.tables.sort());
              setLoading(false);
          }
      }
      catch(error) {
          failSafe("Error fetching tables: ", error);
      }
  };





  //Function: Handle table selection.
  const handleTableSelect = (e) => {
    setSelectedTable(e.target.value);
  }



  //Function: Synchronize tables.
  const syncTables = async () => {
    setLoading(true);
    try {
        const response = await fetch(`${apiBase}/seatable/fullSync`);
        const data = await response.json();
        if(data.success) {
            console.log("Tables synchronized successfully.");
            fetchTables();
        }
    }
    catch(error) {
        failSafe("Error synchronizing tables: ", error);
    }
  }



  //Function: Convert foreign values to name or ID.
  const convertForeignValues = async (isToName) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/seatable/convertFKeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tableName: selectedTable, isToName })
      });
      const data = await response.json();

      if(!data.success) {
        failSafe("Error converting foreign keys: ", "No data returned.");
        return;
      }
      
      setLoading(false);
    }
    catch(error) {
      failSafe("Error converting foreign keys: ", error);
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
      failSafe("Error updating products table: ", error);
    }
  }
  

  return (
    <div className='seatable-manager'>
        <h1>SeaTable</h1>
        <button onClick={syncTables}>Synchronize</button>
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
              <button onClick={() => convertForeignValues(true)}>Convert to Name</button>
              <button onClick={() => convertForeignValues(false)}>Convert to ID</button>
              <button onClick={updateProductsTable}>Update Available Products</button>
          </div>
        )}
        
        <DataTable tableName={selectedTable} isLoading={loading} />
    </div>
  )
}

export default seatableManager;