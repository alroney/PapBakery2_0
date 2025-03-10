import React, { useState, useEffect } from 'react';
import './SeaTableManager.css';
import DataTable from './DataTable/DataTable';
import useFailSafe from '../../hooks/useFailSafe';
const apiBase = "http://localhost:4000/api";


const seatableManager = () => {
    const { failSafe, loading, setLoading, error, setError } = useFailSafe();
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState('none');
    const [stMetaData, setStMetaData] = useState({
        lastUpdated: null,
        retrievedFrom: '',
    })


    useEffect(() => {
      if(selectedTable !== 'none'){
        console.log(`Selected table: ${selectedTable}`);
      }
    }, [selectedTable]);


    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    useEffect(() => {
      if (stMetaData.lastUpdated) {
        setStMetaData(prev => ({
          ...prev,
          lastUpdated: formatDate(prev.lastUpdated)
        }));
      }
    }, [stMetaData.lastUpdated]);



    const fetchTables = async () => {
      setLoading(true);
      setSelectedTable('none');
      try {
          const response = await fetch(`${apiBase}/seatable/tables`);
          const data = await response.json();

          if(data.success) {
              setTables(data.tables.sort());
              setStMetaData({
                  lastUpdated: data.lastUpdated,
                  retrievedFrom: data.retrievedFrom,
              });
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
    setSelectedTable('none');
    setTables([]);
    try {
        const response = await fetch(`${apiBase}/seatable/syncSeaTable`);
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
  

  const getNutritionFact = async () => {
    setSelectedTable('none');
    try {
      const response = await fetch(`${apiBase}/seatable/testFacts`);
      const data = await response.json();
      if(data.success) {
        console.log("Nutrition facts retrieved successfully.");
        document.getElementById("nutrition-facts").innerHTML = JSON.stringify(data.result, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
        
      }
    }
    catch(error) {
      failSafe("Error retrieving nutrition facts: ", error);
    }
  }


  const buildRecipes = async () => {
    setSelectedTable('none');
    try {
      const response = await fetch(`${apiBase}/seatable/buildRecipes`);
      const data = await response.json();
      if(data.success) {
        console.log("Recipes built successfully.");
        document.getElementById("recipes").innerHTML = JSON.stringify(data.result, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
      }
      else {
        document.getElementById("recipes").innerHTML = "No recipes built.";
      }
    }
    catch(error) {
      failSafe("Error building recipes: ", error);
    }
  }

  const test = async () => {
    setSelectedTable('none');
    try {
      const response = await fetch(`${apiBase}/seatable/test`);
      const data = await response.json();
      if(data.success) {
        console.log("Product build test successful.");
      }
    }
    catch(error) {
      failSafe("Error testing product build: ", error);
    }
  }

  return (
    <div className='seatable-manager'>
        <h1>SeaTable</h1>
        <button onClick={syncTables}>Synchronize</button>
        <button onClick={fetchTables}>Update Available Tables</button>
        <button onClick={updateProductsTable}>Update Available Products</button>
        <button onClick={buildRecipes}>Build Recipes</button>
        <button onClick={test}>Test</button>
        <p id="recipes"> </p>
            {tables.length > 0 && (
              <div className='meta-data'>
                <p>Tables last updated: {stMetaData.lastUpdated}</p>
                <p>Retrieved from: {stMetaData.retrievedFrom}</p>
              </div>
            )}
        <div className='table-selection'>
            <select className='table-select' onChange={handleTableSelect} value={selectedTable}>
                <option value='none'>Select a table</option>
                {tables.map((table, index) => {
                    return <option key={index} value={table}>{table}</option>
                })}
            </select>
        </div>
        {loading && <p>Loading...</p>}
        {!loading && selectedTable !== 'none' && (
          <div>
           {/* TODO: possibly add a temp conversion allowing for easy data editing, then reconvert back to then save it. */}
              <button onClick={() => convertForeignValues(true)}>Convert to Name</button>
              <button onClick={() => convertForeignValues(false)}>Convert to ID</button>
              <DataTable tableName={selectedTable} isLoading={loading} />
          </div>
        )}
        
        
    </div>
  )
}

export default seatableManager;