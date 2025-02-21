/**
 * This hook is used to handle errors in the application.
 */

import { useState } from 'react';

const useFailSafe = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const failSafe = (msg, error) => {
        console.error(msg, error);
        setLoading(false);
        setError(msg);
    };

    return { loading, setLoading, error, setError, failSafe };
}

export default useFailSafe;