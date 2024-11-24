import React, { createContext, useContext, useState } from 'react'

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null); //Holds the user data
  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
        {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext);
