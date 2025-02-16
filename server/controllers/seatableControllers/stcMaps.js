const { getTablesData } = require('../seatableControllers/stDataController'); //Import the getTablesData function from the stDataController.js file.




const mapSTCData = (ctd, mapNames) => {
    //Dynamically create tables and maps objects based on ctd
    const tables = {};
    const maps = {};
    const mapFunctions = {};
    //Extract table names from ctd and populate tables/maps
    ctd.forEach(table => {
        const tableName = table.tableName;
        //Exclude tables that end with '-A'.
        // if (!tableName.endsWith('-A')) {
            const mapName = tableName + "Map"; //Create a map name from the table name. 1.) Take the first letter and lowercase it, 2.) Add the rest of the table name which is done by slicing the table name from the second character to the end, 3.) Add "Map" to the end of the map name.
            const tableKey = tableName + "Table";
            tables[tableKey] = tableName; //tableKey is the key and tableName is the value.
            maps[mapName] = []; //Create an empty object inside the maps object.
            //Dynamically create map functions.
            mapFunctions[mapName] = (map, row) => {
                const rowData = {}; //Create an object to store the row data.
                Object.keys(row).forEach(column => { //Iterate over the columns in the row.
                    if(!column.startsWith('_')) { //Exclude columns that start with '_'.
                        rowData[column] = row[column]; //Add the column data to the rowData object with lowercase first letter
                    }
                    if(column === '_id') {
                        rowData._id = row[column]; //Add the _id to the rowData object.
                    }
                });
                map.push(rowData); //Add the row data to the map object.
                return map;
            };
        // }
    });

    const findTable = (tableName) => ctd.find((table) => table.tableName === tableName);

    //Map the data from the tables to the maps.
    const mapData = (table, map, mapFunction) => {
        if (table && table.data && Array.isArray(table.data.rows)) { //Check if the table and table.data exist and if table.data.rows is an array.
            return table.data.rows.reduce(mapFunction, map); //Reduce the table.data.rows array to a single value using the mapFunction.
        } else {
            console.error(`Error mapping ${table.tableName} data.`);
            return map;
        }
    };

    const selectedMaps = {};
    //Iterate over the mapNames array.
    mapNames.forEach(mapName => {
        if(maps.hasOwnProperty(mapName)) { //Check if the mapName exists in the maps object.
            const tableName = tables[`${mapName.replace('Map', 'Table')}`];
            const table = findTable(tableName);
            selectedMaps[mapName] = mapData(table, maps[mapName], mapFunctions[mapName])
        }
        else {
            console.log(`Map ${mapName} not found.`);
            selectedMaps[mapName] = {};
        }
    })

    return selectedMaps;
};



//Function: Get the maps from the SeaTableControllers cachedTablesData.
const getMaps = async (mapNames) => {
    const ctd = await getTablesData(); //Get the cachedTablesData.
    return mapSTCData(ctd, mapNames); //Return the mapping of the SeaTableControllers cachedTablesData.
}


module.exports = { getMaps }; //Export the getMaps function.