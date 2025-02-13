import React, { useEffect, useState } from 'react'
import './DataTable.css'
import edit_icon from '../../../assets/img/icon/edit_icon.svg';
import save_icon from '../../../assets/img/icon/confirm_icon.svg';
import cancel_icon from '../../../assets/img/icon/cancel_icon.svg';
const apiBase = "http://localhost:4000/api";

const DataTable = ({tableName}) => {
    const [data, setData] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState([]);
    const [sql, setSQL] = useState('');
    const [sqlResult, setSQLResult] = useState([]);
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
                setIsEditing(false);

            }
        };
        if(tableName === 'none') {
            setData([]);
            return;
        }
        
        fetchTableData();
        
    }, [tableName]);



    const handleCellChange = (rowIndex, header, value) => {
        const updatedData = [...editedData];
        updatedData[rowIndex][header] = value;

        //Recalculate the CostPerUnit if UnitSize or PurchaseCost is changed.
        if(tableName === 'Ingredient' && (header === 'UnitSize' || header === 'PurchaseCost')) {
            const unitSize = parseFloat(updatedData[rowIndex]['UnitSize']);
            const purchaseCost = parseFloat(updatedData[rowIndex]['PurchaseCost']);
            if(!isNaN(unitSize) && !isNaN(purchaseCost) && unitSize > 0) {
                const costPerUnit = purchaseCost / unitSize;
                updatedData[rowIndex]['CostPerUnit'] = costPerUnit.toFixed(4); //Update CostPerUnit.
            }
            else {
                updatedData[rowIndex]['CostPerUnit'] = '0.00'; //Set to 0 if values are invalid.
            }
        }

        setEditedData(updatedData);
    };



    const startEdit = () => {
        setIsEditing(true);
        setEditedData([...data]);
    };



    const recalculate = async () => {
        try {
            const response = await fetch(`${apiBase}/seatable/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({tableName}),
            }
            );

            const data = await response.json();
            setEditedData(data);
        }
        catch(error) {
            console.error("Error recalculating: ", error);
        }
    }



    const saveEdit = async () => {
        try {
            const formattedRows = editedData.map((row) => ({
                row: Object.keys(row).reduce((filteredRow, key) => {
                    if(!key.startsWith('_')) {
                        filteredRow[key] = row[key]; //Include keys that don't start with '_'.
                    }
                    return filteredRow;
                }, {}), //The updated row object.
                row_id: row._id, //Map `_id` to `row_id`.
            }));

            await fetch(`${apiBase}/seatable/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tableName, rows: formattedRows }),
            });
            setIsEditing(false);
            setData([...editedData]);
        }
        catch(error) {
            console.error("Error saving edit: ", error);
        }
    };
    

    const cancelEdit = () => {
        setIsEditing(false);
        setEditedData([]);
    };


    const headers = Array.isArray(data) && data.length > 0 
        ? Object.keys(data[0]).filter(key => !key.startsWith('_')) //Filter out keys that start with '_'.
        : [];

    return (
        <div>
            <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        {headers.length > 0 && headers.map((header, index) => {
                            return <th key={index}>{header}</th>
                        })}
                    </tr>
                </thead>
                <tbody>
                    {(isEditing ? editedData : data).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {headers.map((header) => (
                                <td key={header}>
                                    {isEditing ? (
                                        <input type='text' value={row[header]} onChange={(e) => handleCellChange(rowIndex, header, e.target.value)} />
                                    ) : (
                                        row[header]
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {isEditing && tableName !== 'none' ? (
                <div>
                    {(tableName === 'CategoryIngredient' || tableName === 'FlavorIngredient') && (
                        <button onClick={recalculate} className="recalculate-button">
                            Recalculate
                        </button>
                    )}
                    <img onClick={saveEdit} src={save_icon} alt="Save" className="save-icon"/>
                    <img onClick={cancelEdit} src={cancel_icon} alt="Cancel" className="cancel-icon"/>
                </div>
                ) : (
                <div>
                    {data.length > 0 && (
                        <img onClick={() => {startEdit()}} src={edit_icon} alt='Edit' className="edit-icon"/>
                    )}
                    
                </div>
                )    
            }
        </div>
    );
};

export default DataTable
