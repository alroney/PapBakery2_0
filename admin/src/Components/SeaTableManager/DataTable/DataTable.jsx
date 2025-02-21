import React, { useEffect, useState } from 'react'
import './DataTable.css'
import edit_icon from '../../../assets/img/icon/edit_icon.svg';
import save_icon from '../../../assets/img/icon/confirm_icon.svg';
import cancel_icon from '../../../assets/img/icon/cancel_icon.svg';
import useFailSafe from '../../../hooks/useFailSafe';
const apiBase = "http://localhost:4000/api";

const DataTable = ({tableName, isLoading}) => {
    const { failSafe, loading, setLoading, error, setError } = useFailSafe();
    const [data, setData] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState([]);
    const [columnTypes, setColumnTypes] = useState({});
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        const fetchTableData = async () => {
            setLoading(true);
            try {
                console.log("Fetching table data...");
                const response = await fetch(`${apiBase}/seatable/table/${tableName}`);
                const data = await response.json();
                console.log("Table Data: ", data);
                setData(data.rows);
                setColumnTypes(determineColumnTypes(data.rows));
            }
            catch(error) {
                failSafe("Error fetching table data: ", error);
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
        
        if (!isLoading) { //Fetch data only when loading has stopped.
            fetchTableData();
        }
        
    }, [tableName, isLoading]);
 

    const determineColumnTypes = (rows) => {
        if(rows.length === 0) return {};
        const columnTypes = {};
        Object.keys(rows[0]).forEach((key) => {
            if(!key.startsWith('_')) {
                columnTypes[key] = typeof rows[0][key];
            }
        });
        return columnTypes;
    }


    const handleCellChange = (rowIndex, header, value) => {
        const updatedData = [...editedData];
        const columnType = columnTypes[header];
        const errorKey = `${rowIndex}-${header}`;
        const updatedValidationErrors = { ...validationErrors };

        if (columnType === 'number') {
            if (value === '') {
                updatedData[rowIndex][header] = '';
                updatedValidationErrors[errorKey] = 'Input a number';
            } else if (isNaN(value)) {
                updatedValidationErrors[errorKey] = 'Value must be a number';
            } else {
                delete updatedValidationErrors[errorKey];
                updatedData[rowIndex][header] = parseFloat(value);

                if (tableName === 'Ingredient' && (header === 'UnitSize' || header === 'PurchaseCost')) {
                    const { UnitSize, PurchaseCost } = updatedData[rowIndex];
                    const unitSize = parseFloat(UnitSize);
                    const purchaseCost = parseFloat(PurchaseCost);
                    updatedData[rowIndex]['CostPerUnit'] = 
                        (unitSize > 0 && !isNaN(unitSize) && !isNaN(purchaseCost)) 
                            ? (purchaseCost / unitSize).toFixed(4) 
                            : '0.00';
                }
            }
        } else {
            delete updatedValidationErrors[errorKey];
            updatedData[rowIndex][header] = value;
        }

        setEditedData(updatedData);
        setValidationErrors(updatedValidationErrors);
    };



    const startEdit = () => {
        setIsEditing(true);
        setEditedData(JSON.parse(JSON.stringify(data))); //Deep copy of data. This is to prevent changes to the original data.
    };



    const recalculate = async () => {
        setLoading(true);
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
            setLoading(false);
        }
        catch(error) {
            failSafe("Error recalculating: ", error);
        }
    }



    const saveEdit = async () => {
        if(Object.keys(validationErrors).length > 0) {
            console.error("Validation errors: ", validationErrors);
            return;
        }

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
        setEditedData([...data]);
        setValidationErrors({});
    };


    const headers = React.useMemo(() => {
        try {
            if (data.length === 0) return [];
            return Object.keys(data[0]).filter(key => !key.startsWith('_'));
        }
        catch(error) {
            failSafe("Error getting headers: ", error);
            return [];
        }
    }, [data]);

    return (
        <div>
            {isLoading && <p></p>}
            {!isLoading && (
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
                                                <div>
                                                    <input type='text' value={row[header]} onChange={(e) => handleCellChange(rowIndex, header, e.target.value)} />
                                                    {validationErrors[`${rowIndex}-${header}`] && (
                                                        <small style={{ color: 'red' }}>{validationErrors[`${rowIndex}-${header}`]}</small>
                                                    )}
                                                </div>
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
            )}
        </div>
    );
};

export default DataTable
