const axios = require('axios');
const { getBaseTokenAndUUID } = require('./stTokenController');
const urlBase = "https://cloud.seatable.io/api-gateway/api/v2/dtables"; //SeaTable server.

//Function: Execute the column operation on the SeaTable base.
const updateRow = async (data) => {
    console.log("(updateRow) Data: ", data);
    const { baseToken, baseUUID } = await getBaseTokenAndUUID();
    const url = `${urlBase}/${baseUUID}/rows/`;
    const options = {
        method: 'PUT',
        url: url,
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Token ${baseToken}`,

        },
        data: data,
    };

    try {
        const response = await axios(options);
        console.log("Row(s) updated: ", response.data);
        return { success: true, message: "Row(s) updated successfully." };
    }
    catch(error) {
        console.error("(seatableController)(updateRow) Error updating row(s): ", error);
        return { success: false, error: error.message };
    }
}

module.exports = { updateRow };