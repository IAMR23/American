import React from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function SidebarLayout() {
  return (
      <div className="row flex-nowrap">
        <Sidebar />
        <div className="col py-3">
          <Outlet />
        </div>
    </div>
  );
}
