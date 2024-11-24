import React, { createContext, useContext, useState } from 'react'

const UserContext = createContext();

//Provider component.
export const UserProvider = ({ children }) => {
    console.log("(UserContext.jsx) -> (UserProvider) Component Loaded.");

    const [currentUser, setCurrentUser] = useState(null); //Holds the user data

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
        {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext);
