import { HomePage } from '@pages/home'
import { PATHS } from '@shared/const'
import { BrowserRouter, Route, Routes } from "react-router-dom"

export const RouterProvider = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={PATHS.HOME} element={<HomePage />} />
        <Route path={PATHS.CHAT} element={<></>} />
        <Route path={PATHS.SETTINGS} element={<></>} />
      </Routes>
    </BrowserRouter>
  );
};
