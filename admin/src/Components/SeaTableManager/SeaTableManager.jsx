import React, { useState, useEffect } from 'react';
import './SeaTableManager.css';
const apiBase = "http://localhost:4000/api";

const seatableManager = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);

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
    const tableName = e.target.value;
    const table = tables.find(table => table === tableName);
    setSelectedTable(table);
  }

  return (
    <div className='seatable-manager'>
        <h1>SeaTable</h1>
        <button onClick={fetchTables}>List Available Tables</button>
        <div className='tables'>
            <select className='table-select' onChange={handleTableSelect}>
                <option value='none'>Select a table</option>
                {tables.map((table, index) => {
                    return <option key={index} value={table}>{table}</option>
                })}
            </select>
            {selectedTable && (
                <div className='table-info'>
                    <h2>Table: {selectedTable}</h2>
                </div>
            )}
        </div>
    </div>
  )
}

export default seatableManager;