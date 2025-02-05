"use client";
import React, { createContext, ReactNode, useContext, useState } from "react";

interface UserInfo {
    name: string;
  email: string;
  phoneNumber: string;
}

interface UserContextType {
  userInfo: UserInfo;
  setUserInfo: (info: Partial<UserInfo>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
name: "",
    email: "",
    phoneNumber: "",
  });

  const updateUserInfo = (info: Partial<UserInfo>) => {
    setUserInfo((prev) => ({ ...prev, ...info }));
  };

  return (
    <UserContext.Provider value={{ userInfo, setUserInfo: updateUserInfo }}>
      {children}
    </UserContext.Provider>
  );
};

export const UseUserInfo = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserInfo must be within a provider");
  }
  return context;
};
