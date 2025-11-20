import React, { createContext, useState } from "react";


export const MyAppContext = createContext();

function AppContextProvider({ children }) {
    const [authData, setAuthData] = useState({
        email: '',
        password: ''
    });

    return (
        <MyAppContext.Provider value={{ authData, setAuthData }}>
            {children}
        </MyAppContext.Provider>
    );
}

export default AppContextProvider;
