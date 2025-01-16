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
      try {
          const response = await fetch(`${apiBase}/seatable/tables`);
          const data = await response.json();
          console.log("Tables: ", data);

          if(data.success) {
              setTables(data.tables.sort());
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
    }
    catch(error) {
      console.error("Error testing: ", error);
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
        <div>
            <button onClick={test}>Test Maps</button>
        </div>
        <DataTable tableName={selectedTable} />
    </div>
  )
}

export default seatableManager;