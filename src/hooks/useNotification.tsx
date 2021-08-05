import { createContext, useReducer, useContext, FC, Dispatch } from "react";
import { Notification, iNotification } from "../components/Notification";

const NotificationContext = createContext<Dispatch<Action>>(null);

export interface Action {
  type: "ADD_NOTIFICATION" | "REMOVE_NOTIFICATION";
  payload?: iNotification;
  id?: string;
}

export const useNotification = () => {
  return useContext<Dispatch<Action>>(NotificationContext);
};

export const NotificationProvider: FC<{}> = ({ children }) => {
  const [store, dispatch] = useReducer(
    (state: iNotification[], action: Action) => {
      switch (action.type) {
        case "ADD_NOTIFICATION":
          return [...state, action.payload];
        case "REMOVE_NOTIFICATION":
          return state.filter((notification) => notification.id !== action.id);
        default:
          return state;
      }
    },
    []
  );

  return (
    <>
      <NotificationContext.Provider value={dispatch}>
        {store.length ? (
          <div className="notification-wrapper">
            {store.map((notification) => (
              <Notification
                key={notification.id}
                dispatch={dispatch}
                {...notification}
              />
            ))}
          </div>
        ) : null}
        {children}
      </NotificationContext.Provider>
    </>
  );
};
