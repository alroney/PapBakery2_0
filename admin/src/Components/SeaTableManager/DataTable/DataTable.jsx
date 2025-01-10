import React, { useEffect, useState } from 'react'
import './DataTable.css'
const apiBase = "http://localhost:4000/api";

const DataTable = ({tableName}) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        
        const fetchTableData = async () => {
            try {
                const response = await fetch(`${apiBase}/seatable/table/${tableName}`);
                const data = await response.json();
                console.log("Table Data: ", data);

                setData(data.rows);
            }
            catch(error) {
                console.error("Error fetching table data: ", error);
            }
            finally {
                setLoading(false);
            }
        };
        if(tableName !== 'none') {
            fetchTableData();
        }
        
    }, [tableName]);

    const headers = Array.isArray(data) && data.length > 0 
        ? Object.keys(data[0]).filter(key => !key.startsWith('_')) //Filter out keys that start with '_'.
        : [];

    return (
    <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
            <tr>
                {headers.length > 0 && headers.map((header, index) => {
                    return <th key={index}>{header}</th>
                })}
            </tr>
        </thead>
        <tbody>
            {data.map((row, index) => {
                return (
                    <tr key={index}>
                        {headers.map((header, index) => {
                            return <td key={index}>{row[header]}</td>
                        })}
                    </tr>
                )
            })}
        </tbody>
    </table>
  );
};

export default DataTable
