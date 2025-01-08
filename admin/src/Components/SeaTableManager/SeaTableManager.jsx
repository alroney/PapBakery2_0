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

  const handleTableSelect = (e) => {
    const tableName = e.target.value;
    const table = tables.find(table => table.name === tableName);
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
                    return <option key={index} value={table.name}>{table.name}</option>
                })}
            </select>
            {selectedTable && (
                <div className='table-info'>
                    <h2>Table: {selectedTable.name}</h2>
                    <p>ID: {selectedTable._id}</p>
                </div>
            )}
        </div>
    </div>
  )
}

export default seatableManager;